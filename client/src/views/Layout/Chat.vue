<template>
  <div class="chat-wrapper">
    <!-- 会话侧边栏 -->
    <div class="chat-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <el-button type="primary" class="new-chat-btn" @click="createNewSession">
          <el-icon><Plus /></el-icon>
          新对话
        </el-button>
      </div>
      <div class="session-list">
        <div
          v-for="sess in sessionList"
          :key="sess.id"
          :class="['session-item', { active: sess.id === currentSessionId }]"
          @click="switchSession(sess.id)"
        >
          <div class="session-preview">{{ sess.preview || '新对话' }}</div>
          <div class="session-meta">
            <span>{{ sess.messageCount }} 条消息</span>
            <el-button
              class="delete-session-btn"
              size="small"
              text
              type="danger"
              @click.stop="deleteSession(sess.id)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
        <div v-if="sessionList.length === 0" class="empty-sessions">
          暂无对话记录
        </div>
      </div>
      <div class="sidebar-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
        <el-icon :class="{ rotated: sidebarCollapsed }"><Fold /></el-icon>
      </div>
    </div>

    <!-- 主聊天区域 -->
    <div class="chat-main" :class="{ expanded: sidebarCollapsed }">
      <div class="chat-header">
        <h2>AI 智能对话</h2>
        <el-button
          v-if="currentSessionId"
          type="warning"
          size="small"
          @click="clearHistory"
        >
          清空当前对话
        </el-button>
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
        <div v-if="isLoading && typingMessageIndex === -1" class="message assistant">
          <div class="message-content typing-indicator">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="3"
          placeholder="请输入您的问题... (Enter 发送)"
          @keydown.enter.exact.prevent="sendMessage"
        />
        <el-button
          type="primary"
          @click="sendMessage"
          :loading="isLoading"
          :disabled="!currentSessionId"
          style="margin-top: 10px;"
        >
          发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Fold } from '@element-plus/icons-vue'
import { getChatHistory, deleteChatHistory, getSessions } from '@/apis/ai'
import { handleSSE } from '@/utils/sse'
import { useUserStore } from '@/stores/userStore'
import { marked } from 'marked'

marked.setOptions({
  breaks: true,
  gfm: true
})

