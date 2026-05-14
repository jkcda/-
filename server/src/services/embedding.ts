import config from '../config/index.js'
import { cacheGet, cacheSet, hashKey } from './cache.js'
import { providerManager } from '../providers/index.js'

// LanceDB 兼容的 embeddings 实例（含 embedQuery / embedDocuments）
export function getEmbeddings() {
  return { embedQuery, embedDocuments }
}

async function callEmbedding(texts: string[]): Promise<number[][]> {
  return providerManager.createEmbedding(texts)
}

export async function embedQuery(text: string): Promise<number[]> {
  const key = `emb:query:${hashKey(text)}`
  const cached = await cacheGet<number[]>(key)
  if (cached) return cached

  const vectors = await callEmbedding([text])
  const vector = vectors[0]
  await cacheSet(key, vector, config.redis.ttl.embeddingQuery)
  return vector
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const results: (number[] | null)[] = new Array(texts.length).fill(null)
  const uncached: { index: number; text: string }[] = []

  for (let i = 0; i < texts.length; i++) {
    const key = `emb:doc:${hashKey(texts[i])}`
    const cached = await cacheGet<number[]>(key)
    if (cached) {
      results[i] = cached
    } else {
      uncached.push({ index: i, text: texts[i] })
    }
  }

  if (uncached.length > 0) {
    const batchSize = config.embeddings.batchSize
    for (let i = 0; i < uncached.length; i += batchSize) {
      const batch = uncached.slice(i, i + batchSize)
      const vectors = await callEmbedding(batch.map(t => t.text))
      for (let j = 0; j < vectors.length; j++) {
        const { index, text } = batch[j]
        results[index] = vectors[j]
        await cacheSet(`emb:doc:${hashKey(text)}`, vectors[j], config.redis.ttl.embeddingDoc)
      }
    }
  }

  return results as number[][]
}
