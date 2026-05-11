<template>
  <div class="room-chat-wrapper">
    <div class="room-header">
      <el-button text @click="goBack" :icon="ArrowLeft" class="back-btn">返回</el-button>
      <div class="room-info">
        <h2>{{ roomStore.currentRoom?.name }}</h2>
        <div class="room-agents-row">
          <el-tooltip v-for="a in roomStore.currentAgents" :key="a.agent_id" :content="a.name" placement="bottom">
            <el-avatar :size="28" :src="a.avatar" class="agent-avatar-sm">{{ a.name[0] }}</el-avatar>
          </el-tooltip>
          <el-button size="small" text :icon="Plus" @click="showAddAgent = true" title="添加角色" />
        </div>
      </div>
      <div class="room-meta">
        <span class="member-count">{{ roomStore.currentMembers.length }} 人</span>
      </div>
    </div>

    <div class="room-messages" ref="msgContainer">
      <div v-if="loadingHistory" class="loading-hint">加载历史...</div>
      <div v-for="(msg, index) in messages" :key="msg._key || index" class="room-msg" :class="msgClass(msg)">
        <template v-if="msg.role === 'system'">
          <span class="system-msg">{{ msg.content }}</span>
        </template>
        <template v-else>
          <el-avatar :size="32" :src="isMyMessage(msg) ? undefined : msg.avatar" class="msg-avatar">
            {{ isMyMessage(msg) ? myUsername[0] : (msg.username?.[0] || '?') }}
          </el-avatar>
          <div class="msg-body">
            <div class="msg-sender">
              <span class="sender-name">{{ isMyMessage(msg) ? '我' : msg.username }}</span>
              <span class="msg-time">{{ msg.createdAt ? formatTime(msg.createdAt) : '' }}</span>
            </div>
            <div class="msg-content" v-html="renderContent(msg)" />
            <div v-if="msg.files?.length" class="msg-files">
              <div v-for="f in msg.files" :key="f.name" class="file-tag">
                <el-icon><Document /></el-icon> {{ f.name }}
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-if="isGenerating" class="generating-hint">
        <span v-for="aid in generatingIds" :key="aid" class="gen-badge">
          {{ agentStore.getAgentName(aid) || '...' }} 正在输入...
        </span>
      </div>
    </div>

    <div class="room-input-bar">
      <el-input v-model="inputText" type="textarea" :rows="1" :autosize="{ minRows: 1, maxRows: 4 }"
        placeholder="输入消息..." @keydown.enter.exact.prevent="send" />
      <el-button type="primary" :icon="Promotion" @click="send" :disabled="!inputText.trim()" />
    </div>

    <AddAgentDialog v-model="showAddAgent" :agents="agentStore.agents"
      :existingAgentIds="roomStore.currentAgents.map(a => a.agent_id)" :roomId="roomId" @added="onAgentAdded" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Plus, Promotion, Document } from '@element-plus/icons-vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { getRoomDetail, getRoomHistory, joinRoom } from '@/apis/room'
import { useUserStore } from '@/stores/userStore'
import { useAgentStore } from '@/stores/agentStore'
import { useRoomStore } from '@/stores/roomStore'
import { useSocketStore } from '@/stores/socketStore'
import AddAgentDialog from './components/AddAgentDialog.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const agentStore = useAgentStore()
const roomStore = useRoomStore()
const socketStore = useSocketStore()

const roomId = Number(route.params.id)
const userInfo = userStore.getUserInfo()
const currentUserId = userInfo?.id || 0
const myUsername = userInfo?.username || '我'

// 本地 messages（不从 store 读，避免 Pinia 响应式问题）
const messages = ref<any[]>([])

const inputText = ref('')
const loadingHistory = ref(false)
const isGenerating = ref(false)
const generatingIds = ref<number[]>([])
const showAddAgent = ref(false)
const msgContainer = ref<HTMLElement>()

const agentBuffers = ref<Map<number, { full: string }>>(new Map())

const isMyMessage = (msg: any) => msg.role === 'user' && msg.userId === currentUserId

const msgClass = (msg: any) => ({
  'msg-mine': isMyMessage(msg),
  'msg-other': msg.role === 'user' && !isMyMessage(msg),
  'msg-agent': msg.role === 'assistant',
  'msg-system': msg.role === 'system',
})

