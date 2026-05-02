<template>
  <div class="chat-main" @paste="onPaste">
    <div class="chat-header">
      <div class="chat-header-left">
        <el-button
          class="mobile-menu-btn"
          size="small"
          text
          @click="$emit('toggleSidebar')"
        >
          <el-icon :size="18"><Menu /></el-icon>
        </el-button>
        <h2>AI 智能对话</h2>
        <img :src="'/images/character-avatar.png'" alt="AI" class="chat-header-avatar" />
      </div>
      <el-button
        v-if="currentSessionId"
        type="warning"
        size="small"
        @click="$emit('clearHistory')"
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
        v-show="msg.content || !isLoading || index !== messages.length - 1"
        :class="['message', msg.role]"
      >
        <div v-if="msg.role === 'assistant'" class="message-avatar">
          <img :src="'/images/character-avatar.png'" alt="AI" />
        </div>
        <div class="message-content">
          <div v-html="renderMarkdown(msg.content)"></div>
          <!-- 联网搜索参考链接 -->
          <div v-if="(msg as any).webSources && (msg as any).webSources.length > 0 && msg.role === 'assistant'" class="web-refs">
            <span class="web-refs-label">搜索来源：</span>
            <a
              v-for="(src, si) in (msg as any).webSources"
              :key="si"
              :href="src.url"
              target="_blank"
              class="web-ref-link"
            >{{ Number(si) + 1 }}. {{ src.title }}</a>
          </div>

          <!-- RAG 参考来源 -->
          <div v-if="(msg as any).retrievedChunks && (msg as any).retrievedChunks.length > 0 && msg.role === 'assistant'" class="retrieved-sources">
            <div class="sources-header" @click="(msg as any)._showSources = !(msg as any)._showSources">
              <span>参考来源 ({{ (msg as any).retrievedChunks.length }})</span>
              <el-icon :class="{ rotated: (msg as any)._showSources }"><ArrowDown /></el-icon>
            </div>
            <div v-show="(msg as any)._showSources" class="sources-list">
              <div v-for="(chunk, ci) in (msg as any).retrievedChunks" :key="ci" class="source-item">
                <span class="source-name">{{ chunk.source }}</span>
                <span class="source-score">相关度 {{ (chunk.score * 100).toFixed(0) }}%</span>
              </div>
            </div>
          </div>
          <div v-if="msg.files && msg.files.length > 0" class="message-files">
            <div
              v-for="(file, fi) in msg.files"
              :key="fi"
              class="message-file-item"
            >
              <img v-if="file.type.startsWith('image/')" :src="file.url" class="msg-image" />
              <a v-else :href="file.url" target="_blank" class="msg-doc">
                <el-icon><Document /></el-icon>
                {{ file.name }}
              </a>
            </div>
          </div>
        </div>
      </div>
      <div v-if="isLoading && typingMessageIndex === -1" class="message assistant">
        <div class="message-content typing-indicator">
          <span class="loading-text">{{ webSearchEnabled ? '正在搜索并思考...' : '正在思考...' }}</span>
          <div class="typing-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 已选文件预览 -->
    <div v-if="selectedFiles.length > 0" class="file-preview-bar">
      <div
        v-for="(file, index) in selectedFiles"
        :key="index"
        class="file-preview-item"
      >
        <img v-if="file.type.startsWith('image/')" :src="file.previewUrl" class="file-thumb" />
        <el-icon v-else class="file-icon"><Document /></el-icon>
        <span class="file-name">{{ file.name }}</span>
        <el-button class="file-remove" size="small" text type="danger" @click="removeFile(index)">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="chat-input">
      <div class="kb-selector-row">
        <template v-if="kbList.length > 0">
          <span class="kb-selector-label">知识库：</span>
          <el-select
            :model-value="selectedKbId"
            placeholder="选择知识库（可选）"
            clearable
            size="small"
            style="width: 180px"
            @update:model-value="$emit('update:selectedKbId', $event ?? null)"
          >
            <el-option
              v-for="kb in kbList"
              :key="kb.id"
              :label="kb.name"
              :value="kb.id"
            />
          </el-select>
        </template>
        <el-switch
          v-model="webSearchEnabled"
          size="small"
          active-text="联网"
          style="margin-left: 8px"
        />
      </div>
      <div class="input-row">
        <div class="upload-btns">
          <input
            ref="imageInputRef"
            type="file"
            accept="image/*"
            multiple
            hidden
            @change="onFilesSelected($event, 'image')"
          />
          <el-tooltip content="上传图片">
            <el-button size="small" circle @click="imageInputRef?.click()">
              <el-icon><PictureFilled /></el-icon>
            </el-button>
          </el-tooltip>

          <input
            ref="docInputRef"
            type="file"
            accept=".txt,.pdf,.doc,.docx,.md"
            multiple
            hidden
            @change="onFilesSelected($event, 'doc')"
          />
          <el-tooltip content="上传文档">
            <el-button size="small" circle @click="docInputRef?.click()">
              <el-icon><FolderOpened /></el-icon>
            </el-button>
          </el-tooltip>

          <input
            ref="videoInputRef"
            type="file"
            accept="video/*"
            hidden
            @change="onFilesSelected($event, 'video')"
          />
          <el-tooltip content="上传视频">
            <el-button size="small" circle @click="videoInputRef?.click()">
              <el-icon><VideoCameraFilled /></el-icon>
            </el-button>
          </el-tooltip>
        </div>

        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="3"
          placeholder="请输入您的问题... (Enter 发送)"
          @keydown.enter.exact.prevent="handleSend"
          class="text-input"
        />
      </div>

      <el-button
        type="primary"
        class="click-particle"
        @click="handleSend"
        :loading="isLoading"
        :disabled="!currentSessionId"
        style="margin-top: 10px;"
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { PictureFilled, FolderOpened, Document, Close, ArrowDown, Menu, VideoCameraFilled } from '@element-plus/icons-vue'
import { marked } from 'marked'

