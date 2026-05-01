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
    {
      vector: new Array(1024).fill(0),
      text: '',
      session_id: '',
      created_at: ''
    }
  ])
  await table.delete('session_id = \'\'')
  return table
}

// ── 优化1: Q&A 成对暂存 ──
const pendingUserMsg = new Map<string, { content: string; timestamp: string }>()

/**
 * 暂存用户消息，等 AI 回复后成对写入
 */
export function holdUserMessage(userId: number, sessionId: string, content: string): void {
  if (!content.trim()) return
  const key = `${userId}_${sessionId}`
  pendingUserMsg.set(key, { content, timestamp: new Date().toISOString() })
}

/**
 * AI 回复后，与用户消息配对写入记忆库
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

  // ── 优化3: 去重 ──
  if (await isDuplicate(userId, text)) return

  const [vector] = await embedDocuments([text])
  const table = await ensureTable(userId)
  await table.add([{
    vector,
    text,
    session_id: sessionId,
    created_at: pending.timestamp
  }])
  }

// ── 优化2: 时间衰减 ──
function decayFactor(createdAt: string): number {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(0.3, 1 - ageDays / 30)
}

// ── 优化3: 去重检查 ──
async function isDuplicate(userId: number, newText: string): Promise<boolean> {
  try {
    const conn = await getConnection()
    const names = await conn.tableNames()
    if (!names.includes(tableName(userId))) return false

    const qVector = await embedQuery(newText)
    const table = await conn.openTable(tableName(userId))
    const results = await table.search(qVector).limit(1).toArray()
    if (results.length === 0) return false

    // LanceDB 返回 distance，转 cosine 相似度：cosine = 1 - distance²/2
    const dist = (results[0] as any)._distance ?? 1
    const similarity = 1 - (dist * dist) / 2
    return similarity > 0.95
  } catch {
    return false
  }
}

// ── 优化4: 相对时间格式化 ──
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

/**
 * 检索与当前问题最相关的历史记忆（含时间衰减）
 */
export async function recallMemory(
  userId: number,
  query: string,
  topK: number = 5
): Promise<string> {
  const conn = await getConnection()
  const names = await conn.tableNames()
  if (!names.includes(tableName(userId))) return ''

  const table = await conn.openTable(tableName(userId))
  const qVector = await embedQuery(query)

  // 多取一些候选，衰减后再截断
  const raw = await table.search(qVector).limit(topK * 2).toArray()

  if (raw.length === 0) return ''

  // 时间衰减重排
  const weighted = raw.map((r: any) => {
    const dist = r._distance ?? 0
    const sim = 1 - (dist * dist) / 2
    const decay = decayFactor(r.created_at || '')
    return { text: r.text, score: sim * decay }
  })

  weighted.sort((a, b) => b.score - a.score)
  const top = weighted.slice(0, topK)

  if (top.length === 0) return ''

  const lines = top.map(t => t.text)
    return `--- 以下是相关的历史记忆 ---\n${lines.join('\n\n')}\n--- 记忆结束 ---\n\n`
}
