// SSE (Server-Sent Events) 工具函数
// 用于处理流式响应

/**
 * 处理 SSE 流式响应
 * @param response - fetch 响应对象
 * @param onContent - 内容回调函数
 * @param onError - 错误回调函数
 * @param onComplete - 完成回调函数
 */
export async function handleSSE(
  response: Response,
  onContent: (content: string) => void,
  onError: (error: Error) => void,
  onComplete: () => void
) {
  try {
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('无法获取响应流')
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        onComplete()
        break
      }

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            onComplete()
            return
          }

          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              onContent(parsed.content)
            } else if (parsed.error) {
              throw new Error(parsed.error)
            }
          } catch (e) {
            console.error('解析 SSE 数据失败:', e)
          }
        }
      }
    }
  } catch (error: any) {
    onError(error)
  }
}
