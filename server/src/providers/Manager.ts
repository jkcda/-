/**
 * ProviderManager — 多供应商 AI 能力调度中心
 *
 * 职责：
 * 1. 根据 modelId 或能力类型 -> 解析到对应的供应商配置（API Key + BaseURL)
 * 2. 提供简单工厂方法：创建各 SDK 客户端，或直接调用供应商 API
 * 3. 支持通过 PROVIDER_CONFIG 动态覆盖供应商 baseURL 和请求模板
 * 4. 新增供应商只需在 config.ai.providers 里加一条配置，无需改服务代码
 *
 * PROVIDER_CONFIG 格式（存储在 system_settings 中）：
 * {
 *   "modelscope": {
 *     "baseURL": "https://自定义URL",
 *     "requestTemplate": "{\"model\":\"...\",\"max_tokens\":4096,\"temperature\":0.7}"
 *   }
 * }
 */

import Anthropic from '@anthropic-ai/sdk'
import { OpenAI } from 'openai'
import { ChatOpenAI } from '@langchain/openai'
import config, { getSetting } from '../config/index.js'
import type { ProviderConfig } from './types.js'

interface ProviderOverride {
  baseURL?: string
  requestTemplate?: string
}

type ProviderOverrides = Record<string, ProviderOverride>

class ProviderManager {
  // ── 动态覆盖（从 PROVIDER_CONFIG 加载） ──

  /** 从 PROVIDER_CONFIG 加载所有覆盖配置 */
  private getOverrides(): ProviderOverrides {
    try {
      const raw = getSetting('PROVIDER_CONFIG')
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
      return {}
    } catch { return {} }
  }

  /** 获取某个供应商的覆盖配置 */
  getOverride(providerId: string): ProviderOverride {
    return this.getOverrides()[providerId] || {}
  }

  /** 获取覆盖后的 baseURL */
  getEffectiveBaseURL(providerId: string): string {
    const ov = this.getOverride(providerId)
    if (ov.baseURL) return ov.baseURL
    return config.ai.providers[providerId]?.baseURL || ''
  }

  /** 获取请求模板 */
  getRequestTemplate(providerId: string): string {
    return this.getOverride(providerId).requestTemplate || ''
  }

  /** 保存完整覆盖配置 */
  saveOverrides(overrides: ProviderOverrides): void {
    // 由 admin route 调用，写入 system_settings
    // 实际写入在 admin.ts 中通过 updateSetting 完成
  }

  /**
   * 根据供应商的 requestTemplate 生成请求 body
   * 用户可以在模板中定义 model / max_tokens / temperature 等参数
   * 系统自动注入 messages 和 stream
   */
  buildRequestBody(providerId: string, messages: any[], stream: boolean, extra?: Record<string, any>): any {
    const template = this.getRequestTemplate(providerId)
    if (template) {
      try {
        const base = JSON.parse(template)
        // 合成最终 body：模板中的字段优先，messages/stream 由系统注入
        return {
          ...base,
          messages,
          stream,
          ...extra,
        }
      } catch {
        // 模板解析失败，回退默认
      }
    }
    // 无模板，用默认 OpenAI 格式
    return {
      model: config.ai.defaultModel,
      messages,
      stream,
      max_tokens: config.ai.maxTokens,
      temperature: 0.7,
      ...extra,
    }
  }

  // ═══════════════════════════════════════════════
  //  核心：根据 modelId 或能力类型 -> 解析供应商
  // ═══════════════════════════════════════════════

  /** 根据 modelId 获取供应商配置 + API key + 完整模型名 */
  getModelConfig(modelId?: string): ProviderConfig {
    const id = modelId || config.ai.defaultModel
    const model = config.ai.models.find(m => m.id === id)
    const providerId = model?.provider || 'modelscope'
    const def = config.ai.providers[providerId]
    if (!def) throw new Error(`[Provider] 未定义的供应商: ${providerId}`)
    const apiKey = getSetting(def.apiKeySetting)
    if (!apiKey) throw new Error(`[Provider] ${def.name} 的 API Key 未配置（${def.apiKeySetting}）`)
    const baseURL = this.getEffectiveBaseURL(providerId)
    return { providerId, apiKey, baseURL, modelId: id }
  }

  /** 获取指定供应商的配置（不依赖 modelId） */
  getProviderConfig(providerId: string): ProviderConfig {
    const def = config.ai.providers[providerId]
    if (!def) throw new Error(`[Provider] 未定义的供应商: ${providerId}`)
    const apiKey = getSetting(def.apiKeySetting)
    const baseURL = this.getEffectiveBaseURL(providerId)
    return { providerId, apiKey, baseURL }
  }

