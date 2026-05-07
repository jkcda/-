import * as fs from 'node:fs'
import * as path from 'node:path'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import config from '../config/index.js'

const workspaceRoot = path.resolve(config.workspace.root)

/** 校验路径在沙箱内，越界抛错 */
function resolveSafe(targetPath: string): string {
  const resolved = path.resolve(workspaceRoot, targetPath)
  if (!resolved.startsWith(workspaceRoot + path.sep) && resolved !== workspaceRoot) {
    throw new Error(`路径越界：${targetPath} 不在工作区范围内`)
  }
  return resolved
}

// 确保 workspace 目录存在
if (!fs.existsSync(workspaceRoot)) {
  fs.mkdirSync(workspaceRoot, { recursive: true })
}

export const fsTools = [
  tool(async ({ filePath }: { filePath: string }) => {
    const abs = resolveSafe(filePath)
    if (!fs.existsSync(abs)) return `文件不存在：${filePath}`
    const stat = fs.statSync(abs)
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(abs)
      return JSON.stringify({ type: 'directory', path: filePath, entries, count: entries.length })
    }
    const content = fs.readFileSync(abs, 'utf-8')
    const truncated = content.length > 10000 ? content.slice(0, 10000) + '\n...(内容已截断)' : content
    return JSON.stringify({ type: 'file', path: filePath, content: truncated, size: stat.size, modifiedAt: stat.mtime.toISOString() })
  }, {
    name: 'fs_read',
    description: '读取指定文件内容或列出目录下的文件。返回文件内容（文本）或目录下所有条目名。',
    schema: z.object({
      filePath: z.string().describe('相对于工作区的文件或目录路径，如 "notes/" 或 "readme.md"'),
    }),
  }),

  tool(async ({ filePath, content }: { filePath: string; content: string }) => {
    const abs = resolveSafe(filePath)
    const dir = path.dirname(abs)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(abs, content, 'utf-8')
    return `文件已写入：${filePath}（${content.length} 字符）`
  }, {
    name: 'fs_write',
    description: '创建或覆盖文件。会自动创建不存在的父目录。',
    schema: z.object({
      filePath: z.string().describe('相对于工作区的文件路径'),
      content: z.string().describe('要写入的内容'),
    }),
  }),

  tool(async ({ filePath }: { filePath: string }) => {
    const abs = resolveSafe(filePath)
    if (!fs.existsSync(abs)) return `文件不存在：${filePath}`
    fs.rmSync(abs, { recursive: true, force: true })
    return `已删除：${filePath}`
  }, {
    name: 'fs_delete',
    description: '删除文件或目录（递归删除目录内所有内容）。不可恢复。',
    schema: z.object({
      filePath: z.string().describe('要删除的文件或目录路径'),
    }),
  }),

  tool(async ({ filePath, recursive }: { filePath: string; recursive?: boolean }) => {
    const abs = resolveSafe(filePath)
    if (!fs.existsSync(abs)) return `路径不存在：${filePath}`
    if (!fs.statSync(abs).isDirectory()) return `不是目录：${filePath}`
    const walk = (dir: string, depth: number): any[] => {
      if (depth > 5) return []
      const entries = fs.readdirSync(dir)
      return entries.map(entry => {
        const full = path.join(dir, entry)
        const rel = path.relative(workspaceRoot, full).replace(/\\/g, '/')
        const stat = fs.statSync(full)
        if (stat.isDirectory()) {
          return { name: entry, type: 'directory', children: recursive ? walk(full, depth + 1) : undefined }
        }
        return { name: entry, type: 'file', size: stat.size, modifiedAt: stat.mtime.toISOString() }
      })
    }
    const tree = walk(abs, 0)
    return JSON.stringify({ path: filePath, total: tree.length, entries: tree })
  }, {
    name: 'fs_list',
    description: '列出目录下的所有文件和子目录，支持递归展开。',
    schema: z.object({
      filePath: z.string().describe('目录路径'),
      recursive: z.boolean().optional().describe('是否递归展开子目录（默认 false）'),
    }),
  }),
]
