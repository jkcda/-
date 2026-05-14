// ── 能力配置（用户可自由配置，以能力为中心） ──

export interface CapabilityLLMConfig {
  name: string
  apiKey: string
  /** openai = /v1/chat/completions, anthropic = Anthropic SDK */
  format: 'openai' | 'anthropic'
  baseURL: string
  model: string
  requestTemplate: string
}

export interface CapabilityImageConfig {
  name: string
  apiKey: string
  baseURL: string
  model: string
  requestTemplate: string
  defaultSize: string
}

export interface ImageGenResult {
  imageUrl: string
  prompt: string
  size: string
}

export interface SearchSource {
  title: string
  url: string
  snippet: string
}

export interface SearchResult {
  text: string
  sources: SearchSource[]
}
