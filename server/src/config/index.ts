// 配置文件
// 集中管理应用配置

import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000
  },
  
  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ai_chat'
  },
  
  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key',
    expiresIn: '7d'
  },
  
  // AI 配置
  ai: {
    apiKey: process.env.DASHSCOPE_API_KEY || '',
    model: 'Qwen/Qwen3.5-397B-A17B',  // 397B MoE，统一多模态（文本+图像+视频）
    maxTokens: 16384,
    baseURL: 'https://api-inference.modelscope.cn'
  },
  
  // 上下文配置
  context: {
    maxChars: 30000 // 上下文最大字符数（模型 32K 上下文）
  },

  // RAG 配置
  rag: {
    chunkSize: 1000,        // 文档分块大小（字符数）
    chunkOverlap: 200,      // 分块重叠字符数
    topK: 5,                // 检索返回的最相关分块数
    similarityThreshold: 0.5 // 相似度阈值
  },

  // Embedding 模型配置（ModelScope API-Inference）
  embeddings: {
    modelName: 'qwen/Qwen3-Embedding-0.6B',  // 1024 维，32K 上下文
    batchSize: 100
  },

  // LanceDB 配置
  lancedb: {
    dataDir: './data/lancedb' // LanceDB 数据存储目录
  },

  // Redis 缓存配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: Number(process.env.REDIS_DB) || 0,
    ttl: {
      embeddingQuery: 3600,     // 查询向量缓存 1 小时
      embeddingDoc: 86400,      // 文档向量缓存 24 小时
      kbList: 300,              // KB 列表缓存 5 分钟
      kbDocs: 300,              // KB 文档列表缓存 5 分钟
      ragResult: 600            // RAG 检索结果缓存 10 分钟
    }
  },

  // 文件上传配置
  upload: {
    maxImageSize: 10 * 1024 * 1024,   // 图片最大 10MB
    maxDocSize: 20 * 1024 * 1024,     // 文档最大 20MB
    maxVideoSize: 500 * 1024 * 1024,  // 视频最大 500MB
    allowedImages: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedDocs: [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    allowedVideos: ['video/mp4', 'video/webm', 'video/quicktime']
  },

  // 视频处理配置
  video: {
    maxDuration: 1800,  // 最长 30 分钟
    fps: 2              // 每秒 2 帧采样
  },

  // 联网搜索配置
  webSearch: {
    enabled: true,
    provider: 'tavily' as 'tavily' | 'duckduckgo',
    tavilyApiKey: process.env.TAVILY_API_KEY || '',
    maxResults: 5
  }
}

export default config
