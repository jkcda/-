import { execSync } from 'child_process'
import { createRequire } from 'module'
import config, { getSetting } from '../config/index.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

const ffmpegPath = createRequire(import.meta.url)('ffmpeg-static')

let _transcriber: any = null
let _transcriberLoading = false
let _transcriberLoadError: string | null = null

async function getTranscriber() {
  if (_transcriber) return _transcriber
  if (_transcriberLoadError) throw new Error(_transcriberLoadError)

  // 低配服务器（空闲内存<1.5GB）拒绝加载 Whisper 模型，避免 OOM 崩溃
  const freeMem = Math.round(os.freemem() / (1024 * 1024))
  if (freeMem < 1536) {
    const msg = `服务器可用内存不足（${freeMem}MB < 1.5GB），已跳过语音转写`
    _transcriberLoadError = msg
    console.warn('[Whisper] ' + msg)
    throw new Error(msg)
  }

  if (_transcriberLoading) {
    // 等待已在进行的加载
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000))
      if (_transcriber) return _transcriber
      if (_transcriberLoadError) throw new Error(_transcriberLoadError)
    }
    throw new Error('语音模型加载超时（2分钟）')
  }
  _transcriberLoading = true
  try {
    console.log('[Whisper] 加载 whisper-small 模型（首次约需下载500MB，中文识别更好）...')
    const { pipeline, env } = await import('@xenova/transformers')
    // 设置国内 HF 镜像，解决 fetch failed 问题
    env.remoteHost = 'https://hf-mirror.com/'
    console.log('[Whisper] 下载源:', env.remoteHost)
    _transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small')
    console.log('[Whisper] 模型加载完成')
    return _transcriber
  } catch (e: any) {
    _transcriberLoadError = e.message || '模型加载失败'
    console.error('[Whisper] 模型加载失败:', _transcriberLoadError)
    throw e
  } finally {
    _transcriberLoading = false
  }
}

function extractFrames(videoPath: string): string[] {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vf-'))
  const out = path.join(tmpDir, 'f-%03d.jpg')
  try {
    execSync(
      `"${ffmpegPath}" -i "${videoPath}" -vf "fps=${config.video.fps}" -threads 1 "${out}"`,
      { timeout: 120000, stdio: 'pipe' }
    )
  } catch { /* 帧提取完成 */ }

  const frames = fs.readdirSync(tmpDir).filter(f => f.endsWith('.jpg')).sort()
    .map(f => fs.readFileSync(path.join(tmpDir, f)).toString('base64'))
  fs.rmSync(tmpDir, { recursive: true, force: true })
  return frames
}

function extractAudio(videoPath: string): string | null {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'va-'))
  const out = path.join(tmpDir, 'audio.wav')
  try {
    execSync(
      `"${ffmpegPath}" -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 -threads 1 -y "${out}"`,
      { timeout: 30000, stdio: 'pipe' }
    )
  } catch { return null }
  if (!fs.existsSync(out) || fs.statSync(out).size < 1000) return null
  return out
}

export async function preloadTranscriber(): Promise<void> {
  try {
    await getTranscriber()
  } catch {
    // 预加载失败不阻塞启动
  }
}

async function transcribeViaAPI(audioPath: string): Promise<string> {
  try {
    const buffer = fs.readFileSync(audioPath)
    const base64 = buffer.toString('base64')
    console.log(`[ASR-API] 调用 ModelScope API，音频 ${(buffer.length / 1024).toFixed(1)}KB`)
    const res = await fetch('https://api-inference.modelscope.cn/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getSetting('DASHSCOPE_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        file: base64,
        model: 'iic/SenseVoiceSmall',
        language: 'zh'
      })
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      throw new Error(`ASR API 返回 ${res.status}: ${err.slice(0, 200)}`)
    }
    const data = await res.json() as { text?: string }
    console.log(`[ASR-API] 转写完成: "${data.text?.slice(0, 50)}"`)
    return data.text?.trim() || ''
  } catch (e: any) {
    console.error('[ASR-API] 转写失败:', e.message)
    return ''
  }
}

