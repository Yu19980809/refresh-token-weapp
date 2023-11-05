import request from '@/utils/request'

// 登录
export const loginApi = code => request('/auth/login', 'POST', {code}, false)

// 商品
export const getCommodities = () => request('/commodity', 'GET', {}, false)
export const newCommodity = data => request('/commodity', 'POST', data)
