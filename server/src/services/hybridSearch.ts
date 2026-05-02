import config from '../config/index.js'

// BM25 实现：对向量检索候选集计算关键词匹配分，与向量分加权融合

export interface HybridCandidate {
  content: string
  source: string
  score: number
}

export interface HybridResult {
  content: string
  source: string
  vectorScore: number
  bm25Score: number
  fusedScore: number
}

/**
 * 分词：中文按单字 + 二字词，英文按空格分词
 */
function tokenize(text: string): string[] {
  const tokens: string[] = []
  const segments = text.match(/[\u4e00-\u9fff]+|[a-zA-Z\d]+|[^\s\u4e00-\u9fffa-zA-Z\d]+/g) || []

  for (const seg of segments) {
    if (/^[\u4e00-\u9fff]+$/.test(seg)) {
      for (const ch of seg) {
        tokens.push(ch)
      }
      if (seg.length >= 2) {
        for (let i = 0; i < seg.length - 1; i++) {
          tokens.push(seg[i] + seg[i + 1])
        }
      }
    } else {
      tokens.push(seg.toLowerCase())
    }
  }

  return tokens
}

function computeBM25Score(
  docTokens: string[],
  queryTokens: string[],
  idf: Map<string, number>,
  avgDocLen: number
): number {
  const k1 = 1.5
  const b = 0.75
  const docLen = docTokens.length

  let score = 0
  const termFreq = new Map<string, number>()
  for (const t of docTokens) {
    termFreq.set(t, (termFreq.get(t) || 0) + 1)
  }

  for (const qt of queryTokens) {
    const tf = termFreq.get(qt) || 0
    if (tf === 0) continue
    const qidf = idf.get(qt) || 0
    score += qidf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLen))))
  }

  return score
}

/**
 * 混合检索：向量相似度 + BM25 关键词匹配
 * 在向量检索候选集上计算 BM25 分，加权融合后排序
 */
export function hybridFuse(
  query: string,
  candidates: HybridCandidate[],
  topK: number = config.rag.topK
): HybridResult[] {
  if (candidates.length === 0) return []

  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) {
    return candidates.slice(0, topK).map(c => ({
      content: c.content,
      source: c.source,
      vectorScore: c.score,
      bm25Score: 0,
      fusedScore: c.score
    }))
  }

  // 所有候选分词
  const allDocTokens = candidates.map(c => tokenize(c.content))
  const totalDocs = candidates.length
  const avgDocLen = allDocTokens.reduce((sum, t) => sum + t.length, 0) / totalDocs

  // 候选集内 IDF
  const docFreq = new Map<string, number>()
  for (const tokens of allDocTokens) {
    const seen = new Set<string>()
    for (const t of tokens) {
      if (!seen.has(t)) {
        seen.add(t)
        docFreq.set(t, (docFreq.get(t) || 0) + 1)
      }
    }
  }
  const idf = new Map<string, number>()
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1))
  }

  // BM25 分
  const bm25Scores = allDocTokens.map(tokens =>
    computeBM25Score(tokens, queryTokens, idf, avgDocLen)
  )

  // 归一化
  const vectorScores = candidates.map(c => c.score)
  const maxVec = Math.max(...vectorScores, 0.001)
  const maxBM25 = Math.max(...bm25Scores, 0.001)
  const normVec = vectorScores.map(s => s / maxVec)
  const normBM25 = bm25Scores.map(s => s / maxBM25)

  // 加权融合
  const { vectorWeight, bm25Weight } = config.rag
  const fused: HybridResult[] = candidates.map((c, i) => ({
    content: c.content,
    source: c.source,
    vectorScore: c.score,
    bm25Score: bm25Scores[i],
    fusedScore: vectorWeight * normVec[i] + bm25Weight * normBM25[i]
  }))

  fused.sort((a, b) => b.fusedScore - a.fusedScore)
  return fused.slice(0, topK)
}