export async function transcribeAudio(audioPath: string): Promise<string> {
  // 尝试本地 Whisper 模型
  try {
    const buffer = fs.readFileSync(audioPath)
    const wav = parseWav(buffer)
    if (!wav) {
      console.error('[Whisper] WAV 解析失败')
      return ''
    }
    console.log(`[Whisper] 音频: ${wav.sampleRate}Hz, ${wav.channels}ch, ${(wav.samples.length / wav.sampleRate).toFixed(1)}s`)
    const t = await getTranscriber()
    const r = await t(wav.samples, {
      sampling_rate: wav.sampleRate,
      language: 'chinese',
      task: 'transcribe'
    })
    return (r as any).text?.trim() || ''
  } catch (e: any) {
    // 本地模型不可用，自动切 ModelScope API
    console.warn('[Whisper] 本地模型不可用，切换 API 转写:', e.message)
    return transcribeViaAPI(audioPath)
  }
}

function parseWav(buffer: Buffer): { samples: Float32Array; sampleRate: number; channels: number } | null {
  try {
    // WAV 头: RIFF(4) + size(4) + WAVE(4) + fmt(4) + fmtSize(4) + audioFormat(2) + channels(2)
    // + sampleRate(4) + byteRate(4) + blockAlign(2) + bitsPerSample(2)
    // 然后找 data chunk
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    if (view.getUint32(0, true) !== 0x46464952) return null // "RIFF"
    // 找 fmt chunk
    let offset = 12
    let fmtFound = false
    while (offset < buffer.length - 8) {
      const chunkId = view.getUint32(offset, true)
      const chunkSize = view.getUint32(offset + 4, true)
      if (chunkId === 0x20746d66) { // "fmt "
        const audioFormat = view.getUint16(offset + 8, true)
        if (audioFormat !== 1) return null // 只支持 PCM
        const channels = view.getUint16(offset + 10, true)
        const sampleRate = view.getUint32(offset + 12, true)
        const bitsPerSample = view.getUint16(offset + 22, true)
        fmtFound = true
        // 找 data chunk
        offset = offset + 8 + chunkSize
        while (offset < buffer.length - 8) {
          const dId = view.getUint32(offset, true)
          const dSize = view.getUint32(offset + 4, true)
          if (dId === 0x61746164) { // "data"
            const dataStart = offset + 8
            const dataEnd = Math.min(dataStart + dSize, buffer.length)
            const raw = buffer.subarray(dataStart, dataEnd)
            // 16-bit PCM → Float32
            const samples = new Float32Array(Math.floor(raw.length / 2))
            for (let i = 0; i < samples.length; i++) {
              samples[i] = raw.readInt16LE(i * 2) / 32768
            }
            return { samples, sampleRate, channels }
          }
          offset = offset + 8 + dSize
        }
        break
      }
      offset = offset + 8 + chunkSize
    }
    return null
  } catch { return null }
}

function getFreeMemoryMB(): number {
  const free = os.freemem()
  return Math.round(free / (1024 * 1024))
}

function getCpuCount(): number {
  return os.cpus().length
}

export async function processVideo(videoUrl: string) {
  const filePath = path.join(process.cwd(), videoUrl)
  let frames = extractFrames(filePath)

  const freeMem = getFreeMemoryMB()
  const cpuCount = getCpuCount()
  const isLowResource = cpuCount <= 2 || freeMem < 1024

  // 低配服务器：限制帧数上限 60（≈30秒视频@2fps），防止 base64 帧数组 OOM
  const LOW_RES_FRAME_CAP = 60
  if (isLowResource && frames.length > LOW_RES_FRAME_CAP) {
    console.log(`[Video] 低配服务器帧数限制: ${frames.length} → ${LOW_RES_FRAME_CAP}`)
    frames = frames.filter((_, i) => i % Math.ceil(frames.length / LOW_RES_FRAME_CAP) === 0).slice(0, LOW_RES_FRAME_CAP)
  }

  // 语音转写：本地 Whisper 优先，低配自动切 ModelScope API
  if (isLowResource) {
    console.log(`[Video] 低配服务器（CPU:${cpuCount}核, 空闲内存:${freeMem}MB），使用 API 转写`)
  }
  let transcript = ''
  try {
    const audio = extractAudio(filePath)
    if (audio) {
      transcript = await transcribeAudio(audio)
      fs.rmSync(path.dirname(audio), { recursive: true, force: true })
    }
  } catch (e: any) {
    console.error('[Video] 语音转写失败（不影响帧分析）:', e.message)
  }
  return { frames, transcript }
}
