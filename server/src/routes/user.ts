import express from 'express'
import { register, login, getUserInfo } from '../controllers/user.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// POST /api/user/register - 用户注册
router.post('/register', register)

// POST /api/user/login - 用户登录
router.post('/login', login)

// GET /api/user/info - 获取用户信息（需要认证）
router.get('/info', authMiddleware, getUserInfo)

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