marked.setOptions({
  breaks: true,
  gfm: true
})

interface FileAttachment {
  name: string
  url: string
  type: string
}

interface RetrievedChunk {
  source: string
  score: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  files?: FileAttachment[]
  retrievedChunks?: RetrievedChunk[]
}

interface KbItem {
  id: number
  name: string
}

const props = defineProps<{
  messages: Message[]
  isLoading: boolean
  loadingHistory: boolean
  typingMessageIndex: number
  currentSessionId: string
  kbList: KbItem[]
  selectedKbId: number | null
}>()

const emit = defineEmits<{
  send: [payload: { content: string; files: File[]; webSearch: boolean }]
  clearHistory: []
  toggleSidebar: []
  'update:selectedKbId': [value: number | null]
}>()

const inputMessage = ref('')
const webSearchEnabled = ref(false)
const messagesContainer = ref<HTMLElement>()
const imageInputRef = ref<HTMLInputElement>()
const docInputRef = ref<HTMLInputElement>()
const videoInputRef = ref<HTMLInputElement>()

interface SelectedFile {
  file: File
  name: string
  type: string
  previewUrl: string
}

const selectedFiles = ref<SelectedFile[]>([])

function renderMarkdown(content: string): string {
  if (!content) return ''
  return marked.parse(content) as string
}

function addFiles(files: FileList | File[]) {
  for (const file of files) {
    const previewUrl = file.type.startsWith('image/')
      ? URL.createObjectURL(file)
      : ''
    selectedFiles.value.push({
      file,
      name: file.name,
      type: file.type,
      previewUrl
    })
  }
}

function onFilesSelected(event: Event, _source: 'image' | 'doc' | 'video') {
  const input = event.target as HTMLInputElement
  if (input.files) addFiles(input.files)
  input.value = ''
}

function onPaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items) return
  const files: File[] = []
  for (const item of items) {
    if (item.kind === 'file') {
      const f = item.getAsFile()
      if (f) files.push(f)
    }
  }
  if (files.length > 0) addFiles(files)
}

function removeFile(index: number) {
  const removed = selectedFiles.value.splice(index, 1)[0]
  if (removed?.previewUrl) {
    URL.revokeObjectURL(removed.previewUrl)
  }
}

