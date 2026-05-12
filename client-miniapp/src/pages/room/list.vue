<template>
  <view class="rooms-page">
    <view class="page-header">
      <text class="header-title">聊天室</text>
    </view>

    <view class="tab-bar">
      <text :class="['tab', { active: tab === 'mine' }]" @tap="tab = 'mine'">我的</text>
      <text :class="['tab', { active: tab === 'discover' }]" @tap="tab = 'discover'">发现</text>
    </view>

    <scroll-view class="room-list" scroll-y :style="{ height: scrollHeight + 'px' }">
      <view v-for="room in currentList" :key="room.id" class="room-card" @tap="enterRoom(room)">
        <view class="rc-header">
          <text class="rc-name">{{ room.name }}</text>
          <view class="rc-tags">
            <text class="rc-tag">{{ room.member_count || 1 }} 人</text>
            <text v-if="room.agent_count" class="rc-tag agent-tag">{{ room.agent_count }} 角色</text>
          </view>
        </view>
        <text v-if="room.topic" class="rc-topic">{{ room.topic }}</text>
        <view class="rc-footer">
          <text class="rc-time">{{ formatTime(room.updated_at) }}</text>
          <text v-if="tab === 'discover' && !room.is_joined" class="join-btn" @tap.stop="doJoin(room.id)">加入</text>
        </view>
      </view>

      <view v-if="currentList.length === 0" class="empty-hint">
        <text>{{ tab === 'mine' ? '还没有加入房间' : '暂无公开房间' }}</text>
      </view>
      <view style="height: 100rpx;"></view>
    </scroll-view>

    <view class="fab" @tap="openCreate">+</view>

    <!-- 创建弹层 -->
    <view v-if="showCreateForm" class="form-overlay" @tap="showCreateForm = false">
      <view class="form-panel" @tap.stop>
        <text class="form-title">创建聊天室</text>
        <input class="form-input" v-model="createName" placeholder="房间名称" />
        <input class="form-input" v-model="createTopic" placeholder="话题（可选）" />
        <view class="agent-select">
          <text class="form-label">选择角色（至少一个）</text>
          <view v-if="agentList.length === 0" class="no-agent-hint">
            <text>暂无角色，请先在"角色"页面创建</text>
          </view>
          <view v-for="a in agentList" :key="a.id" class="agent-check" @tap="toggleAgent(a.id)">
            <text :class="['check-box', { checked: selectedAgentIds.includes(a.id) }]">{{ selectedAgentIds.includes(a.id) ? '☑' : '☐' }}</text>
            <image v-if="a.avatar" :src="a.avatar" class="agent-thumb-sm" mode="aspectFill" />
            <text class="agent-check-name">{{ a.name }}</text>
          </view>
        </view>
        <button class="form-submit" :loading="creating" @tap="createRoom">创建</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, post } from '../../api/request'

interface Room {
  id: number
  name: string
  topic: string | null
  member_count: number
  agent_count: number
  is_joined?: number
  updated_at: string
}

const tab = ref('mine')
const myRooms = ref<Room[]>([])
const discoverRooms = ref<Room[]>([])
const showCreateForm = ref(false)
const creating = ref(false)
const createName = ref('')
const createTopic = ref('')
const agentList = ref<any[]>([])
const selectedAgentIds = ref<number[]>([])
const scrollHeight = ref(500)

const currentList = computed(() => tab.value === 'mine' ? myRooms.value : discoverRooms.value)

const load = async () => {
  try {
    const [my, disc] = await Promise.all([
      get<any>('/api/rooms'),
      get<any>('/api/rooms/discover/list'),
    ])
    if (my.success) myRooms.value = my.result as any || []
    if (disc.success) discoverRooms.value = disc.result as any || []
  } catch {}
}

const loadAgents = async () => {
  try {
    const r = await get<any>('/api/agents')
    if (r.success) agentList.value = r.result.agents || []
  } catch {}
}

const enterRoom = (room: Room) => {
  uni.navigateTo({ url: `/pages/room/chat?id=${room.id}&name=${encodeURIComponent(room.name)}` })
}

const doJoin = async (roomId: number) => {
  try {
    await post(`/api/rooms/${roomId}/join`)
    uni.showToast({ title: '已加入', icon: 'success' })
    load()
  } catch {}
}

const openCreate = () => {
  createName.value = ''
  createTopic.value = ''
  selectedAgentIds.value = []
  loadAgents()
  showCreateForm.value = true
}

