import Anthropic from '@anthropic-ai/sdk'
import { ChatHistoryModel } from '../models/chatHistory.js'
import config from '../config/index.js'
import fs from 'fs'
import path from 'path'
import { parseDocument } from './documentPipeline.js'
import { retrieveFromKB, retrieveFromFileChunks } from './ragChain.js'
import { recallMemory, holdUserMessage } from './memoryService.js'
import { processVideo } from './videoProcessor.js'
import { searchWeb } from './webSearch.js'
import type { RAGContext } from './ragChain.js'

function getClient(provider: 'modelscope' | 'volcengine' = 'modelscope') {
  const cfg = provider === 'volcengine' ? config.ai.volcengine : config.ai.modelscope
  return new Anthropic({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL
  })
}

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

async function buildMultimodalContent(
  message: string,
  files: UploadedFile[],
  maxVideoFrames: number = 600
): Promise<Anthropic.MessageParam> {
  const contentBlocks: any[] = []

  let documentContext = ''
  let videoTranscript = ''
  const videoFrames: string[] = []

  for (const file of files) {
    if (file.type.startsWith('text/') || file.type === 'application/pdf' || file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const docText = await parseDocument(file.url, file.type)
      documentContext += `\n\n--- 文件: ${file.name} ---\n${docText}\n--- 文件结束 ---\n`
    } else if (file.type.startsWith('video/')) {
      const result = await processVideo(file.url)
      if (result.transcript) {
        videoTranscript += `\n\n--- 视频语音转写: ${file.name} ---\n${result.transcript}\n--- 转写结束 ---\n`
      }
      const sampled = result.frames.length <= maxVideoFrames
        ? result.frames
        : Array.from({ length: maxVideoFrames }, (_, i) => result.frames[Math.floor(i * result.frames.length / maxVideoFrames)])
      videoFrames.push(...sampled)
    }
  }

  const textParts = [message]
  if (videoTranscript) textParts.push(videoTranscript)
  if (documentContext) textParts.push(`以下是上传的文档内容:\n${documentContext}`)
  const promptSuffix = videoFrames.length > 0
    ? '\n\n以上是视频的关键帧截图，请结合画面和语音转写内容进行综合分析。'
    : documentContext ? '\n请根据文档内容和用户问题进行回答。' : ''
  const textContent = textParts.join('\n\n') + promptSuffix
  contentBlocks.push({ type: 'text', text: textContent })

  // 视频帧作为图片发送给 VL 模型
  for (const frame of videoFrames) {
    contentBlocks.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: frame }
    })
  }

  for (const file of files) {
    if (file.type.startsWith('image/')) {
      try {
        const { data, mediaType } = imageToBase64(file.url)
        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data
          }
        })
      } catch {
        contentBlocks.push({ type: 'text', text: `\n[图片上传失败: ${file.name}]` })
      }
    }
  }

  return { role: 'user', content: contentBlocks }
}

export async function chatWithAIStream(
  message: string,
  sessionId: string,
  userId: number | null = null,
  files?: UploadedFile[],
  kbId?: number,
  webSearchEnabled: boolean = false,
  nexusMode: boolean = true,
  maxVideoFrames?: number,
  model?: string
) {
  try {
    const history = await ChatHistoryModel.getBySessionIdAndUserId(sessionId, userId)
    const historyMessages: Message[] = history.map(h => ({
      role: h.role,
      content: h.content,
      files: h.files ? (typeof h.files === 'string' ? JSON.parse(h.files) : h.files) : undefined
    }))

    // RAG 检索（知识库 + 记忆），并行执行以降低延迟
    let ragContext: RAGContext = { chunks: [], promptAddition: '' }
    const context = buildContext(historyMessages)

    const [kbResult, memoryContext, webResult] = await Promise.all([
      kbId ? retrieveFromKB(message, kbId, context, config.rag.topK, undefined, sessionId) : Promise.resolve(null),
      userId ? recallMemory(userId, message) : Promise.resolve(''),
      webSearchEnabled ? searchWeb(message) : Promise.resolve({ text: '', sources: [] })
    ])
    const webContext = webResult.text
    const webSources = webResult.sources

    if (kbResult) ragContext = kbResult

    if (files && files.length > 0) {
      const docFiles = files.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'))
      if (docFiles.length > 0) {
        const { chunkFileForChat } = await import('./documentPipeline.js')
        let allChunks: any[] = []
        for (const f of docFiles) {
          const chunks = await chunkFileForChat(f.url, f.type, f.name)
          allChunks = allChunks.concat(chunks)
        }
        const fileRag = await retrieveFromFileChunks(message, allChunks)
        if (fileRag.promptAddition) {
          ragContext.promptAddition += '\n' + fileRag.promptAddition
          ragContext.chunks = ragContext.chunks.concat(fileRag.chunks)
        }
      }
    }
    const prefix = webContext + memoryContext + (ragContext.promptAddition || '')
    const combinedPrefix = prefix
      ? prefix + '\n--- 以下是当前对话 ---\n'
      : ''
    const fullPrompt = `${combinedPrefix}${context}用户: ${message}\n助手:`

    const filesJson = files ? JSON.stringify(files) : undefined
    const retrievedJson = ragContext.chunks.length > 0
      ? JSON.stringify(ragContext.chunks.map(c => ({ source: c.source, score: c.score })))
      : undefined
    await ChatHistoryModel.create(sessionId, userId, 'user', message, filesJson)

    // 暂存用户消息，等 AI 回复后成对写入记忆库
    if (userId) {
      holdUserMessage(userId, sessionId, message)
    }

    let messages: Anthropic.MessageParam[]

    if (files && files.some(f => f.type.startsWith('image/') || f.type.startsWith('video/'))) {
      // 多模态消息：图片/视频帧用 content-block，文本用 RAG 增强后的 prompt
      const historyBlocks: Anthropic.MessageParam[] = []
      let contextText = ''
      for (let i = historyMessages.length - 1; i >= 0; i--) {
        const m = historyMessages[i]
        const role = m.role === 'user' ? '用户' : '助手'
        contextText = `${role}: ${m.content}\n` + contextText
      }

      const multimodalPrefix = webContext + memoryContext + (ragContext.promptAddition || '')
      const systemText = multimodalPrefix
        ? `${multimodalPrefix}\n--- 以下是对话历史 ---\n${contextText}`
        : contextText

      if (systemText) {
        historyBlocks.push({ role: 'user', content: `以下是历史对话:\n${systemText}` })
      }

      const multimodalMsg = await buildMultimodalContent(message, files, maxVideoFrames || 600)
      messages = [...historyBlocks, multimodalMsg]
    } else {
      messages = [
        { role: 'user', content: fullPrompt }
      ]
    }

    const isFirstMessage = historyMessages.length === 0
    const systemPrompt = nexusMode
      ? (isFirstMessage
          ? NEXUS_SYSTEM_PROMPT + '\n\n' + firstMessageSystemPrompt
          : NEXUS_SYSTEM_PROMPT)
      : undefined

    const modelId = model || config.ai.defaultModel
    const modelCfg = config.ai.models.find(m => m.id === modelId)
    const provider = modelCfg?.provider || 'modelscope'
    const activeClient = getClient(provider)

    const stream = await activeClient.messages.stream({
      model: modelId,
      max_tokens: config.ai.maxTokens,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages
    })

    return {
      stream,
      sessionId,
      retrievedChunks: ragContext.chunks.length > 0 ? ragContext.chunks : undefined,
      webSources: webSources.length > 0 ? webSources : undefined
    }
  } catch (error: any) {
    throw new Error(`AI流式调用失败: ${error.message}`)
  }
}
