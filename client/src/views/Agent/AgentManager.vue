<template>
  <div class="agent-manager">
    <div class="agent-sidebar">
      <div class="sidebar-header">
        <h3>我的角色</h3>
        <el-button type="primary" size="small" @click="createNew">+ 创建角色</el-button>
      </div>
      <div class="agent-list" v-if="agents.length > 0">
        <div
          v-for="agent in agents"
          :key="agent.id"
          :class="['agent-item', { active: selectedId === agent.id }]"
          @click="selectAgent(agent.id)"
        >
          <img v-if="agent.avatar" :src="agent.avatar" class="agent-avatar-small" />
          <div v-else class="agent-avatar-placeholder">{{ agent.name.slice(0, 1) }}</div>
          <span class="agent-name">{{ agent.name }}</span>
        </div>
      </div>
      <div v-else class="agent-empty">尚未创建角色</div>
    </div>

    <div class="agent-editor" v-if="selectedId || isCreating">
      <h3>{{ isCreating ? '创建新角色' : '编辑角色' }}</h3>

      <el-form label-width="80px" class="agent-form">
        <el-form-item label="角色名">
          <el-input v-model="form.name" placeholder="给你的角色起个名字" maxlength="50" />
        </el-form-item>

        <el-form-item label="头像">
          <div class="avatar-upload">
            <img v-if="form.avatar" :src="form.avatar" class="avatar-preview" />
            <div v-else class="avatar-preview placeholder">?</div>
            <el-button size="small" @click="avatarInputRef?.click()" :loading="uploading">
              {{ form.avatar ? '更换头像' : '上传头像' }}
            </el-button>
            <el-button v-if="form.avatar" size="small" type="danger" @click="form.avatar = null">
              移除
            </el-button>
            <input ref="avatarInputRef" type="file" accept="image/*" hidden @change="onAvatarSelected" />
          </div>
        </el-form-item>

        <el-form-item label="人设背景">
          <el-input
            v-model="form.systemPrompt"
            type="textarea"
            :rows="10"
            placeholder="写下角色的人设、背景故事、性格特点、说话风格等。这部分内容会写进System Prompt，AI角色会严格按照这些设定来回复。"
          />
          <div class="form-hint">这部分内容会写进 System Prompt，角色会按照这些设定来回复。</div>
        </el-form-item>

        <el-form-item label="初始场景">
          <el-input
            v-model="form.greeting"
            type="textarea"
            :rows="4"
            placeholder="角色出场时的第一句话/场景描述。例如：&#10;&#34;酒吧里灯光昏暗，你看到角落里坐着一个人...&#34;&#10;这部分不会写进System Prompt，只在新建对话的第一条消息中展示。"
          />
          <div class="form-hint">仅在新建对话的第一条消息中展示，不在 System Prompt 中。</div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="saveAgent" :loading="saving">
            {{ isCreating ? '创建' : '保存' }}
          </el-button>
          <el-button v-if="!isCreating" type="danger" @click="deleteAgent" :loading="deleting">
            删除
          </el-button>
          <el-button @click="cancelEdit">取消</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div v-else class="agent-editor empty-hint">
      <p>从左侧选择一个角色，或创建一个新角色。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/http'

interface AgentItem {
  id: number
  name: string
  avatar: string | null
  systemPrompt: string
  greeting: string | null
  createdAt: string
  updatedAt: string
}

const agents = ref<AgentItem[]>([])
const selectedId = ref<number | null>(null)
const isCreating = ref(false)
const saving = ref(false)
const deleting = ref(false)
const uploading = ref(false)
const avatarInputRef = ref<HTMLInputElement>()

const form = ref({
  name: '',
  avatar: null as string | null,
  systemPrompt: '',
  greeting: ''
})

async function loadAgents() {
  try {
    const res = await request.get('/agents')
    if (res.data.success) {
      agents.value = res.data.result.agents
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '加载角色列表失败')
  }
}

function selectAgent(id: number) {
  isCreating.value = false
  selectedId.value = id
  const agent = agents.value.find(a => a.id === id)
  if (agent) {
    form.value = {
      name: agent.name,
      avatar: agent.avatar,
      systemPrompt: agent.systemPrompt,
      greeting: agent.greeting || ''
    }
  }
}

function createNew() {
  selectedId.value = null
  isCreating.value = true
  form.value = { name: '', avatar: null, systemPrompt: '', greeting: '' }
}

function cancelEdit() {
  selectedId.value = null
  isCreating.value = false
}

async function onAvatarSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const baseURL = (import.meta.env as any).VITE_BASE_URL || ''
    const resp = await fetch(`${baseURL}/api/upload/avatar`, { method: 'POST', body: formData })
    const data = await resp.json()
    if (data.success) {
      form.value.avatar = data.result.url
      ElMessage.success('头像上传成功')
    } else {
      ElMessage.error(data.message || '上传失败')
    }
  } catch {
    ElMessage.error('头像上传失败')
  } finally {
    uploading.value = false
  }
}

async function saveAgent() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入角色名')
    return
  }
  if (!form.value.systemPrompt.trim()) {
    ElMessage.warning('请输入人设背景')
    return
  }

  saving.value = true
  try {
    const body = {
      name: form.value.name.trim(),
      systemPrompt: form.value.systemPrompt.trim(),
      greeting: form.value.greeting.trim() || undefined,
      avatar: form.value.avatar
    }

    if (isCreating.value) {
      const res = await request.post('/agents', body)
      if (res.data.success) {
        ElMessage.success('角色创建成功')
        await loadAgents()
        const newId = res.data.result.id
        selectedId.value = newId
        isCreating.value = false
      }
    } else if (selectedId.value) {
      await request.put(`/agents/${selectedId.value}`, body)
      ElMessage.success('角色更新成功')
      await loadAgents()
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function deleteAgent() {
  if (!selectedId.value) return
  try {
    await ElMessageBox.confirm('确定要删除这个角色吗？', '删除确认', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  deleting.value = true
  try {
    await request.delete(`/agents/${selectedId.value}`)
    ElMessage.success('角色已删除')
    selectedId.value = null
    await loadAgents()
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  loadAgents()
})
</script>

<style scoped>
.agent-manager {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.agent-sidebar {
  width: 240px;
  background: var(--color-bg-card);
  border-right: var(--border-thin) var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: var(--border-thin) var(--color-border);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 14px;
  color: var(--color-magic-gold);
}

.agent-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.agent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: 4px;
}

.agent-item:hover {
  background: var(--color-bg-input);
}

.agent-item.active {
  background: var(--color-primary);
  color: var(--color-silver);
}

.agent-avatar-small {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-border);
}

.agent-avatar-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--color-text-muted);
  border: 2px solid var(--color-border);
}

.agent-name {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-empty {
  padding: 24px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13px;
}

.agent-editor {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
  background: var(--color-bg-deep);
}

.agent-editor h3 {
  margin: 0 0 20px 0;
  color: var(--color-magic-gold);
  font-size: 16px;
}

.agent-form {
  max-width: 640px;
}

.avatar-upload {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-preview {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-magic-gold);
}

.avatar-preview.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-input);
  color: var(--color-text-muted);
  font-size: 24px;
  font-weight: 700;
}

.form-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .agent-manager {
    flex-direction: column;
  }

  .agent-sidebar {
    width: 100%;
    max-height: 160px;
    border-right: none;
    border-bottom: var(--border-thin) var(--color-border);
  }

  .agent-editor {
    padding: 16px;
  }
}
</style>
