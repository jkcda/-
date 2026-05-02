import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { execSync } from 'child_process'
import { createRequire } from 'module'
import config from '../config/index.js'
import { ApiResponse } from '../utils/response.js'
import { transcribeAudio } from '../services/videoProcessor.js'
import { synthesizeSpeech, voiceList } from '../services/ttsService.js'

const router = express.Router()
const ffmpegPath = createRequire(import.meta.url)('ffmpeg-static')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.audio.maxFileSize }
})

// POST /api/voice/transcribe
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  const tmpDir = path.join(os.tmpdir(), 'voice-' + Date.now())
  try {
    if (!req.file) {
      return ApiResponse.badRequest(res, '请提供音频文件')
    }

    console.log(`[Voice] 收到音频: ${(req.file.size / 1024).toFixed(1)}KB, mime=${req.file.mimetype}`)
    fs.mkdirSync(tmpDir, { recursive: true })
    const webmPath = path.join(tmpDir, 'input.webm')
    const wavPath = path.join(tmpDir, 'audio.wav')

    fs.writeFileSync(webmPath, req.file.buffer)

    // Convert to 16kHz mono WAV
    try {
      execSync(
        `"${ffmpegPath}" -i "${webmPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 -y "${wavPath}"`,
        { timeout: 30000, stdio: 'pipe' }
      )
      console.log(`[Voice] ffmpeg 转换完成: ${(fs.statSync(wavPath).size / 1024).toFixed(1)}KB WAV`)
    } catch (ffErr: any) {
      console.error('[Voice] ffmpeg 转换失败:', ffErr.message)
      try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
      return ApiResponse.badRequest(res, '音频格式转换失败')
    }

    if (!fs.existsSync(wavPath) || fs.statSync(wavPath).size < 1000) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
      return ApiResponse.badRequest(res, '音频文件无效或太短')
    }

    console.log('[Voice] 开始 Whisper 转写...')
    const transcript = await transcribeAudio(wavPath)
    fs.rmSync(tmpDir, { recursive: true, force: true })
    console.log(`[Voice] 转写结果: "${transcript}"`)

    if (!transcript) {
      return ApiResponse.success(res, { text: '' }, '未识别到语音内容')
    }

    ApiResponse.success(res, { text: transcript }, '语音识别成功')
  } catch (error: any) {
    console.error('[Voice] 转写接口崩溃:', error.message, error.stack)
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
    ApiResponse.internalServerError(res, '语音识别失败', error.message)
  }
})

// GET /api/voice/voices
router.get('/voices', (_req, res) => {
  ApiResponse.success(res, { voices: voiceList }, '获取语音列表成功')
})

// POST /api/voice/tts — Edge-TTS 语音合成
router.post('/tts', async (req, res) => {
  try {
    const { text, voiceId } = req.body
    if (!text || text.trim().length === 0) {
      return ApiResponse.badRequest(res, '请提供要合成的文本')
    }
    console.log(`[TTS] 合成请求: "${text.trim().slice(0, 50)}..." voice=${voiceId || 'default'}`)
    const audio = await synthesizeSpeech(text.trim(), voiceId || undefined)
    console.log(`[TTS] 合成完成: ${(audio.length / 1024).toFixed(1)}KB`)
    res.set('Content-Type', 'audio/mpeg')
    res.set('Cache-Control', 'public, max-age=3600')
    res.send(audio)
  } catch (error: any) {
    console.error('[TTS] 合成失败:', error.message)
    ApiResponse.internalServerError(res, '语音合成失败', error.message)
  }
})

export default router
