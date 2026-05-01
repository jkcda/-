<template>
  <div class="chat-sidebar" :class="{ collapsed, 'mobile-open': mobileOpen }">
    <div class="sidebar-header">
      <el-button type="primary" class="new-chat-btn" @click="$emit('createSession')">
        <el-icon><Plus /></el-icon>
        新对话
      </el-button>
    </div>
    <div class="session-list">
      <div
        v-for="sess in sessionList"
        :key="sess.id"
        :class="['session-item', { active: sess.id === currentSessionId }]"
        @click="$emit('selectSession', sess.id)"
      >
        <div class="session-preview">{{ sess.preview || '新对话' }}</div>
        <div class="session-meta">
          <span>{{ sess.messageCount }} 条消息</span>
          <el-button
            class="delete-session-btn"
            size="small"
            text
            type="danger"
            @click.stop="$emit('deleteSession', sess.id)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
      <div v-if="sessionList.length === 0" class="empty-sessions">
        暂无对话记录
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Delete } from '@element-plus/icons-vue'

interface SessionItem {
  id: string
  preview: string
  messageCount: number
  lastActiveAt: string
}

defineProps<{
  sessionList: SessionItem[]
  currentSessionId: string
  collapsed: boolean
  mobileOpen?: boolean
}>()

defineEmits<{
  createSession: []
  selectSession: [sessionId: string]
  deleteSession: [sessionId: string]
}>()
</script>

<style scoped>
.chat-sidebar {
  width: 260px;
  background: #fff;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e4e7ed;
  transition: width 0.3s;
  flex-shrink: 0;
}

.chat-sidebar.collapsed {
  width: 0;
  overflow: hidden;
  border-right: none;
}

.sidebar-header {
  padding: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.new-chat-btn {
  width: 100%;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background 0.15s;
}

.session-item:hover {
  background: #f5f7fa;
}

.session-item.active {
  background: #ecf5ff;
}

.session-preview {
  font-size: 14px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.session-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.delete-session-btn {
  opacity: 0;
  transition: opacity 0.15s;
  padding: 2px;
  font-size: 14px;
}

.session-item:hover .delete-session-btn {
  opacity: 1;
}

.empty-sessions {
  text-align: center;
  padding: 30px 0;
  color: #c0c4cc;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-sidebar {
    position: fixed;
    top: 0;
    left: -280px;
    width: 260px;
    height: 100vh;
    z-index: 60;
    transition: left 0.3s ease;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  }

  .chat-sidebar.mobile-open {
    left: 0;
  }

  .chat-sidebar.collapsed {
    width: 260px;
    overflow: visible;
    border-right: 1px solid #e4e7ed;
  }
}
</style>
