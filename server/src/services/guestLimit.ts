// 游客模式：IP 维度限流，每 IP 最多 10 次 AI 对话
// 服务重启后清空（轻量方案，无需数据库）

const ipUsage = new Map<string, number>()
const MAX_GUEST_QUESTIONS = 10

// 定时清理（每 6 小时清掉超过 1 小时未活动的 IP）
setInterval(() => {
  // 简化：每 6 小时全清
  ipUsage.clear()
}, 6 * 60 * 60 * 1000)

export function getGuestRemaining(clientIp: string): number {
  const used = ipUsage.get(clientIp) || 0
  return Math.max(0, MAX_GUEST_QUESTIONS - used)
}

export function consumeGuestQuota(clientIp: string): boolean {
  const used = ipUsage.get(clientIp) || 0
  if (used >= MAX_GUEST_QUESTIONS) return false
  ipUsage.set(clientIp, used + 1)
  return true
}

export function isGuestBlocked(clientIp: string): boolean {
  const used = ipUsage.get(clientIp) || 0
  return used >= MAX_GUEST_QUESTIONS
}

export { MAX_GUEST_QUESTIONS }
