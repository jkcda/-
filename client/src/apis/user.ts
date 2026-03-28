import request from '@/utils/http'

// 注册接口
export const register = (data: { username: string; email: string; password: string }) => {
  return request.post('/user/register', data)
}

// 登录接口
export const login = (data: { username: string; password: string }) => {
  return request.post('/user/login', data)
}

// 获取用户信息接口
export const getUserInfo = () => {
  return request.get('/user/info')
}
