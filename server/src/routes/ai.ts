import express from 'express'
import { chatWithAIStream } from '../services/ai.js'
import { ChatHistoryModel } from '../models/chatHistory.js'
import { ApiResponse } from '../utils/response.js'

const router = express.Router()

// POST /api/ai/chat - AI对话（流式输出）
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, userId } = req.body

    if (!message) {
      return ApiResponse.badRequest(res, '请输入消息内容')
    }

    if (!sessionId) {
      return ApiResponse.badRequest(res, '请提供会话ID')
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')

    try {
      const { stream, sessionId: returnedSessionId } = await chatWithAIStream(message, sessionId, userId)

      let assistantContent = ''

      // 流式输出
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const content = (event.delta as any)?.text
          if (content) {
            assistantContent += content
            res.write(`data: ${JSON.stringify({ content })}
\n`)
          }
        }
      }

      // 保存助手消息
      if (assistantContent) {
        await ChatHistoryModel.create(returnedSessionId, userId || null, 'assistant', assistantContent)
      }

      res.write('data: [DONE]\n\n')
      res.end()
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
      res.end()
    }
  } catch (error: any) {
    ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
})

// GET /api/ai/sessions - 获取用户的会话列表
router.get('/sessions', async (req, res) => {
  try {
    const { userId } = req.query
    const uid = userId ? Number(userId) : null
    const sessions = await ChatHistoryModel.getSessionsByUserId(uid)
    ApiResponse.success(res, { sessions }, '获取会话列表成功')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
})

// GET /api/ai/history - 获取对话历史
router.get('/history', async (req, res) => {
  try {
    const { sessionId, userId } = req.query

    if (!sessionId) {
      return ApiResponse.badRequest(res, '请提供会话ID')
    }

    // 使用新的查询方法，同时匹配 session_id 和 user_id
    const history = await ChatHistoryModel.getBySessionIdAndUserId(
      sessionId as string,
      userId ? Number(userId) : null
    )
    
    const messages = history.map(item => ({
      role: item.role,
      content: item.content
    }))

    ApiResponse.success(res, { messages }, '获取对话历史成功')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
})

// DELETE /api/ai/history - 删除对话历史
router.delete('/history', async (req, res) => {
  try {
    const { sessionId, userId } = req.query

    if (!sessionId) {
      return ApiResponse.badRequest(res, '请提供会话ID')
    }

    // 删除数据库中的对话历史
    await ChatHistoryModel.deleteBySessionId(sessionId as string)

    ApiResponse.success(res, null, '对话历史已清空')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
})

export default router