import * as esbuild from 'esbuild'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..', '..')
const serverRoot = path.join(root, 'server')
const clientRoot = path.join(root, 'client')
const electronDir = path.join(root, 'desktop', 'electron')
const bundleDir = path.join(clientRoot, 'server-bundle')

// ===== 1. 编译 Electron 主进程文件 =====
await esbuild.build({
  entryPoints: [
    path.join(electronDir, 'main.ts'),
    path.join(electronDir, 'preload.ts'),
  ],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outdir: electronDir,
  outExtension: { '.js': '.mjs' },
  external: ['electron', 'node:*'],
  minify: true,
  sourcemap: false,
})
console.log('[build] Electron main/preload compiled')

// ===== 2. 打包服务端代码 =====
const externals = [
  '@lancedb/*', '@lancedb/lancedb',
  '@xenova/*', '@playwright/*',
  'ffmpeg-static', 'apache-arrow',
  'mysql2', 'sharp', 'ioredis', 'bcryptjs',
  '@langchain/*', 'langchain',
  'node:*',
]

await esbuild.build({
  entryPoints: [path.join(serverRoot, 'src', 'app.ts')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: path.join(bundleDir, 'server.bundle.mjs'),
  external: [...externals],
  minify: false,
  sourcemap: false,
  packages: 'bundle',
})
console.log(`[build] Server bundled → ${path.join(bundleDir, 'server.bundle.mjs')}`)
