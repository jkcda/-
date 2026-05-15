import { describe, it, expect, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import userRouter from '../routes/user.js'
import aiRouter from '../routes/ai.js'

// 创建一个测试用的 Express 应用，只挂载要测试的路由
function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/user', userRouter)
  app.use('/api/ai', aiRouter)
  return app
}

describe('用户路由 /api/user', () => {
  const app = createTestApp()

  // 测试 GET /api/user — 一个简单路由，返回 { message: 'User route' }
  it('GET /api/user 返回欢迎消息', async () => {
    const res = await request(app).get('/api/user')
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('User route')
  })

  // 测试 GET /api/user/:id — 返回用户 ID
  it('GET /api/user/123 返回用户信息', async () => {
    const res = await request(app).get('/api/user/123')
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('123')
    expect(res.body.message).toBe('User detail')
  })
})

describe('AI 游客状态 /api/ai/guest-status', () => {
  const app = createTestApp()

  it('GET /api/ai/guest-status 返回剩余次数', async () => {
    const res = await request(app).get('/api/ai/guest-status')
    expect(res.status).toBe(200)
    // guest-status 返回格式: { success: true, message: '...', result: { remaining, max } }
    expect(res.body.success).toBe(true)
    expect(res.body.result.remaining).toBeGreaterThanOrEqual(0)
    expect(res.body.result.max).toBe(10)
  })
})
