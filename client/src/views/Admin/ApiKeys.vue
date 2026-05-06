<template>
  <div class="api-keys-page">
    <div class="page-header">
      <h3>API Key 管理</h3>
      <p class="page-desc">管理系统调用的外部服务密钥，保存后立即生效。</p>
    </div>

    <div v-loading="loading" class="keys-list">
      <el-card v-for="item in settings" :key="item.key_name" class="key-card" shadow="hover">
        <div class="key-row">
          <div class="key-info">
            <div class="key-name">{{ item.key_name }}</div>
            <div class="key-desc">{{ item.description }}</div>
          </div>
          <div class="key-value">
            <code>{{ item.masked }}</code>
          </div>
          <div class="key-action">
            <el-button type="primary" plain size="small" @click="openEdit(item)">
              编辑
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <el-dialog v-model="dialogVisible" :title="`编辑 ${editingKey}`" width="520px" @closed="editValue = ''">
      <el-form label-position="top">
        <el-form-item label="新值">
          <el-input
            v-model="editValue"
            type="password"
            show-password
            placeholder="请输入新的密钥值"
            clearable
          />
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
import { ElMessage } from 'element-plus'
import { getSettings, updateSetting } from '@/apis/admin'

interface SettingItem {
  key_name: string
  description: string
  masked: string
}

const loading = ref(false)
const saving = ref(false)
const settings = ref<SettingItem[]>([])
const dialogVisible = ref(false)
const editingKey = ref('')
const editValue = ref('')

async function fetchSettings() {
  loading.value = true
  try {
    const res = await getSettings()
    settings.value = (res as any).data?.result?.settings || []
  } catch {
    ElMessage.error('获取配置列表失败')
  } finally {
    loading.value = false
  }
}

function openEdit(item: SettingItem) {
  editingKey.value = item.key_name
  editValue.value = ''
  dialogVisible.value = true
}

async function handleSave() {
  if (!editValue.value.trim()) {
    ElMessage.warning('请输入密钥值')
    return
  }
  saving.value = true
  try {
    await updateSetting(editingKey.value, editValue.value)
    ElMessage.success(`配置 ${editingKey.value} 已更新`)
    dialogVisible.value = false
    await fetchSettings()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchSettings()
})
</script>

<style scoped>
.api-keys-page {
  max-width: 800px;
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
}

.keys-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.key-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.key-row {
  display: flex;
  align-items: center;
  gap: 20px;
}

.key-info {
  flex: 1;
  min-width: 0;
}

.key-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  font-family: 'Courier New', monospace;
  margin-bottom: 2px;
}

.key-desc {
  font-size: 12px;
  color: var(--color-text-muted);
}

.key-value {
  flex-shrink: 0;
}

.key-value code {
  font-size: 13px;
  color: var(--color-magic-gold);
  background: var(--color-bg-deep);
  padding: 4px 10px;
  border-radius: 4px;
}

.key-action {
  flex-shrink: 0;
}
</style>
