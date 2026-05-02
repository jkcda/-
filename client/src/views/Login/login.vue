<template>
  <div class="login-container">
    <div class="login-form-wrapper">
      <!-- 登录表单卡片 -->
      <el-card class="login-card rune-corner" shadow="hover">
        <!-- 卡片头部：标题 + 管理员登录切换 -->
        <template #header>
          <div class="card-header">
            <div class="login-title">
              <h2>{{ isAdmin ? '管理员登录' : '用户登录' }}</h2>
              <p>{{ isAdmin ? '请输入管理员账号和密码' : '请输入您的账号和密码' }}</p>
            </div>
            <el-switch 
              v-model="isAdmin" 
              active-text="管理员"
              inactive-text="普通用户"
              size="large"
              class="admin-switch"
            />
          </div>
        </template>
        
        <!-- 登录表单 -->
        <el-form 
          ref="loginFormRef" 
          :model="loginForm" 
          :rules="LoginRules" 
          label-width="0"
          class="login-form"
        >
          <!-- 用户名输入 -->
          <el-form-item prop="username">
            <el-input 
              v-model="loginForm.username" 
              placeholder="请输入用户名" 
              prefix-icon="User"
              size="large"
            />
          </el-form-item>
          
          <!-- 密码输入 -->
          <el-form-item prop="password">
            <el-input 
              v-model="loginForm.password" 
              placeholder="请输入密码" 
              prefix-icon="Lock" 
              type="password"
              show-password
              size="large"
            />
          </el-form-item>
          
          <!-- 记住我和忘记密码 -->
          <el-form-item class="form-footer-item">
            <div class="form-footer">
              <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
              <el-link type="primary" :underline="false">忘记密码?</el-link>
            </div>
          </el-form-item>

          <!-- 注册账号 -->
          <el-form-item>
            <div class="register-link">
              <router-link to="/register">注册账号</router-link>
            </div>
          </el-form-item>
          
          <!-- 登录按钮 -->
          <el-form-item>
            <el-button 
              type="primary" 
              @click="handleLogin" 
              :loading="loading"
              size="large"
              class="login-btn"
            >
              {{ isAdmin ? '管理员登录' : '登录' }}
            </el-button>
          </el-form-item>
          
          <!-- 其他登录方式 -->
          <div class="other-login">
            <span>其他登录方式</span>
            <div class="social-login">
              <el-icon class="social-icon"><Platform /></el-icon>
              <el-icon class="social-icon"><ChatDotRound /></el-icon>
              <el-icon class="social-icon"><Phone /></el-icon>
            </div>
          </div>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Platform, ChatDotRound, Phone } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/userStore'
import { login } from '@/apis/user'
import type { FormInstance } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

// 表单引用
const loginFormRef = ref<FormInstance>()

// 加载状态
const loading = ref(false)

// 是否为管理员登录
const isAdmin = ref(false)

// 登录表单数据
const loginForm = ref({
  username: '', // 用户名
  password: '', // 密码
  remember: false // 记住我
})

// 登录表单验证规则
const LoginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 14, message: '密码长度在6-14个字符之间' }
  ]
}

// 登录处理函数
const handleLogin = async () => {
  // 1. 表单验证
  if (!loginFormRef.value) return
  
  try {
    await loginFormRef.value.validate()
    
    // 2. 显示加载状态
    loading.value = true
    
    // 3. 调用登录 API
    const response = await login({
      username: loginForm.value.username,
      password: loginForm.value.password
    })
    
    console.log('登录响应:', response)
    
    // 4. 登录成功处理
    if (response.data.success) {
      // 5. 获取用户信息
      const { token, user } = response.data.result
      console.log('登录成功:', token, user)
      
      // 6. 权限校验：检查登录模式与用户角色是否匹配
      if (isAdmin.value && user.role !== 'admin') {
        ElMessage.error('该账号不是管理员账号，无法使用管理员登录界面')
        return
      }
      
      if (!isAdmin.value && user.role === 'admin') {
        ElMessage.error('管理员账号请使用管理员登录界面')
        return
      }
      
      // 7. 保存 token 和用户信息到 store
      userStore.setToken(token)
      userStore.setUserInfo(user)
      
      // 8. 显示成功消息
      ElMessage.success('登录成功！')
      
      // 9. 根据用户角色跳转
      setTimeout(() => {
        if (user.role === 'admin') {
          // 管理员跳转到后台管理页面
          router.push('/admin')
        } else {
          // 普通用户跳转到首页
          router.push('/')
        }
      }, 1000)
    }
  } catch (error: any) {
    console.error('登录失败:', error)
    // 显示错误信息
    ElMessage.error(error.message || '登录失败，请稍后重试')
  } finally {
    // 7. 隐藏加载状态
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--color-bg-deep);
  padding: 20px;
}

.login-form-wrapper {
  width: 100%;
  max-width: 400px;
}

.login-card {
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow: var(--shadow-dialog);
  border: var(--border-game) var(--color-border);
  background: var(--color-bg-card);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.login-title {
  flex: 1;

  h2 {
    font-family: var(--font-pixel);
    font-size: 16px;
    color: var(--color-magic-gold);
    text-shadow: 0 0 10px var(--color-gold-glow);
    margin-bottom: 8px;
    image-rendering: pixelated;
  }

  p {
    font-size: 14px;
    color: var(--color-text-secondary);
  }
}

.admin-switch {
  flex-shrink: 0;
}

.login-form {
  padding: 0 20px 20px;
}

.el-form-item {
  margin-bottom: 20px;
}

.form-footer-item {
  margin-bottom: 10px;
}

.form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.register-link {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;

  :deep(.el-link) {
    color: var(--color-magic-gold);
  }
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
}

.other-login {
  margin-top: 20px;
  text-align: center;

  span {
    display: block;
    font-size: 14px;
    color: var(--color-text-muted);
    margin-bottom: 15px;
    position: relative;

    &::before,
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 35%;
      height: 1px;
      background: var(--color-border);
    }

    &::before { left: 0; }
    &::after { right: 0; }
  }
}

.social-login {
  display: flex;
  justify-content: center;
  gap: 30px;

  .social-icon {
    font-size: 24px;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: color var(--transition-normal);

    &:hover {
      color: var(--color-magic-gold);
    }
  }
}

@media (max-width: 768px) {
  .login-container { padding: 16px; }
  .login-form-wrapper { max-width: 100%; }
  .card-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .login-title h2 { font-size: 14px; }
}

@media (max-width: 480px) {
  .login-container { align-items: flex-start; padding: 40px 12px; }
  .login-form { padding: 0 12px 12px; }
  .admin-switch { width: 100%; }
}
</style>
