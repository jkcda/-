// WebSocket 客户端 — 小程序专用（原生 WebSocket，不依赖 socket.io）

import { WS_URL } from '../config'

type MessageHandler = (data: any) => void

class MiniWsClient {
  private ws: UniApp.SocketTask | null = null
  private handlers: Map<string, Set<MessageHandler>> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _connected = false

  get connected() { return this._connected }

  connect(token: string, serverUrl?: string) {
    if (this.ws && this._connected) return

    const baseUrl = serverUrl || WS_URL
    const url = `${baseUrl}?token=${encodeURIComponent(token)}`

    this.ws = uni.connectSocket({ url, complete: () => {} })

    this.ws.onOpen(() => {
      this._connected = true
      this.clearReconnect()
      this.emit('__connected__')
    })

    this.ws.onMessage((res) => {
      try {
        const packet = JSON.parse(res.data as string)
        const handlers = this.handlers.get(packet.event)
        if (handlers) {
          handlers.forEach((fn) => fn(packet.data))
        }
      } catch { /* 忽略解析失败 */ }
    })

    this.ws.onClose(() => {
      this._connected = false
      this.scheduleReconnect(token, serverUrl)
    })

    this.ws.onError(() => {
      this._connected = false
    })
  }

  private scheduleReconnect(token: string, serverUrl?: string) {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect(token, serverUrl)
    }, 3000)
  }

  private clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  // 内部事件分发
  private emit(event: string, data: any = {}) {
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.forEach((fn) => fn(data))
    }
  }

  // 发送消息到服务器
  send(event: string, data: any = {}) {
    if (this.ws) {
      this.ws.send({ data: JSON.stringify({ event, data }) })
    }
  }

  // 监听事件
  on(event: string, handler: MessageHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
  }

  // 取消监听
  off(event: string, handler: MessageHandler) {
    this.handlers.get(event)?.delete(handler)
  }

  // 关闭连接
  close() {
    this.clearReconnect()
    this.ws?.close()
    this.ws = null
    this._connected = false
    this.handlers.clear()
  }
}

// 全局单例
export const wsClient = new MiniWsClient()
