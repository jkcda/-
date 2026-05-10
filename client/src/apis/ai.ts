import request from '@/utils/http'

interface UploadResult {
  name: string
  url: string
  type: string
  size: number
}

// 获取对话历史接口
export const getChatHistory = (sessionId: string, userId?: number | null) => {
  const params = new URLSearchParams({ sessionId })
  if (userId) {
    params.append('userId', userId.toString())
  }
  return request.get(`/ai/history?${params.toString()}`)
}

// AI 聊天接口（流式）
export const chatWithAI = (data: {
  message: string
  sessionId: string
  userId?: number | null
  files?: UploadResult[]
  kbId?: number
  nexusMode?: boolean
  model?: string
  agentId?: number | null
}) => {
  return request.post('/ai/chat', data)
}

// 获取用户的会话列表
export const getSessions = (userId?: number | null) => {
  const params = new URLSearchParams()
  if (userId) {
    params.append('userId', userId.toString())
  }
  return request.get(`/ai/sessions?${params.toString()}`)
}

// 删除对话历史接口
export const deleteChatHistory = (sessionId: string, userId?: number | null) => {
  const params = new URLSearchParams({ sessionId })
  if (userId) {
    params.append('userId', userId.toString())
  }
  return request.delete(`/ai/history?${params.toString()}`)
}

// 清空用户全部 RAG 记忆（管理员专用）
export const clearUserMemories = (userId: number) => {
  return request.delete(`/ai/memory?userId=${userId}`)
}

// 上传文件
export const uploadFile = async (file: File): Promise<UploadResult> => {
  const formData = new FormData()
  formData.append('file', file)
  const baseURL = (import.meta.env as any).VITE_BASE_URL || ''
  const response = await fetch(`${baseURL}/api/upload`, {
    method: 'POST',
    body: formData
  })
  const data = await response.json()
  if (!data.success) {
    throw new Error(data.message || '上传失败')
  }
  return data.result
}
