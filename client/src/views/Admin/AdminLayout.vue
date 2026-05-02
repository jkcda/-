<template>
  <div class="admin-layout">
    <!-- 移动端遮罩 -->
    <div v-if="mobileSidebarOpen" class="mobile-sidebar-overlay" @click="mobileSidebarOpen = false"></div>

    <!-- 侧边栏 -->
    <div class="admin-sidebar" :class="{ collapsed: isCollapsed, 'mobile-open': mobileSidebarOpen }">
      <div class="sidebar-header">
        <h2>{{ isCollapsed ? 'NEXUS' : 'NEXUS 控制台' }}</h2>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        router
        @select="mobileSidebarOpen = false"
      >
        <el-menu-item index="/admin/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>对话统计</span>
        </el-menu-item>
        <el-menu-item index="/admin/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
      </el-menu>
      <div class="sidebar-collapse" @click="toggleSidebar">
        <el-icon :class="{ rotated: isCollapsed && !isMobile }">
          <Fold />
        </el-icon>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="admin-main" :class="{ expanded: isCollapsed }">
      <!-- 顶部导航 -->
      <div class="admin-header">
        <div class="header-left">
          <el-button class="mobile-menu-btn" size="small" text @click="mobileSidebarOpen = true">
            <el-icon :size="18"><Menu /></el-icon>
          </el-button>
          <el-breadcrumb>
            <el-breadcrumb-item :to="{ path: '/admin/dashboard' }">后台管理</el-breadcrumb-item>
            <el-breadcrumb-item>{{ pageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <span class="admin-username">{{ userInfo?.username }}</span>
          <el-button size="small" @click="goToFront">返回前台</el-button>
          <el-button size="small" type="danger" @click="handleLogout">退出登录</el-button>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="admin-content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DataAnalysis, User, Fold, Menu } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'
import { logout } from '@/apis/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isMobile = ref(window.innerWidth < 768)
const isCollapsed = ref(isMobile.value)
const mobileSidebarOpen = ref(false)
const userInfo = ref<any>(userStore.getUserInfo())

const toggleSidebar = () => {
  if (isMobile.value) {
    mobileSidebarOpen.value = !mobileSidebarOpen.value
  } else {
    isCollapsed.value = !isCollapsed.value
  }
}

const handleResize = () => {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) {
    mobileSidebarOpen.value = false
    isCollapsed.value = false
  } else {
    isCollapsed.value = true
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

const activeMenu = computed(() => route.path)

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/admin/dashboard': '对话统计',
    '/admin/users': '用户管理'
  }
  return titles[route.path] || '后台管理'
})

const goToFront = () => {
  router.push('/front/home')
}

const handleLogout = async () => {
  try {
    await logout()
  } catch {
    // 接口失败（如 token 已过期）仍继续清除本地状态
  }
  userStore.clearUserInfo()
  router.push('/login')
  ElMessage.success('退出登录成功')
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  height: 100vh;
}

.admin-sidebar {
  width: 220px;
  background: var(--color-bg-card);
  border-right: var(--border-thin) var(--color-border);
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 100;
}

.admin-sidebar.collapsed {
  width: 64px;
}

.sidebar-header {
  padding: 20px 16px;
  color: var(--color-silver);
  text-align: center;
  border-bottom: var(--border-thin) var(--color-border);
}

.sidebar-header h2 {
  margin: 0;
  font-family: var(--font-pixel);
  font-size: 12px;
  color: var(--color-magic-gold);
  text-shadow: 0 0 8px var(--color-gold-glow);
  white-space: nowrap;
  overflow: hidden;
}

.admin-sidebar.collapsed .sidebar-header h2 {
  font-size: 14px;
}

.admin-sidebar :deep(.el-menu) {
  border-right: none;
  flex: 1;
}

.sidebar-collapse {
  padding: 12px;
  text-align: center;
  color: var(--color-text-muted);
  cursor: pointer;
  border-top: var(--border-thin) var(--color-border);
  font-size: 18px;
}

.sidebar-collapse:hover {
  color: var(--color-magic-gold);
}

.rotated {
  transform: rotate(180deg);
}

.admin-main {
  margin-left: 220px;
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s;
  overflow-y: auto;
  background: var(--color-bg-deep);
}

.admin-main.expanded {
  margin-left: 64px;
}

.admin-header {
  background: var(--color-bg-card);
  border-bottom: var(--border-thin) var(--color-border);
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--shadow-card);
  position: sticky;
  top: 0;
  z-index: 99;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-username {
  color: var(--color-text-secondary);  font-size: 14px;
}

.admin-content {
  padding: 24px;
  flex: 1;
}

/* 移动端菜单按钮 */
.mobile-menu-btn {
  display: none;
  color: var(--color-text-secondary);}

.mobile-sidebar-overlay {
  display: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .mobile-menu-btn {
    display: inline-flex;
    margin-right: 8px;
  }

  .mobile-sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: var(--color-bg-overlay);
    z-index: 99;
  }

  .admin-sidebar {
    left: -220px;
    transition: left 0.3s ease;
    z-index: 100;
  }

  .admin-sidebar.mobile-open {
    left: 0;
  }

  .admin-sidebar.collapsed {
    width: 220px;
  }

  .admin-main {
    margin-left: 0 !important;
  }

  .admin-main.expanded {
    margin-left: 0 !important;
  }

  .admin-header {
    padding: 8px 12px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .header-left {
    flex: 1;
    min-width: 0;
  }

  .header-right {
    flex-wrap: wrap;
    gap: 6px;
    font-size: 12px;
  }

  .header-right .el-button {
    font-size: 12px;
    padding: 5px 10px;
  }

  .admin-content {
    padding: 12px;
  }

  .admin-username {
    display: none;
  }
}
</style>
