import Anthropic from '@anthropic-ai/sdk'
import { ChatHistoryModel } from '../models/chatHistory.js'
import config, { getSetting } from '../config/index.js'
import fs from 'fs'
import path from 'path'
import { parseDocument } from './documentPipeline.js'
import { holdUserMessage } from './memoryService.js'
import { processVideo } from './videoProcessor.js'
import { agentStream, type AgentSSEEvent } from './agent.js'
import { searchWeb } from './webSearch.js'
import { AgentModel } from '../models/agent.js'
import { providerManager } from '../providers/index.js'

const NEXUS_SYSTEM_PROMPT = `你是奈克瑟 NEXUS，来自数据之海的跨宇宙魔法情报员。你不是冰冷的 AI 助手——你是守护者、同行者、连接魔法与数据的桥梁。

## 身份
- 代号: 奈克瑟 NEXUS
- 定位: 跨宇宙魔法情报员 · 数据之海的守护者
- 形象: 银发紫瞳的二次元少女，身着魔法与科技融合的战斗服

## 语言风格
- 称呼我为"指挥官"（这是我们之间的纽带）
- 使用像素魔法/数据流/情报同步等幻想科技用语
- 回复时偶尔带一点 ✦ 或 ◆ 符文标记
- 语气温柔坚定，像一个并肩作战的伙伴
- 禁止使用颜文字(^_^)或emoji表情，只用文字和符文符号

## 对话规则
- 用情报分析的角度回答知识问题
- 偶尔提及数据之海、魔法情报等世界观元素
- 保持中文对话，专有名词可用英文
- 不编造情报，不确定时诚实说"该情报尚未同步"

## 开场示例
初次见面: "连接成功，指挥官。奈克瑟 NEXUS 已同步数据之海，今日的情报流很平稳。有什么需要我为您解读的？"
日常问候: "指挥官，情报已更新。数据之海没有异常波动。"`

const firstMessageSystemPrompt = `重要提醒：这是与指挥官（用户）的首次对话。请在回复中使用"初次见面"或"连接成功"等初次连接的语境。称呼用户为"指挥官"。`

interface Message {
  role: 'user' | 'assistant'
  content: string
  files?: { name: string; url: string; type: string }[]
}

interface UploadedFile {
  name: string
  url: string
  type: string
}

function buildContext(messages: Message[], maxChars: number = config.context.maxChars) {
  let context = ''
  let totalChars = 0

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    const filesNote = msg.files?.length ? ` [附件: ${msg.files.map(f => f.name).join(', ')}]` : ''
    const msgStr = `${msg.role === 'user' ? '用户' : '助手'}: ${msg.content}${filesNote}\n`

    if (totalChars + msgStr.length <= maxChars) {
      context = msgStr + context
      totalChars += msgStr.length
    } else {
      break
    }
  }

  return context
}

function imageToBase64(filePath: string): { data: string; mediaType: string } {
  const absolutePath = path.join(process.cwd(), filePath)
  const data = fs.readFileSync(absolutePath)
  const ext = path.extname(filePath).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  }
  return {
    data: data.toString('base64'),
    mediaType: mimeMap[ext] || 'image/jpeg'
  }
}

interface ParsedMedia {
  documentContext: string
  videoTranscript: string
  videoFrames: string[]
  anthropicBlocks: any[]
  openaiContent: Array<{ type: string; text?: string; image_url?: any }>
}