const renderContent = (msg: any) => DOMPurify.sanitize(marked.parse(msg.content) as string)

const goBack = () => router.push('/rooms')

const formatTime = (ts: string) => {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const scrollBottom = () => nextTick(() => {
  const el = msgContainer.value
  if (el) el.scrollTop = el.scrollHeight
})

const finishAgentMsg = (agentId: number) => {
  const idx = [...messages.value].reverse().findIndex(m => m.agentId === agentId && m.isStreaming)
  if (idx >= 0) {
    const realIdx = messages.value.length - 1 - idx
    messages.value[realIdx] = { ...messages.value[realIdx], isStreaming: false }
  }
}

const loadRoom = async () => {
  try {
    const res = await getRoomDetail(roomId)
    const data = (res.data as any).result || res.data
    roomStore.setCurrentRoom(data.room, data.agents || [], data.members || [])
  } catch {
    ElMessage.error('加载房间失败')
    router.push('/rooms')
  }
}

const loadHistory = async () => {
  loadingHistory.value = true
  try {
    const res = await getRoomHistory(roomId)
    const rows = (res.data as any).result || res.data || []
    messages.value = rows.map((r: any) => ({
      _key: `hist-${r.id}`,
      role: r.role,
      content: r.content,
      username: r.role === 'user' ? (r.user_username || `用户${r.user_id}`) : (r.agent_name || ''),
      avatar: r.role === 'assistant' ? r.agent_avatar : undefined,
      agentId: r.agent_id,
      userId: r.user_id,
      files: r.files ? (typeof r.files === 'string' ? JSON.parse(r.files) : r.files) : [],
      createdAt: r.created_at,
    }))
    scrollBottom()
  } catch {} finally { loadingHistory.value = false }
}

const send = () => {
  const text = inputText.value.trim()
  if (!text) return
  const s = socketStore.get()
  if (!s?.connected) { ElMessage.error('连接已断开，请刷新页面'); return }
  s.emit('room:send', { roomId, message: text, files: [] })
  inputText.value = ''
}

const onAgentAdded = async () => {
  await loadRoom()
  await loadHistory()
}

const setupSocket = () => {
  const token = userStore.getToken()
  if (!token) return
  const s = socketStore.connect(token)

  s.emit('room:join', { roomId })

  s.on('room:message', (data: any) => {
    if (data.roomId !== roomId) return
    messages.value.push({
      _key: `msg-${data.id || Date.now()}-${Math.random()}`,
      role: 'user', content: data.content, username: data.username,
      userId: data.userId, files: data.files || [],
      createdAt: data.createdAt || new Date().toISOString(),
    })
    scrollBottom()
  })

  s.on('room:agents-typing', (data: any) => {
    if (data.roomId !== roomId) return
    isGenerating.value = true
    generatingIds.value = data.agentIds
  })

  s.on('room:agent-chunk', (data: any) => {
    if (data.roomId !== roomId) return
    const { agentId, content, agentName, agentAvatar } = data

    let buf = agentBuffers.value.get(agentId)
    if (!buf) {
      // 创建新消息
      const newMsg = {
        _key: `agent-${agentId}-${Date.now()}`,
        role: 'assistant' as const, content: content, username: agentName,
        avatar: agentAvatar, agentId,
        createdAt: new Date().toISOString(), isStreaming: true,
      }
      messages.value = [...messages.value, newMsg]
      buf = { full: content }
      agentBuffers.value.set(agentId, buf)
    } else {
      buf.full += content
      // force reactivity with array replace
      const idx = messages.value.findIndex(m => m.agentId === agentId && m.isStreaming)
      if (idx >= 0) {
        messages.value[idx] = { ...messages.value[idx], content: buf.full }
      }
      scrollBottom()
    }
  })

  s.on('room:agent-done', (data: any) => {
    if (data.roomId !== roomId) return
    const msgs = [...messages.value]
    let idx = -1
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].agentId === data.agentId && msgs[i].isStreaming) { idx = i; break }
    }
    if (idx >= 0) finishAgentMsg(data.agentId)
    generatingIds.value = generatingIds.value.filter(id => id !== data.agentId)
  })

  s.on('room:agent-error', (data: any) => {
    if (data.roomId !== roomId) return
    generatingIds.value = generatingIds.value.filter(id => id !== data.agentId)
    messages.value.push({
      _key: `err-${Date.now()}`, role: 'system',
      content: `${data.agentName || ''} 暂时无法回复`,
      createdAt: new Date().toISOString(),
    })
  })

  s.on('room:all-done', (data: any) => {
    if (data.roomId !== roomId) return
    isGenerating.value = false
    generatingIds.value = []
  })

  s.on('room:user-joined', (data: any) => {
    if (data.roomId !== roomId) return
    messages.value.push({
      _key: `join-${Date.now()}`, role: 'system',
      content: `${data.username} 加入了房间`,
      createdAt: new Date().toISOString(),
    })
    scrollBottom()
  })

  s.on('room:error', (data: any) => {
    ElMessage.error(data.message || '错误')
  })
}

