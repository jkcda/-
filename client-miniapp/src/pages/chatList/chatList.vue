<template>
  <view class="sessions-page">
    <view class="page-header">
      <text class="header-title">对话列表</text>
      <text class="new-btn" @tap="newSession">+ 新对话</text>
    </view>

    <scroll-view class="session-list" scroll-y>
      <view
        v-for="sess in sessions"
        :key="sess.session_id"
        :class="['session-card', { active: sess.session_id === currentId }]"
        @tap="selectSession(sess.session_id)"
        @longpress="showDeleteOption(sess.session_id)"
      >
        <view class="sc-left">
          <image :src="sess.agentAvatar || '/static/logo.png'" class="sc-avatar" mode="aspectFill" />
          <view class="sc-info">
            <text class="sc-title">{{ sess.agent_name || '奈克瑟 NEXUS' }}</text>
            <text class="sc-preview">{{ sess.first_message || '新对话' }}</text>
            <text class="sc-meta">{{ sess.message_count }} 条消息</text>
          </view>
        </view>
        <text v-if="sess.session_id === currentId" class="sc-check">✓</text>
      </view>

      <view v-if="sessions.length === 0" class="empty-hint">
        <text>还没有对话，点击右上角开始吧</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSessions, deleteChatHistory, type SessionItem } from '../../api/ai'
import { useUserStore } from '../../store/userStore'
import { get } from '../../api/request'

const userStore = useUserStore()
const sessions = ref<SessionItem[]>([])
const currentId = ref<string>('')

// 恢复临时数据
const restoreTmp = () => {
  try {
    const raw = uni.getStorageSync('_tmp_sessions')
    if (raw) {
      const tmp = JSON.parse(raw)
      currentId.value = tmp.currentId || ''
      uni.removeStorageSync('_tmp_sessions')
    }
  } catch {}
}

const load = async () => {
  try {
    const userId = userStore.getUserInfo()?.id
    const res = await getSessions(userId)
    if (res.success) {
      sessions.value = (res.result.sessions || []).map(s => ({
        ...s,
        agentAvatar: s.agent_avatar,
        agentName: s.agent_name || undefined,
      } as any))
    }
  } catch {}
}

const selectSession = (sessionId: string) => {
  // 保存选择结果
  uni.setStorageSync('_selected_session', sessionId)
  uni.navigateBack()
}

const newSession = async () => {
  const uid = userStore.getUserInfo()?.id || 'anon'
  const newId = `session_${uid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const newSess = {
    session_id: newId,
    message_count: 0,
    last_active_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    agent_id: null,
    agent_name: null,
    agent_avatar: null,
  } as SessionItem
  sessions.value.unshift(newSess)
  uni.setStorageSync('_selected_session', newId)
  uni.navigateBack()
}

const showDeleteOption = (sessionId: string) => {
  uni.showModal({
    title: '删除对话',
    content: '确定删除此对话的所有历史吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const userId = userStore.getUserInfo()?.id
          await deleteChatHistory(sessionId, userId)
          sessions.value = sessions.value.filter(s => s.session_id !== sessionId)
          if (sessionId === currentId.value) {
            currentId.value = sessions.value[0]?.session_id || ''
          }
          uni.showToast({ title: '已删除', icon: 'success' })
        } catch {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

onMounted(() => {
  restoreTmp()
  load()
})
</script>

<style lang="scss" scoped>
.sessions-page {
  height: 100vh;
  background: #0f0f23;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1px solid rgba(212, 175, 55, 0.15);
}

.header-title {
  font-size: 32rpx;
  color: #d4af37;
  font-weight: 600;
}

.new-btn {
  font-size: 26rpx;
  color: #d4af37;
  padding: 8rpx 20rpx;
  border: 1px solid #d4af37;
  border-radius: 24rpx;
}

.session-list {
  flex: 1;
  overflow-y: auto;
}

.session-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.session-card.active {
  background: rgba(212, 175, 55, 0.08);
}

.sc-left {
  display: flex;
  gap: 20rpx;
  flex: 1;
  min-width: 0;
}

.sc-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.sc-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.sc-title {
  font-size: 28rpx;
  color: #e0e0e0;
  font-weight: 500;
}

.sc-preview {
  font-size: 24rpx;
  color: #8892b0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sc-meta {
  font-size: 20rpx;
  color: #556;
}

.sc-check {
  font-size: 28rpx;
  color: #d4af37;
  flex-shrink: 0;
}

.empty-hint {
  text-align: center;
  padding: 120rpx 40rpx;
  font-size: 28rpx;
  color: #556;
}
</style>
