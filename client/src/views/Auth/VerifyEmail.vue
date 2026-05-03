<template>
  <div class="verify-page">
    <div class="verify-card">
      <el-icon v-if="status === 'loading'" class="verify-icon is-loading" :size="40"><Loading /></el-icon>
      <el-icon v-else-if="status === 'success'" class="verify-icon success" :size="40"><CircleCheck /></el-icon>
      <el-icon v-else class="verify-icon error" :size="40"><CircleClose /></el-icon>
      <h2>{{ status === 'loading' ? '正在验证...' : status === 'success' ? '验证成功！' : '验证失败' }}</h2>
      <p>{{ message }}</p>
      <el-button v-if="status !== 'loading'" type="primary" style="margin-top:20px" @click="$router.push('/auth/login')">去登录</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Loading, CircleCheck, CircleClose } from '@element-plus/icons-vue'

const route = useRoute()
const status = ref<'loading' | 'success' | 'error'>('loading')
const message = ref('正在验证您的邮箱...')

onMounted(async () => {
  const token = route.query.token as string
  if (!token) {
    status.value = 'error'
    message.value = '缺少验证令牌'
    return
  }
  try {
    const res = await fetch(`/api/user/verify-email?token=${encodeURIComponent(token)}`)
    const data = await res.json()
    if (data.success) {
      status.value = 'success'
      message.value = '邮箱验证成功，现在可以登录了！'
    } else {
      status.value = 'error'
      message.value = data.message || '验证失败'
    }
  } catch {
    status.value = 'error'
    message.value = '网络错误，请稍后重试'
  }
})
</script>

<style scoped lang="scss">
.verify-page {
  display: flex; align-items: center; justify-content: center;
  height: 100vh; background: var(--color-bg-deep);
}
.verify-card {
  text-align: center; padding: 48px; max-width: 400px;
  background: var(--color-bg-card); border-radius: 16px;
  border: 1px solid var(--color-border);
  h2 { margin: 16px 0 8px; color: var(--color-text-primary); }
  p { color: var(--color-text-muted); font-size: 14px; }
}
.verify-icon.success { color: #67c23a; }
.verify-icon.error { color: #f56c6c; }
</style>