function renderMarkdown(content: string): string {
  if (!content) return ''
  return marked.parse(content) as string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface SessionItem {
  id: string
  preview: string
  messageCount: number
  lastActiveAt: string
}

// --- 响应式数据 ---
const messages = ref<Message[]>([])
const inputMessage = ref('')
const isLoading = ref(false)
const loadingHistory = ref(false)
const messagesContainer = ref<HTMLElement>()
const sidebarCollapsed = ref(false)
const currentSessionId = ref<string>('')
const sessionList = ref<SessionItem[]>([])

// 打字机效果
let typewriterTimer: ReturnType<typeof setInterval> | null = null
const typingMessageIndex = ref(-1)

const userStore = useUserStore()

// --- 会话存储 ---
const getStorageKey = () => {
  const userInfo = userStore.getUserInfo()
  const uid = userInfo?.id || 'anon'
  return `chatSessions_${uid}`
}

const getCurrentKey = () => {
  const userInfo = userStore.getUserInfo()
  const uid = userInfo?.id || 'anon'
  return `chatCurrentSession_${uid}`
}

const loadSessionList = () => {
  const raw = localStorage.getItem(getStorageKey())
  if (raw) {
    try {
      sessionList.value = JSON.parse(raw)
    } catch {
      sessionList.value = []
    }
  } else {
    sessionList.value = []
  }
}

const saveSessionList = () => {
  localStorage.setItem(getStorageKey(), JSON.stringify(sessionList.value))
}

const generateSessionId = () => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

// 生成首条用户消息的预览（截取前30字）
const getPreview = (content: string) => {
  if (!content) return ''
  return content.length > 30 ? content.slice(0, 30) + '...' : content
}

// --- 初始化 ---
const initCurrentSession = async () => {
  loadSessionList()
  const saved = localStorage.getItem(getCurrentKey())

  if (saved && sessionList.value.some(s => s.id === saved)) {
    currentSessionId.value = saved
    await loadHistory()
  } else if (sessionList.value.length > 0) {
    currentSessionId.value = sessionList.value[0].id
    localStorage.setItem(getCurrentKey(), currentSessionId.value)
    await loadHistory()
  } else {
    createNewSession(false)
  }
}

// --- 会话操作 ---
const createNewSession = (switchTo = true) => {
  const newId = generateSessionId()
  const newSession: SessionItem = {
    id: newId,
    preview: '',
    messageCount: 0,
    lastActiveAt: new Date().toISOString()
  }
  sessionList.value.unshift(newSession)
  saveSessionList()

  if (switchTo) {
    switchSession(newId, false)
  }
}

const switchSession = async (sessionId: string, saveCurrent = true) => {
  if (sessionId === currentSessionId.value) return
  stopTypewriter()

  if (saveCurrent) {
    localStorage.setItem(getCurrentKey(), sessionId)
  }
  currentSessionId.value = sessionId
  messages.value = []
  inputMessage.value = ''
  isLoading.value = false

  await loadHistory()
}

const deleteSession = async (sessionId: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除此对话吗？',
      '删除确认',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  try {
    const userInfo = userStore.getUserInfo()
    const userId = userInfo?.id || null
    await deleteChatHistory(sessionId, userId)
  } catch {
    // 即使后端删除失败也继续清理前端
  }

  sessionList.value = sessionList.value.filter(s => s.id !== sessionId)
  saveSessionList()

  if (sessionId === currentSessionId.value) {
    if (sessionList.value.length > 0) {
      await switchSession(sessionList.value[0].id)
    } else {
      createNewSession()
    }
  }
}

// --- 历史加载 ---
const loadHistory = async () => {
  if (!currentSessionId.value) return
  loadingHistory.value = true
  try {
    const userInfo = userStore.getUserInfo()
    const userId = userInfo?.id || null
    const response = await getChatHistory(currentSessionId.value, userId)
    if (response.data.success) {
      messages.value = response.data.result.messages
    }
  } catch {
    ElMessage.error('加载历史对话失败')
  } finally {
    loadingHistory.value = false
  }
}

// 刷新会话列表元数据（从后端获取实际消息数）
const refreshSessionMeta = async () => {
  try {
    const userInfo = userStore.getUserInfo()
    const userId = userInfo?.id || null
    const res = await getSessions(userId)
    if (res.data.success && res.data.result.sessions) {
      const backendSessions: any[] = res.data.result.sessions
      for (const bs of backendSessions) {
        const local = sessionList.value.find(s => s.id === bs.session_id)
        if (local) {
          local.messageCount = bs.message_count || 0
          local.preview = getPreview(bs.first_message || '')
          local.lastActiveAt = bs.last_active_at || local.lastActiveAt
        }
      }
      saveSessionList()
    }
  } catch {
    // 静默失败
  }
}

// --- 打字机效果 ---
const startTypewriter = (msgIndex: number) => {
  stopTypewriter()
  typingMessageIndex.value = msgIndex

  let fullContent = ''
  let typedLength = 0

  const tick = () => {
    if (typingMessageIndex.value !== msgIndex) return
    const remaining = fullContent.length - typedLength
    if (remaining <= 0) return

    let charsPerTick = 2 + Math.floor(Math.random() * 4)
    if (remaining > 200) charsPerTick = 8
    else if (remaining < charsPerTick) charsPerTick = remaining

    typedLength += charsPerTick
    if (typedLength > fullContent.length) typedLength = fullContent.length

    const msg = messages.value[msgIndex]
    if (msg) msg.content = fullContent.slice(0, typedLength)
    scrollToBottom()
  }

  typewriterTimer = setInterval(tick, 30)

  return {
    append: (chunk: string) => { fullContent += chunk },
    flush: () => {
      stopTypewriter()
      const msg = messages.value[msgIndex]
      if (msg) msg.content = fullContent
      typingMessageIndex.value = -1
      scrollToBottom()
    }
  }
}

const stopTypewriter = () => {
  if (typewriterTimer !== null) {
    clearInterval(typewriterTimer)
    typewriterTimer = null
  }
  typingMessageIndex.value = -1
}

// --- 发送消息 ---
const sendMessage = async () => {
  if (!inputMessage.value.trim()) {
    ElMessage.warning('请输入消息内容')
    return
  }
  if (!currentSessionId.value) {
    createNewSession()
  }

  const userMessage = inputMessage.value

  // 更新本地会话元数据
  const sess = sessionList.value.find(s => s.id === currentSessionId.value)
  if (sess) {
    if (!sess.preview) sess.preview = getPreview(userMessage)
    sess.messageCount += 2 // user + upcoming assistant
    sess.lastActiveAt = new Date().toISOString()
    saveSessionList()
  }

  messages.value.push({ role: 'user', content: userMessage })
  inputMessage.value = ''
  isLoading.value = true
  await scrollToBottom()

  try {
    const userInfo = userStore.getUserInfo()
    const userId = userInfo?.id || null

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        sessionId: currentSessionId.value,
        userId
      })
    })

    if (!response.ok) throw new Error('网络请求失败')

    messages.value.push({ role: 'assistant', content: '' })
    const typewriter = startTypewriter(messages.value.length - 1)

    await handleSSE(
      response,
      (content) => typewriter.append(content),
      (error) => {
        stopTypewriter()
        ElMessage.error(error.message || '发送消息失败')
        isLoading.value = false
      },
      () => {
        typewriter.flush()
        isLoading.value = false
        scrollToBottom()
        refreshSessionMeta()
      }
    )
  } catch (error: any) {
    stopTypewriter()
    ElMessage.error(error.message || '发送消息失败')
    isLoading.value = false
  }
}

