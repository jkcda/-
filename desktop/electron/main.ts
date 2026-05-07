import { app, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

let mainWindow: BrowserWindow | null = null
let serverProcess: ChildProcess | null = null

// 后端打包脚本路径（由 esbuild 产出的 bundle）
const SERVER_SCRIPT = path.join(__dirname, '..', 'server-bundle', 'server.bundle.mjs')
const SERVER_PORT = process.env.SERVER_PORT || '3000'

function startServer() {
  if (!fs.existsSync(SERVER_SCRIPT)) {
    console.warn('[Electron] 后端 bundle 不存在，跳过启动本地服务')
    return
  }

  serverProcess = spawn(process.execPath, [SERVER_SCRIPT], {
    env: { ...process.env, PORT: SERVER_PORT },
    stdio: 'pipe',
  })

  serverProcess.stdout?.on('data', (d: Buffer) => process.stdout.write(`[server] ${d}`))
  serverProcess.stderr?.on('data', (d: Buffer) => process.stderr.write(`[server] ${d}`))
  serverProcess.on('exit', (code: number | null) => {
    console.log(`[Electron] 后端进程退出，code=${code}`)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '奈克瑟 NEXUS',
  })

  // 优先加载本地构建的前端，否则回退到 Vite dev server
  const distPath = path.join(__dirname, '..', 'dist', 'index.html')
  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath)
  } else {
    mainWindow.loadURL(`http://localhost:${SERVER_PORT}`)
  }
}

app.whenReady().then(() => {
  startServer()
  // 等后端启动后再打开窗口
  setTimeout(createWindow, 2000)
})

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
  app.quit()
})
