import { ref } from 'vue'

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

export async function loadVoices(): Promise<void> {
  try {
    const baseUrl = import.meta.env.VITE_BASE_URL || ''
    const res = await fetch(`${baseUrl}/api/voice/voices`)
    const data = await res.json()
    if (data.success && data.result?.voices) {
      voices.value = data.result.voices
      if (!selectedVoiceId.value && voices.value.length > 0) {
        const pref = voices.value.find(v => v.name === '晓晓')
        selectedVoiceId.value = pref?.id || voices.value[0]!.id
        localStorage.setItem('ttsVoiceId', selectedVoiceId.value)
      }
    }
  } catch (e) {
    console.warn('[TTS] 获取语音列表失败:', e)
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

let currentAudio: HTMLAudioElement | null = null

export function speak(text: string): void {
  stopSpeaking()

  const plainText = stripMarkdown(text)
  if (!plainText) return

  const baseUrl = import.meta.env.VITE_BASE_URL || ''

  fetch(`${baseUrl}/api/voice/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: plainText,
      voiceId: selectedVoiceId.value || undefined
    })
  })
    .then(res => {
      if (!res.ok) throw new Error(`TTS ${res.status}`)
      return res.blob()
    })
    .then(blob => {
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onplay = () => { isSpeaking.value = true }
      audio.onended = () => { isSpeaking.value = false; currentAudio = null; URL.revokeObjectURL(url) }
      audio.onerror = () => { isSpeaking.value = false; currentAudio = null }
      currentAudio = audio
      audio.play()
    })
    .catch(err => {
      console.error('[TTS] 服务端合成失败:', err)
      isSpeaking.value = false
    })
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  isSpeaking.value = false
}
