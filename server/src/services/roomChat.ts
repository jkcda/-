import type { Server as SocketIOServer, Socket } from 'socket.io'
import { RoomModel } from '../models/room.js'
import { ChatHistoryModel } from '../models/chatHistory.js'
import { agentStream, type AgentConfig } from './agent.js'
import { scheduleReplies, recordAgentReply } from './scheduler.js'
import { holdUserMessage, commitMemoryPair, recallMemory } from './memoryService.js'
import { v4 as uuidv4 } from 'uuid'

const userThrottle = new Map<number, number>() // userId -> last send time
const USER_COOLDOWN_MS = 1500

function canUserSend(userId: number): boolean {
  const last = userThrottle.get(userId)
  if (!last) return true
  return (Date.now() - last) >= USER_COOLDOWN_MS
}

function recordUserSend(userId: number): void {
  userThrottle.set(userId, Date.now())
}

// 定期清理
setInterval(() => {
  const now = Date.now()
  for (const [uid, ts] of userThrottle) {
    if (now - ts > 10000) userThrottle.delete(uid)
  }
}, 30_000)

interface RoomMessage {
  role: string
  content: string
  agentId?: number
  username?: string
}

export async function handleRoomMessage(
  io: SocketIOServer,
  socket: Socket,
  roomId: number,
  userId: number,
  username: string,
  message: string,
  files: Array<{ name: string; url: string; type: string; size: number }> | undefined,
  userRole: string
): Promise<void> {
  if (!canUserSend(userId)) {
    socket.emit('room:error', { message: '发送太快，请稍候' })
    return
  }
  recordUserSend(userId)

  const sessionId = uuidv4()

  // 1. 保存用户消息
  const filesJson = files?.length ? JSON.stringify(files) : undefined
  await ChatHistoryModel.create(sessionId, userId, 'user', message, filesJson, undefined, undefined, undefined, roomId)

  // 2. 暂存用户消息（房间记忆使用虚拟 ID，所有人共享）
  const roomVirtualUserId = -(roomId + 1000000)
  const roomMemorySession = `room_${roomId}`
  holdUserMessage(roomVirtualUserId, roomMemorySession, message)

  // 3. 广播用户消息给房间所有人
  io.to(`room:${roomId}`).emit('room:message', {
    id: Date.now(),
    roomId,
    userId,
    username,
    content: message,
    files: files || [],
    role: 'user',
    createdAt: new Date().toISOString(),
  })

  // 4. 获取房间角色和最近历史
  const agents = await RoomModel.getAgents(roomId)
  if (agents.length === 0) return

  const historyRows = await ChatHistoryModel.getByRoomId(roomId, 50)
  const recentMessages: RoomMessage[] = historyRows.map((r: any) => ({
    role: r.role,
    content: r.content,
    agentId: r.agent_id || undefined,
  }))

  // 5. 并行：预取记忆 + 调度角色
  const [memoryResult, scheduledIds] = await Promise.all([
    (async () => {
      try {
        const memText = await recallMemory(roomVirtualUserId, `[房间 ${roomId} 对话] ${message}`)
        if (memText && memText !== '未找到相关历史记忆') {
          return '\n\n[🧠房间记忆]\n' + memText
        }
      } catch {}
      return ''
    })(),
    scheduleReplies(roomId, agents, recentMessages, message, username),
  ])
  const roomMemoryContext = memoryResult

  if (scheduledIds.length === 0) return

  // 通知前端哪些角色将要回复
  io.to(`room:${roomId}`).emit('room:agents-typing', {
    roomId,
    agentIds: scheduledIds,
  })

  // 记录所有角色回复（用于记忆配对）
  const agentReplies: Array<{ agentName: string; content: string }> = []

  // 构建房间上下文提示
  const otherAgents = agents.map(a => a.name).join('、')
  const roomContextPrompt = `你正在一个群聊室里，房间里有其他AI角色：${otherAgents}。你不是唯一的AI，像真人一样自然地聊天。`

  // 7. 并行流式生成每个角色的回复
  const streams = scheduledIds.map(async (agentId) => {
    const agent = agents.find(a => a.agent_id === agentId)
    if (!agent) return

    recordAgentReply(roomId, agentId)

    try {
      const cfg: AgentConfig = {
        userId,
        customSystemPrompt: agent.system_prompt + '\n\n' + roomContextPrompt,
        userRole,
        permissions: { kbRetrieval: false, memory: false, imageGeneration: false },
      }

      const agentMessages = recentMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      const augmentedInput = roomMemoryContext
        ? message + '\n\n---\n' + roomMemoryContext
        : message

      const events = agentStream(cfg, agentMessages, augmentedInput)

      let fullContent = ''
      for await (const event of events) {
        if (event.type === 'content' && event.content) {
          fullContent += event.content
          io.to(`room:${roomId}`).emit('room:agent-chunk', {
            agentId,
            agentName: agent.name,
            agentAvatar: agent.avatar,
            content: event.content,
            roomId,
          })
        } else if (event.type === 'tool_call') {
          io.to(`room:${roomId}`).emit('room:agent-status', {
            agentId,
            agentName: agent.name,
            status: event.tool === 'search_web' ? '搜索中...' : '思考中...',
            roomId,
          })
        } else if (event.type === 'error') {
          io.to(`room:${roomId}`).emit('room:agent-error', {
            agentId,
            agentName: agent.name,
            error: event.error,
            roomId,
          })
          return
        }
      }

      // 保存角色回复
      if (fullContent.trim()) {
        await ChatHistoryModel.create(
          sessionId, userId, 'assistant', fullContent,
          undefined, undefined, undefined, agentId, roomId
        )
      }

      agentReplies.push({ agentName: agent.name, content: fullContent.trim() })

      io.to(`room:${roomId}`).emit('room:agent-done', {
        agentId,
        agentName: agent.name,
        agentAvatar: agent.avatar,
        fullContent,
        roomId,
      })
    } catch (err: any) {
      io.to(`room:${roomId}`).emit('room:agent-error', {
        agentId,
        agentName: agent.name,
        error: err.message || '生成失败',
        roomId,
      })
    }
  })

  await Promise.allSettled(streams)

  // 8. 写入房间长期记忆（所有角色回复合并为一条）
  if (agentReplies.length > 0) {
    try {
      const combined = agentReplies.map(r => `[${r.agentName}]: ${r.content}`).join('\n')
      await commitMemoryPair(roomVirtualUserId, roomMemorySession, combined)
    } catch { /* 静默 */ }
  }

  io.to(`room:${roomId}`).emit('room:all-done', { roomId })
}
