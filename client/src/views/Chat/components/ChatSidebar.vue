<template>
  <div class="chat-sidebar" :class="{ collapsed, 'mobile-open': mobileOpen }">
    <div class="sidebar-header">
      <el-button type="primary" class="new-chat-btn" @click="$emit('createSession')">
        <el-icon><Plus /></el-icon>
        新对话
      </el-button>
    </div>
    <div class="nexus-card">
      <img :src="'/images/character-avatar.png'" class="nexus-avatar" />
      <div class="nexus-info">
        <span class="nexus-name">奈克瑟 NEXUS</span>
        <span class="nexus-level">{{ intimacyRank }}</span>
      </div>
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
        <p class="empty-welcome">{{ welcomeLine }}</p>
        <p class="empty-hint">点击上方按钮开始对话</p>
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

import { computed } from 'vue'
import { loadIntimacy, getIntimacyRank, getWelcomeLine } from '@/utils/intimacy'

const intimacy = computed(() => loadIntimacy())
const intimacyRank = computed(() => getIntimacyRank(intimacy.value))
const welcomeLine = computed(() => getWelcomeLine(intimacy.value))

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
  background: var(--color-bg-card);
  display: flex;
  flex-direction: column;
  border-right: var(--border-thin) var(--color-border);
  transition: width 0.3s;
  flex-shrink: 0;
}

.chat-sidebar.collapsed {
  width: 0;
  overflow: hidden;
  border-right: none;
}

.sidebar-header {
  padding: var(--space-md);
  border-bottom: var(--border-thin) var(--color-border);
}

.new-chat-btn {
  width: 100%;
}

.nexus-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  margin: 0 8px 8px;
  background: var(--color-bg-input);
  border-radius: var(--radius-md);
  border: var(--border-thin) var(--color-border);
}

.nexus-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  border: 2px solid var(--color-magic-gold);
  box-shadow: var(--shadow-gold-glow);
  object-fit: cover;
  flex-shrink: 0;
}

.nexus-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.nexus-name {
  font-family: var(--font-pixel);
  font-size: 9px;
  color: var(--color-magic-gold);
  white-space: nowrap;
}

.nexus-level {
  font-size: 11px;
  color: var(--color-text-muted);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-sm);
}

.session-item {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  margin-bottom: 4px;
  transition: background var(--transition-fast);
  border-left: 3px solid transparent;
}

.session-item:hover {
  background: var(--color-primary-light);
}

.session-item.active {
  background: var(--color-primary-light);
  border-left: 3px solid var(--color-magic-gold);
}

.session-preview {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.session-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
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
  padding: 20px 12px;
  color: var(--color-text-muted);
  font-size: var(--font-size-base);
}

.empty-welcome {
  color: var(--color-magic-gold);
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 8px;
  text-shadow: 0 0 6px var(--color-gold-glow);
}

.empty-hint {
  font-size: 12px;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .chat-sidebar {
    position: fixed;
    top: 0;
    left: -280px;
    width: 260px;
    height: 100vh;
    z-index: 60;
    transition: left 0.3s ease;
    box-shadow: var(--shadow-card);
  }

  .chat-sidebar.mobile-open {
    left: 0;
  }

  .chat-sidebar.collapsed {
    width: 260px;
    overflow: visible;
    border-right: var(--border-thin) var(--color-border);
  }
}
</style>
