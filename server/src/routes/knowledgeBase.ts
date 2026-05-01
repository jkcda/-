import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { ApiResponse } from '../utils/response.js'
import * as kbService from '../services/knowledgeBase.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const router = Router()

// 文件上传配置
const uploadDir = path.join(process.cwd(), 'uploads', 'kb')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, uniqueSuffix + ext)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'text/plain', 'text/markdown', 'application/json',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件类型'))
    }
  }
})

// 所有路由需要认证
router.use(authMiddleware as any)

// 创建知识库
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body
    if (!name || name.trim().length === 0) {
      return ApiResponse.badRequest(res, '知识库名称不能为空')
    }
    const result = await kbService.createKnowledgeBase(req.user!.id, name.trim(), description)
    return ApiResponse.created(res, result, '知识库创建成功')
  } catch (err: any) {
    return ApiResponse.internalServerError(res, '创建知识库失败', err.message)
  }
})

// 获取用户的知识库列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const kbs = await kbService.getUserKnowledgeBases(req.user!.id)
    return ApiResponse.success(res, { knowledgeBases: kbs }, '获取知识库列表成功')
  } catch (err: any) {
    return ApiResponse.internalServerError(res, '获取知识库列表失败', err.message)
  }
})

// 获取知识库详情
router.get('/:kbId', async (req: Request, res: Response) => {
  try {
    const kb = await kbService.getKnowledgeBase(Number(req.params.kbId))
    if (!kb) return ApiResponse.notFound(res, '知识库不存在')
    if (kb.user_id !== req.user!.id) return ApiResponse.forbidden(res, '无权访问此知识库')
    return ApiResponse.success(res, { knowledgeBase: kb })
  } catch (err: any) {
    return ApiResponse.internalServerError(res, '获取知识库详情失败', err.message)
  }
})

// 删除知识库
router.delete('/:kbId', async (req: Request, res: Response) => {
  try {
    const kb = await kbService.getKnowledgeBase(Number(req.params.kbId))
    if (!kb) return ApiResponse.notFound(res, '知识库不存在')
    if (kb.user_id !== req.user!.id) return ApiResponse.forbidden(res, '无权删除此知识库')
    await kbService.deleteKnowledgeBase(Number(req.params.kbId))
    return ApiResponse.success(res, null, '知识库已删除')
  } catch (err: any) {
    return ApiResponse.internalServerError(res, '删除知识库失败', err.message)
  }
})

// 上传文档到知识库
router.post('/:kbId/documents', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const kbId = Number(req.params.kbId)
    const kb = await kbService.getKnowledgeBase(kbId)
    if (!kb) return ApiResponse.notFound(res, '知识库不存在')
    if (kb.user_id !== req.user!.id) return ApiResponse.forbidden(res, '无权操作此知识库')

    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      return ApiResponse.badRequest(res, '请选择要上传的文件')
    }

    const results = []
    for (const file of files) {
      // 修复 multer 中文文件名乱码：busboy 按 latin1 解析，需转回 utf8
      let filename = file.originalname
      if (/[\u0080-\u00ff]/.test(filename)) {
        filename = Buffer.from(filename, 'latin1').toString('utf8')
      }
      const fileUrl = `/uploads/kb/${file.filename}`
      const result = await kbService.addDocumentToKB(
        kbId, file.path, filename, file.mimetype, file.size
      )
      results.push({ id: result.docId, filename, chunkCount: result.chunkCount })
    }

    return ApiResponse.created(res, { documents: results }, `成功上传 ${results.length} 个文档`)
  } catch (err: any) {
    return ApiResponse.internalServerError(res, '上传文档失败', err.message)
  }
})

// 获取知识库中的文档列表
router.get('/:kbId/documents', async (req: Request, res: Response) => {
  try {
    const kbId = Number(req.params.kbId)
    const kb = await kbService.getKnowledgeBase(kbId)
    if (!kb) return ApiResponse.notFound(res, '知识库不存在')
    if (kb.user_id !== req.user!.id) return ApiResponse.forbidden(res, '无权访问此知识库')

    const docs = await kbService.getKBDocuments(kbId)
    return ApiResponse.success(res, { documents: docs })
  } catch (err: any) {
    return ApiResponse.internalServerError(res, '获取文档列表失败', err.message)
  }
})

// 删除知识库中的文档
router.delete('/:kbId/documents/:docId', async (req: Request, res: Response) => {
  try {
    const kbId = Number(req.params.kbId)
    const docId = Number(req.params.docId)

    const kb = await kbService.getKnowledgeBase(kbId)
    if (!kb) return ApiResponse.notFound(res, '知识库不存在')
    if (kb.user_id !== req.user!.id) return ApiResponse.forbidden(res, '无权操作此知识库')

    await kbService.removeDocumentFromKB(docId)
    return ApiResponse.success(res, null, '文档已删除')
  } catch (err: any) {
    return ApiResponse.internalServerError(res, '删除文档失败', err.message)
  }
})

// 在知识库中检索
router.post('/:kbId/search', async (req: Request, res: Response) => {
  try {
    const kbId = Number(req.params.kbId)
    const { query } = req.body

    if (!query || query.trim().length === 0) {
      return ApiResponse.badRequest(res, '检索内容不能为空')
    }

    const kb = await kbService.getKnowledgeBase(kbId)
    if (!kb) return ApiResponse.notFound(res, '知识库不存在')
    if (kb.user_id !== req.user!.id) return ApiResponse.forbidden(res, '无权访问此知识库')

    const results = await kbService.searchInKB(kbId, query.trim())
    return ApiResponse.success(res, { chunks: results }, '检索完成')
  } catch (err: any) {
    return ApiResponse.internalServerError(res, '检索失败', err.message)
  }
})

export default router
