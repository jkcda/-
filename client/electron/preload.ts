import { contextBridge } from 'electron'

// 暴露安全的 API 给渲染进程（前端），后续 IPC 在这里加
contextBridge.exposeInMainWorld('nexus', {
  platform: process.platform,
  isElectron: true,
})
