import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import Layout from '@/views/Layout/index.vue'
import AuthLayout from '@/views/Auth/AuthLayout.vue'
import Login from '@/views/Login/login.vue'
import Register from '@/views/Register/Register.vue'
import VerifyEmail from '@/views/Auth/VerifyEmail.vue'
import Home from '@/views/Home/home.vue'
import Chat from '@/views/Chat/index.vue'
import KnowledgeBase from '@/views/KnowledgeBase/index.vue'
import AgentManager from '@/views/Agent/AgentManager.vue'
import AdminLayout from '@/views/Admin/AdminLayout.vue'
import AdminDashboard from '@/views/Admin/AdminDashboard.vue'
import AdminUsers from '@/views/Admin/AdminUsers.vue'
import AdminApiKeys from '@/views/Admin/ApiKeys.vue'
import AdminProviders from '@/views/Admin/Providers.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 前台路由 - 首页即根路径
    {
      path: '/',
      component: Layout,
      children: [
        {
          path: '',
          component: Home,
          meta: { title: '首页' }
        },
        {
          path: 'chat',
          component: Chat,
          meta: { title: 'AI对话' }
        },
        {
          path: 'knowledge-base',
          component: KnowledgeBase,
          meta: { title: '知识库' }
        },
        {
          path: 'agents',
          component: AgentManager,
          meta: { title: '角色管理', requiresAuth: true }
        },
        {
          path: 'rooms',
          component: () => import('@/views/Room/index.vue'),
          meta: { title: '聊天室', requiresAuth: true }
        },
        {
          path: 'room/:id',
          component: () => import('@/views/Room/RoomChat.vue'),
          meta: { title: '聊天室', requiresAuth: true }
        }
      ]
    },
    // 后台路由
    {
      path: '/admin',
      component: AdminLayout,
      redirect: '/admin/providers',
      children: [
        {
          path: 'dashboard',
          component: AdminDashboard,
          meta: { title: '对话统计', requiresAdmin: true }
        },
        {
          path: 'users',
          component: AdminUsers,
          meta: { title: '用户管理', requiresAdmin: true }
        },
        {
          path: 'api-keys',
          component: AdminApiKeys,
          meta: { title: 'API Key 管理', requiresAdmin: true }
        },
        {
          path: 'providers',
          component: AdminProviders,
          meta: { title: '模型供应商配置' }
        }
      ]
    },
    // 认证页面（登录/注册）— 背景图 + 左侧介绍 + 右侧表单
    {
      path: '/auth',
      component: AuthLayout,
      children: [
        {
          path: 'login',
          name: 'Login',
          component: Login,
          meta: { title: '登录' }
        },
        {
          path: 'register',
          name: 'Register',
          component: Register,
          meta: { title: '注册' }
        },
        {
          path: '',
          redirect: '/auth/login'
        }
      ]
    },
    {
      path: '/verify',
      component: VerifyEmail,
      meta: { title: '邮箱验证' }
    },
    // 旧路由重定向
    { path: '/login', redirect: '/auth/login' },
    { path: '/register', redirect: '/auth/register' },
  ],
})

// 路由守卫
// 作用：控制页面访问权限
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const userInfoStr = localStorage.getItem('userInfo')

  // 游客可访问的页面（无需登录）
  const guestPages = ['/auth/login', '/auth/register', '/verify', '/login', '/register', '/', '/chat']

  // 检查是否需要登录
  if (!token && !guestPages.includes(to.path)) {
    return next('/auth/login')
  }

  // 检查是否需要管理员权限
  if (to.meta.requiresAdmin) {
    if (userInfoStr) {
      try {
        const userInfo = JSON.parse(userInfoStr)
        if (userInfo.role !== 'admin') {
          ElMessage.error('无管理员权限，无法访问后台')
          return next('/')
        }
      } catch {
        return next('/auth/login')
      }
    } else {
      return next('/auth/login')
    }
  }

  next()
})

export default router
