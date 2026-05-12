// 原生 WebSocket 服务 — 为 uniapp 小程序提供流式对话和房间功能
// 小程序不支持 Socket.IO（engine.io 协议），只能用原生 WebSocket
import { WebSocketServer, WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import { chatWithAIStream } from './ai.js'
import { ChatHistoryModel } from '../models/chatHistory.js'
import { UserModel } from '../models/user.js'
import { RoomModel } from '../models/room.js'
import { commitMemoryPair } from './memoryService.js'
import { getIO } from './socket.js'

interface WsClient {
  ws: WebSocket
  userId: number
  username: string
  role: string
  email: string
}

const clients = new Map<WebSocket, WsClient>()

function sendJson(ws: WebSocket, event: string, data: any) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ event, data }))
  }
}

export function initWsBridge(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // 从 URL query 中提取 token 进行 JWT 鉴权
    const url = new URL(req.url || '', `http://${req.headers.host}`)
    const token = url.searchParams.get('token')

    if (!token) {
      sendJson(ws, 'error', { message: '未提供认证令牌' })
      ws.close(1008, '未提供认证令牌')
      return
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, config.jwt.secret)
    } catch {
      sendJson(ws, 'error', { message: '无效的认证令牌' })
      ws.close(1008, '无效的认证令牌')
      return
    }

    const client: WsClient = {
      ws,
      userId: decoded.id,
      username: decoded.username,
      role: decoded.role || 'user',
      email: decoded.email,
    }
    clients.set(ws, client)

    sendJson(ws, 'connected', { userId: client.userId, username: client.username })
    console.log(`[WS Bridge] 用户 ${client.username} (id=${client.userId}) 已连接`)

    ws.on('message', async (raw) => {
      let parsed: { event: string; data: any }
      try {
        parsed = JSON.parse(raw.toString())
      } catch {
        return
      }

      const { event, data } = parsed

      switch (event) {
        case 'ai:chat':
          await handleAiChat(ws, client, data)
          break
        case 'room:join':
          await handleRoomJoin(ws, client, data)
          break
        case 'room:leave':
          handleRoomLeave(ws, client, data)
          break
        case 'room:send':
          await handleRoomSend(ws, client, data)
          break
        case 'ai:stop':
          // 停止生成 — 客户端断开后自然会停止，这里可以做标记
          break
        default:
          sendJson(ws, 'error', { message: `未知事件: ${event}` })
      }
    })

    ws.on('close', () => {
      clients.delete(ws)
      console.log(`[WS Bridge] 用户 ${client.username} 已断开`)
    })

    ws.on('error', () => {
      clients.delete(ws)
    })
  })

  console.log('[WS Bridge] 原生 WebSocket 服务已就绪 (path=/ws)')
}

// ── AI 流式对话 ──

