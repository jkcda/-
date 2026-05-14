// 配置文件
// 集中管理应用配置

import dotenv from 'dotenv'
import pool from '../utils/db.js'

// 加载环境变量
dotenv.config()

// ── 待动态管理的 API Key 白名单 ──
const SETTING_KEYS = [
  // AI 供应商 API Keys
  'DASHSCOPE_API_KEY',
  'ARK_API_KEY',
  'OPENAI_API_KEY',
  'TAVILY_API_KEY',
  // AI 供应商自定义配置（baseURL 覆盖、请求模板等）
  'PROVIDER_CONFIG',
  // 系统配置
  'EMAIL_USER',
  'EMAIL_PASS',
  'JWT_SECRET',
  'CLIENT_URL',
] as const

type SettingKey = (typeof SETTING_KEYS)[number]

// ── 内存中的动态配置缓存 ──
const settings = new Map<SettingKey, string>()

// 环境变量到 setting key 的映射
const ENV_MAP: Record<SettingKey, string | undefined> = {
  DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY,
  ARK_API_KEY: process.env.ARK_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
  PROVIDER_CONFIG: process.env.PROVIDER_CONFIG,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  JWT_SECRET: process.env.JWT_SECRET,
  CLIENT_URL: process.env.CLIENT_URL,
}

/** 从数据库加载所有配置到内存（DB 有值则用 DB，否则 fallback 到环境变量） */
export async function initDynamicConfig(): Promise<void> {
  try {
    const [rows] = await pool.execute(
      'SELECT key_name, value FROM system_settings'
    ) as [Array<{ key_name: string; value: string }>, any]

    for (const row of rows) {
      if (SETTING_KEYS.includes(row.key_name as SettingKey)) {
        settings.set(row.key_name as SettingKey, row.value)
      }
    }
    console.log(`[Config] 已从数据库加载 ${settings.size} 项动态配置`)
  } catch (e: any) {
    console.warn('[Config] 数据库读取失败，回退到环境变量:', e.message)
  }
}

/** 读取一个动态配置值（内存 > 环境变量 > 空串） */
export function getSetting(key: string): string {
  const k = key as SettingKey
  if (settings.has(k)) return settings.get(k)!
  return ENV_MAP[k] || ''
}

/** 更新配置值（写入 DB + 内存），仅白名单内的 key 允许 */
export async function updateSetting(key: string, value: string): Promise<void> {
  const k = key as SettingKey
  if (!SETTING_KEYS.includes(k)) {
    throw new Error(`不允许修改配置项: ${key}`)
  }
  await pool.execute(
    'INSERT INTO system_settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
    [k, value]
  )
  settings.set(k, value)
  console.log(`[Config] 已更新: ${k}`)
}

