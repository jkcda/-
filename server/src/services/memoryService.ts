import { connect } from '@lancedb/lancedb'
import { embedQuery, embedDocuments } from './embedding.js'
import config from '../config/index.js'
import path from 'path'
import fs from 'fs'
import type { Connection, Table } from '@lancedb/lancedb'

let _connection: Connection | null = null

async function getConnection(): Promise<Connection> {
  if (!_connection) {
    const dataDir = path.resolve(config.lancedb.dataDir)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    _connection = await connect(dataDir)
  }
  return _connection
}

function tableName(userId: number): string {
  return `kb_memory_${userId}`
}

async function ensureTable(userId: number): Promise<Table> {
  const conn = await getConnection()
  const name = tableName(userId)
  const names = await conn.tableNames()
  if (names.includes(name)) {
    return conn.openTable(name)
  }
  const table = await conn.createTable(name, [
    { vector: new Array(1024).fill(0), text: '', session_id: '', created_at: '' }
  ])
  await table.delete('session_id = \'\'')
  return table
}

// ── Q&A 成对暂存 ──
const pendingUserMsg = new Map<string, { content: string; timestamp: string }>()
// ── 会话摘要：跟踪每会话的消息轮数 ──
const sessionRoundCount = new Map<string, number>()

export function holdUserMessage(userId: number, sessionId: string, content: string): void {
  if (!content.trim()) return
  const key = `${userId}_${sessionId}`
  pendingUserMsg.set(key, { content, timestamp: new Date().toISOString() })
}

/**
 * AI 回复后配对写入，并在每 10 轮对话后生成摘要
 */
export async function commitMemoryPair(
  userId: number,
  sessionId: string,
  assistantContent: string
): Promise<void> {
  if (!assistantContent.trim()) return
  const key = `${userId}_${sessionId}`
  const pending = pendingUserMsg.get(key)
  if (!pending) return
  pendingUserMsg.delete(key)

  const text = `[${formatRelativeTime(pending.timestamp)}]\n用户: ${pending.content}\n助手: ${assistantContent}`

  if (await isDuplicate(userId, text)) return

  const [vector] = await embedDocuments([text])
  const table = await ensureTable(userId)
  await table.add([{ vector, text, session_id: sessionId, created_at: pending.timestamp }])

  // 检查是否需要生成会话摘要
  const countKey = `${userId}_${sessionId}`
  const rounds = (sessionRoundCount.get(countKey) || 0) + 1
  sessionRoundCount.set(countKey, rounds)

  if (rounds % 10 === 0) {
    try {
      await generateSummary(userId, sessionId, rounds)
    } catch {}
  }
}

// ── 中期优化1: 会话摘要 ──
async function generateSummary(userId: number, sessionId: string, roundCount: number): Promise<void> {
  const conn = await getConnection()
  const names = await conn.tableNames()
  if (!names.includes(tableName(userId))) return

  // 取该会话最近 10 条记忆作为摘要素材
  const table = await conn.openTable(tableName(userId))
  const q = await embedQuery(sessionId)
  const recent = await table.search(q).where(`session_id = '${sessionId}'`).limit(10).toArray()

  if (recent.length === 0) return
  const dialogText = recent.map((r: any) => r.text).join('\n\n')

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: config.ai.apiKey, baseURL: config.ai.baseURL })
  const msg = await client.messages.create({
    model: config.ai.model,
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `请用 1-2 句中文总结以下对话的核心内容，只输出摘要本身：\n\n${dialogText}`
    }]
  })
  const summary = (msg.content[0] as any)?.text?.trim()
  if (!summary) return

  const summaryText = `[会话摘要 · 第${roundCount}轮 · ${formatRelativeTime(new Date().toISOString())}]\n${summary}`
  const [vector] = await embedDocuments([summaryText])
  await ensureTable(userId)
  await table.add([{ vector, text: summaryText, session_id: `summary_${sessionId}`, created_at: new Date().toISOString() }])
}

// ── 中期优化2: 分级检索 ──
export async function recallMemory(
  userId: number,
  query: string,
  topK: number = 5
): Promise<string> {
  const conn = await getConnection()
  const names = await conn.tableNames()
  if (!names.includes(tableName(userId))) return ''

  const table = await conn.openTable(tableName(userId))
  // 记忆少于 5 条时跳过检索，省 Embedding API 调用
  const count = await table.countRows()
  if (count < 5) return ''

  const qVector = await embedQuery(query)
  const raw = await table.search(qVector).limit(topK * 3).toArray()
  if (raw.length === 0) return ''

  const weighted = raw.map((r: any) => {
    const dist = r._distance ?? 0
    const sim = 1 - (dist * dist) / 2
    const decay = decayFactor(r.created_at || '')
    // 摘要加权：1.2x，优先召回
    const isSummary = (r.text || '').startsWith('[会话摘要')
    const summaryBoost = isSummary ? 1.2 : 1.0
    return { text: r.text, score: sim * decay * summaryBoost, isSummary }
  })

  weighted.sort((a, b) => b.score - a.score)

  // 至少保留 1 条摘要（如果有的话）
  const summaries = weighted.filter(w => w.isSummary)
  const messages = weighted.filter(w => !w.isSummary)
  const top: { text: string }[] = []
  if (summaries.length > 0) top.push(summaries[0])
  for (const m of messages) {
    if (top.length >= topK) break
    top.push(m)
  }
  // 剩余名额给更多摘要
  for (let i = top.length < topK ? 0 : Infinity; top.length < topK && i < summaries.length; i++) {
    if (!top.includes(summaries[i])) top.push(summaries[i])
  }

  if (top.length === 0) return ''

  const lines = top.map(t => t.text)
  return `--- 以下是相关的历史记忆 ---\n${lines.join('\n\n')}\n--- 记忆结束 ---\n\n`
}

// ── 中期优化3: 遗忘机制 ──

/** 删除指定会话的所有记忆 */
export async function forgetSession(userId: number, sessionId: string): Promise<void> {
  const conn = await getConnection()
  const names = await conn.tableNames()
  if (!names.includes(tableName(userId))) return
  const table = await conn.openTable(tableName(userId))
  // 同时删消息记忆和关联摘要
  await table.delete(`session_id = '${sessionId}'`)
  await table.delete(`session_id = 'summary_${sessionId}'`)
  sessionRoundCount.delete(`${userId}_${sessionId}`)
}

/** 删除用户全部记忆（清空记忆库） */
export async function forgetAllMemories(userId: number): Promise<void> {
  const conn = await getConnection()
  const names = await conn.tableNames()
  const name = tableName(userId)
  if (!names.includes(name)) return
  await conn.dropTable(name)
  // 清除该用户的所有内存状态
  for (const key of sessionRoundCount.keys()) {
    if (key.startsWith(`${userId}_`)) sessionRoundCount.delete(key)
  }
}

// ── 工具函数 ──
function decayFactor(createdAt: string): number {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(0.3, 1 - ageDays / 30)
}

async function isDuplicate(userId: number, newText: string): Promise<boolean> {
  try {
    const conn = await getConnection()
    const names = await conn.tableNames()
    if (!names.includes(tableName(userId))) return false
    const qVector = await embedQuery(newText)
    const table = await conn.openTable(tableName(userId))
    const results = await table.search(qVector).limit(1).toArray()
    if (results.length === 0) return false
    const dist = (results[0] as any)._distance ?? 1
    return (1 - (dist * dist) / 2) > 0.95
  } catch {
    return false
  }
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return `${Math.floor(days / 30)}个月前`
}