async function handleAiChat(ws: WebSocket, client: WsClient, data: any) {
  const { message, sessionId, userId, files, kbId, model, agentId } = data || {}

  if (!message && (!files || files.length === 0)) {
    sendJson(ws, 'error', { message: '请输入消息内容或上传文件' })
    return
  }
  if (!sessionId) {
    sendJson(ws, 'error', { message: '请提供会话ID' })
    return
  }

  try {
    // 查询用户角色
    let userRole: string | undefined
    if (userId) {
      try {
        const u = await UserModel.findById(Number(userId))
        userRole = u?.role
      } catch {}
    }

    const { stream, sessionId: returnedSessionId, agentMode } = await chatWithAIStream(
      message || '',
      sessionId,
      userId || client.userId,
      files?.length > 0 ? files : undefined,
      kbId || undefined,
      true,
      undefined,
      model || undefined,
      userRole,
      agentId || undefined
    )

    let assistantContent = ''

    if (agentMode) {
      for await (const event of stream) {
        if (ws.readyState !== ws.OPEN) break
        switch (event.type) {
          case 'content':
            assistantContent += event.content || ''
            sendJson(ws, 'ai:chunk', { content: event.content })
            break
          case 'tool_call':
            sendJson(ws, 'ai:tool_call', { tool: event.tool, args: event.args })
            break
          case 'tool_result':
            sendJson(ws, 'ai:tool_result', { tool: event.tool, imageUrl: event.imageUrl || null })
            break
          case 'error':
            sendJson(ws, 'ai:error', { error: event.error })
            break
        }
      }
    } else {
      for await (const event of stream) {
        if (ws.readyState !== ws.OPEN) break
        if (event.type === 'content_block_delta') {
          const content = (event.delta as any)?.text
          if (content) {
            assistantContent += content
            sendJson(ws, 'ai:chunk', { content })
          }
        }
      }
    }

    // 保存助手消息到数据库
    if (assistantContent && ws.readyState === ws.OPEN) {
      try {
        await ChatHistoryModel.create(
          returnedSessionId,
          userId || client.userId || null,
          'assistant',
          assistantContent,
          undefined,
          kbId || undefined,
          undefined,
          agentId || undefined
        )
        if (client.userId) {
          commitMemoryPair(client.userId, returnedSessionId, assistantContent).catch(() => {})
        }
      } catch {}
    }

    sendJson(ws, 'ai:done', { sessionId: returnedSessionId })
  } catch (error: any) {
    const errMsg = error.message?.includes('DataInspectionFailed') ? '内容审核拦截，请重新措辞' : error.message
    sendJson(ws, 'ai:error', { error: errMsg || '对话失败' })
  }
}

// ── 房间功能 ──
// 通过原生 WS 接收房间事件，内部复用 Socket.IO 的广播机制

function handleRoomJoin(ws: WebSocket, client: WsClient, data: any) {
  const { roomId } = data || {}
  if (!roomId) {
    sendJson(ws, 'error', { message: '请提供房间ID' })
    return
  }
  // 在 WS 层面记录房间状态
  ;(ws as any)._rooms = (ws as any)._rooms || new Set()
  ;(ws as any)._rooms.add(roomId)

  sendJson(ws, 'room:joined', { roomId })
}

function handleRoomLeave(ws: WebSocket, client: WsClient, data: any) {
  const { roomId } = data || {}
  if (roomId && (ws as any)._rooms) {
    (ws as any)._rooms.delete(roomId)
  }
}

async function handleRoomSend(ws: WebSocket, client: WsClient, data: any) {
  const { roomId, message, files } = data || {}
  if (!roomId || !message?.trim()) {
    sendJson(ws, 'error', { message: '请提供房间ID和消息内容' })
    return
  }

  try {
    const member = await RoomModel.isMember(roomId, client.userId)
    if (!member) {
      await RoomModel.addMember(roomId, client.userId)
    }

    // 通过 Socket.IO 房间机制广播（Web 端监听器已经在 rooom:send 处理生成逻辑）
    const io = getIO()
    const fakeSocket = {
      emit: (event: string, msg: any) => {
        // 把 Socket.IO 发出的 room:* 事件转发给这个 WS 客户端
        sendJson(ws, event, msg)
      },
      join: () => {},
      leave: () => {},
      data: { user: { id: client.userId, username: client.username, role: client.role } },
    } as any

    // 直接把消息内容通过原生 WS 发给当前客户端作为 user message 回显
    sendJson(ws, 'room:message', {
      id: Date.now(), roomId, userId: client.userId,
      username: client.username, content: message,
      files: files || [], role: 'user',
      createdAt: new Date().toISOString(),
    })

    // 通过 Socket.IO 的 handleRoomMessage 触发角色回复
    const { handleRoomMessage } = await import('./roomChat.js')
    await handleRoomMessage(
      io,
      fakeSocket,
      roomId,
      client.userId,
      client.username,
      message,
      files,
      client.role
    )
  } catch (err: any) {
    sendJson(ws, 'error', { message: err.message || '发送失败' })
  }
}
