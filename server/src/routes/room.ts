import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { ApiResponse } from '../utils/response.js'
import { RoomModel } from '../models/room.js'
import { ChatHistoryModel } from '../models/chatHistory.js'

const router = Router()

// 所有路由需要登录
router.use(authMiddleware)

// 列出用户的房间
router.get('/', async (req: Request, res: Response) => {
  try {
    const rooms = await RoomModel.findByUserId(req.user!.id)
    ApiResponse.success(res, rooms)
  } catch (err: any) {
    ApiResponse.internalServerError(res, '获取房间列表失败', err.message)
  }
})

// 创建房间
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, topic, agentIds } = req.body
    if (!name?.trim()) return ApiResponse.badRequest(res, '请输入房间名称')
    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return ApiResponse.badRequest(res, '请至少选择一个AI角色')
    }

    const roomId = await RoomModel.create(req.user!.id, name.trim(), agentIds, topic?.trim())
    const room = await RoomModel.findById(roomId)
    const agents = await RoomModel.getAgents(roomId)
    ApiResponse.created(res, { room, agents })
  } catch (err: any) {
    ApiResponse.internalServerError(res, '创建房间失败', err.message)
  }
})

// 获取房间详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.id)
    const room = await RoomModel.findById(roomId)
    if (!room) return ApiResponse.notFound(res, '房间不存在')

    const agents = await RoomModel.getAgents(roomId)
    const members = await RoomModel.getMembers(roomId)
    ApiResponse.success(res, { room, agents, members })
  } catch (err: any) {
    ApiResponse.internalServerError(res, '获取房间详情失败', err.message)
  }
})

// 更新房间
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.id)
    const isOwner = await RoomModel.isOwner(roomId, req.user!.id)
    if (!isOwner) return ApiResponse.forbidden(res, '只有房主可以编辑房间')

    const { name, topic } = req.body
    await RoomModel.update(roomId, { name, topic })
    ApiResponse.success(res, null, '更新成功')
  } catch (err: any) {
    ApiResponse.internalServerError(res, '更新房间失败', err.message)
  }
})

// 删除房间
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.id)
    const isOwner = await RoomModel.isOwner(roomId, req.user!.id)
    if (!isOwner) return ApiResponse.forbidden(res, '只有房主可以删除房间')

    await RoomModel.delete(roomId)
    ApiResponse.success(res, null, '删除成功')
  } catch (err: any) {
    ApiResponse.internalServerError(res, '删除房间失败', err.message)
  }
})

// 添加角色到房间
router.post('/:id/agents', async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.id)
    const { agentId } = req.body
    if (!agentId) return ApiResponse.badRequest(res, '请选择要添加的角色')

    await RoomModel.addAgent(roomId, agentId)
    const agents = await RoomModel.getAgents(roomId)
    ApiResponse.success(res, agents, '角色已添加')
  } catch (err: any) {
    ApiResponse.internalServerError(res, '添加角色失败', err.message)
  }
})

// 移除角色
router.delete('/:id/agents/:agentId', async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.id)
    const agentId = Number(req.params.agentId)
    await RoomModel.removeAgent(roomId, agentId)
    const agents = await RoomModel.getAgents(roomId)
    ApiResponse.success(res, agents, '角色已移除')
  } catch (err: any) {
    ApiResponse.internalServerError(res, '移除角色失败', err.message)
  }
})

// 获取房间历史消息
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.id)
    // 验证是否房间成员
    const member = await RoomModel.isMember(roomId, req.user!.id)
    if (!member) {
      return ApiResponse.forbidden(res, '你不在该房间中')
    }
    const history = await ChatHistoryModel.getByRoomId(roomId)
    ApiResponse.success(res, history)
  } catch (err: any) {
    console.error('[Room] 获取历史消息失败:', err)
    ApiResponse.internalServerError(res, '获取历史消息失败', err.message)
  }
})

// 加入房间
router.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.id)
    await RoomModel.addMember(roomId, req.user!.id)
    ApiResponse.success(res, null, '已加入房间')
  } catch (err: any) {
    ApiResponse.internalServerError(res, '加入房间失败', err.message)
  }
})

// 发现公开房间（所有活跃房间，标记是否已加入）
router.get('/discover/list', async (req: Request, res: Response) => {
  try {
    const [rows] = await (await import('../utils/db.js')).default.execute(
      `SELECT cr.*,
        COUNT(DISTINCT crm.user_id) AS member_count,
        COUNT(DISTINCT cra.agent_id) AS agent_count,
        EXISTS(SELECT 1 FROM chat_room_members WHERE room_id = cr.id AND user_id = ?) AS is_joined
       FROM chat_rooms cr
       LEFT JOIN chat_room_members crm ON cr.id = crm.room_id
       LEFT JOIN chat_room_agents cra ON cr.id = cra.room_id
       WHERE cr.is_active = 1
       GROUP BY cr.id
       ORDER BY cr.updated_at DESC`,
      [req.user!.id]
    )
    ApiResponse.success(res, rows)
  } catch (err: any) {
    console.error('[Room] 发现房间失败:', err)
    ApiResponse.internalServerError(res, '获取房间列表失败', err.message)
  }
})

export default router
