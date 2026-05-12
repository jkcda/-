import { post, get } from './request'

// 微信登录
export const wxLogin = (code: string) => {
  return post<{ token: string; user: { id: number; username: string; email: string; role: string } }>('/api/user/wx-login', { code })
}

// 获取用户信息
export const getUserInfo = () => {
  return get<{ id: number; username: string; email: string; role: string }>('/api/user/info')
}

// 退出登录
export const logout = () => {
  return post('/api/user/logout')
}
