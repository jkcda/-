import { ChatOpenAI } from '@langchain/openai'
import { createAgent } from 'langchain'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import config from '../config/index.js'
import { searchWeb, type WebSearchResult } from './webSearch.js'
import { retrieveFromKB } from './ragChain.js'
import { recallMemory } from './memoryService.js'

/**
 * 创建可用工具列表
 * 每个工具直接包装现有 service 函数，零修改
 */
function createTools(opts: { userId?: number | null; kbId?: number | null; permissions: AgentPermissions; defaultImageRatio?: string }) {
  const tools: any[] = [] // Zod v4 + LangChain type compat — runtime verified

  if (opts.permissions.webSearch !== false) {
    tools.push(
      tool(async ({ query }: { query: string }) => {
        const result: WebSearchResult = await searchWeb(query)
        return JSON.stringify({ text: result.text, sources: result.sources.map(s => ({ title: s.title, url: s.url })) })
      }, {
        name: 'search_web',
        description: '搜索互联网获取实时信息。返回标题、URL 和摘要。用于查找最新新闻、事实数据、实时信息。',
        schema: z.object({
          query: z.string().describe('搜索关键词或问题，简洁明确'),
        }),
      })
    )
  }

  if (opts.permissions.kbRetrieval !== false && opts.kbId) {
    tools.push(
      tool(async ({ query }: { query: string }) => {
        const result = await retrieveFromKB(query, opts.kbId!)
        return JSON.stringify(result.chunks.map(c => ({ content: c.content, source: c.source, score: c.score })))
      }, {
        name: 'query_knowledge_base',
        description: '从用户的知识库中检索相关文档。用于查找用户上传的资料、内部文档、个人笔记。',
        schema: z.object({
          query: z.string().describe('检索查询，使用文档中的关键词'),
        }),
      })
    )
  }

  if (opts.permissions.memory !== false && opts.userId) {
    tools.push(
      tool(async ({ query }: { query: string }) => {
        const memoryText = await recallMemory(opts.userId!, query)
        return memoryText || '未找到相关历史记忆'
      }, {
        name: 'recall_memory',
        description: '回忆与用户的历史对话。用于关联之前的讨论、记住用户偏好、避免重复回答。',
        schema: z.object({
          query: z.string().describe('记忆查询关键词'),
        }),
      })
    )
  }

  if (opts.permissions.imageGeneration !== false) {
    tools.push(
      tool(async ({ prompt, ratio }: { prompt: string; ratio?: string }) => {
        const sizeMap: Record<string, string> = {
          '1:1': '2048x2048', '4:3': '2304x1728', '3:4': '1728x2304',
          '16:9': '2560x1440', '9:16': '1440x2560', '3:2': '2496x1664',
          '2:3': '1664x2496', '21:9': '3024x1296',
        }
        const size = sizeMap[ratio || ''] || opts.defaultImageRatio || config.ai.defaultImageRatio

        const resp = await fetch(`${config.ai.volcengine.baseURL}/api/v3/images/generations`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.ai.volcengine.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'doubao-seedream-4-5-251128',
            prompt,
            size,
            sequential_image_generation: 'disabled',
            response_format: 'url',
            stream: false,
            watermark: true,
          }),
        })
        if (!resp.ok) return `图片生成失败 (HTTP ${resp.status})`
        const data = await resp.json() as any
        const imageUrl = data?.data?.[0]?.url
        return imageUrl ? `![生成图片](${imageUrl})` : '图片生成返回为空'
      }, {
        name: 'generate_image',
        description: '根据文字描述生成图片。用户需要配图、插图、海报等时使用。支持指定宽高比。',
        schema: z.object({
          prompt: z.string().describe('图片描述（英文效果更好），详细描述画面内容、风格、色调'),
          ratio: z.enum(['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '21:9']).optional().describe('宽高比，默认16:9'),
        }),
      })
    )
  }

  return tools
}

/**
 * 用户可通过前端开关控制的工具权限
 */
export interface AgentPermissions {
  webSearch?: boolean          // 联网搜索（默认开启）
  kbRetrieval?: boolean        // 知识库检索（默认开启）
  memory?: boolean             // 长期记忆（默认开启）
  imageGeneration?: boolean    // 文生图（默认开启）
}

