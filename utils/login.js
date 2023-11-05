import { loginApi } from '@/api/v1/index'

const login = async () => {
  try {
    // 登录获取 code
    const {code} = await wx.login()
    // 通过 code 获取 openId，再根据 openId 获取用户信息
    const {user, accessToken, refreshToken} = await loginApi(code)
    wx.setStorageSync('profile', user)
    wx.setStorageSync('accessToken', `Bearer ${accessToken}`)
    wx.setStorageSync('refreshToken', refreshToken)
  } catch (error) {
    wx.showToast({
      title: '登录失败，请稍后重试',
      icon: 'error',
      duration: 2000
    })
  }
}

export default login
