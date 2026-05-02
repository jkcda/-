<template>
  <div class="admin-dashboard">
    <!-- 欢迎卡片 -->
    <el-card class="welcome-card" shadow="hover">
      <div class="welcome-content">
        <div class="welcome-text">
          <h2>欢迎回来，{{ userInfo?.username || '管理员' }}</h2>
          <p>这里是后台管理系统，您可以在这里查看用户对话数据统计。</p>
        </div>
        <el-icon class="welcome-icon" :size="64"><Monitor /></el-icon>
      </div>
    </el-card>

    <!-- RAG 记忆管理 -->
    <el-card class="memory-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>RAG 记忆管理</span>
        </div>
      </template>
      <div class="memory-form">
        <el-input-number
          v-model="targetUserId"
          :min="1"
          placeholder="输入用户 ID"
          style="width: 200px"
        />
        <el-button
          type="danger"
          :loading="clearing"
          :disabled="!targetUserId"
          @click="handleClearMemories"
        >
          清空该用户全部记忆
        </el-button>
      </div>
    </el-card>

    <!-- 用户对话统计组件 -->
    <UserChatStats />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Monitor } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'
import { clearUserMemories } from '@/apis/ai'
import UserChatStats from './components/UserChatStats.vue'

const userStore = useUserStore()
const userInfo = ref<any>(userStore.getUserInfo())

const targetUserId = ref<number | null>(null)
const clearing = ref(false)

const handleClearMemories = async () => {
  if (!targetUserId.value) return
  try {
    await ElMessageBox.confirm(
      `确定要清空用户 ${targetUserId.value} 的全部 RAG 记忆吗？此操作不可恢复。`,
      '清空记忆确认',
      { confirmButtonText: '确认清空', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  clearing.value = true
  try {
    const res = await clearUserMemories(targetUserId.value)
    if (res.data.success) {
      ElMessage.success(res.data.message)
      targetUserId.value = null
    } else {
      ElMessage.error(res.data.message || '操作失败')
    }
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '清空失败')
  } finally {
    clearing.value = false
  }
}
</script>

<style scoped>
.welcome-card {
  margin-bottom: 20px;
}

.memory-card {
  margin-bottom: 20px;
}

.card-header {
  font-weight: 600;
  font-size: 16px;
}

.memory-form {
  display: flex;
  align-items: center;
  gap: 12px;
}

.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-text h2 {
  margin: 0 0 8px 0;
  font-size: 22px;
  color: #303133;
}

.welcome-text p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.welcome-icon {
  color: #409EFF;
  opacity: 0.6;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .welcome-card {
    margin-bottom: 12px;
  }

  .memory-form {
    flex-direction: column;
    align-items: stretch;
  }

  .welcome-content {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }

  .welcome-text h2 {
    font-size: 18px;
  }

  .welcome-icon {
    font-size: 40px !important;
  }
}
</style>
