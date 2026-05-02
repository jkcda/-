import { ref } from 'vue'

export interface VoiceItem {
  id: string      // browser voice name
  name: string    // friendly display name
  gender: string
  style: string   // e.g. "自然高音" / "温柔" / "本地"
}

// 知名中文女声友好名称映射（按 browser voice.name 前缀匹配）
const FEMALE_VOICE_MAP: [RegExp, string, string][] = [
  [/xiaoxiao/i, '晓晓', '温柔亲切'],
  [/xiaoyi/i,   '晓伊', '活泼可爱'],
  [/xiaochen/i, '晓辰', '沉稳知性'],
  [/xiaohan/i,  '晓涵', '自然随和'],
  [/xiaomeng/i, '晓梦', '甜美梦幻'],
  [/xiaomo/i,   '晓墨', '清冷磁性'],
  [/xiaoqiu/i,  '晓秋', '温婉知性'],
  [/xiaorui/i,  '晓睿', '干练果断'],
  [/xiaoshuang/i, '晓双', '元气少女'],
  [/xiaoxuan/i, '晓萱', '优雅大方'],
  [/xiaoyan/i,  '晓颜', '细腻温柔'],
  [/xiaoyou/i,  '晓悠', '慵懒随性'],
  [/xiaozhen/i, '晓甄', '标准播音'],
  [/yunxi/i,    '云希', '清新少女'],
  [/yunxia/i,   '云夏', '活泼可爱'],
  [/xiaobei/i,  '晓贝', '东北话'],
  [/xiaoni/i,   '晓妮', '陕西话'],
  [/xiaoyuan/i, '晓媛', '粤语'],
  [/yunxi/i,    '云希', '清新'],
  [/zh-CN.*Xiaoxiao/i, '晓晓', '微软在线'],
]

const MALE_PATTERNS = [/kangkang/i, /yunyang/i, /yunjian/i, /yunjie/i,
  /yunfeng/i, /yunhao/i, /yunye/i, /yunze/i, /yundong/i, /male/i]

export const isSpeaking = ref(false)
export const autoSpeakEnabled = ref(
  localStorage.getItem('ttsAutoSpeak') !== 'false'
)
export const voices = ref<VoiceItem[]>([])
export const selectedVoiceId = ref(
  localStorage.getItem('ttsVoiceId') || ''
)

function isMale(name: string): boolean {
  return MALE_PATTERNS.some(p => p.test(name))
}

function friendlyName(raw: SpeechSynthesisVoice): VoiceItem {
  // 尝试映射已知女声
  for (const [re, label, style] of FEMALE_VOICE_MAP) {
    if (re.test(raw.name)) {
      return {
        id: raw.name,
        name: label,
        gender: 'female',
        style: raw.name.includes('Natural') ? style + ' · Natural' : style
      }
    }
  }
  // Google / Mac 默认中文语音
  const short = raw.name
    .replace(/Microsoft\s+/i, '')
    .replace(/Online\s*\(Natural\)\s*/i, '')
    .replace(/\s*-\s*Chinese\s*\(.*\)/i, '')
    .replace(/Google\s+/i, '')
    .replace(/Ting-Ting|Mei-Jia|Sin-Ji|Ya-Ling/i, '')
    .trim()
  return {
    id: raw.name,
    name: short || raw.name.slice(0, 8),
    gender: 'female',
    style: raw.localService ? '本地' : '在线'
  }
}

export async function loadVoices(): Promise<void> {
  let raw = speechSynthesis.getVoices()
  if (raw.length === 0) {
    await new Promise<void>(resolve => {
      speechSynthesis.onvoiceschanged = () => resolve()
    })
    raw = speechSynthesis.getVoices()
  }

  const zhList: VoiceItem[] = []
  for (const v of raw) {
    if (!v.lang.startsWith('zh')) continue
    if (isMale(v.name)) continue
    const item = friendlyName(v)
    // 去重同名
    if (!zhList.some(x => x.name === item.name && x.style === item.style)) {
      zhList.push(item)
    }
  }

  // Natural 优先 → 本地优先
  zhList.sort((a, b) => {
    const aN = a.style.includes('Natural') ? 1 : 0
    const bN = b.style.includes('Natural') ? 1 : 0
    return bN - aN
  })

  voices.value = zhList

  if (!selectedVoiceId.value && zhList.length > 0) {
    const pref = zhList.find(v => v.name === '晓晓')
    selectedVoiceId.value = pref?.id || zhList[0]!.id
    localStorage.setItem('ttsVoiceId', selectedVoiceId.value)
  }
}

export function selectVoice(id: string): void {
  selectedVoiceId.value = id
  localStorage.setItem('ttsVoiceId', id)
}

export function toggleAutoSpeak() {
  autoSpeakEnabled.value = !autoSpeakEnabled.value
  localStorage.setItem('ttsAutoSpeak', String(autoSpeakEnabled.value))
  if (!autoSpeakEnabled.value) stopSpeaking()
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/>\s/g, '')
    .replace(/[-*+]\s/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function speak(text: string): void {
  stopSpeaking()

  const plainText = stripMarkdown(text)
  if (!plainText) return

  const u = new SpeechSynthesisUtterance(plainText)
  u.lang = 'zh-CN'
  u.rate = 1.0

  if (selectedVoiceId.value) {
    const match = speechSynthesis.getVoices().find(v => v.name === selectedVoiceId.value)
    if (match) u.voice = match
  }

  u.onstart = () => { isSpeaking.value = true }
  u.onend = () => { isSpeaking.value = false; currentUtterance = null }
  u.onerror = () => { isSpeaking.value = false; currentUtterance = null }

  currentUtterance = u
  speechSynthesis.speak(u)
}

let currentUtterance: SpeechSynthesisUtterance | null = null

export function stopSpeaking(): void {
  speechSynthesis.cancel()
  isSpeaking.value = false
  currentUtterance = null
}
