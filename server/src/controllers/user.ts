import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { UserModel } from '../models/user.js'
import { ApiResponse } from '../utils/response.js'
import { sendVerificationEmail } from '../services/emailService.js'
import config from '../config/index.js'

const registerSchema = z.object({
  username: z.string().min(2).max(20).regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/,
    '用户名只能包含中英文、数字和下划线'),
  email: z.string().email('邮箱格式不正确').max(100),
  password: z.string().min(6, '密码至少6位').max(100),
})

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

// 注册接口（含邮箱验证）
export const register = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      return ApiResponse.badRequest(res, parsed.error.issues[0]!.message)
    }
    const { username, email, password } = parsed.data

    const existingUser = await UserModel.findByUsername(username)
    if (existingUser) {
      return ApiResponse.badRequest(res, '用户名已存在')
    }

    const existingEmail = await UserModel.findByEmail(email)
    if (existingEmail) {
      return ApiResponse.badRequest(res, '邮箱已被注册')
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const { id, token } = await UserModel.create({
      username,
      email,
      password: hashedPassword,
    })

    // 发送验证邮件（后台发送，失败不影响注册）
    sendVerificationEmail(email, token).catch(e =>
      console.error('[Email] 验证邮件发送失败:', e.message)
    )

    return ApiResponse.created(res, {
      id,
      username,
      email,
      emailSent: !!config.email.user,
    }, config.email.user ? '注册成功，请查收验证邮件' : '注册成功')
  } catch (error: any) {
    console.error('注册错误:', error)
    return ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
}

// 验证邮箱
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query
    if (!token || typeof token !== 'string') {
      return ApiResponse.badRequest(res, '无效的验证链接')
    }
    const ok = await UserModel.verifyEmail(token)
    if (ok) {
      return ApiResponse.success(res, null, '邮箱验证成功')
    }
    return ApiResponse.badRequest(res, '验证链接无效或已过期')
  } catch (error: any) {
    return ApiResponse.internalServerError(res, '验证失败', error.message)
  }
}

// 登录接口
export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      return ApiResponse.badRequest(res, parsed.error.issues[0]!.message)
    }
    const { username, password } = parsed.data

    // 查找用户
    const user = await UserModel.findByUsername(username)
    if (!user) {
      return ApiResponse.unauthorized(res, '用户名或密码错误')
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return ApiResponse.unauthorized(res, '用户名或密码错误')
    }

    // 生成 JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        email: user.email,
        role: user.role 
      },
      config.jwt.secret as any,
      { expiresIn: config.jwt.expiresIn as any }
    )

    return ApiResponse.success(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    }, '登录成功')
    
  } catch (error: any) {
    console.error('登录错误:', error)
    return ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
}

// 获取用户信息接口（需要 token）
export const getUserInfo = async (req: Request, res: Response) => {
  try {
    // 从 request 对象中获取已验证的用户信息（由中间件注入）
    const userPayload = (req as any).user
    
    if (!userPayload) {
      return ApiResponse.unauthorized(res, '未认证')
    }

    // 获取用户信息
    const user = await UserModel.findById(userPayload.id)
    if (!user) {
      return ApiResponse.notFound(res, '用户不存在')
    }

    return ApiResponse.success(res, {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    })
    
  } catch (error: any) {
    console.error('获取用户信息错误:', error)
    return ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
}
