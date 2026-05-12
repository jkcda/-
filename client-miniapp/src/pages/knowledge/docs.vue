<template>
  <view class="docs-page">
    <view class="page-header">
      <text class="back-btn" @tap="goBack">←</text>
      <text class="header-title">{{ kbName }}</text>
    </view>

    <scroll-view class="docs-list" scroll-y :style="{ height: scrollHeight + 'px' }">
      <view v-for="doc in documents" :key="doc.id" class="doc-card">
        <view class="doc-row">
          <text class="doc-name">{{ doc.filename }}</text>
          <text class="doc-status" :class="'status-' + (doc.status || 'pending')">{{ doc.status || '待处理' }}</text>
        </view>
        <view class="doc-meta">
          <text>{{ formatSize(doc.file_size) }}</text>
          <text v-if="doc.chunk_count"> · {{ doc.chunk_count }} 分块</text>
        </view>
      </view>

      <view v-if="documents.length === 0" class="empty-hint">
        <text>还没有文档，点击下方按钮上传</text>
      </view>
    </scroll-view>

    <view class="bottom-bar">
      <button class="upload-btn" :loading="uploading" @tap="uploadDocs">
        {{ uploading ? '上传中...' : '上传文档' }}
      </button>
    </view>

    <!-- 上传进度提示 -->
    <view v-if="uploadMsg" class="upload-toast">{{ uploadMsg }}</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { get } from '../../api/request'
import { uploadFile } from '../../api/request'

const kbId = ref(0)
const kbName = ref('')
const documents = ref<any[]>([])
const uploading = ref(false)
const uploadMsg = ref('')
const scrollHeight = ref(500)

onLoad((options: any) => {
  const params = options || {}
  kbId.value = Number(params.id) || 0
  kbName.value = decodeURIComponent(params.name || '')
  if (!kbId.value) {
    uni.showToast({ title: '知识库ID无效', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1000)
    return
  }
  const info = uni.getWindowInfo()
  scrollHeight.value = info.windowHeight - 100
  loadDocs()
})

const loadDocs = async () => {
  try {
    const res = await get<any>(`/api/kb/${kbId.value}/documents`)
    if (res.success) documents.value = res.result.documents || []
  } catch {}
}

const uploadDocs = () => {
  uni.chooseMessageFile({
    count: 5,
    type: 'all',
    success: async (res) => {
      uploading.value = true
      let ok = 0; let fail = 0
      for (let i = 0; i < res.tempFiles.length; i++) {
        const f = res.tempFiles[i]
        uploadMsg.value = `上传中 ${i + 1}/${res.tempFiles.length}: ${f.name}`
        try {
          await uploadFile(f.path, `/api/kb/${kbId.value}/documents`, 'files')
          ok++
        } catch {
          fail++
        }
      }
      uploading.value = false
      uploadMsg.value = ''
      uni.showToast({ title: `完成: ${ok} 成功${fail > 0 ? ', ' + fail + ' 失败' : ''}`, icon: fail > 0 ? 'none' : 'success' })
      loadDocs()
    },
    fail: (err) => {
      if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
        uni.showToast({ title: '选择文件失败', icon: 'none' })
      }
    },
  })
}

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const goBack = () => uni.navigateBack()
</script>

<style lang="scss" scoped>
.docs-page {
  height: 100vh;
  background: #0f0f23;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  padding: 24rpx 32rpx;
  border-bottom: 1px solid rgba(212, 175, 55, 0.15);
  display: flex;
  gap: 20rpx;
  align-items: center;
  flex-shrink: 0;
}

.back-btn { font-size: 32rpx; color: #d4af37; }

.header-title {
  font-size: 32rpx;
  color: #d4af37;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.docs-list { flex: 1; }

.doc-card {
  padding: 24rpx 32rpx;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}

.doc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.doc-name {
  font-size: 26rpx;
  color: #e0e0e0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 16rpx;
}

.doc-status {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.status-pending { color: #8892b0; background: rgba(255,255,255,0.06); }
.status-processing { color: #d4af37; background: rgba(212,175,55,0.12); }
.status-completed { color: #4caf50; background: rgba(76,175,80,0.12); }
.status-error { color: #ff4757; background: rgba(255,71,87,0.12); }

.doc-meta {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #556;
}

.empty-hint {
  text-align: center;
  padding: 120rpx 32rpx;
  color: #556;
  font-size: 28rpx;
}

.bottom-bar {
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #1a1a2e;
  border-top: 1px solid rgba(212, 175, 55, 0.15);
  flex-shrink: 0;
}

.upload-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: linear-gradient(135deg, #d4af37, #b8960f);
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
  border: none;
}

.upload-toast {
  position: fixed;
  bottom: 160rpx;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: #e0e0e0;
  font-size: 24rpx;
  padding: 12rpx 32rpx;
  border-radius: 32rpx;
  z-index: 50;
  white-space: nowrap;
}
</style>
