<template>
  <div class="auth-form">
    <div class="auth-header">
      <h2 class="auth-form-title">{{ isAdmin ? '管理员登录' : '登录' }}</h2>
      <p class="auth-form-desc">{{ isAdmin ? '请输入管理员账号' : '欢迎回来，请登录您的账号' }}</p>
    </div>

    <el-form ref="loginFormRef" :model="loginForm" :rules="LoginRules" label-width="0">
      <el-form-item prop="username">
        <el-input
          v-model="loginForm.username"
          placeholder="用户名"
          :prefix-icon="User"
          size="large"
          class="auth-input"
        />
      </el-form-item>

      <el-form-item prop="password">
        <el-input
          v-model="loginForm.password"
          placeholder="密码"
          :prefix-icon="Lock"
          type="password"
          show-password
          size="large"
          class="auth-input"
        />
      </el-form-item>

      <div class="auth-options">
        <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
        <el-switch v-model="isAdmin" size="small" active-text="管理员" style="--el-switch-on-color: var(--color-magic-gold)" />
      </div>

      <el-button type="primary" size="large" class="auth-btn" :loading="loading" @click="handleLogin">
        {{ isAdmin ? '管理员登录' : '登 录' }}
      </el-button>

      <p class="auth-switch">
        还没有账号？<router-link to="/auth/register">立即注册</router-link>
      </p>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { User, Lock } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/userStore'
import { login } from '@/apis/user'
import type { FormInstance } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const loginFormRef = ref<FormInstance>()
const loading = ref(false)
const isAdmin = ref(false)

const loginForm = ref({ username: '', password: '', remember: false })

const LoginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 14, message: '密码长度6-14位', trigger: 'blur' },
  ],
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  try {
    await loginFormRef.value.validate()
    loading.value = true
    const response = await login({ username: loginForm.value.username, password: loginForm.value.password })
    if (response.data.success) {
      const { token, user } = response.data.result
      if (isAdmin.value && user.role !== 'admin') return ElMessage.error('该账号不是管理员')
      if (!isAdmin.value && user.role === 'admin') return ElMessage.error('管理员请使用管理员入口')
      userStore.setToken(token)
      userStore.setUserInfo(user)
      ElMessage.success('登录成功！')
      setTimeout(() => router.push(user.role === 'admin' ? '/admin' : '/'), 800)
    }
  } catch (error: any) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.auth-form {
  width: 100%;
  max-width: 360px;
}

.auth-header {
  margin-bottom: 32px;
}

.auth-form-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.auth-form-desc {
  font-size: 14px;
  color: var(--color-text-muted);
}

.auth-input {
  :deep(.el-input__wrapper) {
    background: var(--color-bg-input);
    border: 1px solid var(--color-border);
    box-shadow: none;
    border-radius: 8px;
    padding: 4px 12px;
    transition: border-color 0.2s;

    &:hover, &.is-focus { border-color: var(--color-magic-gold); }
  }
}

.auth-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.auth-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.auth-switch {
  text-align: center;
  font-size: 13px;
  color: var(--color-text-muted);

  a {
    color: var(--color-magic-gold);
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }
}
</style>
