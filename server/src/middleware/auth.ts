import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { ApiResponse } from '../utils/response.js'

/**
 * JWT Payload 类型
 */
interface JWTPayload {
  id: number
  username: string
  email: string
  role?: 'admin' | 'user'
  iat?: number
  exp?: number
}

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload
    }
  }
}

/**
 * JWT 认证中间件
 * 验证请求头中的 Bearer Token
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 获取请求头中的 Authorization
    const authHeader = req.headers.authorization
    
    // 检查是否存在认证头
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, '未提供认证令牌')
    }

    // 提取 token
    const token = authHeader.split(' ')[1]

    // 验证 token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'default-secret-key'
    ) as JWTPayload

    // 将用户信息附加到 request 对象
    req.user = decoded

    // 继续处理请求
    next()
  } catch (error: any) {
    // Token 验证失败
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, '认证令牌已过期')
    }

    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.unauthorized(res, '无效的认证令牌')
    }

    // 其他错误
    return ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
}

/**
 * 可选的 JWT 认证中间件
 * 如果存在 token 则验证，不存在也不报错
 * 用于某些需要判断用户是否登录但不是强制的场景
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'default-secret-key'
      ) as JWTPayload
      
      req.user = decoded
    }
    
    next()
  } catch (error) {
    // 可选认证，即使验证失败也继续执行
    next()
  }
}