  /** 根据能力类型获取第一个支持的供应商配置 */
  getProviderForCapability(cap: 'chat' | 'image' | 'embedding' | 'speech' | 'search', prefer?: string): ProviderConfig {
    const keyMap: Record<string, string> = {
      chat: 'chatSupport',
      image: 'imageSupport',
      embedding: 'embeddingSupport',
      speech: 'speechSupport',
      search: 'searchSupport',
    }
    const prop = keyMap[cap]
    if (!prop) throw new Error(`[Provider] 未知能力: ${cap}`)

    if (prefer && config.ai.providers[prefer] && (config.ai.providers[prefer] as any)[prop]) {
      return this.getProviderConfig(prefer)
    }
    for (const [id, def] of Object.entries(config.ai.providers)) {
      if ((def as any)[prop]) {
        return this.getProviderConfig(id)
      }
    }
    throw new Error(`[Provider] 没有供应商支持能力: ${cap}`)
  }

  // ═══════════════════════════════════════════════
  //  SDK 客户端工厂
  // ═══════════════════════════════════════════════

  /** 创建 Anthropic SDK 客户端 */
  createAnthropicClient(modelId?: string): Anthropic {
    const cfg = this.getModelConfig(modelId)
    return new Anthropic({ apiKey: cfg.apiKey, baseURL: cfg.baseURL })
  }

  /** 创建 OpenAI SDK 客户端 */
  createOpenAIClient(providerId?: string): OpenAI {
    const cfg = providerId
      ? this.getProviderConfig(providerId)
      : this.getProviderForCapability('embedding')
    return new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL + '/v1' })
  }

  /** 创建 LangChain ChatOpenAI 模型 */
  createLangChainModel(modelId?: string): ChatOpenAI {
    const cfg = this.getModelConfig(modelId)
    return new ChatOpenAI({
      model: cfg.modelId || config.ai.defaultModel,
      apiKey: cfg.apiKey,
      configuration: { baseURL: cfg.baseURL + '/v1' },
      maxTokens: config.ai.maxTokens,
      temperature: 0.7,
    })
  }

  /** 获取供应商 baseURL（含覆盖） */
  getBaseURL(providerId: string): string {
    return this.getEffectiveBaseURL(providerId)
  }

  // ═══════════════════════════════════════════════
  //  高层 API 调用
  // ═══════════════════════════════════════════════

  /** 文生图 */
  async generateImage(prompt: string, modelId?: string, size?: string): Promise<string> {
    const mCfg = modelId ? this.getModelConfig(modelId) : this.getProviderForCapability('image')
    const resp = await fetch(`${mCfg.baseURL}/api/v3/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mCfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId || 'doubao-seedream-4-5-251128',
        prompt,
        size: size || config.ai.defaultImageRatio,
        sequential_image_generation: 'disabled',
        response_format: 'url',
        stream: false,
        watermark: true,
      }),
    })
    if (!resp.ok) {
      const err = await resp.text().catch(() => '')
      throw new Error(`图片生成失败 (${resp.status}): ${err.slice(0, 200)}`)
    }
    const data = await resp.json() as any
    return data?.data?.[0]?.url || ''
  }

  /** Embedding */
  async createEmbedding(texts: string[]): Promise<number[][]> {
    const client = this.createOpenAIClient()
    const response = await client.embeddings.create({
      model: config.embeddings.modelName,
      input: texts,
    })
    return response.data.sort((a, b) => a.index - b.index).map(d => d.embedding)
  }

  /** 语音转写 */
  async transcribeAudio(audio: Blob | Buffer): Promise<string> {
    const cfg = this.getProviderForCapability('speech')
    const form = new FormData()
    form.append('file', audio instanceof Blob ? audio : new Blob([audio as BlobPart], { type: 'audio/wav' }), 'audio.wav')
    form.append('model', 'iic/SenseVoiceSmall')

    const res = await fetch(`${cfg.baseURL}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cfg.apiKey}` },
      body: form,
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      throw new Error(`语音转写失败 (${res.status}): ${err.slice(0, 200)}`)
    }
    const data = await res.json() as { text?: string }
    return data.text?.trim() || ''
  }

  /** 获取所有已注册供应商的运行时信息（含覆盖配置） */
  getAllProviders() {
    const overrides = this.getOverrides()
    const result: Array<{
      id: string
      name: string
      apiKeySetting: string
      baseURL: string
      capabilities: string[]
      maskedKey: string
      enabled: boolean
      requestTemplate: string
    }> = []
    for (const [id, def] of Object.entries(config.ai.providers)) {
      const val = getSetting(def.apiKeySetting)
      const masked = val.length > 8
        ? val.slice(0, 4) + '***' + val.slice(-4)
        : val ? '****' : '（未配置）'
      const caps: string[] = []
      if (def.chatSupport) caps.push('对话')
      if (def.imageSupport) caps.push('文生图')
      if (def.embeddingSupport) caps.push('Embedding')
      if (def.speechSupport) caps.push('语音转写')
      const ov = overrides[id] || {}
      result.push({
        id, name: def.name, apiKeySetting: def.apiKeySetting,
        baseURL: ov.baseURL || def.baseURL,
        capabilities: caps,
        maskedKey: masked,
        enabled: !!val,
        requestTemplate: ov.requestTemplate || '',
      })
    }
    return result
  }
}

// 全局单例
export const providerManager = new ProviderManager()
