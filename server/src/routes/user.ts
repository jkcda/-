import express from 'express'
import { register, login, getUserInfo, verifyEmail, wxLogin } from '../controllers/user.js'
import { authMiddleware } from '../middleware/auth.js'
import { ChatHistoryModel } from '../models/chatHistory.js'
import { ApiResponse } from '../utils/response.js'

const router = express.Router()

// POST /api/user/register - 用户注册（发送验证邮件）
router.post('/register', register)

// POST /api/user/verify-email - 邮箱验证（6位验证码）
router.post('/verify-email', verifyEmail)

// POST /api/user/login - 用户登录
router.post('/login', login)

// POST /api/user/wx-login - 微信小程序登录
router.post('/wx-login', wxLogin)

// GET /api/user/info - 获取用户信息（需要认证）
router.get('/info', authMiddleware, getUserInfo)

// POST /api/user/logout - 用户退出登录（不需要认证，前端已清除 token）
router.post('/logout', async (req, res) => {
  try {
    // 退出登录只返回成功，前端负责清除 token
    ApiResponse.success(res, null, '退出登录成功')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '退出登录失败', error.message)
  }
})

// GET /api/user
router.get('/', (req, res) => {
  res.json({ message: 'User route' })
})

// GET /api/user/:id
router.get('/:id', (req, res) => {
  const { id } = req.params
  res.json({ id, message: 'User detail' })
})

export default router
