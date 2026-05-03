<template>
  <div class="chat-wrapper">
    <!-- 移动端遮罩 -->
    <div v-if="mobileSidebarOpen" class="mobile-sidebar-overlay" @click="mobileSidebarOpen = false"></div>

    <ChatSidebar
      :sessionList="sessionList"
      :currentSessionId="currentSessionId"
      :collapsed="sidebarCollapsed"
      :mobile-open="mobileSidebarOpen"
      @createSession="createNewSession(); mobileSidebarOpen = false"
      @selectSession="switchSessionAndClose($event)"
      @deleteSession="deleteSession($event)"
    />

    <div class="sidebar-toggle" @click="toggleSidebar">
      <el-icon :class="{ rotated: sidebarCollapsed && !isMobile }"><Fold /></el-icon>
    </div>

    <ChatMessageArea
      ref="messageAreaRef"
      :messages="messages"
      :isLoading="isLoading"
      :loadingHistory="loadingHistory"
      :typingMessageIndex="typingMessageIndex"
      :currentSessionId="currentSessionId"
      :kbList="kbList"
      :selectedKbId="selectedKbId"
      :nexusMode="nexusMode"
      :modelList="modelList"
      :selectedModel="selectedModel"
      :imageRatios="imageRatios"
      :selectedImageRatio="selectedImageRatio"
      :loadingStage="loadingStage"
      @update:nexusMode="nexusMode = $event"
      @update:selectedModel="onModelChange($event)"
      @update:selectedImageRatio="onImageRatioChange($event)"
      @send="sendMessage"
      @clearHistory="clearHistory"
      @update:selectedKbId="selectedKbId = $event"
      @toggle-sidebar="toggleSidebar"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Fold } from '@element-plus/icons-vue'
import { getChatHistory, deleteChatHistory, getSessions, uploadFile } from '@/apis/ai'
import { getKnowledgeBases, type KnowledgeBase } from '@/apis/knowledgeBase'
import { handleSSE } from '@/utils/sse'
function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了，指挥官还在工作啊。'
  if (h < 12) return '早安，指挥官。'
  if (h < 18) return '午后好，指挥官。'
  return '晚安，指挥官。'
}
import { autoSpeakEnabled, speak } from '@/utils/tts'
import { useUserStore } from '@/stores/userStore'
import ChatSidebar from './components/ChatSidebar.vue'
import ChatMessageArea from './components/ChatMessageArea.vue'

interface FileAttachment {
  name: string
  url: string
  type: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  files?: FileAttachment[]
}

interface SessionItem {
  id: string
  preview: string
  messageCount: number
  lastActiveAt: string
}

const messages = ref<Message[]>([])
const isLoading = ref(false)
const loadingHistory = ref(false)
const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)
const currentSessionId = ref<string>('')
const sessionList = ref<SessionItem[]>([])
const kbList = ref<KnowledgeBase[]>([])
const selectedKbId = ref<number | null>(null)
const nexusMode = ref(true)
const selectedModel = ref<string>(localStorage.getItem('nexusSelectedModel') || '')
const modelList = ref<{ id: string; name: string; type: string; desc: string }[]>([])
const imageRatios = ref<{ label: string; value: string }[]>([])
const loadingStage = ref<string>('thinking')
const selectedImageRatio = ref<string>(localStorage.getItem('nexusImageRatio') || '')

const isMobile = ref(window.innerWidth < 768)