// --- 清空当前对话 ---
const clearHistory = async () => {
  if (!currentSessionId.value) return
  try {
    await ElMessageBox.confirm(
      '确定要清空当前对话的所有消息吗？',
      '清空确认',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  try {
    const userInfo = userStore.getUserInfo()
    const userId = userInfo?.id || null
    const response = await deleteChatHistory(currentSessionId.value, userId)
    if (response.data.success) {
      messages.value = []
      const sess = sessionList.value.find(s => s.id === currentSessionId.value)
      if (sess) {
        sess.preview = ''
        sess.messageCount = 0
        saveSessionList()
      }
      ElMessage.success('历史对话已清空')
    }
  } catch {
    ElMessage.error('清空历史对话失败')
  }
}

// --- 滚动 ---
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// --- 生命周期 ---
onMounted(() => {
  initCurrentSession()
})
</script>

<style scoped>
.chat-wrapper {
  display: flex;
  height: calc(100vh - 60px);
  background: #f0f2f5;
}

/* ---- 侧边栏 ---- */
.chat-sidebar {
  width: 260px;
  background: #fff;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e4e7ed;
  transition: width 0.3s;
  flex-shrink: 0;
}

.chat-sidebar.collapsed {
  width: 0;
  overflow: hidden;
  border-right: none;
}

.sidebar-header {
  padding: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.new-chat-btn {
  width: 100%;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background 0.15s;
}

.session-item:hover {
  background: #f5f7fa;
}

.session-item.active {
  background: #ecf5ff;
}

.session-preview {
  font-size: 14px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.session-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.delete-session-btn {
  opacity: 0;
  transition: opacity 0.15s;
  padding: 2px;
  font-size: 14px;
}

.session-item:hover .delete-session-btn {
  opacity: 1;
}

.empty-sessions {
  text-align: center;
  padding: 30px 0;
  color: #c0c4cc;
  font-size: 14px;
}

.sidebar-toggle {
  padding: 8px;
  text-align: center;
  color: #909399;
  cursor: pointer;
  border-top: 1px solid #e4e7ed;
  font-size: 16px;
}

.sidebar-toggle:hover {
  color: #409EFF;
}

.rotated {
  transform: rotate(180deg);
}

/* ---- 主区域 ---- */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #f5f5f5;
}

.chat-header {
  background: #409EFF;
  color: white;
  padding: 0 24px;
  height: 52px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.chat-header h2 {
  margin: 0;
  font-size: 17px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
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
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 8px;
  word-wrap: break-word;
  line-height: 1.5;
}

.message-content :deep(*) { margin: 0; }
.message-content :deep(* + *) { margin-top: 6px; }
.message-content :deep(h1), .message-content :deep(h2),
.message-content :deep(h3), .message-content :deep(h4) { font-weight: 600; }
.message-content :deep(h1) { font-size: 1.2em; }
.message-content :deep(h2) { font-size: 1.15em; }
.message-content :deep(h3) { font-size: 1.1em; }
.message-content :deep(h4) { font-size: 1.05em; }
.message-content :deep(ul), .message-content :deep(ol) { padding-left: 20px; }
.message-content :deep(li) { margin-top: 2px; }
.message-content :deep(code) {
  background: #f0f0f0; padding: 1px 5px; border-radius: 4px; font-size: 0.88em;
}
.message-content :deep(pre) {
  background: #f5f5f5; padding: 10px 12px; border-radius: 6px; overflow-x: auto; white-space: pre;
}
.message-content :deep(pre code) { background: none; padding: 0; }
.message-content :deep(blockquote) {
  border-left: 3px solid #409EFF; padding-left: 10px; color: #666;
}
.message-content :deep(a) { color: #409EFF; text-decoration: none; }
.message-content :deep(hr) { border: none; border-top: 1px solid #e0e0e0; margin: 8px 0; }

.message.user .message-content {
  background: #409EFF;
  color: white;
}

.message.assistant .message-content {
  background: white;
  color: #333;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* ---- 输入区域 ---- */
.chat-input {
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
  background: #fff;
  flex-shrink: 0;
}

/* ---- 打字指示器 ---- */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px !important;
}

.typing-indicator .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #909399;
  animation: typingBounce 1.4s ease-in-out infinite both;
}

.typing-indicator .dot:nth-child(1) { animation-delay: 0s; }
.typing-indicator .dot:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator .dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typingBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
</style>
