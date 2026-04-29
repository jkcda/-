import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import Layout from '@/views/Layout/index.vue'
import Login from '@/views/Login/login.vue'
import Register from '@/views/Register/Register.vue'
import Home from '@/views/Home/home.vue'
import Chat from '@/views/Chat/index.vue'
import AdminLayout from '@/views/Admin/AdminLayout.vue'
import AdminDashboard from '@/views/Admin/AdminDashboard.vue'
import AdminUsers from '@/views/Admin/AdminUsers.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/front/home',
    },
    // 前台路由 - 普通用户可访问
    {
      path: '/front',
      component: Layout,
      children: [
        {
          path: 'home',
          component: Home,
          meta: { title: '首页' }
        },
        {
          path: 'chat',
          component: Chat,
          meta: { title: 'AI对话' }
        }
      ]
    },
    // 后台路由 - 仅管理员可访问
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAdmin: true },
      children: [
        {
          path: '',
          redirect: '/admin/dashboard'
        },
        {
          path: 'dashboard',
          component: AdminDashboard,
          meta: { title: '对话统计', requiresAdmin: true }
        },
        {
          path: 'users',
          component: AdminUsers,
          meta: { title: '用户管理', requiresAdmin: true }
        }
      ]
    },
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: { title: '登录' }
    },
    {
      path: '/register',
      name: 'Register',
      component: Register,
      meta: { title: '注册' }
    }
  ],
})

// 路由守卫
// 作用：控制页面访问权限
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const userInfoStr = localStorage.getItem('userInfo')

  // 定义不需要登录就能访问的页面
  const publicPages = ['/login', '/register', '/front/home']

  // 检查当前页面是否需要登录
  const requiresAuth = !publicPages.includes(to.path)

  // 如果页面需要登录但用户未登录
  if (requiresAuth && !token) {
    return next('/login')
  }

  // 检查是否需要管理员权限
  if (to.meta.requiresAdmin) {
    if (userInfoStr) {
      try {
        const userInfo = JSON.parse(userInfoStr)
        if (userInfo.role !== 'admin') {
          ElMessage.error('无管理员权限，无法访问后台')
          return next('/front/home')
        }
      } catch {
        return next('/login')
      }
    } else {
      return next('/login')
    }
  }

  next()
})

export default router
