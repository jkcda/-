<template>
  <div class="verify-page">
    <div class="verify-card">
      <el-icon v-if="loading" class="verify-icon is-loading" :size="40"><Loading /></el-icon>
      <el-icon v-else-if="success" class="verify-icon success" :size="40"><CircleCheck /></el-icon>
      <el-icon v-else class="verify-icon icon-normal" :size="40"><Message /></el-icon>

      <h2 v-if="success">验证成功！</h2>
      <h2 v-else>验证邮箱</h2>

      <p v-if="success">现在可以登录了</p>
      <p v-else>请输入发送到 <strong>{{ email }}</strong> 的6位验证码</p>

      <div v-if="!success" class="code-input-wrap">
        <el-input
          v-model="code"
          placeholder="000000"
          maxlength="6"
          size="large"
          class="code-input"
          :disabled="loading"
          @input="onCodeInput"
        />
      </div>

      <el-button
        v-if="!success"
        type="primary"
        size="large"
        class="verify-btn"
        :loading="loading"
        :disabled="code.length < 6"
        @click="handleVerify"
      >
        验证
      </el-button>

      <el-button v-else type="primary" style="margin-top:20px" @click="$router.push('/auth/login')">
        去登录
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Loading, CircleCheck, Message } from '@element-plus/icons-vue'
import { verifyEmail } from '@/apis/user'
import { ElMessage } from 'element-plus'

const route = useRoute()
const email = ref((route.query.email as string) || '')
const code = ref('')
const loading = ref(false)
const success = ref(false)

function onCodeInput(val: string) {
  code.value = val.replace(/\D/g, '')
}

async function handleVerify() {
  if (code.value.length < 6) return
  loading.value = true
  try {
    await verifyEmail({ email: email.value, code: code.value })
    success.value = true
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '验证失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.verify-page {
  display: flex; align-items: center; justify-content: center;
  height: 100vh; height: 100dvh; background: var(--color-bg-deep);
}
.verify-card {
  text-align: center; padding: 48px; max-width: 400px; width: 100%;
  background: var(--color-bg-card); border-radius: 16px;
  border: 1px solid var(--color-border);
  h2 { margin: 16px 0 8px; color: var(--color-text-primary); }
  p { color: var(--color-text-muted); font-size: 14px; margin-bottom: 20px; }
}
.verify-icon.success { color: #67c23a; }
.verify-icon.icon-normal { color: var(--color-magic-gold); }
.code-input-wrap { margin-bottom: 16px; }
.code-input :deep(.el-input__wrapper) {
  background: var(--color-bg-input);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}
.code-input :deep(input) {
  font-size: 28px; letter-spacing: 12px; text-align: center;
  font-family: 'Courier New', monospace; color: var(--color-magic-gold);
}
.verify-btn { width: 100%; }
</style>
