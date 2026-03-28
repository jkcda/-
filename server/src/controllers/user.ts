import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { UserModel } from '../models/user.js'
import { ApiResponse } from '../utils/response.js'
import config from '../config/index.js'

// 注册接口
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body

    // 验证必填字段
    if (!username || !email || !password) {
      return ApiResponse.badRequest(res, '请填写完整信息')
    }

    // 验证密码长度
    if (password.length < 6) {
      return ApiResponse.badRequest(res, '密码长度不能少于 6 位')
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
    })

    return ApiResponse.created(res, {
      id: userId,
      username,
      email
    }, '注册成功')
    
  } catch (error: any) {
    console.error('注册错误:', error)
    return ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
}

// 登录接口
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    // 验证必填字段
    if (!username || !password) {
      return ApiResponse.badRequest(res, '请填写完整信息')
    }

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