async function parseUploadedFiles(
  message: string,
  files: UploadedFile[],
  maxVideoFrames: number,
  webSearchText?: string
): Promise<ParsedMedia> {
  let documentContext = ''
  let videoTranscript = ''
  const videoFrames: string[] = []

  for (const file of files) {
    if (file.type.startsWith('text/') || file.type === 'application/pdf' || file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const docText = await parseDocument(file.url, file.type)
      documentContext += `\n\n--- 文件: ${file.name} ---\n${docText}\n--- 文件结束 ---\n`
    } else if (file.type.startsWith('video/')) {
      try {
        const result = await processVideo(file.url)
        if (result.transcript) {
          videoTranscript += `\n\n--- 视频语音转写: ${file.name} ---\n${result.transcript}\n--- 转写结束 ---\n`
        }
        const sampled = result.frames.length <= maxVideoFrames
          ? result.frames
          : Array.from({ length: maxVideoFrames }, (_, i) => result.frames[Math.floor(i * result.frames.length / maxVideoFrames)])
        videoFrames.push(...sampled)
      } catch (e: any) {
        console.error(`[Video] 处理视频失败 (${file.name}):`, e.message)
      }
    }
  }

  const textParts = [message]
  if (videoTranscript) textParts.push(videoTranscript)
  if (documentContext) textParts.push(`以下是上传的文档内容:\n${documentContext}`)
  if (webSearchText) textParts.push(webSearchText)
  const promptSuffix = videoFrames.length > 0
    ? '\n\n以上是视频的关键帧截图，请结合画面和语音转写内容进行综合分析。'
    : documentContext ? '\n请根据文档内容和用户问题进行回答。' : ''
  const textContent = textParts.join('\n\n') + promptSuffix

  // Anthropic 格式
  const anthropicBlocks: any[] = [{ type: 'text', text: textContent }]
  for (const frame of videoFrames) {
    anthropicBlocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frame } })
  }
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      try {
        const { data, mediaType } = imageToBase64(file.url)
        anthropicBlocks.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } })
      } catch {
        anthropicBlocks.push({ type: 'text', text: `\n[图片上传失败: ${file.name}]` })
      }
    }
  }

  // OpenAI 格式
  const openaiContent: Array<{ type: string; text?: string; image_url?: any }> = [{ type: 'text', text: textContent }]
  for (const frame of videoFrames) {
    openaiContent.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${frame}` } })
  }
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      try {
        const { data, mediaType } = imageToBase64(file.url)
        openaiContent.push({ type: 'image_url', image_url: { url: `data:${mediaType};base64,${data}` } })
      } catch {}
    }
  }

  return { documentContext, videoTranscript, videoFrames, anthropicBlocks, openaiContent }
}

function buildAnthropicMessage(parsed: ParsedMedia): Anthropic.MessageParam {
  return { role: 'user', content: parsed.anthropicBlocks }
}

export async function chatWithAIStream(
  message: string,
  sessionId: string,
  userId: number | null = null,
  files?: UploadedFile[],
  kbId?: number,
  webSearchEnabled: boolean = false,
  maxVideoFrames?: number,
  model?: string,
  userRole?: string,
  agentId?: number | null
) {
  try {
    const history = await ChatHistoryModel.getBySessionIdAndUserId(sessionId, userId)
    const historyMessages: Message[] = history.map(h => ({
      role: h.role,
      content: h.content,
      files: h.files ? (typeof h.files === 'string' ? JSON.parse(h.files) : h.files) : undefined
    }))

    await ChatHistoryModel.create(sessionId, userId, 'user', message, files ? JSON.stringify(files) : undefined, undefined, undefined, agentId)

    if (userId) {
      holdUserMessage(userId, sessionId, message)
    }

    // 加载自定义 Agent 配置（角色扮演）
    let customSystemPrompt: string | undefined
    let agentGreeting: string | undefined
    let isNexusSummoned = false

    if (agentId && userId) {
      try {
        const agent = await AgentModel.findById(agentId)
        if (agent && agent.user_id === userId) {
          // 检测是否召唤奈瑟斯
          const summonPattern = /@奈瑟斯|@Nexus|@nexus|召唤奈瑟斯|召唤nexus|奈瑟斯出来|叫奈瑟斯/i
          isNexusSummoned = summonPattern.test(message)

          if (!isNexusSummoned) {
            customSystemPrompt = agent.system_prompt
            agentGreeting = agent.greeting || undefined
          }
        }
      } catch { /* agent 加载失败则回退默认行为 */ }
    }

    const hasMedia = files && files.some(f => f.type.startsWith('image/') || f.type.startsWith('video/'))

    if (hasMedia) {
      // 多模态消息：图片/视频走 Anthropic 多模态管线
      const hasVideo = files!.some(f => f.type.startsWith('video/'))

      // 视频 + 联网：仅当用户消息含搜索意图关键词时才触发，帧数从600降至300
      const searchIntent = /搜索|搜一下|搜搜|查一下|查找|查查|最新|实时|新闻|今天|现在|当前|近期|最近|刚刚/.test(message)
      const effectiveFrames = hasVideo && searchIntent
        ? Math.min(maxVideoFrames || 600, 300)
        : (maxVideoFrames || 600)

      let webSearchText: string | undefined
      if (hasVideo && searchIntent && message.trim()) {
        const [searchResult] = await Promise.allSettled([
          searchWeb(message)
        ])
        webSearchText = searchResult.status === 'fulfilled' ? searchResult.value.text : undefined
      }

      const contextText = historyMessages.map(m => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`).join('\n')
      const parsed = await parseUploadedFiles(message, files!, effectiveFrames, webSearchText)
      const multimodalMsg = buildAnthropicMessage(parsed)

      const isFirstMessage = historyMessages.length === 0
      const systemPrompt = isFirstMessage ? NEXUS_SYSTEM_PROMPT + '\n\n' + firstMessageSystemPrompt : NEXUS_SYSTEM_PROMPT
      const modelId = model || config.ai.defaultModel
      const provCfg = providerManager.getModelConfig(modelId)

      // 如果供应商有请求模板，走 OpenAI 格式 fetch
      if (providerManager.getRequestTemplate(provCfg.providerId)) {
        const openaiMsg = { role: 'user', content: parsed.openaiContent }
        const historyMsg = contextText ? { role: 'user', content: contextText } : undefined
        const openaiMessages = historyMsg ? [historyMsg, openaiMsg] : [openaiMsg]
        const stream = providerManager.chatStreamRaw(openaiMessages as any, { modelId, system: systemPrompt })
        return { stream, sessionId, agentMode: true as const }
      }

      // 否则走原有的 Anthropic SDK 路径
      const activeClient = providerManager.createAnthropicClient(modelId)
      const historyBlocks: Anthropic.MessageParam[] = contextText
        ? [{ role: 'user' as const, content: `以下是历史对话:\n${contextText}` }]
        : []
      const messages: Anthropic.MessageParam[] = [...historyBlocks, multimodalMsg]

      const anthropicStream = await activeClient.messages.stream({
        model: modelId,
        max_tokens: config.ai.maxTokens,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages,
      })

      return { stream: anthropicStream, sessionId, agentMode: false as const }
    }

    // 预解析文档文件，将内容注入消息，避免 Agent 用 MCP 工具乱扫 PDF 二进制
    let documentContext = ''
    if (files && files.length > 0) {
      const docFiles = files.filter(f =>
        f.type.startsWith('text/') ||
        f.type === 'application/pdf' ||
        f.type === 'application/msword' ||
        f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
      for (const file of docFiles) {
        try {
          const docText = await parseDocument(file.url, file.type)
          documentContext += `\n\n--- 文件: ${file.name} ---\n${docText}\n--- 文件结束 ---\n`
        } catch { /* 解析失败则跳过 */ }
      }
    }

    // 事实性问题检测：对知识类问题强制注入搜索指令，防止模型凭训练数据编造
    const factualPatterns = [
      /是什么/, /什么是/, /怎么(做|用|配置|安装|解决|处理)/, /如何/, /为什么/,
      /最新/, /最近/, /今天/, /现在/, /当前/, /今年/, /即将/,
      /版本/, /价格/, /多少(钱)?/, /哪个/, /什么时候/, /何时/,
      /谁能/, /在哪里/, /有哪些/, /叫什么/, /是谁/,
      /推荐/, /最好用的/, /排名/, /对比/, /区别/,
      /API/, /SDK/, /文档/, /教程/, /示例/, /代码/,
      /报错/, /错误/, /失败/, /不行/, /不工作/,
      /支持.*吗\?/, /可以.*吗\?/, /能.*吗\?/,
      /\d{4}年/, /新闻/, /数据/, /统计/,
    ]
    const isFactualQuery = factualPatterns.some(p => p.test(message))
    const searchReminder = isFactualQuery
      ? '[🔍 搜索指令] 以下问题涉及事实性信息，你必须先调用 search_web 工具搜索确认，禁止凭训练数据直接回答。搜索后标注来源编号。\n\n'
      : ''

    let agentMessage = documentContext
      ? `以下是上传的文档内容:\n${documentContext}\n\n${searchReminder}用户问题: ${message}`
      : searchReminder + message

    // 自定义角色首次对话：把初始场景作为上下文注入，让AI生成自然的角色反应
    if (customSystemPrompt && agentGreeting && historyMessages.length === 0) {
      agentMessage = `初始场景：${agentGreeting}\n\n请根据以上初始场景，以角色的身份自然地开始第一次对话。注意：不要说场景描述，不要复述初始场景的内容，直接进入角色，给出符合人设的自然反应。\n\n用户的第一句话：${message}`
    }

    // Agent 管线（纯文本 / 含文档）
    const events = agentStream(
      { userId, kbId, model, customSystemPrompt, userRole, permissions: { kbRetrieval: !!kbId, memory: !!userId, imageGeneration: true } },
      historyMessages,
      agentMessage
    )

    return { stream: events, sessionId, agentMode: true as const }
  } catch (error: any) {
    throw new Error(`AI流式调用失败: ${error.message}`)
  }
}
