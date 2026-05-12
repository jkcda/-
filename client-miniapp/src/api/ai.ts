import { get, del } from './request'

// 获取会话列表
export const getSessions = (userId?: number) => {
  return get<{ sessions: SessionItem[] }>('/api/ai/sessions', userId ? { userId } : undefined)
}

// 获取对话历史
export const getChatHistory = (sessionId: string, userId?: number) => {
  return get<{ messages: Message[] }>('/api/ai/history', { sessionId, ...(userId ? { userId } : {}) })
}

// 删除对话历史
export const deleteChatHistory = (sessionId: string, userId?: number) => {
  return del('/api/ai/history', { sessionId, ...(userId ? { userId } : {}) })
}

// 获取模型列表
export const getModels = () => {
  return get<{ models: ModelItem[]; imageRatios: { label: string; value: string }[] }>('/api/ai/models')
}

export interface SessionItem {
  session_id: string
  created_at: string
  last_active_at: string
  message_count: number
  first_message?: string
  agent_id?: number | null
  agent_name?: string | null
  agent_avatar?: string | null
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  files?: { name: string; url: string; type: string }[]
  retrievedChunks?: { source: string; score: number }[]
}

export interface ModelItem {
  id: string
  name: string
  type: string
  provider: string
  desc: string
}
