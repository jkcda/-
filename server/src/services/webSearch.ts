import config from '../config/index.js'

interface SearchResult {
  title: string
  url: string
  snippet: string
}

async function searchTavily(query: string): Promise<SearchResult[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: config.webSearch.tavilyApiKey,
      query,
      max_results: config.webSearch.maxResults,
      search_depth: 'basic'
    })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).detail || `Tavily 搜索失败 (${res.status})`)
  }
  const data = await res.json()
  return (data.results || []).map((r: any) => ({
    title: r.title,
    url: r.url,
    snippet: r.content || r.snippet || ''
  }))
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  const res = await fetch(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
    { headers: { 'User-Agent': 'ai-chat-app/1.0' } }
  )
  const data = await res.json()
  const results: SearchResult[] = []

  if (data.AbstractText) {
    results.push({
      title: data.AbstractSource || 'DuckDuckGo',
      url: data.AbstractURL || '',
      snippet: data.AbstractText
    })
  }
  for (const topic of data.RelatedTopics || []) {
    if (topic.Text && topic.FirstURL) {
      results.push({ title: topic.Text.split(' - ')[0] || topic.Text, url: topic.FirstURL, snippet: topic.Text })
    }
  }
  return results.slice(0, config.webSearch.maxResults)
}

function formatResults(results: SearchResult[]): string {
  return results
    .map((r, i) => `${i + 1}. [${r.title}](${r.url})\n   ${r.snippet}`)
    .join('\n')
}

export interface WebSearchResult {
  text: string         // 注入 prompt 的格式化文本
  sources: SearchResult[]  // 前端展示的结构化来源
}

/**
 * 联网搜索，返回格式化文本 + 结构化来源
 */
export async function searchWeb(query: string): Promise<WebSearchResult> {
  const empty = { text: '', sources: [] }
  if (!config.webSearch.enabled) return empty

  try {
    const results = config.webSearch.tavilyApiKey
      ? await searchTavily(query)
      : await searchDuckDuckGo(query)

    if (!results.length) return empty
    return {
      text: `\n--- 以下是联网搜索结果 ---\n${formatResults(results)}\n--- 搜索结果结束 ---\n`,
      sources: results
    }
  } catch {
    return empty
  }
}