function handleSend() {
  const content = inputMessage.value.trim()
  const files = selectedFiles.value.map(f => f.file)

  if (!content && files.length === 0) return

  emit('send', { content, files, webSearch: webSearchEnabled.value })
  inputMessage.value = ''

  // Clear selected files
  for (const f of selectedFiles.value) {
    if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
  }
  selectedFiles.value = []
}

async function scrollToBottom() {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

defineExpose({ scrollToBottom })
</script>

<style scoped>
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--color-bg-deep);
}

.chat-header {
  background: var(--color-bg-card);
  color: var(--color-silver);
  padding: 0 24px;
  height: 52px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  border-bottom: var(--border-thin) var(--color-border);
}

.chat-header-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-lg);
  border: 2px solid var(--color-magic-gold);
  box-shadow: var(--shadow-gold-glow);
  object-fit: cover;
  margin-left: 10px;
}

.chat-header h2 {
  margin: 0;
  font-family: var(--font-pixel);
  font-size: 12px;
  color: var(--color-magic-gold);
  text-shadow: 0 0 8px var(--color-gold-glow);
  image-rendering: pixelated;
  letter-spacing: 1px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.loading-history {
  text-align: center;
  padding: 20px;
  color: var(--color-text-muted);
  font-style: italic;
}

/* 游戏对话框风格消息气泡 */
.message {
  margin-bottom: 15px;
  display: flex;
  animation: dialog-appear 0.25s ease-out;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  word-wrap: break-word;
  line-height: 1.6;
  user-select: text;
}

/* Markdown 深度样式 */
.message-content :deep(*) { margin: 0; }
.message-content :deep(* + *) { margin-top: 6px; }
.message-content :deep(h1), .message-content :deep(h2),
.message-content :deep(h3), .message-content :deep(h4) {
  font-weight: 600;
  color: var(--color-magic-gold);
}
.message-content :deep(h1) { font-size: 1.2em; }
.message-content :deep(h2) { font-size: 1.15em; }
.message-content :deep(h3) { font-size: 1.1em; }
.message-content :deep(h4) { font-size: 1.05em; }
.message-content :deep(ul), .message-content :deep(ol) { padding-left: 20px; }
.message-content :deep(li) { margin-top: 2px; }
.message-content :deep(code) {
  background: var(--color-bg-input);
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  font-size: 0.88em;
  color: var(--color-text-primary);
}
.message-content :deep(pre) {
  background: var(--color-bg-input);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  overflow-x: auto;
  white-space: pre;
  border: var(--border-thin) var(--color-border);
}
.message-content :deep(pre code) { background: none; padding: 0; }
.message-content :deep(blockquote) {
  border-left: 3px solid var(--color-magic-gold);
  padding-left: 10px;
  color: var(--color-text-secondary);
}
.message-content :deep(a) { color: var(--color-magic-gold); text-decoration: none; }
.message-content :deep(hr) { border: none; border-top: var(--border-thin) var(--color-border); margin: 8px 0; }

/* 用户消息 — 宝蓝色背景 + 金色边框 */
.message.user .message-content {
  background: var(--color-primary);
  color: var(--color-silver);
  border: var(--border-game) var(--color-primary);
  box-shadow: var(--shadow-glow);
}

/* AI 消息 — 深蓝卡片 + 游戏对话框风格 */
.message.assistant .message-content {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: var(--border-game) var(--color-border);
  box-shadow: var(--shadow-card);
  position: relative;
}

.message-avatar {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  margin-right: 10px;
  align-self: flex-end;
}

.message-avatar img {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  border: var(--border-game) var(--color-magic-gold);
  box-shadow: var(--shadow-gold-glow);
  object-fit: cover;
}

/* AI 消息左上角像素角色头像标记 */
.message.assistant .message-content::before {
  content: '◆';
  position: absolute;
  top: -8px;
  left: 12px;
  font-size: 10px;
  color: var(--color-magic-gold);
  text-shadow: 0 0 6px var(--color-gold-glow);
}

.message-files {
  margin-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.2);
  padding-top: 8px;
}

