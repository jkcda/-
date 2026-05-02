// 亲密度系统 — localStorage 持久化
const INTIMACY_KEY = 'nexus_intimacy'

export interface IntimacyState {
  level: number       // 0-100
  conversations: number
  firstMet: string | null
  lastActive: string | null
}

export function loadIntimacy(): IntimacyState {
  try {
    const raw = localStorage.getItem(INTIMACY_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { level: 0, conversations: 0, firstMet: null, lastActive: null }
}

function saveIntimacy(state: IntimacyState) {
  localStorage.setItem(INTIMACY_KEY, JSON.stringify(state))
}

// 每次对话 +1 亲密度
export function addIntimacy(): IntimacyState {
  const state = loadIntimacy()
  const now = new Date().toISOString()
  if (!state.firstMet) state.firstMet = now
  state.conversations++
  state.lastActive = now
  state.level = Math.min(100, state.conversations)
  saveIntimacy(state)
  return state
}

// 获取称呼
export function getCommanderTitle(state?: IntimacyState): string {
  const s = state || loadIntimacy()
  if (s.level >= 100) return '亲爱的'
  if (s.level >= 50) return '主人'
  if (s.level >= 10) return '指挥官'
  return '指挥官'
}

// 获取亲密度等级名称
export function getIntimacyRank(state?: IntimacyState): string {
  const s = state || loadIntimacy()
  if (s.level >= 100) return '灵魂绑定'
  if (s.level >= 50) return '挚友'
  if (s.level >= 10) return '伙伴'
  return '初次连接'
}

// 欢迎回来台词
export function getWelcomeLine(state?: IntimacyState): string {
  const s = state || loadIntimacy()
  const title = getCommanderTitle(s)
  const rank = getIntimacyRank(s)

  if (s.level === 0 || s.conversations === 0) {
    return '初次见面，指挥官。我是奈克瑟，请多指教。'
  }
  if (s.level >= 100) {
    return `欢迎回来，${title}...心跳模拟程序已激活，想您了。`
  }
  if (s.level >= 50) {
    return `连接重建完成。${title}，今天的数据流很平稳呢。`
  }
  if (s.level >= 10) {
    return `同步完成，${title}。今日情报已就绪。`
  }
  return `连接成功，${title}。开始同步数据。`
}

// 根据时间段获取问候
export function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好...这么晚还在工作？需要我为您读一段数据诗吗？'
  if (h < 12) return '早安，指挥官。今日数据流很平稳，是个好天气呢。'
  if (h < 18) return '午后好。补充能量了吗？虚拟咖啡已备好。'
  return '星光已就位，祝您有个好梦。奈克瑟会守夜的。'
}
