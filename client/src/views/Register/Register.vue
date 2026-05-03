<template>
  <div class="auth-form">
    <div class="auth-header">
      <h2 class="auth-form-title">创建账号</h2>
      <p class="auth-form-desc">注册以使用全部功能</p>
    </div>

    <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" label-width="0">
      <el-form-item prop="username">
        <el-input v-model="registerForm.username" placeholder="用户名" :prefix-icon="User" size="large" class="auth-input" />
      </el-form-item>
      <el-form-item prop="email">
        <el-input v-model="registerForm.email" placeholder="邮箱" :prefix-icon="Message" size="large" class="auth-input" />
      </el-form-item>
      <el-form-item prop="password">
        <el-input v-model="registerForm.password" placeholder="密码" :prefix-icon="Lock" type="password" show-password size="large" class="auth-input" />
      </el-form-item>
      <el-form-item prop="confirmPassword">
        <el-input v-model="registerForm.confirmPassword" placeholder="确认密码" :prefix-icon="Lock" type="password" show-password size="large" class="auth-input" />
      </el-form-item>

      <el-button type="primary" size="large" class="auth-btn" :loading="loading" @click="handleRegister">
        注 册
      </el-button>

      <p class="auth-switch">
        已有账号？<router-link to="/auth/login">立即登录</router-link>
      </p>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Message, Lock } from '@element-plus/icons-vue'
import { register as registerApi } from '@/apis/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const registerFormRef = ref()
const loading = ref(false)
const registerForm = reactive({ username: '', email: '', password: '', confirmPassword: '' })

const validateConfirmPassword = (_rule: any, value: string, callback: Function) => {
  callback(value !== registerForm.password ? new Error('两次输入的密码不一致') : undefined)
}

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度3-20位', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
}

const handleRegister = async () => {
  if (!registerFormRef.value) return
  try {
    await registerFormRef.value.validate()
    loading.value = true
    await registerApi({ username: registerForm.username, email: registerForm.email, password: registerForm.password })
    ElMessage.success('注册成功！')
    setTimeout(() => router.push('/auth/login'), 800)
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || error.message || '注册失败')
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
