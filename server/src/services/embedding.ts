import { AlibabaTongyiEmbeddings } from '@langchain/community/embeddings/alibaba_tongyi'
import config from '../config/index.js'
import { cacheGet, cacheSet, hashKey } from './cache.js'

let _embeddings: AlibabaTongyiEmbeddings | null = null

export function getEmbeddings(): AlibabaTongyiEmbeddings {
  if (!_embeddings) {
    _embeddings = new AlibabaTongyiEmbeddings({
      apiKey: config.ai.apiKey,
      modelName: config.embeddings.modelName as 'text-embedding-v3',
      batchSize: config.embeddings.batchSize,
      parameters: {
        text_type: 'document'
      }
    })
  }
  return _embeddings
}

export async function embedQuery(text: string): Promise<number[]> {
  const key = `emb:query:${hashKey(text)}`
  const cached = await cacheGet<number[]>(key)
  if (cached) return cached

  const vector = await getEmbeddings().embedQuery(text)
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
    const vectors = await getEmbeddings().embedDocuments(uncached.map(t => t.text))
    for (let j = 0; j < vectors.length; j++) {
      const { index, text } = uncached[j]
      results[index] = vectors[j]
      await cacheSet(`emb:doc:${hashKey(text)}`, vectors[j], config.redis.ttl.embeddingDoc)
    }
  }

  return results as number[][]
}
