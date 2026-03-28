import express from 'express'
import { adminMiddleware } from '../middleware/admin.js'
import { authMiddleware } from '../middleware/auth.js'
import { ApiResponse } from '../utils/response.js'

const router = express.Router()

// 所有后台管理接口都需要先认证，再验证管理员权限

// GET /api/admin/dashboard - 后台管理首页
router.get('/dashboard', authMiddleware, adminMiddleware, (req, res) => {
  ApiResponse.success(res, {
    user: (req as any).user
  }, '欢迎访问后台管理系统')
})

// GET /api/admin/users - 获取所有用户列表（仅管理员）
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // 这里可以实现获取用户列表的逻辑
    ApiResponse.success(res, {
      users: [] // 实际开发中从数据库获取
    }, '获取用户列表成功')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
})

// POST /api/admin/users - 创建用户（仅管理员）
router.post('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // 这里可以实现创建用户的逻辑
    ApiResponse.created(res, {
      user: req.body
    }, '创建用户成功')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
})

export default router
