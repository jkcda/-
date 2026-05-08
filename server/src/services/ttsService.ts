import { spawn, execSync } from 'child_process'
import { createRequire } from 'module'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BRIDGE_SCRIPT = path.resolve(__dirname, '../../scripts/tts_bridge.py')
const ffmpegPath = createRequire(import.meta.url)('ffmpeg-static')

// Female-only Chinese neural voices
export const voiceList = [
  { id: 'zh-CN-XiaoxiaoNeural',   name: '晓晓',   gender: 'female', style: '温柔亲切' },
  { id: 'zh-CN-XiaoyiNeural',     name: '晓伊',   gender: 'female', style: '活泼可爱' },
  { id: 'zh-CN-XiaochenNeural',   name: '晓辰',   gender: 'female', style: '沉稳知性' },
  { id: 'zh-CN-XiaohanNeural',    name: '晓涵',   gender: 'female', style: '自然随和' },
  { id: 'zh-CN-XiaomengNeural',   name: '晓梦',   gender: 'female', style: '甜美梦幻' },
  { id: 'zh-CN-XiaomoNeural',     name: '晓墨',   gender: 'female', style: '清冷磁性' },
  { id: 'zh-CN-XiaoqiuNeural',    name: '晓秋',   gender: 'female', style: '温婉知性' },
  { id: 'zh-CN-XiaoruiNeural',    name: '晓睿',   gender: 'female', style: '干练果断' },
  { id: 'zh-CN-XiaoshuangNeural', name: '晓双',   gender: 'female', style: '元气少女' },
  { id: 'zh-CN-XiaoxuanNeural',   name: '晓萱',   gender: 'female', style: '优雅大方' },
  { id: 'zh-CN-XiaoyanNeural',    name: '晓颜',   gender: 'female', style: '细腻温柔' },
  { id: 'zh-CN-XiaoyouNeural',    name: '晓悠',   gender: 'female', style: '慵懒随性' },
  { id: 'zh-CN-XiaozhenNeural',   name: '晓甄',   gender: 'female', style: '标准播音' },
]

const defaultVoice = 'zh-CN-XiaoxiaoNeural'
const MAX_TTS_CHARS = 2000

async function synthesizeSegment(text: string, voiceId: string, outPath: string): Promise<void> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-'))
  const inPath = path.join(tmpDir, 'input.txt')

  try {
    fs.writeFileSync(inPath, text, 'utf-8')

    await new Promise<void>((resolve, reject) => {
      const child = spawn('python', [BRIDGE_SCRIPT, inPath, voiceId, outPath], {
        timeout: 60000,
        windowsHide: true,
      })

      let stderr = ''
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

      child.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(stderr.trim() || `TTS bridge exited with code ${code}`))
      })

      child.on('error', reject)
    })
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
}

export async function synthesizeSpeech(text: string, voiceId: string = defaultVoice): Promise<Buffer> {
  const cleanText = text
    .replace(/[\r\n]+/g, '。')
    .replace(/[#*`_~\[\]\(\)\{\}]/g, '')
    .replace(/\s{2,}/g, ' ')
  const safeText = cleanText.length > MAX_TTS_CHARS * 3
    ? cleanText.slice(0, MAX_TTS_CHARS * 3) + '。'
    : cleanText

  // 单段，无需拼接
  if (safeText.length <= MAX_TTS_CHARS) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-'))
    const outPath = path.join(tmpDir, 'output.mp3')
    try {
      await synthesizeSegment(safeText, voiceId, outPath)
      const audio = fs.readFileSync(outPath)
      if (audio.length === 0) throw new Error('TTS 生成音频为空')
      return audio
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
    }
  }

  // 长文本：分段合成 + ffmpeg 拼接
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-'))
  const segPaths: string[] = []

  try {
    for (let i = 0; i < safeText.length; i += MAX_TTS_CHARS) {
      const chunk = safeText.slice(i, Math.min(i + MAX_TTS_CHARS, safeText.length))
      const segPath = path.join(tmpDir, `seg_${String(i).padStart(4, '0')}.mp3`)
      await synthesizeSegment(chunk, voiceId, segPath)
      segPaths.push(segPath)
    }

    // ffmpeg concat
    const filelistPath = path.join(tmpDir, 'files.txt')
    fs.writeFileSync(filelistPath, segPaths.map(p => `file '${p}'`).join('\n'), 'utf-8')
    const outPath = path.join(tmpDir, 'output.mp3')

    execSync(
      `"${ffmpegPath}" -f concat -safe 0 -i "${filelistPath}" -c copy "${outPath}" -y`,
      { timeout: 30000, stdio: 'pipe' }
    )

    const audio = fs.readFileSync(outPath)
    if (audio.length === 0) throw new Error('TTS 生成音频为空')
    return audio
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
}