const toggleSidebar = () => {
  if (isMobile.value) {
    mobileSidebarOpen.value = !mobileSidebarOpen.value
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
}

const switchSessionAndClose = (sessionId: string) => {
  switchSession(sessionId)
  mobileSidebarOpen.value = false
}

let typewriterTimer: ReturnType<typeof setInterval> | null = null
const typingMessageIndex = ref(-1)

const userStore = useUserStore()
const messageAreaRef = ref<InstanceType<typeof ChatMessageArea>>()

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

const getPreview = (content: string, files?: FileAttachment[]) => {
  if (files && files.length > 0) {
    const fileNames = files.map(f => f.name).join(', ')
    return `[文件] ${fileNames}`
  }
  if (!content) return ''
  return content.length > 30 ? content.slice(0, 30) + '...' : content
}

const syncSessionsFromBackend = async () => {
  try {
    const userInfo = userStore.getUserInfo()
    const userId = userInfo?.id || null
    if (!userId) return
    const res = await getSessions(userId)
    if (res.data.success && res.data.result.sessions) {
      const backendSessions: any[] = res.data.result.sessions
      for (const bs of backendSessions) {
        const existing = sessionList.value.find(s => s.id === bs.session_id)
        if (!existing) {
          sessionList.value.push({
            id: bs.session_id,
            preview: getPreview(bs.first_message || ''),
            messageCount: bs.message_count || 0,
            lastActiveAt: bs.last_active_at || bs.created_at
          })
        } else {
          existing.messageCount = bs.message_count || 0
          existing.preview = getPreview(bs.first_message || existing.preview)
          existing.lastActiveAt = bs.last_active_at || existing.lastActiveAt
        }
      }
      sessionList.value.sort((a, b) =>
        new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
      )
      saveSessionList()
    }
  } catch {
    // 静默失败
  }
}

const loadModelList = async () => {
  try {
    const res = await fetch('/api/ai/models')
    const data = await res.json()
    if (data.success) {
      modelList.value = data.result.models
      // 加载图片宽高比配置
      if (data.result.imageRatios) {
        imageRatios.value = data.result.imageRatios
        const savedRatio = localStorage.getItem('nexusImageRatio')
        if (savedRatio && imageRatios.value.some(r => r.value === savedRatio)) {
          selectedImageRatio.value = savedRatio
        } else if (imageRatios.value.length > 0) {
          selectedImageRatio.value = imageRatios.value[0]!.value
        }
      }
      // 恢复上次选择的模型，否则用默认
      const saved = localStorage.getItem('nexusSelectedModel')
      if (saved && modelList.value.some(m => m.id === saved)) {
        selectedModel.value = saved
      } else if (!selectedModel.value && modelList.value.length > 0) {
        selectedModel.value = modelList.value[0]!.id
      }
    }
  } catch { /* 静默失败 */ }
}

const loadKBList = async () => {
  try {
    const userInfo = userStore.getUserInfo()
    if (!userInfo?.id) return
    const res = await getKnowledgeBases()
    if (res.data.success) {
      kbList.value = res.data.result.knowledgeBases || []
    }
  } catch {
    // 静默失败
  }
}

const initCurrentSession = async () => {
  loadSessionList()
  await syncSessionsFromBackend()
  const saved = localStorage.getItem(getCurrentKey())

  if (saved && sessionList.value.some(s => s.id === saved)) {
    currentSessionId.value = saved
    await loadHistory()
  } else if (sessionList.value.length > 0) {
    currentSessionId.value = sessionList.value[0]!.id
    localStorage.setItem(getCurrentKey(), currentSessionId.value)
    await loadHistory()
  }
  // 无会话时空着，等待用户点击"新对话"
}

const createNewSession = (switchTo = true) => {
  const newId = generateSessionId()
  const welcomeText = '✦ 新对话已就绪，指挥官。'
  const greeting = getGreeting()

  const newSession: SessionItem = {
    id: newId,
    preview: welcomeText,
    messageCount: 1,
    lastActiveAt: new Date().toISOString()
  }
  sessionList.value.unshift(newSession)
  saveSessionList()

  if (switchTo) {
    stopTypewriter()
    currentSessionId.value = newId
    localStorage.setItem(getCurrentKey(), newId)
    messages.value = [{
      role: 'assistant',
      content: `${greeting}\n\n${welcomeText}`
    }]
    isLoading.value = false
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
  isLoading.value = false

  await loadHistory()
}

const deleteSession = async (sessionId: string) => {
  mobileSidebarOpen.value = false
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
      await switchSession(sessionList.value[0]!.id)
    } else {
      currentSessionId.value = ''
      messages.value = []
      localStorage.removeItem(getCurrentKey())
    }
  }
}

