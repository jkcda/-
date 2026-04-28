import { Request, Response, NextFunction } from 'express'
import { ApiResponse } from '../utils/response.js'

/**
 * 管理员权限中间件
 * 验证用户是否已认证且为管理员角色
 */
export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user

    if (!user) {
      return ApiResponse.unauthorized(res, '未认证')
    }

    if (user.role !== 'admin') {
      return ApiResponse.forbidden(res, '无管理员权限')
    }

    next()
  } catch (error: any) {
    console.error('管理员权限验证错误:', error)
    return ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
}
