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

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const s = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })

    s.on('connect', () => { connected.value = true })
    s.on('disconnect', () => { connected.value = false })

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
