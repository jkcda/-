import express from 'express'
import { chatWithAIStream } from '../services/ai.js'
import { ChatHistoryModel } from '../models/chatHistory.js'
import { commitMemoryPair, forgetSession, forgetAllMemories } from '../services/memoryService.js'
import { clearSessionCache } from '../services/ragChain.js'
import { ApiResponse } from '../utils/response.js'
import { authMiddleware } from '../middleware/auth.js'
import { adminMiddleware } from '../middleware/admin.js'

const router = express.Router()

// POST /api/ai/chat - AI对话（流式输出，支持多模态文件 + RAG 知识库）
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, userId, files, kbId, webSearch, nexusMode } = req.body

    if (!message && (!files || files.length === 0)) {
      return ApiResponse.badRequest(res, '请输入消息内容或上传文件')
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
      const { stream, sessionId: returnedSessionId, retrievedChunks, webSources } = await chatWithAIStream(
        message || '',
        sessionId,
        userId,
        files && files.length > 0 ? files : undefined,
        kbId || undefined,
        webSearch === true,
        nexusMode !== false  // default true (Nexus mode)
      )

      // 发送联网搜索结果
      if (webSources && webSources.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'webSearch', sources: webSources })}

`)
      }

      // 发送检索状态提示
      if (retrievedChunks && retrievedChunks.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'retrieval', chunks: retrievedChunks })}

`)
      }

      let assistantContent = ''

      // 流式输出
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const content = (event.delta as any)?.text
          if (content) {
            assistantContent += content
            res.write(`data: ${JSON.stringify({ content })}

`)
          }
        }
      }

      // 保存助手消息（含检索来源）
      if (assistantContent) {
        const retrievedJson = retrievedChunks && retrievedChunks.length > 0
          ? JSON.stringify(retrievedChunks)
          : undefined
        await ChatHistoryModel.create(
          returnedSessionId,
          userId || null,
          'assistant',
          assistantContent,
          undefined,
          kbId || undefined,
          retrievedJson
        )

        // 与暂存的用户消息配对写入记忆库
        if (userId) {
          commitMemoryPair(userId, returnedSessionId, assistantContent).catch(() => {})
        }
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

    const history = await ChatHistoryModel.getBySessionIdAndUserId(
      sessionId as string,
      userId ? Number(userId) : null
    )

    const messages = history.map(item => ({
      role: item.role,
      content: item.content,
      files: item.files ? (typeof item.files === 'string' ? JSON.parse(item.files) : item.files) : undefined,
      retrievedChunks: (item as any).retrieved_chunks
        ? (typeof (item as any).retrieved_chunks === 'string' ? JSON.parse((item as any).retrieved_chunks) : (item as any).retrieved_chunks)
        : undefined
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

    await ChatHistoryModel.deleteBySessionId(sessionId as string)
    clearSessionCache(sessionId as string)

    // 同步清除 RAG 记忆
    let memoryCleared = false
    if (userId) {
      try {
        await forgetSession(Number(userId), sessionId as string)
        memoryCleared = true
      } catch {}
    }

    ApiResponse.success(res, null, memoryCleared ? '对话历史已清空（含 RAG 记忆）' : '对话历史已清空')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
})

// DELETE /api/ai/memory - 清空用户全部 RAG 记忆（管理员专用）
router.delete('/memory', authMiddleware as any, adminMiddleware as any, async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return ApiResponse.badRequest(res, '请提供用户ID')
    await forgetAllMemories(Number(userId))
    ApiResponse.success(res, null, `用户 ${userId} 的 RAG 记忆已全部清空`)
  } catch (error: any) {
    ApiResponse.internalServerError(res, '清空记忆失败', error.message)
  }
})

export default router
