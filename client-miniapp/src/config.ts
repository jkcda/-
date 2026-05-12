// 切换环境：开发时注释/取消注释下面两行
const ENV = 'production'
// const ENV = 'production'

export const API_BASE_URL = ENV === 'development' ? 'http://localhost:3000' : 'https://www.nexusdown.xyz'
export const WS_URL = ENV === 'development' ? 'ws://localhost:3001/ws' : 'wss://www.nexusdown.xyz/ws'
