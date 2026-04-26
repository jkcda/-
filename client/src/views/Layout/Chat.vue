<template>
  <div class="chat-container">
    <div class="chat-header">
      <h2>AI 智能对话</h2>
      <div class="session-info">
        <span>会话 ID: {{ sessionId }}</span>
        <el-button 
          type="warning" 
          size="small" 
          @click="clearHistory"
        >
          清空历史
        </el-button>
      </div>
    </div>
    
    <div class="chat-messages" ref="messagesContainer">
      <div v-if="loadingHistory" class="loading-history">
        加载历史对话中...
      </div>
      <div 
        v-for="(msg, index) in messages" 
        :key="index" 
        :class="['message', msg.role]"
      >
        <div class="message-content" v-html="renderMarkdown(msg.content)"></div>
      </div>
      <div v-if="isLoading" class="message assistant">
        <div class="message-content">正在思考中...</div>
      </div>
    </div>
    
    <div class="chat-input">
      <el-input
        v-model="inputMessage"
        type="textarea"
        :rows="3"
        placeholder="请输入您的问题..."
        @keydown.enter.prevent="sendMessage"
      />
      <el-button 
        type="primary" 
        @click="sendMessage"
        :loading="isLoading"
        style="margin-top: 10px;"
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getChatHistory, deleteChatHistory } from '@/apis/ai'
import { handleSSE } from '@/utils/sse'
import { useUserStore } from '@/stores/userStore'
import { marked } from 'marked'

// 配置 marked 选项
marked.setOptions({
  breaks: true,       // 保留换行符为 <br>
  gfm: true           // 启用 GitHub 风格 Markdown
})

// 渲染 Markdown 内容为 HTML
function renderMarkdown(content: string): string {
  if (!content) return ''
  return marked.parse(content) as string
}

// 消息类型定义
interface Message {
  role: 'user' | 'assistant'
  content: string
}

// 响应式数据
const messages = ref<Message[]>([])
const inputMessage = ref('')
const isLoading = ref(false)
const loadingHistory = ref(true)
const messagesContainer = ref<HTMLElement>()
const sessionId = ref<string>('')

// 使用用户 store
const userStore = useUserStore()

// 生成或获取 sessionId - 每个用户有独立的 sessionid
const getSessionId = (): string => {
  // 从 store 中获取用户信息
  const userInfo = userStore.getUserInfo()
  const userId = userInfo?.id
  
  // 如果用户已登录，使用用户ID作为key存储sessionid
  if (userId) {
    const storageKey = `chatSessionId_${userId}`
    let id = localStorage.getItem(storageKey)
    if (!id) {
      id = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem(storageKey, id)
    }
    return id
  } else {
    // 未登录用户使用默认的 sessionid
    let id = localStorage.getItem('chatSessionId')
    if (!id) {
      id = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('chatSessionId', id)
    }
    return id
  }
}

