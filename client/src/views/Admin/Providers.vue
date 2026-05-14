<template>
  <div class="providers-page">
    <div class="page-header">
      <h3>供应商管理</h3>
      <p class="page-desc">管理 AI 供应商配置。可自定义 baseURL、填写请求模板来适配任意 OpenAI 兼容 API。</p>
    </div>

    <div v-loading="loading" class="provider-list">
      <el-card v-for="p in providers" :key="p.id" class="provider-card" shadow="hover">
        <div class="provider-header">
          <div class="provider-id-row">
            <span class="provider-id">{{ p.name }}</span>
            <span class="provider-tag">{{ p.id }}</span>
          </div>
          <div class="provider-caps">
            <el-tag v-for="cap in p.capabilities" :key="cap" size="small" type="warning" effect="plain" class="cap-tag">
              {{ cap }}
            </el-tag>
          </div>
        </div>

        <div class="provider-body">
          <div class="info-row">
            <span class="label">API Key</span>
            <code class="value" :class="{ 'not-configured': p.maskedKey === '（未配置）' }">{{ p.maskedKey }}</code>
          </div>
          <div class="info-row">
            <span class="label">状态</span>
            <el-tag :type="p.enabled ? 'success' : 'danger'" size="small" effect="plain">
              {{ p.enabled ? '已配置' : '未配置' }}
            </el-tag>
          </div>
        </div>

        <div class="provider-actions">
          <el-button type="primary" plain size="small" @click="openEdit(p)">
            编辑配置
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="`编辑供应商: ${editing?.name}`"
      width="700px"
      top="5vh"
      @closed="closeEdit"
    >
      <el-form label-position="top" v-if="editing">
        <el-form-item label="供应商 ID">
          <el-input :model-value="editing.id" disabled />
        </el-form-item>

        <el-form-item label="API Key">
          <el-input
            v-model="editing.maskedKey"
            disabled
          >
            <template #append>
              <el-button @click="goToApiKeys">去配置</el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="API Base URL">
          <el-input v-model="editBaseURL" placeholder="例如: https://api.openai.com" clearable />
          <div class="form-tip">留空则使用默认地址。可填任意 OpenAI 兼容 API 的地址。</div>
        </el-form-item>

        <el-form-item label="请求模板（可选）">
          <el-input
            v-model="editTemplate"
            type="textarea"
            :rows="10"
            placeholder='{
  "model": "gpt-4o",
  "max_tokens": 4096,
  "temperature": 0.7,
  "top_p": 0.9
}'
            clearable
          />
          <div class="form-tip">
            粘贴 OpenAI 格式的完整请求 JSON。系统会自动注入 <code>messages</code> 和 <code>stream</code> 字段。
            可自定义 <code>model</code>、<code>max_tokens</code>、<code>temperature</code> 等参数。
          </div>
        </el-form-item>

        <el-form-item label="能力列表">
          <el-tag v-for="cap in editing.capabilities" :key="cap" size="small" type="warning" effect="plain" class="cap-tag">
            {{ cap }}
          </el-tag>
          <div class="form-tip">能力在系统代码中定义，不可在此处修改。</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getProviders, updateProvider } from '@/apis/admin'

interface ProviderInfo {
  id: string
  name: string
  apiKeySetting: string
  baseURL: string
  capabilities: string[]
  maskedKey: string
  enabled: boolean
  requestTemplate: string
}

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const providers = ref<ProviderInfo[]>([])
const dialogVisible = ref(false)
const editing = ref<ProviderInfo | null>(null)
const editBaseURL = ref('')
const editTemplate = ref('')

async function fetchProviders() {
  loading.value = true
  try {
    const res = await getProviders()
    providers.value = (res as any).data?.result?.providers || []
  } catch {
    ElMessage.error('获取供应商列表失败')
  } finally {
    loading.value = false
  }
}

function openEdit(p: ProviderInfo) {
  editing.value = p
  editBaseURL.value = p.baseURL
  editTemplate.value = p.requestTemplate
  dialogVisible.value = true
}

function closeEdit() {
  editing.value = null
  editBaseURL.value = ''
  editTemplate.value = ''
}

function goToApiKeys() {
  dialogVisible.value = false
  router.push('/admin/api-keys')
}

async function handleSave() {
  if (!editing.value) return
  saving.value = true
  try {
    await updateProvider(editing.value.id, {
      baseURL: editBaseURL.value,
      requestTemplate: editTemplate.value,
    })
    ElMessage.success(`供应商 ${editing.value.name} 配置已更新`)
    dialogVisible.value = false
    await fetchProviders()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchProviders()
})
</script>

<style scoped>
.providers-page {
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

.provider-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.provider-card :deep(.el-card__body) {
  padding: 20px 24px;
}

.provider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
}

.provider-id-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.provider-id {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.provider-tag {
  font-size: 11px;
  color: var(--color-text-muted);
  background: var(--color-bg-deep);
  padding: 2px 8px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

.provider-caps {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.cap-tag {
  margin-right: 0;
}

.provider-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
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
