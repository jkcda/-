import { ref } from 'vue'

const baseURL = (import.meta.env as any).VITE_BASE_URL || ''

export interface VoiceItem {
  id: string
  name: string
  gender: string
  style: string
}

export const isSpeaking = ref(false)
export const autoSpeakEnabled = ref(
  localStorage.getItem('ttsAutoSpeak') !== 'false'
)
export const voices = ref<VoiceItem[]>([])
export const selectedVoiceId = ref(
  localStorage.getItem('ttsVoiceId') || ''
)

let audioEl: HTMLAudioElement | null = null

function getAudioEl(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio()
  }
  return audioEl
}

export async function loadVoices(): Promise<void> {
  try {
    const res = await fetch(`${baseURL}/api/voice/voices`)
    const data = await res.json()
    if (data.success) {
      voices.value = data.result.voices
      if (!selectedVoiceId.value && voices.value.length > 0) {
        selectedVoiceId.value = voices.value[0]!.id
      }
    }
  } catch { /* 静默失败 */ }
}

export function selectVoice(id: string): void {
  selectedVoiceId.value = id
  localStorage.setItem('ttsVoiceId', id)
}

export function toggleAutoSpeak() {
  autoSpeakEnabled.value = !autoSpeakEnabled.value
  localStorage.setItem('ttsAutoSpeak', String(autoSpeakEnabled.value))
  if (!autoSpeakEnabled.value) {
    stopSpeaking()
  }
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

export async function speak(text: string): Promise<void> {
  stopSpeaking()

  const plainText = stripMarkdown(text)
  if (!plainText) return

  try {
    const res = await fetch(`${baseURL}/api/voice/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: plainText,
        voiceId: selectedVoiceId.value || undefined
      })
    })

    if (!res.ok) throw new Error('TTS 请求失败')

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)

    const audio = getAudioEl()
    audio.src = url
    isSpeaking.value = true

    audio.onended = () => {
      isSpeaking.value = false
      URL.revokeObjectURL(url)
    }
    audio.onerror = () => {
      isSpeaking.value = false
      URL.revokeObjectURL(url)
    }

    await audio.play()
  } catch {
    isSpeaking.value = false
  }
}

export function stopSpeaking(): void {
  if (audioEl) {
    audioEl.pause()
    audioEl.src = ''
  }
  isSpeaking.value = false
}
