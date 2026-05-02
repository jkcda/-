import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

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

export async function synthesizeSpeech(text: string, voiceId: string = defaultVoice): Promise<Buffer> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-'))
  const outPath = path.join(tmpDir, 'output.mp3')

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn('python', [
        '-m', 'edge_tts',
        '--text', text,
        '--voice', voiceId,
        '--write-media', outPath
      ], { timeout: 30000 })

      let stderr = ''
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

      child.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(stderr.trim() || `edge-tts exited with code ${code}`))
      })

      child.on('error', reject)
    })

    const audio = fs.readFileSync(outPath)
    if (audio.length === 0) throw new Error('TTS 生成音频为空')
    return audio
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
}