const toggleAgent = (id: number) => {
  const idx = selectedAgentIds.value.indexOf(id)
  if (idx >= 0) selectedAgentIds.value.splice(idx, 1)
  else selectedAgentIds.value.push(id)
}

const createRoom = async () => {
  if (!createName.value.trim()) {
    uni.showToast({ title: '请输入房间名称', icon: 'none' })
    return
  }
  if (selectedAgentIds.value.length === 0) {
    uni.showToast({ title: '请至少选择一个角色', icon: 'none' })
    return
  }
  creating.value = true
  try {
    await post('/api/rooms', { name: createName.value, topic: createTopic.value, agentIds: selectedAgentIds.value })
    showCreateForm.value = false
    createName.value = ''
    createTopic.value = ''
    selectedAgentIds.value = []
    uni.showToast({ title: '创建成功', icon: 'success' })
    load()
  } catch {} finally { creating.value = false }
}

const formatTime = (ts: string) => {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const calcHeight = () => {
  const info = uni.getWindowInfo()
  scrollHeight.value = info.windowHeight - 90
}

onShow(() => {
  if (!(globalThis as any).__nexusLoggedIn()) return
  calcHeight()
  load()
})
</script>

<style lang="scss" scoped>
.rooms-page {
  height: 100vh;
  background: #0f0f23;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  padding: 24rpx 32rpx;
  border-bottom: 1px solid rgba(212, 175, 55, 0.15);
  flex-shrink: 0;
}

.header-title {
  font-size: 32rpx;
  color: #d4af37;
  font-weight: 600;
}

.tab-bar {
  display: flex;
  gap: 40rpx;
  padding: 20rpx 32rpx;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}

.tab {
  font-size: 28rpx;
  color: #8892b0;
  padding-bottom: 8rpx;
}

.tab.active {
  color: #d4af37;
  border-bottom: 3rpx solid #d4af37;
}

.room-list { flex: 1; }

.room-card {
  padding: 24rpx 32rpx;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}

.rc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rc-name {
  font-size: 28rpx;
  color: #e0e0e0;
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 12rpx;
}

.rc-tags {
  display: flex;
  gap: 8rpx;
  flex-shrink: 0;
}

.rc-tag {
  font-size: 20rpx;
  color: #8892b0;
  padding: 2rpx 12rpx;
  background: rgba(255,255,255,0.06);
  border-radius: 8rpx;
}

.rc-tag.agent-tag {
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
}

.rc-topic {
  font-size: 24rpx;
  color: #8892b0;
  margin-top: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rc-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12rpx;
}

.rc-time { font-size: 20rpx; color: #556; }

.join-btn {
  font-size: 24rpx;
  color: #d4af37;
  padding: 6rpx 20rpx;
  border: 1px solid #d4af37;
  border-radius: 20rpx;
}

.empty-hint {
  text-align: center;
  padding: 120rpx;
  color: #556;
  font-size: 28rpx;
}

.fab {
  position: fixed;
  right: 40rpx;
  bottom: 120rpx;
  width: 88rpx;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  font-size: 44rpx;
  color: #fff;
  background: linear-gradient(135deg, #d4af37, #b8960f);
  border-radius: 50%;
  box-shadow: 0 8rpx 24rpx rgba(212, 175, 55, 0.3);
  z-index: 50;
}

.form-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}

.form-panel {
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  background: #1a1a2e;
  border-radius: 24rpx 24rpx 0 0;
  padding: 40rpx;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}

.form-title {
  font-size: 32rpx;
  color: #d4af37;
  font-weight: 600;
  margin-bottom: 24rpx;
}

.form-input {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
  margin-bottom: 16rpx;
  color: #e0e0e0;
  font-size: 28rpx;
}

.form-label {
  font-size: 24rpx;
  color: #8892b0;
  display: block;
  margin-bottom: 12rpx;
}

.agent-select {
  margin-bottom: 16rpx;
  max-height: 280rpx;
  overflow-y: auto;
}

.agent-check {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 14rpx 8rpx;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}

.check-box {
  font-size: 32rpx;
  color: #556;
  width: 40rpx;
}

.check-box.checked { color: #d4af37; }

.agent-thumb-sm {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
}

.agent-check-name {
  font-size: 26rpx;
  color: #e0e0e0;
}

.no-agent-hint {
  padding: 20rpx 0;
  font-size: 24rpx;
  color: #556;
  text-align: center;
}

.form-submit {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: linear-gradient(135deg, #d4af37, #b8960f);
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
  border: none;
}
</style>
