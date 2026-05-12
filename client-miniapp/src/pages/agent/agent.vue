<template>
  <view class="agent-page">
    <view class="page-header">
      <text class="header-title">角色管理</text>
    </view>

    <scroll-view class="agent-list" scroll-y :style="{ height: scrollHeight + 'px' }">
      <view v-for="agent in agents" :key="agent.id" class="agent-card" @tap="openEditForm(agent)">
        <image :src="agent.avatar || '/static/logo.png'" class="agent-avatar" mode="aspectFill" />
        <view class="agent-info">
          <text class="agent-name">{{ agent.name }}</text>
          <text class="agent-desc">{{ agent.systemPrompt?.substring(0, 60) || '无描述' }}</text>
        </view>
        <text class="agent-del" @tap.stop="deleteAgent(agent.id)">删除</text>
      </view>

      <view v-if="agents.length === 0" class="empty-hint">
        <text>还没有创建角色</text>
      </view>
      <view style="height: 100rpx;"></view>
    </scroll-view>

    <!-- 创建/编辑弹层 -->
    <view v-if="showForm" class="form-overlay" @tap="showForm = false">
      <view class="form-panel" @tap.stop>
        <text class="form-title">{{ editingAgent ? '编辑角色' : '创建角色' }}</text>
        <input class="form-input" v-model="formData.name" placeholder="角色名" />
        <textarea class="form-textarea" v-model="formData.systemPrompt" placeholder="人设背景 (system prompt)" :auto-height="true" />
        <textarea class="form-textarea" v-model="formData.greeting" placeholder="初始场景 (首条消息，可选)" :auto-height="true" />
        <button class="form-submit" @tap="saveAgent">{{ editingAgent ? '保存' : '创建' }}</button>
      </view>
    </view>

    <view class="fab" @tap="openCreateForm">+</view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, post, put, del } from '../../api/request'

interface Agent {
  id: number
  name: string
  avatar: string | null
  systemPrompt: string
  greeting: string | null
}

const agents = ref<Agent[]>([])
const showForm = ref(false)
const editingAgent = ref<Agent | null>(null)
const formData = reactive({ name: '', systemPrompt: '', greeting: '' })
const scrollHeight = ref(600)

const load = async () => {
  try {
    const res = await get<any>('/api/agents')
    if (res.success) agents.value = res.result.agents || []
  } catch {}
}

const openCreateForm = () => {
  editingAgent.value = null
  formData.name = ''
  formData.systemPrompt = ''
  formData.greeting = ''
  showForm.value = true
}

const openEditForm = (agent: Agent) => {
  editingAgent.value = agent
  formData.name = agent.name
  formData.systemPrompt = agent.systemPrompt
  formData.greeting = agent.greeting || ''
  showForm.value = true
}

const saveAgent = async () => {
  if (!formData.name?.trim() || !formData.systemPrompt?.trim()) {
    uni.showToast({ title: '请填写角色名和人设', icon: 'none' })
    return
  }
  try {
    if (editingAgent.value) {
      await put(`/api/agents/${editingAgent.value.id}`, formData)
    } else {
      await post('/api/agents', formData)
    }
    showForm.value = false
    uni.showToast({ title: '保存成功', icon: 'success' })
    load()
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

const deleteAgent = (id: number) => {
  uni.showModal({
    title: '确认删除',
    content: '删除后不可恢复',
    success: async (res) => {
      if (res.confirm) {
        try {
          await del(`/api/agents/${id}`)
          agents.value = agents.value.filter(a => a.id !== id)
          uni.showToast({ title: '已删除', icon: 'success' })
        } catch {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

const calcHeight = () => {
  const info = uni.getWindowInfo()
  scrollHeight.value = info.windowHeight - 50
}

onShow(() => {
  if (!(globalThis as any).__nexusLoggedIn()) return
  calcHeight()
  load()
})
</script>

<style lang="scss" scoped>
.agent-page {
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

.agent-list {
  flex: 1;
}

.agent-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 32rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.agent-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.agent-info {
  flex: 1;
  min-width: 0;
}

.agent-name {
  font-size: 28rpx;
  color: #e0e0e0;
  font-weight: 500;
}

.agent-desc {
  font-size: 22rpx;
  color: #8892b0;
  margin-top: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-del {
  font-size: 24rpx;
  color: #ff4757;
  flex-shrink: 0;
  padding: 8rpx 12rpx;
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
  max-height: 85vh;
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

.form-textarea {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
  margin-bottom: 16rpx;
  color: #e0e0e0;
  font-size: 26rpx;
  min-height: 120rpx;
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
