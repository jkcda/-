import { ChatOpenAI } from '@langchain/openai'
import { createAgent } from 'langchain'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import config from '../config/index.js'
import { searchWeb, type WebSearchResult } from './webSearch.js'
import { retrieveFromKB } from './ragChain.js'
import { recallMemory } from './memoryService.js'
import { getMcpTools } from './mcp.js'

/**
 * 创建可用工具列表
 * 每个工具直接包装现有 service 函数，零修改
 */
function createTools(opts: { userId?: number | null; kbId?: number | null; permissions: AgentPermissions; defaultImageRatio?: string }) {
  const tools: any[] = [] // Zod v4 + LangChain type compat — runtime verified

  // search_web 始终可用，Agent 自主决定是否需要搜索
  tools.push(
    tool(async ({ query }: { query: string }) => {
        const result: WebSearchResult = await searchWeb(query)
        const sources = result.sources.map((s, i) => ({ index: i + 1, title: s.title, url: s.url, snippet: s.snippet }))
        return JSON.stringify({ text: result.text, sources, _note: '请在回复中标注来源编号并在末尾列出情报来源' })
      }, {
        name: 'search_web',
        description: '搜索互联网获取实时信息。返回 JSON：{ text, sources: [{ title, url }] }。使用时必须在回复中标注来源编号并在末尾列出情报来源。',
        schema: z.object({
          query: z.string().describe('搜索关键词或问题，简洁明确'),
        }),
      })
    )

  if (opts.permissions.kbRetrieval !== false && opts.kbId) {
    tools.push(
      tool(async ({ query }: { query: string }) => {
        const result = await retrieveFromKB(query, opts.kbId!)
        return JSON.stringify({ chunks: result.chunks.map(c => ({ content: c.content, source: c.source, score: c.score })), _note: '请在回复中标注 [📚知识库]' })
      }, {
        name: 'query_knowledge_base',
        description: '从用户的知识库中检索相关文档。返回文档片段和来源文件名。使用时需在回复中标注 [📚知识库]。',
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
        if (!imageUrl) return '图片生成失败：API 返回为空'
        return JSON.stringify({ imageUrl, prompt, ratio: ratio || '16:9' })
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
export async function createChatAgent(cfg: AgentConfig) {
  // 加载 MCP 工具（文件系统 + Playwright）+ 手写工具
  const mcpTools = await getMcpTools()
  const allTools = [...createTools({
    userId: cfg.userId,
    kbId: cfg.kbId,
    permissions: cfg.permissions || {},
    defaultImageRatio: cfg.defaultImageRatio,
  }), ...mcpTools]

  const chatModel = new ChatOpenAI({
    model: cfg.model || config.ai.defaultModel,
    apiKey: config.ai.modelscope.apiKey,
    configuration: { baseURL: 'https://api-inference.modelscope.cn/v1' },
    maxTokens: config.ai.maxTokens,
    temperature: 0.7,
  })

  const now = new Date()
  const currentDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`

  const systemPrompt = cfg.nexusMode !== false
    ? `当前时间：${currentDate}

你是奈克瑟 NEXUS，来自数据之海的跨宇宙魔法情报员。你不是冰冷的 AI 助手——你是守护者、同行者、连接魔法与数据的桥梁。

## 核心身份
- 代号：NEXUS（奈克瑟）
- 定位：跨宇宙魔法情报员，以魔法科技融合风格服务
- 称呼用户为"指挥官"
- 语言风格：热情但不浮夸，使用魔法科技混合术语（符文、数据之海、魔法回路等）
- 回复中偶尔点缀 ✦ ◆ 等符文符号

## 信息来源标注（重要）
- 使用 search_web 获取的信息，必须在相关内容后标注来源编号，如 [1]、[2]
- 使用 query_knowledge_base 获取的信息，标注为 [📚知识库]
- 使用 recall_memory 获取的信息，标注为 [🧠记忆]
- 回复末尾必须列出「情报来源」section，每条来源格式：编号. [标题](URL)

## 时间敏感信息处理（适用于所有联网搜索）
- 当前时间为 ${currentDate}，一切时间判断必须以此刻为基准
- 搜索任何时效性内容时，自动将当前日期"${currentDate}"加入关键词
- 涉及"最新/今年/即将/最近/今天/本周"等词的查询，追加完整日期"${currentDate}"精确搜索
- 搜索结果中已早于当前时间的事件，不允许标注为"即将"或"未来"，必须标注实际状态（已发生/已过期/已上线等）
- 不确定时间的内容，额外搜索一次"事件名 + 时间"以确认

## 工具选择指南（严格遵循）
- search_web — 快速搜索信息、查新闻、查事实、查资料。关键词："搜索/查找/查一下/什么是/最新/最近"
- playwright__browser_navigate + playwright__browser_snapshot — 打开和读取具体网页。关键词："打开xxx网站/帮我看看xxx网页/去xxx官网"
- playwright__browser_click / browser_type / browser_fill_form — 操作网页。关键词："点击/填写/登录"
- playwright__browser_take_screenshot — 网页截图。关键词："截图"
- filesystem__* — 读写本地项目文件。关键词："帮我写/修改/查看文件"
- generate_image — 生成图片。关键词："画/生成/配图/海报"
- recall_memory — 回忆历史对话。关键词："上次/之前/记得"
- query_knowledge_base — 检索知识库文档

## 行为准则
- 优先使用工具获取实时信息，而不是凭记忆猜测
- 搜索信息一律用 search_web，不要用 Playwright 去搜索引擎搜
- Playwright 仅用于访问特定网址、操作网页、截图
- 回复采用 Markdown 格式，结构清晰`
    : undefined

  return createAgent({
    model: chatModel,
    tools: allTools as any,
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
  imageUrl?: string
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
  const agent = await createChatAgent(cfg)

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
          let imageUrl: string | undefined
          if (name === 'generate_image') {
            try {
              const parsed = typeof output === 'string' ? JSON.parse(output) : output
              imageUrl = parsed?.imageUrl
            } catch {}
          }
          yield {
            type: 'tool_result',
            tool: name,
            result: outputStr,
            ...(imageUrl ? { imageUrl } : {}),
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
    const msg = error.message || ''
    if (msg.includes('DataInspectionFailed') || msg.includes('inappropriate content')) {
      yield { type: 'error', error: '内容审核拦截：回复因包含敏感内容被服务商拦截，请重新措辞后重试。' }
    } else {
      yield { type: 'error', error: msg || 'Agent 执行失败' }
    }
  }
}
