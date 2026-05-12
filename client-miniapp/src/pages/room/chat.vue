<template>
  <view class="room-chat-page">
    <view class="page-header">
      <text class="back-btn" @tap="goBack">←</text>
      <view class="header-center">
        <text class="room-name">{{ roomName }}</text>
        <text class="member-count">{{ memberCount }} 人</text>
      </view>
    </view>

    <scroll-view class="messages" scroll-y :scroll-into-view="scrollToId" :scroll-with-animation="true">
      <view v-for="(msg, idx) in chatMessages" :key="idx" :id="'rmsg-'+idx" :class="['rmsg', msgClass(msg)]">
        <!-- 系统消息 -->
        <text v-if="msg.role === 'system'" class="system-msg">{{ msg.content }}</text>

        <!-- 用户 / AI 消息 -->
        <template v-else>
          <view class="rmsg-avatar">
            <image v-if="msg.avatar" :src="msg.avatar" class="ravatar-img" mode="aspectFill" />
            <text v-else class="ravatar-text">{{ (msg.username || '?')[0] }}</text>
          </view>
          <view class="rmsg-body">
            <text class="rmsg-sender">{{ msg.role === 'user' && msg.userId === myUserId ? '我' : msg.username }}</text>
            <text class="rmsg-content">{{ msg.content }}</text>
          </view>
        </template>
      </view>

      <view v-if="isGenerating" class="gen-hint">
        <text v-for="aid in generatingIds" :key="aid" class="gen-item">{{ getAgentName(aid) }} 正在输入...</text>
      </view>

      <view id="rmsg-bottom" style="height:1rpx;"></view>
    </scroll-view>

    <view class="room-input">
      <input class="r-input" v-model="inputTxt" placeholder="输入消息..." @confirm="send" :maxlength="2000" />
      <text class="r-send" :class="{ disabled: !inputTxt.trim() || isGenerating }" @tap="send">发送</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/userStore'
import { wsClient } from '../../utils/ws'
import { get } from '../../api/request'

const userStore = useUserStore()
const roomId = ref(0)
const roomName = ref('')
const memberCount = ref(0)
const chatMessages = ref<any[]>([])
const inputTxt = ref('')
const scrollToId = ref('rmsg-bottom')
const isGenerating = ref(false)
const generatingIds = ref<number[]>([])
const agentNames = ref<Map<number, string>>(new Map())
const myUserId = userStore.getUserInfo()?.id || 0
const agentBuffers = ref<Map<number, string>>(new Map())

