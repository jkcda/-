<template>
  <div class="user-chat-stats">
    <!-- 统计概览卡片 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-value">{{ stats.length }}</div>
            <div class="stat-label">用户总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-value">{{ totalSessions }}</div>
            <div class="stat-label">对话总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-value">{{ totalMessages }}</div>
            <div class="stat-label">消息总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-value">{{ activeUsers }}</div>
            <div class="stat-label">活跃用户</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 对话详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="`${drawerUser?.username || ''} 的对话历史`"
      size="50%"
      direction="rtl"
    >
      <template v-if="loadingHistory">
        <div class="loading-container">
          <el-icon class="is-loading" :size="32"><Loading /></el-icon>
          <p>加载中...</p>
        </div>
      </template>
      <template v-else>
        <div class="history-stats">
          <span>共 {{ chatHistory.length }} 条消息</span>
        </div>
        <div class="chat-history-list">
          <div
            v-for="(msg, index) in chatHistory"
            :key="index"
            :class="['message-item', msg.role]"
          >
            <div class="message-role">
              <el-tag :type="msg.role === 'user' ? '' : 'success'" size="small">
                {{ msg.role === 'user' ? '用户' : 'AI' }}
              </el-tag>
              <span class="message-time">{{ formatTime(msg.created_at) }}</span>
            </div>
            <div class="message-content">{{ msg.content }}</div>
            <div class="message-session">会话ID: {{ msg.session_id }}</div>
          </div>
          <div v-if="chatHistory.length === 0" class="empty-history">
            <el-empty description="暂无对话历史" />
          </div>
        </div>
      </template>
    </el-drawer>

    <!-- 排序工具栏 -->
    <el-card class="stats-table-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>用户对话统计</span>
          <div class="header-actions">
            <el-button size="small" @click="fetchData" :loading="loading">
              刷新数据
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="sortedStats"
        stripe
        v-loading="loading"
        style="width: 100%"
        empty-text="暂无数据"
      >
        <el-table-column prop="username" label="用户名" min-width="120">
          <template #default="{ row }">
            <div class="username-cell">
              <el-icon><User /></el-icon>
              {{ row.username }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="session_count" label="对话数" width="100" align="center">
          <template #default="{ row }">
            <el-tag>{{ row.session_count }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message_count" label="消息总数" width="100" align="center" sortable>
          <template #default="{ row }">
            <el-tag type="primary">{{ row.message_count }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用户消息" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="warning">{{ row.user_message_count }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="AI 回复" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="success">{{ row.assistant_message_count }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="last_active_at" label="最后活跃" width="180" sortable>
          <template #default="{ row }">
            {{ formatTime(row.last_active_at) || '暂无记录' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="viewHistory(row)"
              :disabled="row.message_count === 0"
            >
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Loading } from '@element-plus/icons-vue'
import { getUserChatStats, getUserChatHistory } from '@/apis/admin'

interface ChatStat {
  user_id: number
  username: string
  email: string
  session_count: number
  message_count: number
  user_message_count: number
  assistant_message_count: number
  last_active_at: string | null
}

const loading = ref(false)
const stats = ref<ChatStat[]>([])

const drawerVisible = ref(false)
const loadingHistory = ref(false)
const chatHistory = ref<any[]>([])
const drawerUser = ref<ChatStat | null>(null)

// 统计概览
const totalSessions = computed(() =>
  stats.value.reduce((sum, s) => sum + (s.session_count || 0), 0)
)
const totalMessages = computed(() =>
  stats.value.reduce((sum, s) => sum + (s.message_count || 0), 0)
)
const activeUsers = computed(() =>
  stats.value.filter(s => s.message_count > 0).length
)

// 排序：消息数降序
const sortedStats = computed(() =>
  [...stats.value].sort((a, b) => b.message_count - a.message_count)
)

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getUserChatStats()
    if (res.data.success) {
      stats.value = res.data.result.stats || []
    } else {
      ElMessage.error(res.data.message || '获取数据失败')
    }
  } catch (err: any) {
    ElMessage.error(err.message || '网络错误')
  } finally {
    loading.value = false
  }
}

const viewHistory = async (row: ChatStat) => {
  drawerUser.value = row
  drawerVisible.value = true
  loadingHistory.value = true
  try {
    const res = await getUserChatHistory(row.user_id)
    if (res.data.success) {
      chatHistory.value = res.data.result.history || []
    } else {
      ElMessage.error(res.data.message || '获取历史失败')
    }
  } catch (err: any) {
    ElMessage.error(err.message || '网络错误')
  } finally {
    loadingHistory.value = false
  }
}

const formatTime = (time: string | null) => {
  if (!time) return ''
  const d = new Date(time)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.stats-cards {
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
  padding: 12px 0;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #409EFF;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 8px;
}

.stats-table-card {
  margin-top: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
}

.username-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;
}

.chat-history-list {
  max-height: calc(100vh - 180px);
  overflow-y: auto;
}

.message-item {
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 8px;
  background: #f5f7fa;
}

.message-item.user {
  border-left: 3px solid #409EFF;
}

.message-item.assistant {
  border-left: 3px solid #67C23A;
}

.message-role {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.message-time {
  font-size: 12px;
  color: #909399;
}

.message-content {
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-all;
}

.message-session {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 8px;
}

.empty-history {
  padding: 40px 0;
}

.history-stats {
  margin-bottom: 16px;
  font-size: 14px;
  color: #909399;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-cards :deep(.el-col) {
    flex: 0 0 50%;
    max-width: 50%;
    margin-bottom: 12px;
  }

  .stat-value {
    font-size: 24px;
  }

  .stat-label {
    font-size: 12px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  :deep(.el-drawer) {
    width: 85% !important;
  }

  :deep(.el-table) {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .stats-cards :deep(.el-col) {
    flex: 0 0 100%;
    max-width: 100%;
  }
}
</style>