.message.user .message-files {
  border-top-color: rgba(255,255,255,0.2);
}

.message.assistant .message-files {
  border-top-color: var(--color-border);
}

.message-file-item {
  margin-top: 4px;
}

.msg-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: var(--border-thin) var(--color-border);
}

.msg-doc {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: inherit;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.message.user .msg-doc {
  color: var(--color-silver);
}

.message.assistant .msg-doc {
  color: var(--color-magic-gold);
}

.msg-doc:hover {
  text-decoration: underline;
}

/* 文件预览条 */
.file-preview-bar {
  display: flex;
  gap: 8px;
  padding: 8px 24px;
  background: var(--color-bg-card);
  border-top: var(--border-thin) var(--color-border);
  overflow-x: auto;
  flex-shrink: 0;
}

.file-preview-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--color-bg-input);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  font-size: 13px;
  border: var(--border-thin) var(--color-border);
}

.file-thumb {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.file-icon {
  font-size: 20px;
  color: var(--color-text-muted);
}

.file-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-secondary);
}

.file-remove {
  padding: 2px;
  font-size: 12px;
}

/* 输入区 */
.chat-input {
  padding: 16px 24px;
  border-top: var(--border-thin) var(--color-border);
  background: var(--color-bg-card);
  flex-shrink: 0;
}

.kb-selector-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.kb-selector-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

/* RAG 检索来源 */
.retrieved-sources {
  margin-top: 8px;
  border-top: var(--border-thin) var(--color-border);
  padding-top: 8px;
}

.sources-header {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-magic-gold);
  cursor: pointer;
  user-select: none;
}

.sources-header .rotated {
  transform: rotate(180deg);
}

.sources-list {
  margin-top: 6px;
}

.source-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  font-size: 12px;
  background: var(--color-bg-input);
  border-radius: var(--radius-sm);
  margin-bottom: 3px;
  border: var(--border-thin) var(--color-border);
}

.source-name {
  color: var(--color-text-primary);
  font-weight: 500;
}

.source-score {
  color: var(--color-text-muted);
}

/* 联网搜索参考链接 */
.web-refs {
  margin-top: 10px;
  padding-top: 8px;
  border-top: var(--border-thin) var(--color-border);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.web-refs-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.web-ref-link {
  font-size: 12px;
  color: var(--color-text-secondary);
  text-decoration: none;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.web-ref-link:hover {
  color: var(--color-magic-gold);
  text-decoration: underline;
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.upload-btns {
  display: flex;
  gap: 4px;
  padding-top: 4px;
  flex-shrink: 0;
}

.text-input {
  flex: 1;
}

/* 打字指示器 — 金色星尘 */
.typing-indicator {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 18px !important;
  min-width: 140px;
}

.loading-text {
  font-size: 13px;
  color: var(--color-text-muted);
}

.typing-dots {
  display: flex;
  gap: 6px;
}

.typing-dots .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-magic-gold);
  box-shadow: 0 0 6px var(--color-gold-glow);
  animation: typing-bounce 1.4s ease-in-out infinite both;
}

.typing-dots .dot:nth-child(1) { animation-delay: 0s; }
.typing-dots .dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dots .dot:nth-child(3) { animation-delay: 0.4s; }

.mobile-menu-btn {
  display: none;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 768px) {
  .mobile-menu-btn {
    display: inline-flex;
    color: var(--color-silver);
  }

  .chat-header {
    padding: 0 12px;
    height: 44px;
  }

  .chat-header h2 {
    font-size: 10px;
  }

  .chat-messages {
    padding: 12px;
  }

  .message-content {
    max-width: 90%;
    padding: 8px 12px;
  }

  .chat-input {
    padding: 10px 12px;
  }

  .kb-selector-row {
    flex-wrap: wrap;
  }

  .input-row {
    flex-wrap: wrap;
  }

  .upload-btns {
    padding-top: 0;
  }

  .text-input {
    min-width: 100%;
  }

  .file-preview-bar {
    padding: 6px 12px;
  }

  .msg-image {
    max-width: 140px;
    max-height: 140px;
  }
}
</style>
