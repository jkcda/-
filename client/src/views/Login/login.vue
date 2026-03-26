<template>
  <div class="login-container">
    <div class="login-form-wrapper">
      <!-- 登录表单卡片 -->
      <el-card class="login-card" shadow="hover">
        <!-- 标题 -->
        <template #header>
          <div class="login-title">
            <h2>用户登录</h2>
            <p>请输入您的账号和密码</p>
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
          
          <!-- 记住我 -->
          <el-form-item>
            <div class="form-footer">
              <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
              <el-link type="primary" :underline="false">忘记密码?</el-link>
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
              登录
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
import { ref} from 'vue'
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

// 登录表单数据
const loginForm = ref({
  username: '', // 用户名
  password: '', // 密码
  remember: false // 记住我
})
//2.登录表单验证规则
const LoginRules = {
  username:[
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password:[
    { required: true, message: '请输入密码', trigger: 'blur' },
    {min:6,max:14,message:'密码长度在6-14个字符之间'}
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
      ElMessage.success('登录成功！')
      
      // 5. 保存 token 和用户信息到 store
      const { token, user } = response.data.data
      userStore.setToken(token)
      userStore.setUserInfo(user)
      
      // 6. 跳转到首页
      setTimeout(() => {
        router.push('/')
      }, 1000)
    }
  } catch (error: any) {
    console.error('登录失败:', error)
  
  } finally {
    // 8. 隐藏加载状态
    loading.value = false
  }
}

</script>

<style scoped lang="scss">
// 登录容器 - 使用 flex 布局居中
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

// 表单包装器
.login-form-wrapper {
  width: 100%;
  max-width: 400px;
}

// 登录卡片
.login-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

// 标题样式
.login-title {
  text-align: center;
  margin-bottom: 20px;
  
  h2 {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
  }
  
  p {
    font-size: 14px;
    color: #666;
  }
}

// 登录表单
.login-form {
  padding: 0 20px 20px;
}

// 表单项间距
.el-form-item {
  margin-bottom: 20px;
}

// 表单底部
.form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

// 登录按钮
.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
}

// 其他登录方式
.other-login {
  margin-top: 20px;
  text-align: center;
  
  span {
    display: block;
    font-size: 14px;
    color: #999;
    margin-bottom: 15px;
    position: relative;
    
    &::before,
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 35%;
      height: 1px;
      background: #eaeaea;
    }
    
    &::before {
      left: 0;
    }
    
    &::after {
      right: 0;
    }
  }
}

// 社交登录图标
.social-login {
  display: flex;
  justify-content: center;
  gap: 30px;
  
  .social-icon {
    font-size: 24px;
    color: #999;
    cursor: pointer;
    transition: color 0.3s;
    
    &:hover {
      color: #667eea;
    }
  }
}

// 响应式设计
@media (max-width: 480px) {
  .login-form-wrapper {
    max-width: 100%;
  }
  
  .login-title h2 {
    font-size: 20px;
  }
}
</style>