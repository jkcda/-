import Anthropic from '@anthropic-ai/sdk'
import { ChatHistoryModel } from '../models/chatHistory.js'
import config from '../config/index.js'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse')

const client = new Anthropic({
  apiKey: config.ai.apiKey,
  baseURL: config.ai.baseURL
})

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

// 上下文拼接，限制最大字符数
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

// 读取图片文件为 base64
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

// 提取文档文本内容
async function extractDocumentText(filePath: string, mimetype: string): Promise<string> {
  const absolutePath = path.join(process.cwd(), filePath)

  switch (mimetype) {
    case 'text/plain':
    case 'text/markdown':
    case 'application/json':
      return fs.readFileSync(absolutePath, 'utf-8')

    case 'application/pdf':
      try {
        const dataBuffer = fs.readFileSync(absolutePath)
        const data = await pdfParse(dataBuffer)
        return data.text
      } catch {
        return '[PDF 解析失败]'
      }

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      try {
        const mammoth = (await import('mammoth')).default
        const result = await mammoth.extractRawText({ path: absolutePath })
        return result.value
      } catch {
        return '[DOCX 解析失败]'
      }

    case 'application/msword':
      return '[DOC 为旧版二进制格式，无法直接解析。请将文件另存为 DOCX 格式后重新上传]'

    default:
      return '[不支持预览的文档类型]'
  }
}

// 构建多模态消息内容
async function buildMultimodalContent(
  message: string,
  files: UploadedFile[]
): Promise<Anthropic.MessageParam> {
  const contentBlocks: any[] = []

  // 先添加文档文本
  let documentContext = ''
  for (const file of files) {
    if (file.type.startsWith('text/') || file.type === 'application/pdf' || file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const docText = await extractDocumentText(file.url, file.type)
      documentContext += `\n\n--- 文件: ${file.name} ---\n${docText}\n--- 文件结束 ---\n`
    }
  }

  // 添加文本块
  const textContent = documentContext
    ? `用户问题: ${message}\n\n以下是上传的文档内容:\n${documentContext}\n请根据文档内容和用户问题进行回答。`
    : message
  contentBlocks.push({ type: 'text', text: textContent })

  // 添加图片
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

export async function chatWithAI(message: string, sessionId: string, userId: number | null = null, files?: UploadedFile[]) {
  try {
    const history = await ChatHistoryModel.getBySessionIdAndUserId(sessionId, userId)
    const historyMessages: Message[] = history.map(h => ({
      role: h.role,
      content: h.content,
      files: h.files ? (typeof h.files === 'string' ? JSON.parse(h.files) : h.files) : undefined
    }))

    const context = buildContext(historyMessages)
    const prompt = `${context}用户: ${message}\n助手:`

    const filesJson = files ? JSON.stringify(files) : undefined
    await ChatHistoryModel.create(sessionId, userId, 'user', message, filesJson)

    const response = await client.messages.create({
      model: config.ai.model,
      max_tokens: config.ai.maxTokens,
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    const assistantContent = (response.content[0] as any)?.text || ''

    await ChatHistoryModel.create(sessionId, userId, 'assistant', assistantContent)

    return assistantContent
  } catch (error: any) {
    throw new Error(`AI调用失败: ${error.message}`)
  }
}

export async function chatWithAIStream(message: string, sessionId: string, userId: number | null = null, files?: UploadedFile[]) {
  try {
    const history = await ChatHistoryModel.getBySessionIdAndUserId(sessionId, userId)
    const historyMessages: Message[] = history.map(h => ({
      role: h.role,
      content: h.content,
      files: h.files ? (typeof h.files === 'string' ? JSON.parse(h.files) : h.files) : undefined
    }))

    const context = buildContext(historyMessages)
    const fullPrompt = `${context}用户: ${message}\n助手:`

    const filesJson = files ? JSON.stringify(files) : undefined
    await ChatHistoryModel.create(sessionId, userId, 'user', message, filesJson)

    let messages: Anthropic.MessageParam[]

    if (files && files.length > 0) {
      // 多模态消息: 新消息用 content-block 格式，历史消息保持纯文本
      const historyBlocks: Anthropic.MessageParam[] = []
      let contextText = ''
      for (let i = historyMessages.length - 1; i >= 0; i--) {
        const m = historyMessages[i]
        const role = m.role === 'user' ? '用户' : '助手'
        contextText = `${role}: ${m.content}\n` + contextText
      }
      if (contextText) {
        historyBlocks.push({ role: 'user', content: `以下是历史对话:\n${contextText}` })
      }

      const multimodalMsg = await buildMultimodalContent(message, files)
      messages = [...historyBlocks, multimodalMsg]
    } else {
      messages = [
        { role: 'user', content: fullPrompt }
      ]
    }

    const stream = await client.messages.stream({
      model: config.ai.model,
      max_tokens: config.ai.maxTokens,
      messages
    })

    return {
      stream,
      sessionId
    }
  } catch (error: any) {
    throw new Error(`AI流式调用失败: ${error.message}`)
  }
}
