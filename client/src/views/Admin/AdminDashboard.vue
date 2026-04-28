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

    <!-- 用户对话统计组件 -->
    <UserChatStats />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Monitor } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'
import UserChatStats from './components/UserChatStats.vue'

const userStore = useUserStore()
const userInfo = ref<any>(userStore.getUserInfo())
</script>

<style scoped>
.welcome-card {
  margin-bottom: 20px;
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
</style>
