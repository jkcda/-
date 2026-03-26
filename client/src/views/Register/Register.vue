<template>
  <div class="register-container">
    <div class="register-form-wrapper">
      <!-- 注册表单卡片 -->
      <el-card class="register-card" shadow="hover">
        <!-- 标题 -->
        <template #header>
          <div class="register-title">
            <h2>用户注册</h2>
            <p>创建您的账号</p>
          </div>
        </template>
        
        <!-- 注册表单 -->
        <el-form 
          ref="registerFormRef" 
          :model="registerForm" 
          :rules="registerRules" 
          label-width="0"
          class="register-form"
        >
          <!-- 用户名输入 -->
          <el-form-item prop="username">
            <el-input 
              v-model="registerForm.username" 
              placeholder="请输入用户名" 
              prefix-icon="User"
              size="large"
            />
          </el-form-item>
          
          <!-- 邮箱输入 -->
          <el-form-item prop="email">
            <el-input 
              v-model="registerForm.email" 
              placeholder="请输入邮箱" 
              prefix-icon="Message"
              size="large"
            />
          </el-form-item>
          
          <!-- 密码输入 -->
          <el-form-item prop="password">
            <el-input 
              v-model="registerForm.password" 
              placeholder="请输入密码" 
              prefix-icon="Lock" 
              type="password"
              show-password
              size="large"
            />
          </el-form-item>
          
          <!-- 确认密码 -->
          <el-form-item prop="confirmPassword">
            <el-input 
              v-model="registerForm.confirmPassword" 
              placeholder="请确认密码" 
              prefix-icon="Lock" 
              type="password"
              show-password
              size="large"
            />
          </el-form-item>
          
          <!-- 注册按钮 -->
          <el-form-item>
            <el-button 
              type="primary" 
              @click="handleRegister" 
              :loading="loading"
              size="large"
              class="register-btn"
            >
              注册
            </el-button>
          </el-form-item>
          
          <!-- 已有账号，去登录 -->
          <div class="login-link">
            <span>已有账号？</span>
            <el-link type="primary" @click="goToLogin">立即登录</el-link>
          </div>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Message, Lock } from '@element-plus/icons-vue'
import { register as registerApi } from '@/apis/user'
import { ElMessage } from 'element-plus'

// 路由实例
const router = useRouter()

// 表单引用
const registerFormRef = ref()

// 加载状态
const loading = ref(false)

// 注册表单数据
const registerForm = reactive({
  username: '', // 用户名
  email: '', // 邮箱
  password: '', // 密码
  confirmPassword: '' // 确认密码
})

// 自定义验证器：确认密码
const validateConfirmPassword = (rule: any, value: string, callback: Function) => {
  if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

// 表单验证规则
const registerRules = {
  // 用户名验证
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3-20 之间', trigger: 'blur' }
  ],
  // 邮箱验证
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  // 密码验证
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 位', trigger: 'blur' }
  ],
  // 确认密码验证
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

// 注册处理函数
const handleRegister = async () => {
  if (!registerFormRef.value) return
  
  try {
    // 验证表单
    await registerFormRef.value.validate()
    
    // 显示加载状态
    loading.value = true
    
    // 调用注册 API
    const response = await registerApi({
      username: registerForm.username,
      email: registerForm.email,
      password: registerForm.password
    })
    
    console.log('注册响应:', response)
    
    // 注册成功提示
    ElMessage.success('注册成功！')
    
    // 跳转到登录页
    setTimeout(() => {
      router.push('/login')
    }, 1000)
    
  } catch (error: any) {
    console.error('注册失败:', error)
    
    // 错误提示
    if (error.response) {
      ElMessage.error(error.response.data?.message || '注册失败')
    } else {
      ElMessage.error('网络错误，请稍后重试')
    }
  } finally {
    // 隐藏加载状态
    loading.value = false
  }
}

// 跳转到登录页
const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped lang="scss">
// 注册容器 - 使用 flex 布局居中
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

// 表单包装器
.register-form-wrapper {
  width: 100%;
  max-width: 400px;
}

// 注册卡片
.register-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

// 标题样式
.register-title {
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

// 注册表单
.register-form {
  padding: 0 20px 20px;
}

// 表单项间距
.el-form-item {
  margin-bottom: 20px;
}

// 注册按钮
.register-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
}

// 登录链接
.login-link {
  text-align: center;
  margin-top: 20px;
  
  span {
    color: #666;
    font-size: 14px;
  }
}

// 响应式设计
@media (max-width: 480px) {
  .register-form-wrapper {
    max-width: 100%;
  }
  
  .register-title h2 {
    font-size: 20px;
  }
}
</style>
