import type { RoomAgent } from '../models/room.js'
import { providerManager } from '../providers/index.js'

const agentLastReply = new Map<string, number>()
const AGENT_COOLDOWN_MS = 4000

setInterval(() => {
  const now = Date.now()
  for (const [key, ts] of agentLastReply) {
    if (now - ts > 60000) agentLastReply.delete(key)
  }
}, 60_000)

export function canAgentReply(roomId: number, agentId: number): boolean {
  const key = `${roomId}:${agentId}`
  const last = agentLastReply.get(key)
  if (!last) return true
  return (Date.now() - last) >= AGENT_COOLDOWN_MS
}

export function recordAgentReply(roomId: number, agentId: number): void {
  agentLastReply.set(`${roomId}:${agentId}`, Date.now())
}

/**
 * 批量调度 — 一次 LLM 决定所有角色
 * 规则在 prompt 里写死，不依赖模型素质
 */
export async function scheduleReplies(
  roomId: number,
  roomAgents: RoomAgent[],
  recentMessages: Array<{ role: string; content: string; agentId?: number; username?: string }>,
  userMessage: string,
  username: string
): Promise<number[]> {
  if (roomAgents.length === 0) return []

  // @ 提及的强制回复
  const mentionedIds = roomAgents
    .filter(a => userMessage.includes(`@${a.name}`))
    .map(a => a.agent_id)

  // 只有一个角色 → 直接回
  if (roomAgents.length === 1) {
    return canAgentReply(roomId, roomAgents[0].agent_id) ? [roomAgents[0].agent_id] : []
  }

  try {
    const result = await batchSchedule(roomAgents, recentMessages, userMessage, username)

    // 合并 @提及 + LLM 选中
    const merged = new Set([...mentionedIds, ...result])
    const filtered = Array.from(merged).filter(id => canAgentReply(roomId, id))

    if (filtered.length === 0 && result.length === 0) return [] // 没人该回
    if (filtered.length === 0) return mentionedIds.filter(id => canAgentReply(roomId, id))

    console.log('[Scheduler] 选中:', filtered.join(','))
    return filtered
  } catch (err: any) {
    console.warn('[Scheduler] LLM 失败，降级为 @ 触发:', err.message)
    return mentionedIds.filter(id => canAgentReply(roomId, id))
  }
}

async function batchSchedule(
  agents: RoomAgent[],
  recentMessages: Array<{ role: string; content: string; agentId?: number; username?: string }>,
  userMessage: string,
  username: string
): Promise<number[]> {
  const context = recentMessages.slice(-6).map(m => {
    const who = m.username || (m.role === 'user' ? '用户' : (m.agentId ? `角色${m.agentId}` : 'AI'))
    return `${who}: ${m.content.slice(0, 150)}`
  }).join('\n')

  const agentList = agents.map(a =>
    `[${a.agent_id}] ${a.name}（${a.system_prompt.slice(0, 200)}）`
  ).join('\n')

  const model = providerManager.createLangChainModel('deepseek-ai/DeepSeek-V4-Flash')
  // 覆写默认参数
  model.maxTokens = 200
  model.temperature = 0

  const prompt = `你是群聊调度器。判断哪些角色应该回复用户的消息。

规则（严格遵守）：
- reply: false 是默认值，大多数角色不应回复
- 用户 @某角色名的 → reply: true（强制）
- 角色人设与消息话题明显相关 → reply: true
- 纯闲聊/寒暄（"哈哈""嗯""好的"）→ 最多1个角色 reply: true
- 问问题 → 只有懂这个领域的角色 reply: true
- 输出严格 JSON 数组，总数不超过 3 个 true

角色：
${agentList}

最近对话：
${context || '（开始）'}

${username} 说：${userMessage.slice(0, 400)}

JSON:`

  const response = await model.invoke(prompt)
  const text = typeof response.content === 'string'
    ? response.content
    : Array.isArray(response.content)
      ? response.content.map((c: any) => typeof c === 'string' ? c : c.text).join('')
      : ''

  const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  try {
    const decisions = JSON.parse(clean) as Array<{ agentId: number; reply: boolean }>
    const selected = decisions.filter(d => d.reply).map(d => d.agentId)
    if (selected.length > 3) return selected.slice(0, 3)
    return selected
  } catch {
    // 解析失败 → 安全降级：不回
    console.warn('[Scheduler] JSON 解析失败，跳过')
    return []
  }
}
