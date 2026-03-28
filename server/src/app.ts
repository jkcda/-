import express from 'express'
import cors from 'cors'
import userRouter from './routes/user.js'
import adminRouter from './routes/admin.js'
import aiRouter from './routes/ai.js'
import config from './config/index.js'

const app = express()

// 中间件
app.use(cors())
app.use(express.json())

// 路由
app.use('/api/user', userRouter)
app.use('/api/admin', adminRouter)
app.use('/api/ai', aiRouter)

// 启动
const PORT = config.server.port
app.listen(PORT, () => {
  console.log(`🚀 服务运行在 http://localhost:${PORT}`)
})