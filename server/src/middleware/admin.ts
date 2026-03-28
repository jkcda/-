import { Request, Response, NextFunction } from 'express'
import { ApiResponse } from '../utils/response.js'

/**
 * 管理员权限中间件
 * 验证用户是否为管理员
 */
export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 检查用户是否已认证
    const user = (req as any).user
    
    if (!user) {
      return ApiResponse.unauthorized(res, '未认证')
    }

    // 检查用户是否为管理员
    if (user.role !== 'admin') {
      return ApiResponse.forbidden(res, '权限不足，需要管理员权限')
    }

    // 继续处理请求
    next()
  } catch (error: any) {
    console.error('管理员权限验证错误:', error)
    return ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
}
