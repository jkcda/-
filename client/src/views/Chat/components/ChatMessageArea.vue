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
        <h2>奈克瑟 · 情报同步</h2>
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

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="previewVisible" title="图片预览" :width="previewWidth" destroy-on-close center @closed="previewUrl = ''">
      <div class="preview-body">
        <div class="preview-toolbar">
          <el-button size="small" :icon="ZoomIn" circle @click="previewScale = Math.min(3, previewScale + 0.25)" />
          <el-button size="small" :icon="ZoomOut" circle @click="previewScale = Math.max(0.25, previewScale - 0.25)" />
          <el-button size="small" :icon="RefreshLeft" circle @click="previewScale = 1" />
          <el-button size="small" type="primary" @click="downloadImage(previewUrl)">
            <el-icon style="margin-right:4px"><Download /></el-icon>导出下载
          </el-button>
        </div>
        <div class="preview-image-wrap" @wheel.prevent="onPreviewWheel">
          <img :src="previewUrl" :style="{ transform: `scale(${previewScale})` }" class="preview-image" />
        </div>
      </div>
    </el-dialog>

    <div v-if="!currentSessionId" class="chat-empty-state">
      <img :src="'/images/character-avatar.png'" alt="AI" class="empty-avatar" />
      <p class="empty-title">奈克瑟 NEXUS</p>
      <p class="empty-desc">在左侧创建或选择一个对话，开始同步情报。</p>
    </div>

    <div v-else class="chat-messages" ref="messagesContainer" @click="onMessageClick">
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
              <img v-if="file.type.startsWith('image/')" :src="file.url" class="msg-image" @load="onImgLoad" @click="openPreview(file.url)" />
              <a v-else :href="file.url" target="_blank" class="msg-doc">
                <el-icon><Document /></el-icon>
                {{ file.name }}
              </a>
            </div>
          </div>
        </div>
        <el-button
          v-if="msg.role === 'assistant' && msg.content"
          class="speak-btn"
          size="small"
          text
          @click="speakMessage(msg.content)"
        >
          <el-icon :size="16"><Headset /></el-icon>
        </el-button>
      </div>
      <div v-if="isLoading && typingMessageIndex === -1" class="message assistant">
        <div class="message-content typing-indicator">
          <img
            :src="loadingImage"
            class="loading-image"
            alt="loading"
          />
          <span class="loading-text">{{ loadingText }}</span>
        </div>
      </div>
    </div>

    <template v-if="currentSessionId">
    <!-- 已选文件预览 -->
    <div v-if="selectedFiles.length > 0" class="file-preview-bar">
      <div
        v-for="(file, index) in selectedFiles"
        :key="index"
        class="file-preview-item"
      >
        <img v-if="file.type.startsWith('image/')" :src="file.previewUrl" class="file-thumb" @load="onImgLoad" />
        <el-icon v-else class="file-icon"><Document /></el-icon>
        <span class="file-name">{{ file.name }}</span>
        <el-button class="file-remove" size="small" text type="danger" @click="removeFile(index)">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 录音状态条 -->
    <div v-if="isRecording" class="recording-bar">
      <span class="recording-dot"></span>
      <span class="recording-timer">{{ formatDuration(recordingDuration) }}</span>
      <el-button size="small" text type="danger" @click="handleCancelRecording">取消</el-button>
      <el-button size="small" type="primary" @click="handleStopRecording">完成</el-button>
    </div>

    <div class="chat-input">
      <!-- 移动端附加面板 -->
      <div v-if="isMobile && showMobileExtras" class="mobile-extras-panel">
        <div class="mobile-extras-grid">
          <div class="mobile-extras-section">
            <span class="mobile-extras-label">上传</span>
            <div class="mobile-extras-btns">
              <input ref="imageInputRef" type="file" accept="image/*" multiple hidden @change="onFilesSelected($event, 'image')" />
              <el-button size="small" @click="imageInputRef?.click()"><el-icon><PictureFilled /></el-icon>图片</el-button>
              <input ref="docInputRef" type="file" accept=".txt,.pdf,.doc,.docx,.md" multiple hidden @change="onFilesSelected($event, 'doc')" />
              <el-button size="small" @click="docInputRef?.click()"><el-icon><FolderOpened /></el-icon>文档</el-button>
              <input ref="videoInputRef" type="file" accept="video/*" hidden @change="onFilesSelected($event, 'video')" />
              <el-button size="small" @click="videoInputRef?.click()"><el-icon><VideoCameraFilled /></el-icon>视频</el-button>
              <el-button size="small" :type="isRecording ? 'danger' : undefined" @click="toggleRecording">
                <el-icon><Microphone /></el-icon>语音
              </el-button>
            </div>
          </div>
          <div class="mobile-extras-section">
            <span class="mobile-extras-label">设置</span>
            <div class="mobile-extras-selects">
              <el-select v-if="kbList.length > 0" :model-value="selectedKbId" placeholder="知识库" clearable size="small" @update:model-value="$emit('update:selectedKbId', $event ?? null)">
                <el-option v-for="kb in kbList" :key="kb.id" :label="kb.name" :value="kb.id" />
              </el-select>
              <el-select v-if="modelList.length > 0" :model-value="selectedModel" size="small" @update:model-value="$emit('update:selectedModel', $event ?? '')">
                <el-option v-for="m in modelList" :key="m.id" :label="m.name" :value="m.id" />
              </el-select>
              <el-select v-if="imageRatios.length > 0" :model-value="selectedImageRatio" size="small" @update:model-value="$emit('update:selectedImageRatio', $event ?? '')">
                <el-option v-for="r in imageRatios" :key="r.value" :label="r.label" :value="r.value" />
              </el-select>
            </div>
          </div>
          <div class="mobile-extras-section">
            <span class="mobile-extras-label">开关</span>
            <div class="mobile-extras-toggles">
              <el-switch :model-value="nexusMode" size="small" active-text="奈克瑟" inactive-text="AI" @change="$emit('update:nexusMode', $event as boolean)" />
              <el-switch :model-value="autoSpeakEnabled" size="small" active-text="朗读" @change="onAutoSpeakToggle" />
              <el-select v-if="autoSpeakEnabled && voices.length > 0" :model-value="selectedVoiceId" size="small" style="width: 100px" @update:model-value="onVoiceSelect">
                <el-option v-for="v in voices" :key="v.id" :label="v.name" :value="v.id" />
              </el-select>
            </div>
          </div>
        </div>
      </div>

      <!-- 桌面端布局 -->
      <template v-if="!isMobile">
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
          <el-select
            v-if="modelList.length > 0"
            :model-value="selectedModel"
            size="small"
            style="width: 170px; margin-left: 0"
            @update:model-value="$emit('update:selectedModel', $event ?? '')"
          >
            <el-option
              v-for="m in modelList"
              :key="m.id"
              :label="`${m.name} · ${m.type === 'multimodal' ? '多模态' : m.type === 'vision' ? '视觉' : '文本'}`"
              :value="m.id"
            />
          </el-select>
          <el-select
            v-if="imageRatios.length > 0"
            :model-value="selectedImageRatio"
            size="small"
            style="width: 150px; margin-left: 6px"
            @update:model-value="$emit('update:selectedImageRatio', $event ?? '')"
          >
            <el-option
              v-for="r in imageRatios"
              :key="r.value"
              :label="r.label"
              :value="r.value"
            />
          </el-select>
          <el-switch
            :model-value="nexusMode"
            size="small"
            active-text="奈克瑟"
            inactive-text="AI助手"
            style="margin-left: 8px"
            @change="$emit('update:nexusMode', $event as boolean)"
          />
          <el-switch
            :model-value="autoSpeakEnabled"
            size="small"
            active-text="朗读"
            style="margin-left: 8px"
            @change="onAutoSpeakToggle"
          />
          <el-select
            v-if="autoSpeakEnabled && voices.length > 0"
            :model-value="selectedVoiceId"
            size="small"
            style="width: 130px; margin-left: 6px"
            @update:model-value="onVoiceSelect"
          >
            <el-option
              v-for="v in voices"
              :key="v.id"
              :label="v.name"
              :value="v.id"
            />
          </el-select>
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

            <el-tooltip :content="isRecording ? '录音中...' : '语音输入'">
              <el-button
                size="small"
                circle
                :type="isRecording ? 'danger' : undefined"
                @click="toggleRecording"
              >
                <el-icon><Microphone /></el-icon>
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
      </template>

      <!-- 移动端单行布局 -->
      <div v-else class="mobile-input-row">
        <el-button
          class="extras-toggle"
          :class="{ active: showMobileExtras }"
          size="small"
          circle
          @click="showMobileExtras = !showMobileExtras"
        >
          <el-icon :size="20"><Plus /></el-icon>
        </el-button>
        <el-input
          v-model="inputMessage"
          placeholder="输入消息..."
          @keydown.enter.exact.prevent="handleSend"
          class="mobile-text-input"
        />
        <el-button
          type="primary"
          size="small"
          circle
          class="mobile-send-btn"
          @click="handleSend"
          :loading="isLoading"
          :disabled="!currentSessionId || (!inputMessage.trim() && selectedFiles.length === 0)"
        >
          <el-icon :size="16"><Promotion /></el-icon>
        </el-button>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import { PictureFilled, FolderOpened, Document, Close, ArrowDown, Menu, VideoCameraFilled, Microphone, Headset, ZoomIn, ZoomOut, RefreshLeft, Download, Plus, Promotion } from '@element-plus/icons-vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useVoiceRecording, uploadVoiceForTranscription } from '@/utils/voiceRecording'
