import { MultiServerMCPClient } from '@langchain/mcp-adapters'

let mcpClient: MultiServerMCPClient | null = null

/**
 * 初始化 MCP 客户端，连接所有 MCP Server
 * 文件系统：操作项目文件（读写/搜索/目录）
 * Playwright：浏览器自动化（打开网页/填表单/截图）
 */
export async function initMCP() {
  if (mcpClient) return mcpClient

  mcpClient = new MultiServerMCPClient({
    throwOnLoadError: false,       // 单个 Server 加载失败不影响其他
    prefixToolNameWithServerName: true, // tool 名加 server_ 前缀避免冲突

    mcpServers: {
      filesystem: {
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', 'C:/Users/ak195/Desktop/aiconnent'],
      },
      playwright: {
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@playwright/mcp'],
      },
    },
  })

  await mcpClient.initializeConnections()
  console.log('[MCP] All servers connected')
  return mcpClient
}

/**
 * 获取所有 MCP 工具（LangChain Tool 格式，可直接传入 createAgent）
 */
export async function getMcpTools() {
  if (!mcpClient) throw new Error('MCP not initialized. Call initMCP() first.')
  return mcpClient.getTools()
}

/**
 * 关闭所有 MCP 连接
 */
export async function closeMCP() {
  if (mcpClient) {
    await mcpClient.close()
    mcpClient = null
    console.log('[MCP] All connections closed')
  }
}
