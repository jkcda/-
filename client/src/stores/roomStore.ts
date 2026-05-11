import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getRooms, discoverRooms } from '@/apis/room'

interface RoomItem {
  id: number
  owner_id: number
  name: string
  topic: string | null
  member_count?: number
  agent_count?: number
  is_joined?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface RoomAgent {
  agent_id: number
  name: string
  avatar: string | null
}

interface RoomMessage {
  _key: string
  role: 'user' | 'assistant' | 'system'
  content: string
  username?: string
  avatar?: string
  agentId?: number
  userId?: number
  files?: Array<{ name: string; url: string; type: string; size: number }>
  createdAt: string
  isStreaming?: boolean
}

export const useRoomStore = defineStore('room', () => {
  const myRooms = ref<RoomItem[]>([])
  const discoverList = ref<RoomItem[]>([])

  // 当前房间状态
  const currentRoomId = ref<number | null>(null)
  const currentRoom = ref<any>(null)
  const currentAgents = ref<RoomAgent[]>([])
  const currentMembers = ref<number[]>([])
  const messages = ref<RoomMessage[]>([])

  const roomAgentMap = computed(() =>
    new Map(currentAgents.value.map(a => [a.agent_id, a]))
  )

  function setCurrentRoom(room: any, agents: RoomAgent[], members: number[]) {
    currentRoomId.value = room?.id
    currentRoom.value = room
    currentAgents.value = agents
    currentMembers.value = members
  }

  function addMessage(msg: RoomMessage) {
    messages.value.push(msg)
  }

  function updateMessage(index: number, content: string) {
    if (messages.value[index]) {
      messages.value[index].content = content
    }
  }

  function finalizeMessage(index: number) {
    if (messages.value[index]) {
      messages.value[index].isStreaming = false
    }
  }

  function clearMessages() {
    messages.value = []
  }

  function resetCurrentRoom() {
    currentRoomId.value = null
    currentRoom.value = null
    currentAgents.value = []
    currentMembers.value = []
    messages.value = []
  }

  async function loadMyRooms() {
    try {
      const res = await getRooms()
      myRooms.value = (res.data as any).result || res.data || []
    } catch {}
  }

  async function loadDiscover() {
    try {
      const res = await discoverRooms()
      discoverList.value = (res.data as any).result || res.data || []
    } catch {}
  }

  return {
    myRooms, discoverList,
    currentRoomId, currentRoom, currentAgents, currentMembers, messages, roomAgentMap,
    setCurrentRoom, addMessage, updateMessage, finalizeMessage, clearMessages, resetCurrentRoom,
    loadMyRooms, loadDiscover,
  }
})
