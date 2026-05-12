import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io, type Socket } from 'socket.io-client'

export const useSocketStore = defineStore('socket', () => {
  const socket = ref<Socket | null>(null)
  const connected = ref(false)

  const isConnected = computed(() => connected.value)

  function connect(token: string) {
    if (socket.value?.connected) return socket.value
    if (socket.value) socket.value.disconnect()

    const serverUrl = import.meta.env.VITE_API_URL || window.location.origin
    console.log('[SocketStore] 连接地址:', serverUrl, 'token:', token ? token.substring(0, 20) + '...' : '无')
    const s = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })

    s.on('connect', () => {
      console.log('[SocketStore] 连接成功 transport:', s.io.engine.transport.name)
      connected.value = true
    })
    s.on('disconnect', (reason) => {
      console.log('[SocketStore] 断开连接 reason:', reason)
      connected.value = false
    })
    s.on('connect_error', (err) => {
      console.error('[SocketStore] 连接错误:', err.message)
    })
    s.io.on('reconnect_attempt', (attempt) => {
      console.log('[SocketStore] 重连尝试 #' + attempt)
    })

    socket.value = s
    connected.value = s.connected
    return s
  }

  function disconnect() {
    socket.value?.disconnect()
    socket.value = null
    connected.value = false
  }

  function get() {
    return socket.value
  }

  return { socket, connected, isConnected, connect, disconnect, get }
})
