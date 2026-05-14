// ── Provider 抽象层类型定义 ──

export interface ProviderDef {
  id: string
  name: string
  apiKeySetting: string
  baseURL: string
  chatSupport: boolean
  imageSupport: boolean
  embeddingSupport: boolean
  speechSupport: boolean
}

export interface ModelDef {
  id: string
  name: string
  type: 'text' | 'multimodal' | 'vision'
  provider: string
  desc?: string
}

export interface ProviderConfig {
  apiKey: string
  baseURL: string
  providerId: string
  modelId?: string
}

// ── 图片生成 ──
export interface ImageGenResult {
  imageUrl: string
  prompt: string
  size: string
}

// ── Embedding ──
export interface EmbeddingResult {
  vectors: number[][]
}

// ── 语音转写 ──
export interface SpeechResult {
  text: string
}

// ── 搜索结果 ──
export interface SearchSource {
  title: string
  url: string
  snippet: string
}

export interface SearchResult {
  text: string
  sources: SearchSource[]
}

// ── 运行时动态配置的 Provider 信息 ──
export interface ProviderRuntimeInfo {
  id: string
  name: string
  apiKeySetting: string
  baseURL: string
  chatSupport: boolean
  imageSupport: boolean
  embeddingSupport: boolean
  speechSupport: boolean
  maskedKey: string
  enabled: boolean
}
