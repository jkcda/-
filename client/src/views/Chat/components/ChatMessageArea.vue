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
  user-select: text;
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

.message-files {
  margin-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.3);
  padding-top: 8px;
}

.message.user .message-files {
  border-top-color: rgba(255,255,255,0.3);
}

.message.assistant .message-files {
  border-top-color: #e0e0e0;
}

.message-file-item {
  margin-top: 4px;
}

.msg-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 6px;
  cursor: pointer;
}

.msg-doc {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: inherit;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 4px;
}

.message.user .msg-doc {
  color: rgba(255,255,255,0.9);
}

.message.assistant .msg-doc {
  color: #409EFF;
}

.msg-doc:hover {
  text-decoration: underline;
}

/* 文件预览条 */
.file-preview-bar {
  display: flex;
  gap: 8px;
  padding: 8px 24px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  overflow-x: auto;
  flex-shrink: 0;
}

.file-preview-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #f5f7fa;
  border-radius: 6px;
  flex-shrink: 0;
  font-size: 13px;
}

.file-thumb {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
}

.file-icon {
  font-size: 20px;
  color: #909399;
}

.file-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #606266;
}

.file-remove {
  padding: 2px;
  font-size: 12px;
}

.chat-input {
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
  background: #fff;
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
  color: #606266;
  white-space: nowrap;
}

.retrieved-sources {
  margin-top: 8px;
  border-top: 1px solid #e1f3d8;
  padding-top: 8px;
}

.sources-header {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #67c23a;
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
  background: #f0f9eb;
  border-radius: 4px;
  margin-bottom: 3px;
}

.source-name {
  color: #606266;
  font-weight: 500;
}

.source-score {
  color: #909399;
}

/* 联网搜索参考链接 */
.web-refs {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.web-refs-label {
  font-size: 12px;
  color: #9ca3af;
}

.web-ref-link {
  font-size: 12px;
  color: #6b7280;
  text-decoration: none;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.web-ref-link:hover {
  color: #3b82f6;
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
  color: #909399;
}

.typing-dots {
  display: flex;
  gap: 6px;
}

.typing-dots .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #409EFF;
  animation: typingBounce 1.4s ease-in-out infinite both;
}

.typing-dots .dot:nth-child(1) { animation-delay: 0s; }
.typing-dots .dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dots .dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typingBounce {
  0%, 80%, 100% { transform: scale(0.5); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

/* 移动端菜单按钮 */
.mobile-menu-btn {
  display: none;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .mobile-menu-btn {
    display: inline-flex;
    color: #fff;
  }

  .chat-header {
    padding: 0 12px;
    height: 44px;
  }

  .chat-header h2 {
    font-size: 15px;
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
