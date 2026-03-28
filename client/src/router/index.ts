import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/views/Layout/index.vue'
import Login from '@/views/Login/login.vue'
import Register from '@/views/Register/Register.vue'
import Home from '@/views/Home/home.vue'
import Chat from '@/views/Layout/Chat.vue'

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
        // 其他前台页面路由可以在这里添加
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
  
  // 定义不需要登录就能访问的页面
  const publicPages = ['/login', '/register', '/front/home']
  
  // 检查当前页面是否需要登录
  const requiresAuth = !publicPages.includes(to.path)
  
  // 如果页面需要登录但用户未登录
  if (requiresAuth && !token) {
    // 跳转到登录页面
    next('/login')
  } 
  // 其他情况，允许访问
  else {
    next()
  }
})

export default router
