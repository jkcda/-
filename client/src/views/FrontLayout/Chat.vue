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
        <div class="message-content">{{ msg.content }}</div>
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

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const messages = ref<Message[]>([])
const inputMessage = ref('')
const isLoading = ref(false)
const loadingHistory = ref(true)
const messagesContainer = ref<HTMLElement>()
const sessionId = ref<string>('')

// 生成或获取 sessionId
const getSessionId = () => {
  let id = localStorage.getItem('chatSessionId')
  if (!id) {
    id = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('chatSessionId', id)
  }
  return id
}

// 加载历史对话
const loadHistory = async () => {
  try {
    const response = await fetch(`http://localhost:3000/api/ai/history?sessionId=${sessionId.value}`)
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        messages.value = data.result.messages
      }
    }
  } catch (error) {
    console.error('加载历史对话失败:', error)
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
  messages.value.push({
    role: 'user',
    content: userMessage
  })
  inputMessage.value = ''
  isLoading.value = true

  await scrollToBottom()

  try {
    const response = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: userMessage,
        sessionId: sessionId.value,
        userId: null // 如果有用户登录，可以传用户ID
      })
    })

    if (!response.ok) {
      throw new Error('网络请求失败')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    let assistantMessage = ''
    messages.value.push({
      role: 'assistant',
      content: ''
    })

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              isLoading.value = false
              await scrollToBottom()
              return
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                assistantMessage += parsed.content
                const lastMessage = messages.value[messages.value.length - 1]
                if (lastMessage) {
                  lastMessage.content = assistantMessage
                  await scrollToBottom()
                }
              } else if (parsed.error) {
                throw new Error(parsed.error)
              }
            } catch (e) {
              console.error('解析数据失败:', e)
            }
          }
        }
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '发送消息失败')
    isLoading.value = false
  }
}

// 清空历史
const clearHistory = () => {
  messages.value = []
  ElMessage.success('历史对话已清空')
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
  sessionId.value = getSessionId()
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
  padding: 12px 16px;
  border-radius: 8px;
  word-wrap: break-word;
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