onMounted(async () => {
  await agentStore.load()
  await loadRoom()
  await loadHistory()
  setupSocket()
  try { await joinRoom(roomId) } catch {}
})

onBeforeUnmount(() => {
  const s = socketStore.get()
  if (s) {
    s.emit('room:leave', { roomId })
    agentBuffers.value.clear()
  }
  roomStore.resetCurrentRoom()
})
</script>

<style scoped>
.room-chat-wrapper { display: flex; flex-direction: column; height: 100%; max-width: 800px; margin: 0 auto; }
.room-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: var(--border-thin) var(--color-border); background: var(--color-bg-card); }
.back-btn { flex-shrink: 0; }
.room-info { flex: 1; }
.room-info h2 { margin: 0; font-size: 16px; }
.room-agents-row { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
.agent-avatar-sm { border: 1px solid var(--color-border); flex-shrink: 0; }
.room-meta { flex-shrink: 0; }
.member-count { font-size: 13px; color: var(--color-text-tertiary); }
.room-messages { flex: 1; overflow-y: auto; padding: 16px; min-height: 0; }
.room-msg { display: flex; gap: 10px; margin-bottom: 16px; }
.msg-system { justify-content: center; }
.system-msg { font-size: 12px; color: var(--color-text-tertiary); background: var(--color-bg-secondary); padding: 4px 12px; border-radius: 12px; }
.msg-mine { flex-direction: row-reverse; }
.msg-mine .msg-body { align-items: flex-end; text-align: right; }
.msg-mine .msg-content { background: var(--color-primary); color: #fff; border-radius: 16px 4px 16px 16px; }
.msg-other .msg-body { align-items: flex-start; }
.msg-other .msg-content { background: var(--color-bg-secondary); color: var(--color-text-primary); border-radius: 4px 16px 16px 16px; }
.msg-agent .msg-content { background: var(--color-bg-secondary); color: var(--color-text-primary); border-radius: 4px 16px 16px 16px; }
.msg-avatar { flex-shrink: 0; }
.msg-body { display: flex; flex-direction: column; gap: 2px; max-width: 70%; }
.msg-sender { display: flex; gap: 8px; align-items: baseline; }
.sender-name { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); }
.msg-time { font-size: 11px; color: var(--color-text-tertiary); }
.msg-content { padding: 10px 14px; font-size: 14px; line-height: 1.6; word-break: break-word; }
.msg-content :deep(p) { margin: 0; }
.msg-content :deep(p + p) { margin-top: 6px; }
.msg-files { margin-top: 4px; }
.file-tag { font-size: 12px; color: var(--color-text-secondary); display: flex; align-items: center; gap: 4px; }
.generating-hint { display: flex; gap: 12px; padding: 8px 0; flex-wrap: wrap; }
.gen-badge { font-size: 12px; color: var(--color-primary); animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.loading-hint { text-align: center; font-size: 13px; color: var(--color-text-tertiary); padding: 12px; }
.room-input-bar { display: flex; gap: 10px; padding: 12px 16px; border-top: var(--border-thin) var(--color-border); background: var(--color-bg-card); }
.room-input-bar :deep(.el-textarea__inner) { resize: none; }
</style>
