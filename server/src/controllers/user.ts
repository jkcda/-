import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { UserModel } from '../models/user.js'
import { ApiResponse } from '../utils/response.js'
import { sendVerificationEmail } from '../services/emailService.js'
import config, { getSetting } from '../config/index.js'
import { VerificationModel } from '../models/verificationCode.js'

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

// 注册接口（先发验证码，验证通过后才入库）
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

    // 密码加密
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // 暂存验证信息，不入 users 表
    const code = await VerificationModel.create({ email, username, password: hashedPassword })

    // 发送验证邮件
    if (!getSetting('EMAIL_USER')) {
      return ApiResponse.internalServerError(res, '邮件服务未配置，请联系管理员')
    }
    try {
      await sendVerificationEmail(email, code)
    } catch (e: any) {
      return ApiResponse.internalServerError(res, '验证邮件发送失败，请稍后重试')
    }

    return ApiResponse.success(res, { email }, '验证码已发送，请查收邮箱')
  } catch (error: any) {
    console.error('注册错误:', error)
    return ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
}

// 邮箱验证（验证通过后创建用户）
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body
    if (!email || !code) {
      return ApiResponse.badRequest(res, '请提供邮箱和验证码')
    }
    const pending = await VerificationModel.verify(email, code)
    if (!pending) {
      return ApiResponse.badRequest(res, '验证码错误或已过期')
    }
    // 验证通过 → 正式创建用户
    await UserModel.createVerified({
      username: pending.username,
      email,
      password: pending.password,
    })
    return ApiResponse.success(res, null, '邮箱验证成功，现在可以登录了')
  } catch (error: any) {
    console.error('验证错误:', error)
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

    // 校验邮箱是否已验证
    if (!user.email_verified) {
      return ApiResponse.unauthorized(res, '邮箱未验证，请先查收验证邮件并完成验证')
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

// 微信登录接口（小程序专用）
export const wxLogin = async (req: Request, res: Response) => {
  try {
    const { code } = req.body
    if (!code) return ApiResponse.badRequest(res, '缺少登录凭证 code')

    const appid = getSetting('WECHAT_APPID')
    const secret = getSetting('WECHAT_SECRET')
    if (!appid || !secret) {
      return ApiResponse.internalServerError(res, '微信登录未配置，请联系管理员')
    }

    const wxRes = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`
    )
    const wxData = await wxRes.json() as { openid?: string; unionid?: string; errcode?: number; errmsg?: string }

    if (wxData.errcode || !wxData.openid) {
      console.error('微信登录失败:', wxData)
      return ApiResponse.badRequest(res, `微信登录失败: ${wxData.errmsg || '未知错误'}`)
    }

    const { openid, unionid } = wxData

    // 查找已有用户，没有则自动创建
    let user = await UserModel.findByOpenid(openid)
    if (!user) {
      const result = await UserModel.createWechatUser(openid)
      user = await UserModel.findById(result.id)
    }

    if (!user) {
      return ApiResponse.internalServerError(res, '创建用户失败')
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      config.jwt.secret as any,
      { expiresIn: config.jwt.expiresIn as any }
    )

    return ApiResponse.success(res, {
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      isNewUser: !user.created_at // 简化判断
    }, '登录成功')
  } catch (error: any) {
    console.error('微信登录错误:', error)
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
