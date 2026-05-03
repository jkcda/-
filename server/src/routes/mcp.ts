import express from 'express'
import { getMcpStatus, toggleMcpServer } from '../services/mcp.js'
import { ApiResponse } from '../utils/response.js'

const router = express.Router()

// GET /api/mcp/status — 获取所有 MCP Server 状态
router.get('/status', async (_req, res) => {
  try {
    const servers = await getMcpStatus()
    const totalTools = servers.reduce((sum, s) => sum + s.toolCount, 0)
    ApiResponse.success(res, { servers, totalTools, connected: servers.some(s => s.enabled) }, '获取MCP状态成功')
  } catch (e: any) {
    ApiResponse.internalServerError(res, '获取MCP状态失败', e.message)
  }
})

// POST /api/mcp/toggle — 启用/禁用 MCP Server
router.post('/toggle', (req, res) => {
  const { name, enabled } = req.body
  if (!name || typeof enabled !== 'boolean') {
    return ApiResponse.badRequest(res, '请提供 name 和 enabled 参数')
  }
  const result = toggleMcpServer(name, enabled)
  ApiResponse.success(res, result, `${result.enabled ? '启用' : '禁用'} ${name} 成功`)
})

export default router