import { speak, autoSpeakEnabled, toggleAutoSpeak, voices, selectedVoiceId, selectVoice, loadVoices } from '@/utils/tts'

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
  nexusMode: boolean
  modelList: { id: string; name: string; type: string; desc: string }[]
  selectedModel: string
  imageRatios: { label: string; value: string }[]
  selectedImageRatio: string
  loadingStage: string
}>()

const emit = defineEmits<{
  send: [payload: { content: string; files: File[] }]
  clearHistory: []
  toggleSidebar: []
  'update:selectedKbId': [value: number | null]
  'update:nexusMode': [value: boolean]
  'update:selectedModel': [value: string]
  'update:selectedImageRatio': [value: string]
}>()

const inputMessage = ref('')
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

// 移动端附加面板
const isMobile = useMediaQuery('(max-width: 768px)')
const showMobileExtras = ref(false)

// 图片预览
const previewVisible = ref(false)
const previewUrl = ref('')
const previewScale = ref(1)
const isMobilePreview = useMediaQuery('(max-width: 768px)')
const previewWidth = computed(() => isMobilePreview.value ? '95%' : '70%')

const loadingText = computed(() => {
  const map: Record<string, string> = {
    searching: '正在穿越数据之海...',
    retrieving_kb: '正在检索知识库...',
    recalling: '正在同步记忆回路...',
    generating_image: '正在绘制魔法画像...',
    composing: '正在整理情报...',
  }
  return map[props.loadingStage] || '正在解析情报...'
})

