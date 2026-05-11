import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import { RoomModel } from '../models/room.js'
import { handleRoomMessage } from './roomChat.js'

let io: SocketIOServer

interface SocketUser {
  id: number
  username: string
  role: 'admin' | 'user'
}

export function initSocketIO(httpServer: HttpServer, allowedOrigins: string[]): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
        cb(null, false)
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // JWT 鉴权中间件
  io.use((socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token
    if (!token) {
      return next(new Error('未提供认证令牌'))
    }
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any
      socket.data.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role || 'user',
      }
      next()
    } catch (err: any) {
      next(new Error('无效的认证令牌'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser

    socket.on('room:join', async ({ roomId }: { roomId: number }) => {
      try {
        const member = await RoomModel.isMember(roomId, user.id)
        if (!member) {
          // 自动加入
          await RoomModel.addMember(roomId, user.id)
        }
        socket.join(`room:${roomId}`)
        socket.to(`room:${roomId}`).emit('room:user-joined', {
          roomId,
          userId: user.id,
          username: user.username,
        })
      } catch (err: any) {
        socket.emit('room:error', { message: err.message || '加入房间失败' })
      }
    })

    socket.on('room:leave', ({ roomId }: { roomId: number }) => {
      socket.leave(`room:${roomId}`)
    })

    socket.on('room:send', async ({ roomId, message, files }: {
      roomId: number
      message: string
      files?: Array<{ name: string; url: string; type: string; size: number }>
    }) => {
      if (!message?.trim()) return

      try {
        const member = await RoomModel.isMember(roomId, user.id)
        if (!member) {
          socket.emit('room:error', { message: '你不在该房间中' })
          return
        }

        await handleRoomMessage(
          io, socket, roomId, user.id, user.username, message, files, user.role
        )
      } catch (err: any) {
        socket.emit('room:error', { message: err.message || '发送失败' })
      }
    })

    socket.on('disconnect', () => {
      // 房间自动 leave 由 Socket.IO 处理
    })
  })

  console.log('[Socket.IO] 已初始化')
  return io
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO 尚未初始化')
  return io
}
