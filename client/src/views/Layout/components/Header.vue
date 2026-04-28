<template>
  <div class="layout-header">
    <!-- 网站标题 -->
    <div class="header-logo">
      <h1>AI 智能对话系统</h1>
    </div>
    
    <!-- 导航菜单 -->
    <div class="header-nav">
      <router-link to="/front/home">首页</router-link>
      <router-link to="/front/chat">AI对话</router-link>
      <router-link v-if="isAdmin" to="/admin/dashboard" class="admin-link">后台管理</router-link>
    </div>
    
    <!-- 用户信息和退出登录 -->
    <div class="header-user">
      <div v-if="userInfo" class="user-info">
        <span class="username">{{ userInfo.username }}</span>
        <el-button 
          type="danger" 
          size="small" 
          @click="handleLogout"
          :loading="logoutLoading"
        >
          退出登录
        </el-button>
      </div>
      <div v-else class="login-register">
        <router-link to="/login">登录</router-link>
        <router-link to="/register">注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 布局头部组件
// 包含网站标题、导航菜单和用户信息

import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/userStore'
import { logout } from '@/apis/user'

// 使用用户 store
const userStore = useUserStore()
const router = useRouter()

// 用户信息
const userInfo = ref<any>(null)
// 退出登录加载状态
const logoutLoading = ref(false)
// 是否为管理员
const isAdmin = ref(false)

// 加载用户信息
const loadUserInfo = () => {
  userInfo.value = userStore.getUserInfo()
  isAdmin.value = userInfo.value?.role === 'admin'
}

// 退出登录
const handleLogout = async () => {
  try {
    logoutLoading.value = true
    await logout()
  } catch {
    // 接口失败（如 token 已过期）仍继续清除本地状态
  }
  // 无论接口成功与否，都清除本地状态并跳转
  userStore.clearUserInfo()
  router.push('/login')
  ElMessage.success('退出登录成功')
  logoutLoading.value = false
}

// 组件挂载时加载用户信息
onMounted(() => {
  loadUserInfo()
})
</script>

<style scoped>
.layout-header {
  background: white;
  padding: 15px 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-logo h1 {
  margin: 0;
  font-size: 20px;
  color: #409EFF;
  font-weight: 600;
}

.header-nav {
  display: flex;
  gap: 20px;
}

.header-nav a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 4px;
  transition: all 0.3s;
}

.header-nav a:hover {
  background: #409EFF;
  color: white;
}

.header-nav a.router-link-active {
  background: #409EFF;
  color: white;
}

.admin-link {
  background: #E6A23C !important;
}

.admin-link:hover {
  background: #d4890e !important;
}

.admin-link.router-link-active {
  background: #E6A23C !important;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.username {
  font-weight: 500;
  color: #333;
}

.login-register {
  display: flex;
  gap: 15px;
}

.login-register a {
  text-decoration: none;
  color: #409EFF;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 4px;
  transition: all 0.3s;
}

.login-register a:hover {
  background: #409EFF;
  color: white;
}
</style>
