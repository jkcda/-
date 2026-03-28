import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/views/Layout/index.vue'
import FrontLayout from '@/views/FrontLayout/index.vue'
import Login from '@/views/Login/login.vue'
import Register from '@/views/Register/Register.vue'
import Home from '@/views/Home/home.vue'
import Chat from '@/views/FrontLayout/Chat.vue'

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
      component: FrontLayout,
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
        // 其他前台页面路由可以在这里添加
      ]
    },
    // 后台管理路由 - 仅管理员可访问
    {
      path: '/admin',
      component: Layout,
      children: [
        // 首页
        {
          path: 'home',
          component: () => import('@/views/Dashboard/Home.vue'),
          meta: { title: '首页' }
        },
        // 用户管理
        {
          path: 'user/list',
          component: () => import('@/views/Dashboard/UserList.vue'),
          meta: { title: '用户列表' }
        },
        {
          path: 'user/role',
          component: () => import('@/views/Dashboard/RoleList.vue'),
          meta: { title: '角色管理' }
        },
        // 内容管理
        {
          path: 'content/article',
          component: () => import('@/views/Dashboard/ArticleList.vue'),
          meta: { title: '文章管理' }
        },
        {
          path: 'content/category',
          component: () => import('@/views/Dashboard/CategoryList.vue'),
          meta: { title: '分类管理' }
        },
        // 系统设置
        {
          path: 'system/basic',
          component: () => import('@/views/Dashboard/BasicSetting.vue'),
          meta: { title: '基础设置' }
        },
        {
          path: 'system/log',
          component: () => import('@/views/Dashboard/LogList.vue'),
          meta: { title: '日志管理' }
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
  // 获取本地存储的 token
  const token = localStorage.getItem('token')
  // 获取本地存储的用户信息
  const userInfoStr = localStorage.getItem('userInfo')
  const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null
  
  // 定义不需要登录就能访问的页面
  const publicPages = ['/login', '/register']
  // 定义需要管理员权限的页面
  const adminPages = ['/admin']
  
  // 检查当前页面是否需要登录
  const requiresAuth = !publicPages.includes(to.path)
  // 检查当前页面是否需要管理员权限
  const requiresAdmin = adminPages.some(page => to.path.startsWith(page))
  
  // 如果页面需要登录但用户未登录
  if (requiresAuth && !token) {
    // 跳转到登录页面
    next('/login')
  } 
  // 如果页面需要管理员权限但用户不是管理员
  else if (requiresAdmin && (!userInfo || userInfo.role !== 'admin')) {
    // 跳转到登录页面
    next('/login')
  } 
  // 其他情况，允许访问
  else {
    next()
  }
})

export default router
