import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import userRouter from './routes/user.js' // 注意TS里要加 .js

dotenv.config()
const app = express()

// 中间件
app.use(cors())
app.use(express.json())

// 路由
app.use('/api/user', userRouter)

// 启动
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 服务运行在 http://localhost:${PORT}`)
})