const loadingImage = computed(() => {
  if (props.loadingStage === 'searching') return '/images/searching.png'
  return '/images/thinking.png'
})

function openPreview(url: string) {
  previewUrl.value = url
  previewScale.value = 1
  previewVisible.value = true
}

function onMessageClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.tagName === 'IMG' && target.closest('.message-content')) {
    const src = target.getAttribute('src')
    if (src) openPreview(src)
  }
}

function onPreviewWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  previewScale.value = Math.max(0.25, Math.min(3, previewScale.value + delta))
}

async function downloadImage(url: string) {
  try {
    const resp = await fetch(url)
    const blob = await resp.blob()
    const objUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objUrl
    a.download = `nexus-image-${Date.now()}.${blob.type.split('/')[1] || 'png'}`
    a.click()
    URL.revokeObjectURL(objUrl)
    ElMessage.success('下载成功')
  } catch {
    window.open(url, '_blank')
  }
}

// Voice recording
const { isRecording, duration: recordingDuration, audioBlob,
         startRecording, stopRecording, cancelRecording } = useVoiceRecording()

async function toggleRecording() {
  if (isRecording.value) {
    await handleStopRecording()
  } else {
    await startRecording()
  }
}

async function handleStopRecording() {
  stopRecording()
  // 等待 audioBlob 就绪（MediaRecorder.onstop 是异步的）
  for (let i = 0; i < 50; i++) {
    await new Promise(r => setTimeout(r, 100))
    if (audioBlob.value) break
  }
  if (!audioBlob.value) {
    ElMessage.warning('录音数据未就绪，请重试')
    return
  }

  try {
    const text = await uploadVoiceForTranscription(audioBlob.value)
    if (text) {
      inputMessage.value = inputMessage.value
        ? inputMessage.value + '\n' + text
        : text
      ElMessage.success('语音识别完成')
    } else {
      ElMessage.warning('未识别到语音内容')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '语音识别失败')
  }
}

