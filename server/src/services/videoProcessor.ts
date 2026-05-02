import { execSync } from 'child_process'
import { createRequire } from 'module'
import config from '../config/index.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

const ffmpegPath = createRequire(import.meta.url)('ffmpeg-static')

let _transcriber: any = null

async function getTranscriber() {
  if (!_transcriber) {
    const { pipeline } = await import('@xenova/transformers')
    _transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny')
  }
  return _transcriber
}

function extractFrames(videoPath: string): string[] {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vf-'))
  const out = path.join(tmpDir, 'f-%03d.jpg')
  try {
    execSync(
      `"${ffmpegPath}" -i "${videoPath}" -vf "fps=${config.video.fps}" "${out}"`,
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
      `"${ffmpegPath}" -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 -y "${out}"`,
      { timeout: 30000, stdio: 'pipe' }
    )
  } catch { return null }
  if (!fs.existsSync(out) || fs.statSync(out).size < 1000) return null
  return out
}

async function transcribeAudio(audioPath: string): Promise<string> {
  try {
    const t = await getTranscriber()
    const r = await t(audioPath)
    return (r as any).text?.trim() || ''
  } catch { return '' }
}

export async function processVideo(videoUrl: string) {
  const filePath = path.join(process.cwd(), videoUrl)
  const frames = extractFrames(filePath)
  const audio = extractAudio(filePath)
  const transcript = audio ? await transcribeAudio(audio) : ''
  if (audio) fs.rmSync(path.dirname(audio), { recursive: true, force: true })
  return { frames, transcript }
}
