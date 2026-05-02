import { ref, onBeforeUnmount } from 'vue'

export function useVoiceRecording() {
  const isRecording = ref(false)
  const duration = ref(0)
  const audioBlob = ref<Blob | null>(null)
  const error = ref<string | null>(null)

  let mediaRecorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let chunks: Blob[] = []

  async function startRecording() {
    error.value = null
    duration.value = 0
    audioBlob.value = null
    chunks = []

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      mediaRecorder = new MediaRecorder(stream, { mimeType })

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      mediaRecorder.onstop = () => {
        audioBlob.value = new Blob(chunks, { type: mimeType })
        stopStream()
      }

      mediaRecorder.onerror = () => {
        error.value = '录音出错'
        stopStream()
      }

      mediaRecorder.start()
      isRecording.value = true

      timer = setInterval(() => { duration.value++ }, 1000)
    } catch (e: any) {
      error.value = e.message || '无法访问麦克风'
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    clearTimer()
    isRecording.value = false
  }

  function cancelRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    clearTimer()
    isRecording.value = false
    audioBlob.value = null
    chunks = []
    stopStream()
  }

  function stopStream() {
    stream?.getTracks().forEach(t => t.stop())
    stream = null
  }

  function clearTimer() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  onBeforeUnmount(() => {
    stopStream()
    clearTimer()
  })

  return { isRecording, duration, audioBlob, error, startRecording, stopRecording, cancelRecording }
}

export async function uploadVoiceForTranscription(blob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('audio', blob, 'recording.webm')
  console.log(`[Voice] 上传音频: ${(blob.size / 1024).toFixed(1)}KB, type=${blob.type}`)
  const baseURL = (import.meta.env as any).VITE_BASE_URL || ''
  const response = await fetch(`${baseURL}/api/voice/transcribe`, {
    method: 'POST',
    body: formData
  })
  const data = await response.json()
  console.log('[Voice] 服务端响应:', data)
  if (!data.success) {
    throw new Error(data.message || '语音识别失败')
  }
  return data.result.text || ''
}