function handleCancelRecording() {
  cancelRecording()
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// TTS
function speakMessage(content: string) {
  speak(content)
}

function onAutoSpeakToggle() {
  toggleAutoSpeak()
}

function onVoiceSelect(id: string) {
  selectVoice(id)
}

function renderMarkdown(content: string): string {
  if (!content) return ''
  const raw = marked.parse(content) as string
  return DOMPurify.sanitize(raw, { ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','b','strong','i','em','u','s','a','ul','ol','li','pre','code','blockquote','hr','img','table','thead','tbody','tr','th','td','span','div'], ALLOWED_ATTR: ['href','target','src','alt','class','id'] })
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

function onImgLoad(e: Event) {
  ;(e.target as HTMLElement).classList.add('img-loaded')
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

  emit('send', { content, files })
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

// markdown 图片骨架屏：监听消息容器中新增的 img，附加 load 监听
let imgObserver: MutationObserver | null = null

onMounted(() => {
  loadVoices()
  if (messagesContainer.value) {
    imgObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node instanceof HTMLElement) {
            const imgs = node.tagName === 'IMG' ? [node] : Array.from(node.querySelectorAll('img'))
            for (const img of imgs) {
              if ((img as HTMLImageElement).complete) {
                img.classList.add('img-loaded')
              } else {
                img.addEventListener('load', () => img.classList.add('img-loaded'), { once: true })
              }
            }
          }
        }
      }
    })
    imgObserver.observe(messagesContainer.value, { childList: true, subtree: true })
  }
})

onBeforeUnmount(() => {
  imgObserver?.disconnect()
})

defineExpose({ scrollToBottom })
</script>

<style scoped>
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
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
  overflow-x: hidden;
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
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.6;
  user-select: text;
  min-width: 0;
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
  white-space: pre-wrap;
  word-break: break-word;
  border: var(--border-thin) var(--color-border);
}
.message-content :deep(pre code) { background: none; padding: 0; white-space: pre-wrap; word-break: break-word; }
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
  max-width: 180px;
  max-height: 180px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: var(--border-thin) var(--color-border);
  object-fit: cover;
  transition: transform 0.15s, opacity 0.3s ease, border-color 0.15s;
  background: linear-gradient(90deg, var(--color-bg-input) 25%, var(--color-bg-card) 50%, var(--color-bg-input) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
  min-height: 80px;
  min-width: 80px;
}

.msg-image.img-loaded {
  background: transparent;
  animation: none;
  min-height: 0;
  min-width: 0;
}

.msg-image:hover {
  transform: scale(1.05);
  border-color: var(--color-magic-gold);
}

/* Markdown 渲染的图片也限制尺寸 */
.message-content :deep(img) {
  max-width: 240px;
  max-height: 240px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  object-fit: cover;
  transition: opacity 0.3s ease;
  background: linear-gradient(90deg, var(--color-bg-input) 25%, var(--color-bg-card) 50%, var(--color-bg-input) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
  min-height: 120px;
  min-width: 120px;
}

.message-content :deep(img.img-loaded) {
  background: transparent;
  animation: none;
  min-height: 0;
  min-width: 0;
}

.message-content :deep(img):hover {
  transform: scale(1.05);
}

/* 图片预览弹窗 */
.preview-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.preview-toolbar {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.preview-image-wrap {
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 70vh;
}

.preview-image {
  max-width: 100%;
  max-height: 65vh;
  object-fit: contain;
  transition: transform 0.2s;
  border-radius: var(--radius-md);
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
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
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
  background: linear-gradient(90deg, var(--color-bg-input) 25%, var(--color-bg-card) 50%, var(--color-bg-input) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}

.file-thumb.img-loaded {
  background: transparent;
  animation: none;
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
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
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
.loading-image {
  width: 100px;
  height: 100px;
  margin: 0 auto 8px;
  display: block;
  object-fit: contain;
  animation: float-up 2s ease-in-out infinite !important;
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

/* 录音状态条 */
.recording-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 24px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  background: var(--color-bg-card);
  border-top: var(--border-thin) var(--color-danger);
  flex-shrink: 0;
}

.recording-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-danger);
  animation: recording-pulse 1s ease-in-out infinite;
}

@keyframes recording-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.3); }
}

