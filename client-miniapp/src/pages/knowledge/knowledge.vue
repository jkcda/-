<template>
  <view class="kb-page">
    <view class="page-header">
      <text class="header-title">知识库</text>
    </view>

    <scroll-view class="kb-list" scroll-y :style="{ height: scrollHeight + 'px' }">
      <view v-for="kb in knowledgeBases" :key="kb.id" class="kb-card" @tap="goToDocs(kb)">
        <text class="kb-name">{{ kb.name }}</text>
        <text class="kb-desc">{{ kb.description || '无描述' }}</text>
        <view class="kb-meta">
          <text>{{ kb.document_count }} 文档 · {{ kb.chunk_count }} 分块</text>
        </view>
      </view>

      <view v-if="knowledgeBases.length === 0" class="empty-hint">
        <text>还没有知识库</text>
      </view>
      <view style="height: 100rpx;"></view>
    </scroll-view>

    <!-- 创建弹层 -->
    <view v-if="showForm" class="form-overlay" @tap="showForm = false">
      <view class="form-panel" @tap.stop>
        <text class="form-title">创建知识库</text>
        <input class="form-input" v-model="formName" placeholder="知识库名称" />
        <input class="form-input" v-model="formDesc" placeholder="描述（可选）" />
        <button class="form-submit" @tap="createKB">创建</button>
      </view>
    </view>

    <view class="fab" @tap="showForm = true">+</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, post } from '../../api/request'

interface KB {
  id: number
  name: string
  description: string | null
  document_count: number
  chunk_count: number
}

const knowledgeBases = ref<KB[]>([])
const showForm = ref(false)
const formName = ref('')
const formDesc = ref('')
const scrollHeight = ref(600)

const load = async () => {
  try {
    const res = await get<any>('/api/kb')
    if (res.success) knowledgeBases.value = res.result.knowledgeBases || []
  } catch {}
}

const createKB = async () => {
  if (!formName.value.trim()) {
    uni.showToast({ title: '请输入名称', icon: 'none' })
    return
  }
  try {
    await post('/api/kb', { name: formName.value, description: formDesc.value })
    showForm.value = false
    formName.value = ''
    formDesc.value = ''
    uni.showToast({ title: '创建成功', icon: 'success' })
    load()
  } catch {
    uni.showToast({ title: '创建失败', icon: 'none' })
  }
}

const goToDocs = (kb: KB) => {
  uni.navigateTo({ url: `/pages/knowledge/docs?id=${kb.id}&name=${encodeURIComponent(kb.name)}` })
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
.kb-page {
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

.kb-list { flex: 1; }

.kb-card {
  padding: 28rpx 32rpx;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}

.kb-name {
  font-size: 28rpx;
  color: #e0e0e0;
  font-weight: 500;
}

.kb-desc {
  font-size: 24rpx;
  color: #8892b0;
  margin-top: 6rpx;
}

.kb-meta {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #556;
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
