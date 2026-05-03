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
    // ModelScope 魔搭社区
    modelscope: {
      apiKey: process.env.DASHSCOPE_API_KEY || '',
      baseURL: 'https://api-inference.modelscope.cn',
    },
    // 火山引擎 ARK
    volcengine: {
      apiKey: process.env.ARK_API_KEY || '',
      baseURL: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com',
    },
    defaultModel: 'Qwen/Qwen3.5-397B-A17B',
    maxTokens: 16384,
    // 可用模型列表
    models: [
      // --- ModelScope 文本 ---
      { id: 'Qwen/Qwen3.5-397B-A17B',        name: 'Qwen3.5-397B',   type: 'multimodal' as const, provider: 'modelscope' as const, desc: '397B MoE 多模态（默认）' },
      { id: 'deepseek-ai/DeepSeek-V4-Flash',  name: 'DeepSeek-V4',    type: 'text' as const,        provider: 'modelscope' as const, desc: '文本推理' },
      { id: 'ZhipuAI/GLM-5.1',                name: 'GLM-5.1',        type: 'text' as const,        provider: 'modelscope' as const, desc: '744B MoE 文本' },
      { id: 'ZhipuAI/GLM-5',                  name: 'GLM-5',          type: 'text' as const,        provider: 'modelscope' as const, desc: '555B MoE 文本' },
      { id: 'deepseek-ai/DeepSeek-R1-0528',   name: 'DeepSeek-R1',    type: 'text' as const,        provider: 'modelscope' as const, desc: '推理增强' },
    ] as { id: string; name: string; type: 'text' | 'multimodal' | 'vision'; provider: 'modelscope' | 'volcengine'; desc: string }[],
    // 图片宽高比配置（Seedream 4.5 等文生图模型）
    imageRatios: [
      { label: '1:1 正方形',   value: '2048x2048' },
      { label: '4:3 横版',     value: '2304x1728' },
      { label: '3:4 竖版',     value: '1728x2304' },
      { label: '16:9 宽屏',    value: '2560x1440' },
      { label: '9:16 手机',    value: '1440x2560' },
      { label: '3:2 经典摄影', value: '2496x1664' },
      { label: '2:3 竖版摄影', value: '1664x2496' },
      { label: '21:9 超宽屏',  value: '3024x1296' },
    ] as { label: string; value: string }[],
    defaultImageRatio: '2560x1440',
    // OpenAI 兼容端点（用于 LangChain Agent 工具调用）
    openai: {
      baseURL: 'https://api-inference.modelscope.cn/v1',
      apiKey: process.env.DASHSCOPE_API_KEY || '',
    },
  },
  
  // 上下文配置
  context: {
    maxChars: 30000 // 上下文最大字符数（模型 32K 上下文）
  },

  // RAG 配置
  rag: {
    chunkSize: 300,         // 文档分块大小（小窗口检索用，字符数）
    chunkOverlap: 100,      // 分块重叠字符数
    topK: 5,                // 最终返回的最相关分块数
    retrievalTopK: 20,      // 初始检索候选数（向量检索阶段）
    similarityThreshold: 0.5, // 相似度阈值

    // 查询重写
    enableQueryRewrite: true,  // 是否启用 LLM 查询重写
    queryRewriteMinLen: 15,    // 短于此长度的查询触发重写（字符）

    // 混合检索（向量 + BM25）
    enableHybridSearch: true,  // 是否启用混合检索
    vectorWeight: 0.7,         // 向量相似度权重
    bm25Weight: 0.3,           // BM25 关键词权重

    // LLM 重排序
    enableRerank: true,        // 是否启用 LLM 重排序
    rerankTopK: 10,            // 送入 LLM 重排序的候选数

    // 小窗口检索 → 大窗口上下文（Small-to-Big）
    enableSmallToBig: true,    // 是否启用上下文窗口扩展
    windowBefore: 1,           // 匹配块前取几块
    windowAfter: 2,            // 匹配块后取几块
    maxExpandedChars: 3000     // 扩展后单个上下文窗口最大字符数（超过则截断）
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

  // 语音/音频配置
  audio: {
    maxDurationSec: 120,              // 录音最大时长（秒）
    maxFileSize: 10 * 1024 * 1024     // 音频文件最大 10MB
  },

  // 联网搜索配置
  webSearch: {
    enabled: true,
    provider: 'tavily' as 'tavily' | 'duckduckgo',
    tavilyApiKey: process.env.TAVILY_API_KEY || '',
    maxResults: 8
  }
}

export default config
