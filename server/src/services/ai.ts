import Anthropic from '@anthropic-ai/sdk'
import { ChatHistoryModel } from '../models/chatHistory.js'

const client = new Anthropic({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://api-inference.modelscope.cn'
})

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// 上下文拼接，限制最大字符数
function buildContext(messages: Message[], maxChars: number = 2000) {
  let context = ''
  let totalChars = 0
  
  // 从最新的消息开始，往前拼接
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    const msgStr = `${msg.role === 'user' ? '用户' : '助手'}: ${msg.content}\n`
    
    if (totalChars + msgStr.length <= maxChars) {
      context = msgStr + context
      totalChars += msgStr.length
    } else {
      break
    }
  }
  
  return context
}

export async function chatWithAI(message: string, sessionId: string, userId: number | null = null) {
  try {
    // 获取历史对话
    const history = await ChatHistoryModel.getBySessionId(sessionId)
    const messages: Message[] = history.map(h => ({
      role: h.role,
      content: h.content
    }))
    
    // 构建上下文
    const context = buildContext(messages)
    const prompt = `${context}用户: ${message}\n助手:`
    
    // 保存用户消息
    await ChatHistoryModel.create(sessionId, userId, 'user', message)
    
    const response = await client.messages.create({
      model: 'Qwen/Qwen3.5-35B-A3B',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
    
    const assistantContent = (response.content[0] as any)?.text || ''
    
    // 保存助手消息
    await ChatHistoryModel.create(sessionId, userId, 'assistant', assistantContent)
    
    return assistantContent
  } catch (error: any) {
    throw new Error(`AI调用失败: ${error.message}`)
  }
}

export async function chatWithAIStream(message: string, sessionId: string, userId: number | null = null) {
  try {
    // 获取历史对话
    const history = await ChatHistoryModel.getBySessionId(sessionId)
    const messages: Message[] = history.map(h => ({
      role: h.role,
      content: h.content
    }))
    
    // 构建上下文
    const context = buildContext(messages)
    const prompt = `${context}用户: ${message}\n助手:`
    
    // 保存用户消息
    await ChatHistoryModel.create(sessionId, userId, 'user', message)
    
    const stream = await client.messages.stream({
      model: 'Qwen/Qwen3.5-35B-A3B',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
    
    return {
      stream,
      sessionId
    }
  } catch (error: any) {
    throw new Error(`AI流式调用失败: ${error.message}`)
  }
}