/** 获取所有配置项的脱敏值列表（供管理后台展示） */
export function getMaskedSettings(): { key_name: string; description: string; masked: string }[] {
  const desc: Record<SettingKey, string> = {
    DASHSCOPE_API_KEY: 'ModelScope API Key（聊天 / Embedding / Agent）',
    ARK_API_KEY: '火山引擎 ARK API Key（图片生成）',
    OPENAI_API_KEY: 'OpenAI API Key（备用供应商，用于聊天或Embedding）',
    TAVILY_API_KEY: 'Tavily API Key（联网搜索）',
    PROVIDER_CONFIG: '供应商自定义配置（baseURL 覆盖、请求模板，JSON格式）',
    EMAIL_USER: 'QQ邮箱 SMTP 登录账号',
    EMAIL_PASS: 'QQ邮箱 SMTP 授权码',
    JWT_SECRET: 'JWT 签名密钥（用于签发和验证登录凭证）',
    CLIENT_URL: '前端访问地址（用于邮件验证链接，如 https://你的域名.com）',
  }
  return SETTING_KEYS.map(k => {
    const val = getSetting(k)
    const masked = val.length > 8
      ? val.slice(0, 4) + '***' + val.slice(-4)
      : val ? '****' : '（未配置）'
    return { key_name: k, description: desc[k], masked }
  })
}

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
    get secret() {
      return getSetting('JWT_SECRET') || 'default-secret-key'
    },
    expiresIn: '7d'
  },

  // AI 配置（Provider 中心化）
  ai: {
    // ── 供应商注册表 ──
    // 新增供应商只需在此加一条，对应的 API Key 在 SETTING_KEYS 中注册
    providers: {
      modelscope: {
        name: '魔搭社区',
        apiKeySetting: 'DASHSCOPE_API_KEY',
        baseURL: 'https://api-inference.modelscope.cn',
        chatSupport: true,
        imageSupport: false,
        embeddingSupport: true,
        speechSupport: true,
      },
      volcengine: {
        name: '火山引擎 ARK',
        apiKeySetting: 'ARK_API_KEY',
        baseURL: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com',
        chatSupport: false,
        imageSupport: true,
        embeddingSupport: false,
        speechSupport: false,
      },
      // ── 预留：启用后可在管理后台配置 OPENAI_API_KEY ──
      // openai: {
      //   name: 'OpenAI',
      //   apiKeySetting: 'OPENAI_API_KEY',
      //   baseURL: 'https://api.openai.com',
      //   chatSupport: true,
      //   imageSupport: false,
      //   embeddingSupport: true,
      //   speechSupport: false,
      // },
    } as Record<string, {
      name: string
      apiKeySetting: string
      baseURL: string
      chatSupport: boolean
      imageSupport: boolean
      embeddingSupport: boolean
      speechSupport: boolean
    }>,

    // ── 向后兼容别名 ──
    get modelscope() { return this.providers.modelscope },
    get volcengine() { return this.providers.volcengine },

    defaultModel: 'Qwen/Qwen3.5-397B-A17B',
    maxTokens: 16384,
    // 可用模型列表（每个模型关联到对应供应商）
    models: [
      // --- ModelScope 文本&多模态 ---
      { id: 'Qwen/Qwen3.5-397B-A17B',        name: 'Qwen3.5-397B',   type: 'multimodal' as const, provider: 'modelscope', desc: '397B MoE 多模态（默认）' },
      { id: 'deepseek-ai/DeepSeek-V4-Flash',  name: 'DeepSeek-V4',    type: 'text' as const,        provider: 'modelscope', desc: '文本推理' },
      { id: 'ZhipuAI/GLM-5.1',                name: 'GLM-5.1',        type: 'text' as const,        provider: 'modelscope', desc: '744B MoE 文本' },
      { id: 'ZhipuAI/GLM-5',                  name: 'GLM-5',          type: 'text' as const,        provider: 'modelscope', desc: '555B MoE 文本' },
      { id: 'deepseek-ai/DeepSeek-R1-0528',   name: 'DeepSeek-R1',    type: 'text' as const,        provider: 'modelscope', desc: '推理增强' },
      // --- 火山引擎 ---
      { id: 'doubao-seedream-4-5-251128',     name: 'Seedream 4.5',   type: 'text' as const,        provider: 'volcengine', desc: '文生图（火山引擎）' },
      // --- 预留：切换 OpenAI 时只需改 provider: 'openai' ---
      // { id: 'gpt-4o', name: 'GPT-4o', type: 'multimodal', provider: 'openai', desc: 'OpenAI 多模态' },
    ] as { id: string; name: string; type: 'text' | 'multimodal' | 'vision'; provider: string; desc: string }[],
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

  // 邮件配置（QQ邮箱 SMTP）
  email: {
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '',
  },

  // 联网搜索配置
  webSearch: {
    enabled: true,
    provider: 'tavily' as 'tavily' | 'duckduckgo',
    maxResults: 8
  },

  // 文件系统沙箱配置
  workspace: {
    root: process.env.WORKSPACE_ROOT || './workspace'
  }
}

export default config
