<template>
  <div class="kb-docs">
    <div class="kb-docs-header">
      <h3>{{ kbName }}</h3>
      <div class="kb-docs-actions">
        <el-button type="primary" size="small" @click="triggerUpload">上传文档</el-button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".txt,.md,.pdf,.doc,.docx"
          multiple
          hidden
          @change="handleFileChange"
        />
      </div>
    </div>

    <!-- 检索框 -->
    <div class="search-bar">
      <el-input
        v-model="searchQuery"
        placeholder="在知识库中搜索..."
        size="small"
        clearable
        @keydown.enter="handleSearch"
      >
        <template #append>
          <el-button :loading="searching" @click="handleSearch">搜索</el-button>
        </template>
      </el-input>
    </div>

    <!-- 检索结果 -->
    <div v-if="searchResults.length > 0" class="search-results">
      <div class="search-results-header">
        <span>检索结果 ({{ searchResults.length }})</span>
        <el-button size="small" text @click="searchResults = []; searchQuery = ''">清除</el-button>
      </div>
      <div
        v-for="(chunk, i) in searchResults"
        :key="i"
        class="search-result-item"
      >
        <div class="chunk-source">{{ chunk.source }} (相关度: {{ (chunk.score * 100).toFixed(0) }}%)</div>
        <div class="chunk-content">{{ chunk.content }}</div>
      </div>
    </div>

    <!-- 文档列表 -->
    <div class="doc-list" v-loading="loading">
      <div
        v-for="doc in documents"
        :key="doc.id"
        class="doc-item"
      >
        <div class="doc-info">
          <el-icon class="doc-icon"><Document /></el-icon>
          <div class="doc-details">
            <div class="doc-name">{{ doc.filename }}</div>
            <div class="doc-meta">
              <el-tag
                :type="statusTagType(doc.status)"
                size="small"
              >
                {{ statusLabel(doc.status) }}
              </el-tag>
              <span v-if="doc.chunk_count > 0">{{ doc.chunk_count }} 分块</span>
              <span>{{ formatSize(doc.file_size) }}</span>
              <span>{{ new Date(doc.created_at).toLocaleDateString() }}</span>
            </div>
            <div v-if="doc.error_message" class="doc-error">{{ doc.error_message }}</div>
          </div>
        </div>
        <el-button
          size="small"
          text
          type="danger"
          @click="handleDelete(doc.id)"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>

      <el-empty v-if="!loading && documents.length === 0" description="暂无文档，点击上方按钮上传" :image-size="60" />
    </div>

    <!-- 上传进度 -->
    <el-dialog v-model="uploading" title="上传文档" width="400px" :close-on-click-modal="false">
      <div class="upload-progress">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
        <p>正在处理文档，请稍候...</p>
        <p class="upload-hint">文档将被解析、分块并生成向量索引</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Delete, Loading } from '@element-plus/icons-vue'
import {
  getKBDocuments,
  uploadDocumentsToKB,
  deleteKBDocument,
  searchKB,
  type KbDocument,
  type SearchChunk
} from '@/apis/knowledgeBase'

const props = defineProps<{
  kbId: number
  kbName: string
}>()

const emit = defineEmits<{
  uploaded: []
  deleted: []
}>()

const documents = ref<KbDocument[]>([])
const loading = ref(false)
const uploading = ref(false)
const searching = ref(false)
const searchQuery = ref('')
const searchResults = ref<SearchChunk[]>([])
const fileInputRef = ref<HTMLInputElement>()

const loadDocuments = async () => {
  loading.value = true
  try {
    const res = await getKBDocuments(props.kbId)
    if (res.data.success) {
      documents.value = res.data.result.documents || []
    }
  } catch {
    ElMessage.error('获取文档列表失败')
  } finally {
    loading.value = false
  }
}

const triggerUpload = () => {
  fileInputRef.value?.click()
}

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  uploading.value = true
  try {
    const result = await uploadDocumentsToKB(props.kbId, Array.from(files))
    if (result.success) {
      ElMessage.success(`成功上传 ${result.result.documents.length} 个文档`)
      await loadDocuments()
      emit('uploaded')
    } else {
      ElMessage.error(result.message || '上传失败')
    }
  } catch (err: any) {
    console.error('文档上传失败:', err)
    ElMessage.error(err.message || '上传文档失败，请检查网络连接')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

const handleDelete = async (docId: number) => {
  try {
    await ElMessageBox.confirm('确定要删除此文档吗？', '删除确认', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    await deleteKBDocument(props.kbId, docId)
    ElMessage.success('文档已删除')
    await loadDocuments()
    emit('deleted')
  } catch {
    ElMessage.error('删除文档失败')
  }
}

const handleSearch = async () => {
  if (!searchQuery.value.trim()) return
  searching.value = true
  try {
    const res = await searchKB(props.kbId, searchQuery.value.trim())
    if (res.data.success) {
      searchResults.value = res.data.result.chunks || []
    }
  } catch {
    ElMessage.error('检索失败')
  } finally {
    searching.value = false
  }
}

const statusTagType = (status: string) => {
  switch (status) {
    case 'completed': return 'success'
    case 'processing': return 'warning'
    case 'failed': return 'danger'
    default: return 'info'
  }
}

const statusLabel = (status: string) => {
  switch (status) {
    case 'pending': return '等待处理'
    case 'processing': return '处理中'
    case 'completed': return '已完成'
    case 'failed': return '失败'
    default: return status
  }
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

onMounted(() => {
  loadDocuments()
})
</script>

<style scoped>
.kb-docs {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-card);
}

.kb-docs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: var(--border-thin) var(--color-border);
}

.kb-docs-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--color-text-primary);
}

.search-bar {
  padding: 12px 24px;
  background: var(--color-bg-input);
  border-bottom: var(--border-thin) var(--color-border);
}

.search-results {
  padding: 12px 24px;
  background: var(--color-primary-light);
  border-bottom: var(--border-thin) var(--color-primary);
}

.search-results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--color-magic-gold);
  font-weight: 500;
}

.search-result-item {
  background: var(--color-bg-card);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  margin-bottom: 8px;
  border: var(--border-thin) var(--color-border);
}

.chunk-source {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.chunk-content {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
}

.doc-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.doc-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
}

.doc-item:hover {
  background: var(--color-primary-light);
}

.doc-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.doc-icon {
  font-size: 24px;
  color: var(--color-primary);
  flex-shrink: 0;
}

.doc-details {
  flex: 1;
  min-width: 0;
}

.doc-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.doc-error {
  font-size: 12px;
  color: var(--color-danger);
  margin-top: 4px;
}

.upload-progress {
  text-align: center;
  padding: 20px;
}

.upload-progress p {
  margin-top: 12px;
  color: var(--color-text-secondary);
}

.upload-hint {
  font-size: 12px;
  color: var(--color-text-muted) !important;
}

@media (max-width: 768px) {
  .kb-docs-header {
    padding: 12px 16px;
  }

  .kb-docs-header h3 {
    font-size: 14px;
  }

  .search-bar {
    padding: 10px 16px;
  }

  .doc-list {
    padding: 12px 16px;
  }

  .doc-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .doc-meta {
    flex-wrap: wrap;
    gap: 4px;
  }

  .search-results {
    padding: 10px 16px;
  }
}
</style>