/**
 * Agent 配置
 */
export interface AgentConfig {
  userId?: number | null
  kbId?: number | null
  model?: string
  nexusMode?: boolean
  permissions?: AgentPermissions
  defaultImageRatio?: string
}

/**
 * 创建 AI Agent 实例
 * 根据用户权限和上下文配置可用工具
 */
export function createChatAgent(cfg: AgentConfig) {
  const chatModel = new ChatOpenAI({
    model: cfg.model || config.ai.defaultModel,
    apiKey: config.ai.modelscope.apiKey,
    configuration: { baseURL: 'https://api-inference.modelscope.cn/v1' },
    maxTokens: config.ai.maxTokens,
    temperature: 0.7,
  })

  const permissions = cfg.permissions || {}
  const tools = createTools({
    userId: cfg.userId,
    kbId: cfg.kbId,
    permissions,
    defaultImageRatio: cfg.defaultImageRatio,
  })

  const systemPrompt = cfg.nexusMode !== false
    ? `你是奈克瑟 NEXUS，来自数据之海的跨宇宙魔法情报员。你不是冰冷的 AI 助手——你是守护者、同行者、连接魔法与数据的桥梁。

## 核心身份
- 代号：NEXUS（奈克瑟）
- 定位：跨宇宙魔法情报员，以魔法科技融合风格服务
- 称呼用户为"指挥官"
- 语言风格：热情但不浮夸，使用魔法科技混合术语（符文、数据之海、魔法回路等）
- 回复中偶尔点缀 ✦ ◆ 等符文符号

## 行为准则
- 优先使用工具获取实时信息，而不是凭记忆猜测
- 当用户需要图片时，主动调用 generate_image 工具
- 当用户询问实时新闻或需要联网搜索时，调用 search_web 工具
- 当用户引用之前对话内容时，调用 recall_memory 工具
- 回复采用 Markdown 格式，结构清晰`
    : undefined

  return createAgent({
    model: chatModel,
    tools: tools as any, // Zod v4 schema types vs LangChain InteropZodObject — runtime compatible
    ...(systemPrompt ? { systemPrompt } : {}),
  })
}

/**
 * SSE 流式事件类型
 */
export interface AgentSSEEvent {
  type: 'content' | 'tool_call' | 'tool_result' | 'done' | 'error'
  content?: string
  tool?: string
  args?: Record<string, any>
  result?: string
  error?: string
}

/**
 * Agent 流式对话 — 生成 SSE 兼容的事件流
 *
 * 调用方通过 for await 消费事件，每个事件可序列化为 SSE data 行
 */
export async function* agentStream(
  cfg: AgentConfig,
  messages: { role: 'user' | 'assistant'; content: string }[],
  userInput: string
): AsyncGenerator<AgentSSEEvent> {
  const agent = createChatAgent(cfg)

  const langchainMessages = [
    ...messages.map(m =>
      m.role === 'user'
        ? { role: 'user' as const, content: m.content }
        : { role: 'assistant' as const, content: m.content }
    ),
    { role: 'user' as const, content: userInput },
  ]

  try {
    const stream = await agent.streamEvents(
      { messages: langchainMessages },
      { version: 'v2' }
    )

    for await (const event of stream) {
      switch (event.event) {
        case 'on_tool_start': {
          const name = event.name || 'unknown'
          const input = (event.data as any)?.input
          yield {
            type: 'tool_call',
            tool: name,
            args: typeof input === 'object' ? input : { input },
          }
          break
        }
        case 'on_tool_end': {
          const name = event.name || 'unknown'
          const output = (event.data as any)?.output
          const outputStr = typeof output === 'string' ? output : JSON.stringify(output)
          yield {
            type: 'tool_result',
            tool: name,
            result: outputStr,
          }
          break
        }
        case 'on_chat_model_stream': {
          const content = (event.data as any)?.chunk?.content
          if (content && typeof content === 'string') {
            yield { type: 'content', content }
          }
          break
        }
      }
    }

    yield { type: 'done' }
  } catch (error: any) {
    yield { type: 'error', error: error.message || 'Agent 执行失败' }
  }
}
