// HTTP 请求封装 — 适配 uniapp 的 uni.request
// 接口返回格式与现有后端一致: { success: boolean, message: string, result: T }

import { API_BASE_URL } from '../config'
const BASE_URL = API_BASE_URL

function getToken(): string {
  return uni.getStorageSync('token') || ''
}

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
}

interface ApiResponse<T = any> {
  success: boolean
  message: string
  result: T
}

export function request<T = any>(options: RequestOptions): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const token = getToken()
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        ...options.header,
      },
      success: (res) => {
        const data = res.data as ApiResponse<T>
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data)
        } else {
          uni.showToast({ title: data.message || '请求失败', icon: 'none' })
          reject(data)
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络连接失败', icon: 'none' })
        reject(err)
      },
    })
  })
}

// GET 快捷方法
export function get<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  const query = data ? '?' + Object.entries(data).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&') : ''
  return request({ url: url + query, method: 'GET' })
}

// POST 快捷方法
export function post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return request({ url, method: 'POST', data })
}

// PUT 快捷方法
export function put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return request({ url, method: 'PUT', data })
}

// DEL 快捷方法
export function del<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  const query = data ? '?' + Object.entries(data).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&') : ''
  return request({ url: url + query, method: 'DELETE' })
}

// 文件上传 — 使用 uni.uploadFile
export function uploadFile(filePath: string, url: string = '/api/upload', name: string = 'file'): Promise<{ name: string; url: string; type: string; size: number }> {
  return new Promise((resolve, reject) => {
    const token = getToken()
    uni.uploadFile({
      url: BASE_URL + url,
      filePath,
      name,
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data.success) resolve(data.result)
          else {
            uni.showToast({ title: data.message || '上传失败', icon: 'none' })
            reject(new Error(data.message))
          }
        } catch {
          reject(new Error('解析上传结果失败'))
        }
      },
      fail: (err) => {
        uni.showToast({ title: '上传失败', icon: 'none' })
        reject(err)
      },
    })
  })
}
