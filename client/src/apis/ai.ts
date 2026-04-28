import request from '@/utils/http'

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