// 加载历史对话
const loadHistory = async () => {
  try {
    // 从 store 中获取用户信息
    const userInfo = userStore.getUserInfo()
    const userId = userInfo?.id || null
    
    // 调用接口获取历史记录，传递用户 ID
    const response = await getChatHistory(sessionId.value, userId)
    if (response.data.success) {
      messages.value = response.data.result.messages
    }
  } catch (error) {
    console.error('加载历史对话失败:', error)
    ElMessage.error('加载历史对话失败')
  } finally {
    loadingHistory.value = false
  }
}

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim()) {
    ElMessage.warning('请输入消息内容')
    return
  }

  const userMessage = inputMessage.value
  
  // 添加用户消息到界面
  messages.value.push({
    role: 'user',
    content: userMessage
  })
  
  inputMessage.value = ''
  isLoading.value = true

  await scrollToBottom()

  try {
    // 从 store 中获取用户信息
    const userInfo = userStore.getUserInfo()
    const userId = userInfo?.id || null
    
    // 发送消息到服务器（使用 SSE 流式接口）
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: userMessage,
        sessionId: sessionId.value,
        userId: userId // 传递用户 ID
      })
    })

    if (!response.ok) {
      throw new Error('网络请求失败')
    }

    let assistantMessage = ''
    
    // 添加助手消息占位符
    messages.value.push({
      role: 'assistant',
      content: ''
    })

    // 使用 SSE 工具函数处理流式响应
    await handleSSE(
      response,
      (content) => {
        // 处理收到的内容
        assistantMessage += content
        const lastMessage = messages.value[messages.value.length - 1]
        if (lastMessage) {
          lastMessage.content = assistantMessage
          scrollToBottom()
        }
      },
      (error) => {
        // 处理错误
        ElMessage.error(error.message || '发送消息失败')
        isLoading.value = false
      },
      () => {
        // 处理完成
        isLoading.value = false
        scrollToBottom()
      }
    )
  } catch (error: any) {
    ElMessage.error(error.message || '发送消息失败')
    isLoading.value = false
  }
}

// 清空历史 - 同时删除数据库中的记录
const clearHistory = async () => {
  try {
    // 从 store 中获取用户信息
    const userInfo = userStore.getUserInfo()
    const userId = userInfo?.id || null
    
    // 调用后端接口删除数据库中的历史记录，传递用户 ID
    const response = await deleteChatHistory(sessionId.value, userId)
    
    if (response.data.success) {
      // 清空前端显示的消息
      messages.value = []
      ElMessage.success('历史对话已清空')
    } else {
      ElMessage.error('清空历史对话失败')
    }
  } catch (error) {
    console.error('清空历史对话失败:', error)
    ElMessage.error('清空历史对话失败')
  }
}

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 组件挂载时
onMounted(() => {
  // 获取或生成会话ID
  sessionId.value = getSessionId()
  // 加载历史对话
  loadHistory()
})
</script>

<style scoped>
.chat-container {
  max-width: 800px;
  margin: 20px auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.chat-header {
  background: #409EFF;
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header h2 {
  margin: 0;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.session-info span {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
}

.chat-messages {
  height: 500px;
  overflow-y: auto;
  padding: 20px;
  background: #f5f5f5;
}

.loading-history {
  text-align: center;
  padding: 20px;
  color: #999;
  font-style: italic;
}

.message {
  margin-bottom: 15px;
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 8px;
  word-wrap: break-word;
  line-height: 1.5;
}

.message-content :deep(*) {
  margin: 0;
}

.message-content :deep(* + *) {
  margin-top: 6px;
}

.message-content :deep(h1),
.message-content :deep(h2),
.message-content :deep(h3),
.message-content :deep(h4) {
  font-weight: 600;
}

.message-content :deep(h1) { font-size: 1.2em; }
.message-content :deep(h2) { font-size: 1.15em; }
.message-content :deep(h3) { font-size: 1.1em; }
.message-content :deep(h4) { font-size: 1.05em; }

.message-content :deep(ul),
.message-content :deep(ol) {
  padding-left: 20px;
}

.message-content :deep(li) {
  margin-top: 2px;
}

.message-content :deep(code) {
  background: #f0f0f0;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.88em;
}

.message-content :deep(pre) {
  background: #f5f5f5;
  padding: 10px 12px;
  border-radius: 6px;
  overflow-x: auto;
  white-space: pre;
}

.message-content :deep(pre code) {
  background: none;
  padding: 0;
}

.message-content :deep(blockquote) {
  border-left: 3px solid #409EFF;
  padding-left: 10px;
  color: #666;
}

.message-content :deep(a) {
  color: #409EFF;
  text-decoration: none;
}

.message-content :deep(hr) {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 8px 0;
}

.message.user .message-content {
  background: #409EFF;
  color: white;
}

.message.assistant .message-content {
  background: white;
  color: #333;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.chat-input {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
}
</style>