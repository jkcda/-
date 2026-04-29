import { searchInKB } from './knowledgeBase.js'
import { embedQuery } from './embedding.js'
import { getVectorStore, similaritySearch } from './vectorStore.js'
import { cacheGet, cacheSet, hashKey } from './cache.js'
import type { Document } from '@langchain/core/documents'
import config from '../config/index.js'

export interface RetrievedChunk {
  content: string
  source: string
  score: number
}

export interface RAGContext {
  chunks: RetrievedChunk[]
  promptAddition: string
}

export async function retrieveFromKB(
  query: string,
  kbId: number,
  topK: number = config.rag.topK
): Promise<RAGContext> {
  const cacheKey = `rag:${kbId}:${hashKey(query)}`
  const cached = await cacheGet<RAGContext>(cacheKey)
  if (cached) return cached

  const results = await searchInKB(kbId, query, topK)

  const chunks: RetrievedChunk[] = results
    .filter(r => r.score >= config.rag.similarityThreshold)
    .map(r => ({
      content: r.content,
      source: r.source,
      score: r.score
    }))

  const promptAddition = formatChunksForPrompt(chunks)
  const context: RAGContext = { chunks, promptAddition }

  await cacheSet(cacheKey, context, config.redis.ttl.ragResult)
  return context
}

export async function retrieveFromFileChunks(
  query: string,
  fileChunks: Document[],
  topK: number = config.rag.topK
): Promise<RAGContext> {
  if (fileChunks.length === 0) {
    return { chunks: [], promptAddition: '' }
  }

  const queryLower = query.toLowerCase()
  const scored = fileChunks.map(doc => {
    const content = doc.pageContent
    const queryTerms = queryLower.split(/\s+/)
    let hits = 0
    const contentLower = content.toLowerCase()
    for (const term of queryTerms) {
      if (contentLower.includes(term)) hits++
    }
    const score = hits / Math.max(queryTerms.length, 1)
    return { doc, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, topK).filter(s => s.score > 0)

  const chunks: RetrievedChunk[] = top.map(s => ({
    content: s.doc.pageContent,
    source: (s.doc.metadata.source as string) || (s.doc.metadata.filename as string) || 'unknown',
    score: s.score
  }))

  const promptAddition = formatChunksForPrompt(chunks)

  return { chunks, promptAddition }
}

function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return ''

  return '\n\n--- 以下是与当前问题相关的参考资料 ---\n' +
    chunks.map((c, i) =>
      `[参考资料 ${i + 1} 来源: ${c.source}]\n${c.content}`
    ).join('\n\n') +
    '\n--- 参考资料结束 ---\n' +
    '请根据以上参考资料回答用户问题。如果参考资料不足以回答问题，请如实说明。\n'
}
