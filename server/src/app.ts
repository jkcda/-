import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import userRouter from './routes/user.js'
import adminRouter from './routes/admin.js'
import aiRouter from './routes/ai.js'
import uploadRouter from './routes/upload.js'
import config from './config/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// 中间件
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// 静态文件服务 — 上传文件访问
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// 路由
app.use('/api/user', userRouter)
app.use('/api/admin', adminRouter)
app.use('/api/ai', aiRouter)
app.use('/api', uploadRouter)

// 启动
const PORT = config.server.port
app.listen(PORT, () => {
  console.log(`🚀 服务运行在 http://localhost:${PORT}`)
})