onLoad((options: any) => {
  const params = options || {}
  roomId.value = Number(params.id) || 0
  roomName.value = decodeURIComponent(params.name || '')
  if (!roomId.value) {
    uni.showToast({ title: '房间ID无效', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1000)
    return
  }
  loadRoom()
  loadHistory()
  setupWs()
})

const loadRoom = async () => {
  try {
    const res = await get<any>(`/api/rooms/${roomId.value}`)
    if (res.success) {
      const data = res.result || {}
      memberCount.value = (data.members || []).length
      ;(data.agents || []).forEach((a: any) => agentNames.value.set(a.agent_id, a.name))
    }
  } catch {}
}

const loadHistory = async () => {
  try {
    const res = await get<any>(`/api/rooms/${roomId.value}/history`)
    const rows = res.result || []
    chatMessages.value = rows.map((r: any) => ({
      _key: `hist-${r.id}`,
      role: r.role,
      content: r.content,
      username: r.role === 'user' ? (r.user_username || `用户${r.user_id}`) : r.agent_name,
      avatar: r.role === 'assistant' ? r.agent_avatar : undefined,
      userId: r.user_id,
      createdAt: r.created_at,
    }))
    scrollBottom()
  } catch {}
}

const setupWs = () => {
  const token = userStore.getToken()
  if (!wsClient.connected) wsClient.connect(token)

  wsClient.send('room:join', { roomId: roomId.value })

  wsClient.on('room:message', (data: any) => {
    if (data.roomId !== roomId.value) return
    chatMessages.value.push({
      _key: `msg-${Date.now()}-${Math.random()}`,
      role: 'user', content: data.content, username: data.username,
      userId: data.userId, createdAt: data.createdAt,
    })
    scrollBottom()
  })

  wsClient.on('room:agents-typing', (data: any) => {
    if (data.roomId !== roomId.value) return
    isGenerating.value = true
    generatingIds.value = data.agentIds
  })

  wsClient.on('room:agent-chunk', (data: any) => {
    if (data.roomId !== roomId.value) return
    let buf = agentBuffers.value.get(data.agentId)
    if (!buf) {
      chatMessages.value.push({
        _key: `agent-${data.agentId}-${Date.now()}`,
        role: 'assistant', content: data.content,
        username: data.agentName, avatar: data.agentAvatar,
        agentId: data.agentId, createdAt: new Date().toISOString(),
      })
      buf = data.content
      agentBuffers.value.set(data.agentId, buf)
    } else {
      buf += data.content
      agentBuffers.value.set(data.agentId, buf)
      let idx = -1
      for (let i = chatMessages.value.length - 1; i >= 0; i--) {
        if (chatMessages.value[i].agentId === data.agentId && chatMessages.value[i].role === 'assistant') { idx = i; break }
      }
      if (idx >= 0) {
        chatMessages.value[idx] = { ...chatMessages.value[idx], content: buf }
      }
    }
    scrollBottom()
  })

  wsClient.on('room:agent-done', (data: any) => {
    if (data.roomId !== roomId.value) return
    generatingIds.value = generatingIds.value.filter(id => id !== data.agentId)
    agentBuffers.value.set(data.agentId, data.fullContent || '')
  })

  wsClient.on('room:all-done', (data: any) => {
    if (data.roomId !== roomId.value) return
    isGenerating.value = false
    generatingIds.value = []
  })

  wsClient.on('room:error', (data: any) => {
    uni.showToast({ title: data.message || '错误', icon: 'none' })
  })
}

const msgClass = (msg: any) => ({
  'msg-mine': msg.role === 'user' && msg.userId === myUserId,
  'msg-other': msg.role === 'user' && msg.userId !== myUserId,
  'msg-agent': msg.role === 'assistant',
  'msg-system': msg.role === 'system',
})

const getAgentName = (id: number) => agentNames.value.get(id) || `角色${id}`

const send = () => {
  const text = inputTxt.value.trim()
  if (!text || isGenerating.value) return
  wsClient.send('room:send', { roomId: roomId.value, message: text, files: [] })
  inputTxt.value = ''
}

const scrollBottom = () => {
  setTimeout(() => {
    scrollToId.value = ''
    setTimeout(() => { scrollToId.value = 'rmsg-bottom' }, 50)
  }, 50)
}

const goBack = () => uni.navigateBack()

onBeforeUnmount(() => {
  wsClient.send('room:leave', { roomId: roomId.value })
  ;['room:message', 'room:agents-typing', 'room:agent-chunk', 'room:agent-done', 'room:all-done', 'room:error'].forEach(ev => {
    wsClient.off(ev, () => {})
  })
})
</script>

<style lang="scss" scoped>
.room-chat-page {
  height: 100vh;
  background: #0f0f23;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 24rpx;
  background: #1a1a2e;
  border-bottom: 1px solid rgba(212, 175, 55, 0.15);
  flex-shrink: 0;
}

.back-btn { font-size: 32rpx; color: #d4af37; }

.header-center { flex: 1; min-width: 0; }

.room-name {
  font-size: 28rpx;
  color: #d4af37;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-count {
  font-size: 22rpx;
  color: #8892b0;
  margin-left: 12rpx;
}

.messages {
  flex: 1;
  padding: 20rpx;
  overflow-y: auto;
}

.rmsg {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
  align-items: flex-start;
}

.msg-mine { flex-direction: row-reverse; }

.msg-system { justify-content: center; }

.system-msg {
  font-size: 22rpx;
  color: #556;
  padding: 6rpx 20rpx;
  background: rgba(255,255,255,0.04);
  border-radius: 16rpx;
  max-width: 80%;
  word-break: break-all;
}

.rmsg-avatar { flex-shrink: 0; }

.ravatar-img {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
}

.ravatar-text {
  display: inline-block;
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  font-size: 24rpx;
  color: #8892b0;
}

.rmsg-body {
  max-width: 70%;
  min-width: 0;
}

.rmsg-sender {
  font-size: 20rpx;
  color: #8892b0;
  margin-bottom: 4rpx;
}

.rmsg-content {
  font-size: 26rpx;
  color: #e0e0e0;
  padding: 12rpx 20rpx;
  background: rgba(255,255,255,0.06);
  border-radius: 12rpx;
  word-break: break-all;
  white-space: pre-wrap;
}

.msg-mine .rmsg-content {
  background: linear-gradient(135deg, #d4af37, #b8960f);
  color: #1a1a2e;
}

.gen-hint {
  display: flex;
  gap: 16rpx;
  padding: 8rpx 0;
  flex-wrap: wrap;
}

.gen-item {
  font-size: 22rpx;
  color: #d4af37;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.room-input {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  background: #1a1a2e;
  border-top: 1px solid rgba(212, 175, 55, 0.15);
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  flex-shrink: 0;
}

.r-input {
  flex: 1;
  height: 64rpx;
  background: rgba(255,255,255,0.06);
  border-radius: 32rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #e0e0e0;
}

.r-send {
  font-size: 26rpx;
  color: #d4af37;
  line-height: 64rpx;
  flex-shrink: 0;
}

.r-send.disabled { color: #556; }
</style>
