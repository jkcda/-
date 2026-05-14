<template>
  <div class="capabilities-page">
    <div class="page-header">
      <h3>能力配置</h3>
      <p class="page-desc">配置大语言模型和图片生成能力。每个能力独立选择供应商、API Key、接口格式和模型。</p>
    </div>

    <div v-loading="loading" class="cap-list">
      <!-- ====== 大语言模型 ====== -->
      <el-card class="cap-card" shadow="hover">
        <template #header>
          <div class="cap-header">
            <div class="cap-title">
              <span class="cap-icon">💬</span>
              <span>大语言模型</span>
              <el-tag size="small" type="warning" effect="plain" class="format-tag">{{ llm.format === 'openai' ? 'OpenAI 格式' : 'Anthropic 格式' }}</el-tag>
              <el-tag v-if="llm.name" size="small" effect="plain">{{ llm.name }}</el-tag>
            </div>
            <el-button type="primary" plain size="small" @click="openLLMEdit">编辑配置</el-button>
          </div>
        </template>
        <div class="cap-body">
          <div class="info-row">
            <span class="label">模型</span>
            <code class="value">{{ llm.model || '未配置' }}</code>
          </div>
          <div class="info-row">
            <span class="label">API Key</span>
            <code class="value" :class="{ 'not-configured': !llm.apiKey }">{{ llm.apiKey ? maskKey(llm.apiKey) : '未配置' }}</code>
          </div>
          <div class="info-row">
            <span class="label">Base URL</span>
            <code class="value">{{ llm.baseURL || '未配置' }}</code>
          </div>
          <div class="info-row">
            <span class="label">请求模板</span>
            <code class="value" :class="{ 'not-configured': !llm.requestTemplate }">{{ llm.requestTemplate ? '已配置' : '未配置（使用默认参数）' }}</code>
          </div>
        </div>
      </el-card>

      <!-- ====== 图片生成 ====== -->
      <el-card class="cap-card" shadow="hover">
        <template #header>
          <div class="cap-header">
            <div class="cap-title">
              <span class="cap-icon">🎨</span>
              <span>图片生成</span>
              <el-tag v-if="img.name" size="small" effect="plain">{{ img.name }}</el-tag>
            </div>
            <el-button type="primary" plain size="small" @click="openImageEdit">编辑配置</el-button>
          </div>
        </template>
        <div class="cap-body">
          <div class="info-row">
            <span class="label">模型</span>
            <code class="value">{{ img.model || '未配置' }}</code>
          </div>
          <div class="info-row">
            <span class="label">API Key</span>
            <code class="value" :class="{ 'not-configured': !img.apiKey }">{{ img.apiKey ? maskKey(img.apiKey) : '未配置' }}</code>
          </div>
          <div class="info-row">
            <span class="label">Base URL</span>
            <code class="value">{{ img.baseURL || '未配置' }}</code>
          </div>
          <div class="info-row">
            <span class="label">默认尺寸</span>
            <code class="value">{{ img.defaultSize || '未配置' }}</code>
          </div>
          <div class="info-row">
            <span class="label">请求模板</span>
            <code class="value" :class="{ 'not-configured': !img.requestTemplate }">{{ img.requestTemplate ? '已配置' : '未配置（使用默认参数）' }}</code>
          </div>
        </div>
      </el-card>
    </div>

    <!-- ====== LLM 编辑对话框 ====== -->
    <el-dialog v-model="llmDialogVisible" title="大语言模型配置" width="680px" top="5vh" @closed="closeLLMEdit">
      <el-form label-position="top">
        <el-form-item label="供应商名称">
          <el-input v-model="llmForm.name" placeholder="例如: 我的 OpenAI 代理、DeepSeek 官方" clearable />
          <div class="form-tip">仅用于在管理后台识别，不涉及实际请求。</div>
        </el-form-item>

        <el-form-item label="API Key">
          <el-input v-model="llmForm.apiKey" type="password" show-password placeholder="sk-..." clearable />
        </el-form-item>

        <el-form-item label="接口格式">
          <el-radio-group v-model="llmForm.format">
            <el-radio value="openai">OpenAI 兼容格式（/v1/chat/completions）</el-radio>
            <el-radio value="anthropic">Anthropic 格式（/v1/messages）</el-radio>
          </el-radio-group>
          <div class="form-tip">大多数供应商同时支持两种格式。多模态（图片/视频）建议用 Anthropic 格式。</div>
        </el-form-item>

        <el-form-item label="API Base URL">
          <el-input v-model="llmForm.baseURL" placeholder="例如: https://api.openai.com" clearable />
          <div class="form-tip">必须与接口格式匹配。OpenAI 格式例：https://api.openai.com；Anthropic 格式例：https://api.anthropic.com。</div>
        </el-form-item>

        <el-form-item label="模型">
          <el-input v-model="llmForm.model" placeholder="例如: gpt-4o、Qwen/Qwen3.5-397B-A17B" clearable />
          <div class="form-tip">填供应商支持的模型 ID。</div>
        </el-form-item>

        <el-form-item label="请求模板（可选）">
          <el-input v-model="llmForm.requestTemplate" type="textarea" :rows="8"
            placeholder='{
  "max_tokens": 4096,
  "temperature": 0.7,
  "top_p": 0.9
}' clearable />
          <div class="form-tip">粘贴 OpenAI 格式的请求 JSON。系统会自动注入 <code>messages</code> 和 <code>stream</code> 字段。留空则使用默认参数。</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="llmDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingLLM" @click="saveLLM">保存</el-button>
      </template>
    </el-dialog>

    <!-- ====== 图片生成编辑对话框 ====== -->
    <el-dialog v-model="imgDialogVisible" title="图片生成配置" width="680px" top="5vh" @closed="closeImageEdit">
      <el-form label-position="top">
        <el-form-item label="供应商名称">
          <el-input v-model="imgForm.name" placeholder="例如: 火山引擎、OpenAI DALL-E" clearable />
        </el-form-item>

        <el-form-item label="API Key">
          <el-input v-model="imgForm.apiKey" type="password" show-password placeholder="sk-..." clearable />
        </el-form-item>

        <el-form-item label="API Base URL">
          <el-input v-model="imgForm.baseURL" placeholder="例如: https://ark.cn-beijing.volces.com" clearable />
        </el-form-item>

        <el-form-item label="模型">
          <el-input v-model="imgForm.model" placeholder="例如: doubao-seedream-4-5-251128" clearable />
        </el-form-item>

        <el-form-item label="默认图片尺寸">
          <el-select v-model="imgForm.defaultSize" placeholder="选择默认尺寸" clearable>
            <el-option v-for="ratio in imageRatios" :key="ratio.value" :label="ratio.label" :value="ratio.value" />
          </el-select>
        </el-form-item>

        <el-form-item label="请求模板（可选）">
          <el-input v-model="imgForm.requestTemplate" type="textarea" :rows="6"
            placeholder='{
  "model": "doubao-seedream-4-5-251128",
  "size": "2560x1440",
  "watermark": true
}' clearable />
          <div class="form-tip">粘贴请求 JSON。系统会自动注入 <code>prompt</code> 和 <code>stream: false</code>。</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="imgDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingImg" @click="saveImage">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getCapabilities, updateLLMConfig, updateImageConfig } from '@/apis/admin'
