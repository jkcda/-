import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import userRouter from './routes/user.js'
import adminRouter from './routes/admin.js'
import aiRouter from './routes/ai.js'
import uploadRouter from './routes/upload.js'
import knowledgeBaseRouter from './routes/knowledgeBase.js'
import voiceRouter from './routes/voice.js'
import mcpRouter from './routes/mcp.js'
import config from './config/index.js'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// 中间件
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// 静态文件服务 — 上传文件访问
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// 确保 LanceDB 数据目录存在
const lancedbDir = path.resolve(config.lancedb.dataDir)
if (!fs.existsSync(lancedbDir)) {
  fs.mkdirSync(lancedbDir, { recursive: true })
}

// 路由
app.use('/api/user', userRouter)
app.use('/api/admin', adminRouter)
app.use('/api/ai', aiRouter)
app.use('/api/kb', knowledgeBaseRouter)
app.use('/api', uploadRouter)
app.use('/api/voice', voiceRouter)
app.use('/api/mcp', mcpRouter)

// Multer 文件上传错误处理
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: '文件大小超出限制（图片10MB/文档20MB/视频500MB）' })
  }
  if (err.message?.startsWith('不支持的文件类型')) {
    return res.status(400).json({ success: false, message: err.message })
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: `文件上传错误: ${err.message}` })
  }
  console.error('未捕获的错误:', err)
  res.status(500).json({ success: false, message: '服务器内部错误' })
})

// 后台预加载语音识别模型（避免首次请求阻塞/OOM崩溃）
import('./services/videoProcessor.js').then(m => {
  console.log('[Preload] 后台预加载语音识别模型...')
  m.preloadTranscriber()
}).catch(() => {})

// 初始化 MCP 连接（文件系统 + Playwright）
import('./services/mcp.js').then(m => {
  console.log('[MCP] Connecting to MCP servers...')
  m.initMCP()
}).catch(() => {})

// 启动
const PORT = config.server.port
app.listen(PORT, () => {
  console.log(`🚀 服务运行在 http://localhost:${PORT}`)
})