.recording-timer {
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--color-text-primary);
  min-width: 50px;
}

/* 空状态 */
.chat-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--color-text-muted);
  user-select: none;
  padding: 40px;
}

.empty-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: var(--border-game) var(--color-magic-gold);
  box-shadow: var(--shadow-gold-glow);
  object-fit: cover;
  opacity: 0.6;
}

.empty-title {
  font-family: var(--font-pixel);
  font-size: 12px;
  color: var(--color-magic-gold);
  text-shadow: 0 0 10px var(--color-gold-glow);
  margin: 0;
}

.empty-desc {
  font-size: 13px;
  color: var(--color-text-muted);
  margin: 0;
}

/* 朗读播放按钮 — 气泡外右下角 */
.speak-btn {
  color: var(--color-text-muted);
  flex-shrink: 0;
  align-self: flex-end;
  margin-left: 4px;
  margin-bottom: 2px;
  transition: color var(--transition-fast);
}

.speak-btn:hover {
  color: var(--color-magic-gold);
}

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
    overflow-x: hidden;
  }

  .message-content {
    max-width: 85%;
    padding: 8px 12px;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .chat-input {
    padding: 8px 10px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    overflow-x: hidden;
  }

  .kb-selector-row {
    flex-wrap: wrap;
    overflow-x: hidden;
  }

  .input-row {
    flex-wrap: wrap;
  }

  .upload-btns {
    padding-top: 0;
  }

  .text-input {
    min-width: 100%;
    max-width: 100%;
  }

  /* === 移动端附加面板 === */
  .mobile-extras-panel {
    margin-bottom: 8px;
    padding: 10px 12px;
    background: var(--color-bg-deep);
    border-radius: var(--radius-md);
    border: var(--border-thin) var(--color-border);
    animation: slide-up 0.2s ease-out;
  }

  @keyframes slide-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .mobile-extras-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .mobile-extras-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mobile-extras-label {
    font-size: 11px;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .mobile-extras-btns {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .mobile-extras-btns .el-button {
    font-size: 12px;
  }

  .mobile-extras-selects {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .mobile-extras-selects .el-select {
    width: 130px !important;
  }

  .mobile-extras-toggles {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  /* === 移动端单行输入栏 === */
  .mobile-input-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .extras-toggle {
    flex-shrink: 0;
    transition: transform 0.2s, background var(--transition-fast);
    width: 36px;
    height: 36px;
  }

  .extras-toggle.active {
    transform: rotate(45deg);
    background: var(--color-bg-input);
    border-color: var(--color-magic-gold);
  }

  .mobile-text-input {
    flex: 1;
    min-width: 0;
  }

  .mobile-text-input :deep(.el-input__wrapper) {
    border-radius: 18px;
    padding: 0 14px;
    background: var(--color-bg-input);
  }

  .mobile-text-input :deep(.el-input__inner) {
    height: 36px;
    line-height: 36px;
    font-size: 14px;
  }

  .mobile-send-btn {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
  }

  .file-preview-bar {
    padding: 6px 12px;
    overflow-x: auto;
  }

  .msg-image {
    max-width: 140px;
    max-height: 140px;
    min-height: 60px;
    min-width: 60px;
  }

  .msg-image.img-loaded {
    min-height: 0;
    min-width: 0;
  }

  .message-content :deep(pre) {
    max-width: calc(100vw - 56px);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .message-content :deep(img) {
    max-width: 200px;
    max-height: 200px;
  }

  .loading-image {
    width: 80px;
    height: 80px;
  }
}
</style>