import request from '@/utils/http'

const loading = ref(false)

interface LLMData {
  name: string
  apiKey: string
  format: string
  baseURL: string
  model: string
  requestTemplate: string
}

interface ImageData {
  name: string
  apiKey: string
  baseURL: string
  model: string
  requestTemplate: string
  defaultSize: string
}

const emptyLLM = (): LLMData => ({ name: '', apiKey: '', format: 'openai', baseURL: '', model: '', requestTemplate: '' })
const emptyImage = (): ImageData => ({ name: '', apiKey: '', baseURL: '', model: '', requestTemplate: '', defaultSize: '' })

const llm = ref<LLMData>(emptyLLM())
const img = ref<ImageData>(emptyImage())
const imageRatios = ref<{ label: string; value: string }[]>([])

// LLM dialog
const llmDialogVisible = ref(false)
const llmForm = ref<LLMData>(emptyLLM())
const savingLLM = ref(false)

// Image dialog
const imgDialogVisible = ref(false)
const imgForm = ref<ImageData>(emptyImage())
const savingImg = ref(false)

function maskKey(key: string): string {
  if (key.length <= 8) return '****'
  return key.slice(0, 4) + '***' + key.slice(-4)
}

async function fetchCapabilities() {
  loading.value = true
  try {
    const res: any = await getCapabilities()
    const caps = res?.data?.result?.capabilities || {}
    llm.value = { ...emptyLLM(), ...caps.llm }
    img.value = { ...emptyImage(), ...caps.img }
  } catch {
    ElMessage.error('获取能力配置失败')
  } finally {
    loading.value = false
  }
}

async function fetchImageRatios() {
  try {
    const res: any = await request.get('/ai/models')
    imageRatios.value = res?.data?.data?.imageRatios || []
  } catch {}
}

// ── LLM ──
function openLLMEdit() {
  llmForm.value = { ...llm.value }
  llmDialogVisible.value = true
}

function closeLLMEdit() {
  llmForm.value = emptyLLM()
}

async function saveLLM() {
  savingLLM.value = true
  try {
    await updateLLMConfig(llmForm.value)
    ElMessage.success('LLM 配置已更新')
    llmDialogVisible.value = false
    await fetchCapabilities()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    savingLLM.value = false
  }
}

// ── Image ──
function openImageEdit() {
  imgForm.value = { ...img.value }
  imgDialogVisible.value = true
}

function closeImageEdit() {
  imgForm.value = emptyImage()
}

async function saveImage() {
  savingImg.value = true
  try {
    await updateImageConfig(imgForm.value)
    ElMessage.success('图片生成配置已更新')
    imgDialogVisible.value = false
    await fetchCapabilities()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    savingImg.value = false
  }
}

onMounted(() => {
  fetchCapabilities()
  fetchImageRatios()
})
</script>

<style scoped>
.capabilities-page {
  max-width: 860px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h3 {
  margin: 0 0 6px;
  font-size: 20px;
  color: var(--color-text);
}

.page-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.cap-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cap-card :deep(.el-card__header) {
  padding: 14px 20px;
}

.cap-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.cap-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.cap-icon {
  font-size: 20px;
}

.format-tag {
  font-family: 'Courier New', monospace;
}

.cap-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.info-row .label {
  color: var(--color-text-secondary);
  min-width: 80px;
  flex-shrink: 0;
}

.info-row .value {
  font-family: 'Courier New', monospace;
  color: var(--color-magic-gold);
  background: var(--color-bg-deep);
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 12px;
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-row .value.not-configured {
  color: var(--color-text-muted);
}

.form-tip {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
  line-height: 1.5;
}

.form-tip code {
  background: var(--color-bg-deep);
  padding: 1px 5px;
  border-radius: 2px;
  font-size: 12px;
}
</style>
