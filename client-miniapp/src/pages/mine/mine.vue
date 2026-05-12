<template>
  <view class="mine-page">
    <view class="profile-card">
      <image class="avatar" src="/static/logo.png" mode="aspectFill" />
      <text class="username">{{ userInfo?.username || '未登录' }}</text>
      <text class="email">{{ userInfo?.email || '' }}</text>
    </view>

    <view class="menu-list">
      <view class="menu-item" @tap="goChat">
        <text>AI 对话</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @tap="goAgents">
        <text>角色管理</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @tap="goKnowledge">
        <text>知识库</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @tap="goRooms">
        <text>聊天室</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <button class="logout-btn" @tap="handleLogout">退出登录</button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/userStore'

const userStore = useUserStore()
const userInfo = ref<any>(null)
onShow(() => {
  if (!(globalThis as any).__nexusLoggedIn()) return
  userInfo.value = userStore.getUserInfo()
})

const handleLogout = () => {
  userStore.clear()
  ;(globalThis as any).__nexusSetLoggedIn(false)
  uni.reLaunch({ url: '/pages/login/login' })
}

const goChat = () => uni.switchTab({ url: '/pages/chat/chat' })
const goAgents = () => uni.switchTab({ url: '/pages/agent/agent' })
const goKnowledge = () => uni.switchTab({ url: '/pages/knowledge/knowledge' })
const goRooms = () => uni.switchTab({ url: '/pages/room/list' })
</script>

<style lang="scss" scoped>
.mine-page {
  min-height: 100vh;
  background: #0f0f23;
  padding: 40rpx 32rpx;
}
.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx;
  background: #1a1a2e;
  border-radius: 20rpx;
  border: 1px solid rgba(212, 175, 55, 0.15);
  margin-bottom: 32rpx;
}
.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 2px solid #d4af37;
  margin-bottom: 20rpx;
}
.username {
  font-size: 32rpx;
  color: #e0e0e0;
  font-weight: 600;
}
.email {
  font-size: 24rpx;
  color: #8892b0;
  margin-top: 8rpx;
}
.menu-list {
  background: #1a1a2e;
  border-radius: 20rpx;
  border: 1px solid rgba(212, 175, 55, 0.15);
  overflow: hidden;
  margin-bottom: 32rpx;
}
.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 32rpx;
  font-size: 28rpx;
  color: #e0e0e0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.menu-item:last-child { border-bottom: none; }
.arrow { font-size: 36rpx; color: #556; }
.logout-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  background: rgba(255, 71, 87, 0.15);
  color: #ff4757;
  border-radius: 44rpx;
  font-size: 28rpx;
  border: 1px solid rgba(255, 71, 87, 0.3);
}
</style>
