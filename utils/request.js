import { baseUrl, statusCode } from '@/config/index'

let isTokenRefreshing = false // 标识 token 刷新状态
let failedRequests = [] // 存储因为 token 刷新而挂起的请求

const request = (url, method = 'GET', params = {}, needToken = false, header = null) => {
  const {contentType = 'application/json'} = header || {}
  if (url.indexOf(baseUrl) === -1) url = baseUrl + url

  const option = {
    url,
    method,
    header: {'Content-Type': contentType},
    data: method === 'GET' ? {} : params
  }

  // 处理 token
  if (needToken) {
    const accessToken = wx.getStorageSync('accessToken')
    if (accessToken) {
      option['header']['Authorization'] = accessToken
    } else {
      wx.showToast({
        title: '请登录',
        icon: 'error',
        duration: 2000
      })

      return
    }
  }

  return new Promise((resolve, reject) => {
    wx.request({
      ...option,
      success(res) {
        // _successHandler(res, option, needToken, resolve, reject)
        switch (res.statusCode) {
          // 200
          case statusCode.SUCCESS:
            return resolve(res.data)
      
          // 401
          case statusCode.AUTHENTICATE:
            // 获取存储的 refreshToken 发送请求刷新 token
            // 刷新请求发送前，先判断是否有已发送的刷新请求，如果有就挂起，如果没有就发送请求
            if (isTokenRefreshing) {
              const {url, method, header, data} = option
              return failedRequests.push(() => request(url, method, data, true, header))
            }
      
            isTokenRefreshing = true
            const url = '/auth/refresh-token'
            const refreshToken = wx.getStorageSync('refreshToken')
            return request(url, 'POST', {refreshToken}, false)
              .then(res => {
                // 刷新成功，将新的 accessToken 和 refreshToken 存储到本地
                wx.setStorageSync('accessToken', `Bearer ${res.accessToken}`)
                wx.setStorageSync('refreshToken', res.refreshToken)
                // 将 failedRequests 中的请求使用新的 accessToken 重新发送
                failedRequests.forEach(callback => callback())
                failedRequests = []
                // 再将之前报 401 错误的请求重新发送
                const {url, method, data, header} = option
                request(url, method, data, true, header)
                  .then(response => resolve(response))
                  .catch(error => reject(error))
              })
              .catch(err => reject(err))
              .finally(() => isTokenRefreshing = false)
      
          // 403
          case statusCode.FORBIDDEN:
            return reject({message: '没有权限访问'})
      
          // 404
          case statusCode.NOT_FOUND:
            return reject({message: '请求资源不存在'})
      
          // 500
          case statusCode.SERVER_ERROR:
            // 刷新 token 失败
            if (res.data.message === 'Failed to refresh token') {
              wx.setStorageSync('profile', null)
              wx.showToast({
                title: '请登录',
                icon: 'error',
                duration: 2000
              })
              return reject({message: '请登录'})
            }
      
            // 其他问题
            return reject({message: '服务器错误'})
      
          // 502
          case statusCode.BAD_GATEWAY:
            return reject({message: '服务端出现了问题'})
        }
      },
      fail(err) {
        console.log('网络请求异常', err, option)
        reject(err)
      }
    })
  })
}

export default request
