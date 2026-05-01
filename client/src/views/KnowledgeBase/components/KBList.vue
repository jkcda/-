<template>
  <div class="kb-sidebar" :class="{ 'mobile-open': mobileOpen }">
    <div class="kb-sidebar-header">
      <h3>知识库</h3>
      <el-button size="small" type="primary" @click="$emit('create')">新建</el-button>
    </div>

    <div class="kb-list" v-loading="loading">
      <div
        v-for="kb in kbList"
        :key="kb.id"
        :class="['kb-item', { active: kb.id === selectedKbId }]"
        @click="$emit('select', kb)"
      >
        <div class="kb-item-content">
          <div class="kb-name">{{ kb.name }}</div>
          <div class="kb-meta">
            <span>{{ kb.document_count }} 个文档</span>
            <span>·</span>
            <span>{{ kb.chunk_count }} 个分块</span>
          </div>
        </div>
        <el-button
          class="kb-delete-btn"
          size="small"
          text
          type="danger"
          @click.stop="$emit('delete', kb)"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>

      <el-empty v-if="!loading && kbList.length === 0" description="暂无知识库" :image-size="60" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Delete } from '@element-plus/icons-vue'
import type { KnowledgeBase } from '@/apis/knowledgeBase'

defineProps<{
  kbList: KnowledgeBase[]
  selectedKbId: number | null
  loading: boolean
  mobileOpen?: boolean
}>()

defineEmits<{
  select: [kb: KnowledgeBase]
  create: []
  delete: [kb: KnowledgeBase]
}>()
</script>

<style scoped>
.kb-sidebar {
  width: 260px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.kb-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
}

.kb-sidebar-header h3 {
  margin: 0;
  font-size: 15px;
  color: #303133;
}

.kb-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.kb-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 4px;
}

.kb-item:hover {
  background: #f5f7fa;
}

.kb-item.active {
  background: #ecf5ff;
  border: 1px solid #d9ecff;
}

.kb-item-content {
  flex: 1;
  min-width: 0;
}

.kb-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kb-meta {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  display: flex;
  gap: 4px;
}

.kb-delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.kb-item:hover .kb-delete-btn {
  opacity: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .kb-sidebar {
    position: fixed;
    top: 0;
    left: -280px;
    width: 260px;
    height: 100vh;
    z-index: 60;
    transition: left 0.3s ease;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  }

  .kb-sidebar.mobile-open {
    left: 0;
  }
}
</style>
