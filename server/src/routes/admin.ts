import express from 'express'
import bcrypt from 'bcryptjs'
import { adminMiddleware } from '../middleware/admin.js'
import { authMiddleware } from '../middleware/auth.js'
import { ApiResponse } from '../utils/response.js'
import { ChatHistoryModel } from '../models/chatHistory.js'
import { UserModel } from '../models/user.js'
import pool from '../utils/db.js'

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
    const [rows] = await pool.execute(
      'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
    )
    ApiResponse.success(res, { users: rows }, '获取用户列表成功')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
})

// POST /api/admin/users - 创建用户（仅管理员）
router.post('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username, email, password, role } = req.body

    // 参数验证
    if (!username || !email || !password) {
      return ApiResponse.badRequest(res, '用户名、邮箱和密码为必填项')
    }
    if (username.length < 3 || username.length > 20) {
      return ApiResponse.badRequest(res, '用户名长度需在3-20个字符之间')
    }
    if (password.length < 6) {
      return ApiResponse.badRequest(res, '密码长度至少6位')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return ApiResponse.badRequest(res, '邮箱格式不正确')
    }

    // 检查用户名是否已存在
    const existingUser = await UserModel.findByUsername(username)
    if (existingUser) {
      return ApiResponse.badRequest(res, '用户名已存在')
    }

    // 检查邮箱是否已存在
    const existingEmail = await UserModel.findByEmail(email)
    if (existingEmail) {
      return ApiResponse.badRequest(res, '邮箱已被注册')
    }

    // 密码加密
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // 创建用户
    const userId = await UserModel.create({
      username,
      email,
      password: hashedPassword,
      role: role === 'admin' ? 'admin' : 'user'
    })

    ApiResponse.created(res, {
      user: { id: userId, username, email, role: role === 'admin' ? 'admin' : 'user' }
    }, '创建用户成功')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
})

// PUT /api/admin/users/:id - 更新用户信息（仅管理员）
router.put('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = parseInt(String(req.params.id), 10)
    if (isNaN(userId)) {
      return ApiResponse.badRequest(res, '无效的用户ID')
    }

    const { username, email, password, role } = req.body

    // 检查用户是否存在
    const user = await UserModel.findById(userId)
    if (!user) {
      return ApiResponse.notFound(res, '用户不存在')
    }

    // 检查用户名唯一性
    if (username && username !== user.username) {
      if (username.length < 3 || username.length > 20) {
        return ApiResponse.badRequest(res, '用户名长度需在3-20个字符之间')
      }
      const existingUser = await UserModel.findByUsername(username)
      if (existingUser) {
        return ApiResponse.badRequest(res, '用户名已存在')
      }
    }

    // 检查邮箱唯一性
    if (email && email !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return ApiResponse.badRequest(res, '邮箱格式不正确')
      }
      const existingEmail = await UserModel.findByEmail(email)
      if (existingEmail) {
        return ApiResponse.badRequest(res, '邮箱已被注册')
      }
    }

    // 构建更新字段
    const updates: string[] = []
    const params: any[] = []

    if (username) {
      updates.push('username = ?')
      params.push(username)
    }
    if (email) {
      updates.push('email = ?')
      params.push(email)
    }
    if (password) {
      if (password.length < 6) {
        return ApiResponse.badRequest(res, '密码长度至少6位')
      }
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(password, salt)
      updates.push('password = ?')
      params.push(hashedPassword)
    }
    if (role) {
      if (!['admin', 'user'].includes(role)) {
        return ApiResponse.badRequest(res, '角色值无效，只能为 admin 或 user')
      }
      updates.push('role = ?')
      params.push(role)
    }

    if (updates.length === 0) {
      return ApiResponse.badRequest(res, '没有需要更新的字段')
    }

    params.push(userId)
    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    )

    const updatedUser = await UserModel.findById(userId)
    const { password: _, ...userWithoutPassword } = updatedUser!

    ApiResponse.success(res, { user: userWithoutPassword }, '更新用户成功')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
})

// DELETE /api/admin/users/:id - 删除用户（仅管理员）
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = parseInt(String(req.params.id), 10)
    if (isNaN(userId)) {
      return ApiResponse.badRequest(res, '无效的用户ID')
    }

    // 检查用户是否存在
    const user = await UserModel.findById(userId)
    if (!user) {
      return ApiResponse.notFound(res, '用户不存在')
    }

    // 不能删除自己
    const currentUser = (req as any).user
    if (currentUser.id === userId) {
      return ApiResponse.badRequest(res, '不能删除自己的账号')
    }

    // 检查是否是最后一个管理员
    if (user.role === 'admin') {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM users WHERE role = ?',
        ['admin']
      )
      const adminCount = (rows as any[])[0]?.count || 0
      if (adminCount <= 1) {
        return ApiResponse.badRequest(res, '不能删除最后一个管理员账号')
      }
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [userId])
    ApiResponse.success(res, null, '删除用户成功')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
})

// GET /api/admin/chat-stats - 获取所有用户的对话统计（仅管理员）
router.get('/chat-stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const stats = await ChatHistoryModel.getUserChatStats()
    ApiResponse.success(res, { stats }, '获取对话统计成功')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
})

// GET /api/admin/chat-history/:userId - 获取指定用户的对话历史（仅管理员）
router.get('/chat-history/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = parseInt(String(req.params.userId), 10)
    if (isNaN(userId)) {
      return ApiResponse.badRequest(res, '无效的用户ID')
    }
    const history = await ChatHistoryModel.getByUserId(userId)
    ApiResponse.success(res, { history }, '获取对话历史成功')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
})

export default router
