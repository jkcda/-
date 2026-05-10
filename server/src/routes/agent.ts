import express from 'express'
import { AgentModel } from '../models/agent.js'
import { ApiResponse } from '../utils/response.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// 所有路由需要登录
router.use(authMiddleware as any)

// GET /api/agents - 获取用户的所有角色
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user.id
    const agents = await AgentModel.findByUserId(userId)
    const list = agents.map(a => ({
      id: a.id,
      name: a.name,
      avatar: a.avatar,
      systemPrompt: a.system_prompt,
      greeting: a.greeting,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }))
    ApiResponse.success(res, { agents: list }, '获取角色列表成功')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '获取角色列表失败', error.message)
  }
})

// POST /api/agents - 创建角色
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user.id
    const { name, systemPrompt, greeting, avatar } = req.body

    if (!name || !name.trim()) {
      return ApiResponse.badRequest(res, '请输入角色名')
    }
    if (!systemPrompt || !systemPrompt.trim()) {
      return ApiResponse.badRequest(res, '请输入人设背景')
    }

    const id = await AgentModel.create(userId, name.trim(), systemPrompt.trim(), greeting?.trim(), avatar)
    ApiResponse.success(res, { id, name: name.trim() }, '角色创建成功')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '创建角色失败', error.message)
  }
})

// PUT /api/agents/:id - 更新角色
router.put('/:id', async (req, res) => {
  try {
    const userId = (req as any).user.id
    const agentId = Number(req.params.id)
    const { name, systemPrompt, greeting, avatar } = req.body

    if (!(await AgentModel.updateOwner(agentId, userId))) {
      return ApiResponse.notFound(res, '角色不存在')
    }

    await AgentModel.update(agentId, {
      name: name?.trim(),
      systemPrompt: systemPrompt?.trim(),
      greeting: greeting?.trim(),
      avatar
    })

    ApiResponse.success(res, null, '角色更新成功')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '更新角色失败', error.message)
  }
})

// DELETE /api/agents/:id - 删除角色
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as any).user.id
    const agentId = Number(req.params.id)

    if (!(await AgentModel.updateOwner(agentId, userId))) {
      return ApiResponse.notFound(res, '角色不存在')
    }

    await AgentModel.delete(agentId)
    ApiResponse.success(res, null, '角色已删除')
  } catch (error: any) {
    ApiResponse.internalServerError(res, '删除角色失败', error.message)
  }
})

export default router