const loadHistory = async () => {
  if (!currentSessionId.value) return
  loadingHistory.value = true
  try {
    const userInfo = userStore.getUserInfo()
    const userId = userInfo?.id || null
    const response = await getChatHistory(currentSessionId.value, userId)
    if (response.data.success) {
      const msgs = response.data.result.messages
      if (msgs && msgs.length > 0) {
        messages.value = msgs
      } else {
        // 新会话无后端记录时显示欢迎消息，防止刷新消失
        const sess = sessionList.value.find(s => s.id === currentSessionId.value)
        if (sess) {
          messages.value = [{
            role: 'assistant',
            content: `${getGreeting()}\n\n${sess.preview || '✦ 新对话已就绪'}`
          }]
        } else {
          messages.value = []
        }
      }
    }
  } catch {
    ElMessage.error('加载历史对话失败')
  } finally {
    loadingHistory.value = false
  }
}

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
    messageAreaRef.value?.scrollToBottom()
  }

  typewriterTimer = setInterval(tick, 30)

  return {
    append: (chunk: string) => { fullContent += chunk },
    flush: () => {
      stopTypewriter()
      const msg = messages.value[msgIndex]
      if (msg) msg.content = fullContent
      typingMessageIndex.value = -1
      messageAreaRef.value?.scrollToBottom()
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

function onModelChange(val: string) {
  selectedModel.value = val
  localStorage.setItem('nexusSelectedModel', val)
}

function onImageRatioChange(val: string) {
  selectedImageRatio.value = val
  localStorage.setItem('nexusImageRatio', val)
}

const sendMessage = async (payload: { content: string; files: File[] }) => {
  const { content, files } = payload
  if (!currentSessionId.value) {
    createNewSession()
  }

  // 上传文件
  let uploadedFiles: FileAttachment[] = []
  if (files.length > 0) {
    for (const file of files) {
      try {
        const result = await uploadFile(file)
        uploadedFiles.push({ name: result.name, url: result.url, type: result.type })
      } catch {
        ElMessage.error(`文件 ${file.name} 上传失败`)
      }
    }
  }

  const sess = sessionList.value.find(s => s.id === currentSessionId.value)
  if (sess) {
    const preview = getPreview(content, uploadedFiles)
    if (!sess.preview) sess.preview = preview
    sess.messageCount += 2
    sess.lastActiveAt = new Date().toISOString()
    saveSessionList()
  }

  messages.value.push({ role: 'user', content: content || '', files: uploadedFiles.length > 0 ? uploadedFiles : undefined })
  isLoading.value = true
  loadingStage.value = 'thinking'
  await messageAreaRef.value?.scrollToBottom()

  try {
    const userInfo = userStore.getUserInfo()
    const userId = userInfo?.id || null

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: content,
        sessionId: currentSessionId.value,
        userId,
        files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        kbId: selectedKbId.value || undefined,
        nexusMode: nexusMode.value,
        model: selectedModel.value || undefined,
        maxVideoFrames: uploadedFiles.some(f => f.type.startsWith('video/')) ? 40 : undefined
      })
    })

    if (!response.ok) throw new Error('网络请求失败')

    messages.value.push({ role: 'assistant', content: '' })
    const msgIndex = messages.value.length - 1
    let typewriter: ReturnType<typeof startTypewriter> | null = null
    const pendingWebSources: any[] = []

    await handleSSE(
      response,
      (chunk) => {
        if (!typewriter) typewriter = startTypewriter(msgIndex)
        typewriter.append(chunk)
      },
      (error) => {
        stopTypewriter()
        ElMessage.error(error.message || '发送消息失败')
        isLoading.value = false
      },
      () => {
        if (typewriter) {
          typewriter.flush()
        } else {
          // 没有任何内容返回
          typingMessageIndex.value = -1
          isLoading.value = false
        }
        const lastMsg = messages.value[msgIndex]
        if (lastMsg && pendingWebSources.length > 0) {
          (lastMsg as any).webSources = pendingWebSources
        }
        isLoading.value = false
        messageAreaRef.value?.scrollToBottom()
        refreshSessionMeta()
        // Auto-speak
        if (autoSpeakEnabled.value) {
          const lastMsg = messages.value[msgIndex]
          if (lastMsg?.content) speak(lastMsg.content)
        }
      },
      (event) => {
        if (event.type === 'webSearch' && event.sources) {
          pendingWebSources.push(...event.sources)
        }
        if (event.type === 'tool_call') {
          const stageMap: Record<string, string> = {
            search_web: 'searching',
            query_knowledge_base: 'retrieving_kb',
            recall_memory: 'recalling',
            generate_image: 'generating_image',
          }
          loadingStage.value = stageMap[event.tool || ''] || 'thinking'
        }
        if (event.type === 'tool_result') {
          loadingStage.value = 'composing'
          if (event.tool === 'generate_image' && event.imageUrl) {
            const lastMsg = messages.value[msgIndex]
            if (lastMsg) {
              lastMsg.content = (lastMsg.content || '') + `\n\n![生成图片](${event.imageUrl})\n\n`
            }
          }
        }
      }
    )
  } catch (error: any) {
    stopTypewriter()
    ElMessage.error(error.message || '发送消息失败')
    isLoading.value = false
  }
}

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

const handleResize = () => {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) {
    mobileSidebarOpen.value = false
  }
}

onMounted(() => {
  initCurrentSession()
  loadKBList()
  loadModelList()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.chat-wrapper {
  display: flex;
  height: 100%;
  position: relative;
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  background: var(--color-bg-card);
  color: var(--color-text-muted);
  cursor: pointer;
  flex-shrink: 0;
  font-size: 16px;
  transition: color var(--transition-fast), background var(--transition-fast);
  border-right: var(--border-thin) var(--color-border);
  z-index: 10;
}

.sidebar-toggle:hover {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.rotated {
  transform: rotate(180deg);
}

.mobile-sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .mobile-sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: var(--color-bg-overlay);
    z-index: 50;
  }

  .sidebar-toggle {
    position: absolute;
    left: 0;
    top: 0;
    height: 44px;
    width: 36px;
    border-right: var(--border-thin) var(--color-border);
    border-bottom: var(--border-thin) var(--color-border);
    border-radius: 0 0 6px 0;
    z-index: 10;
  }
}
</style>
