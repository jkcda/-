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
        <span class="nexus-level">跨宇宙魔法情报员</span>
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

    <!-- MCP 工具配置 -->
    <div class="mcp-panel">
      <div class="mcp-header" @click="mcpExpanded = !mcpExpanded">
        <span class="mcp-title">🔌 MCP 工具</span>
        <span class="mcp-total">{{ mcpServers.filter(s => s.enabled).length }}/{{ mcpServers.length }} 在线</span>
        <el-icon :class="{ rotated: mcpExpanded }"><ArrowRight /></el-icon>
      </div>
      <div v-if="mcpExpanded" class="mcp-list">
        <div
          v-for="srv in mcpServers"
          :key="srv.name"
          class="mcp-item"
        >
          <div class="mcp-item-info">
            <span class="mcp-icon">{{ srv.icon }}</span>
            <div class="mcp-item-detail">
              <span class="mcp-label">{{ srv.label }}</span>
              <span class="mcp-tools">{{ srv.toolCount }} 个工具</span>
            </div>
          </div>
          <el-switch
            :model-value="srv.enabled"
            size="small"
            @change="(val: boolean) => handleToggle(srv.name, val)"
          />
        </div>
        <div class="mcp-restart-hint" v-if="toggleNote">{{ toggleNote }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Delete, ArrowRight } from '@element-plus/icons-vue'
import { ref, computed, onMounted } from 'vue'

interface SessionItem {
  id: string
  preview: string
  messageCount: number
  lastActiveAt: string
}

interface McpServer {
  name: string
  label: string
  icon: string
  enabled: boolean
  toolCount: number
}

const welcomeLine = computed(() => '✦ 指挥官，数据之海已同步。开始新的对话吧。')

// MCP state
const mcpExpanded = ref(false)
const mcpServers = ref<McpServer[]>([])
const toggleNote = ref('')

async function fetchMcpStatus() {
  try {
    const res = await fetch('/api/mcp/status')
    const data = await res.json()
    if (data.success) {
      mcpServers.value = data.result.servers
    }
  } catch { /* 静默失败 */ }
}

async function handleToggle(name: string, enabled: boolean) {
  try {
    const res = await fetch('/api/mcp/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, enabled }),
    })
    const data = await res.json()
    if (data.success) {
      toggleNote.value = data.result.note || '变更将在服务重启后生效'
      setTimeout(() => toggleNote.value = '', 4000)
      // 乐观更新
      const srv = mcpServers.value.find(s => s.name === name)
      if (srv) srv.enabled = enabled
    }
  } catch {
    toggleNote.value = '操作失败，请检查服务状态'
    setTimeout(() => toggleNote.value = '', 3000)
  }
}

onMounted(() => fetchMcpStatus())

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

.mcp-panel {
  border-top: var(--border-thin) var(--color-border);
  padding: 8px 12px;
  flex-shrink: 0;
}

.mcp-header {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 4px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.mcp-header:hover {
  background: var(--color-primary-light);
}

.mcp-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 0 0 auto;
}

.mcp-total {
  font-size: 10px;
  color: var(--color-magic-gold);
  flex: 1;
  text-align: right;
  margin-right: 4px;
}

.mcp-header .el-icon {
  font-size: 12px;
  transition: transform 0.2s;
  color: var(--color-text-muted);
}

.mcp-header .el-icon.rotated {
  transform: rotate(90deg);
}

.mcp-list {
  padding: 4px 0;
}

.mcp-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.mcp-item:hover {
  background: var(--color-primary-light);
}

.mcp-item-info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.mcp-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.mcp-item-detail {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.mcp-label {
  font-size: 12px;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.mcp-tools {
  font-size: 10px;
  color: var(--color-text-muted);
}

.mcp-restart-hint {
  font-size: 10px;
  color: var(--color-magic-gold);
  text-align: center;
  padding: 4px;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .chat-sidebar {
    position: fixed;
    top: 0;
    left: -280px;
    width: 260px;
    height: 100vh;
    height: 100dvh;
    padding-bottom: env(safe-area-inset-bottom, 0px);
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
