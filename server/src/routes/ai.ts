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
            res.write(`data: ${JSON.stringify({ content })}\n\n`)
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

// GET /api/ai/history - 获取对话历史
router.get('/history', async (req, res) => {
  try {
    const { sessionId } = req.query

    if (!sessionId) {
      return ApiResponse.badRequest(res, '请提供会话ID')
    }

    const history = await ChatHistoryModel.getBySessionId(sessionId as string)
    const messages = history.map(item => ({
      role: item.role,
      content: item.content
    }))

    ApiResponse.success(res, { messages }, '获取对话历史成功')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
})

export default router
