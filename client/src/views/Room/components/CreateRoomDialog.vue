<template>
  <el-dialog v-model="visible" title="创建聊天室" width="520px" :close-on-click-modal="false">
    <el-form :model="form" label-position="top">
      <el-form-item label="房间名称" required>
        <el-input v-model="form.name" maxlength="50" placeholder="给聊天室起个名字" />
      </el-form-item>
      <el-form-item label="话题 / 描述">
        <el-input v-model="form.topic" type="textarea" :rows="2" maxlength="200" placeholder="可选的房间话题或描述" />
      </el-form-item>
      <el-form-item label="选择AI角色" required>
        <el-checkbox-group v-model="form.agentIds" class="agent-checkbox-grid">
          <el-checkbox v-for="agent in agents" :key="agent.id" :value="agent.id" :label="agent.id" border>
            <div class="agent-option">
              <el-avatar :size="32" :src="agent.avatar">{{ (agent.name || '?')[0] }}</el-avatar>
              <span>{{ agent.name }}</span>
            </div>
          </el-checkbox>
        </el-checkbox-group>
        <div v-if="agents.length === 0" class="no-agents-hint">
          还没有AI角色，请先到 <router-link to="/agents">角色管理</router-link> 创建
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="submit" :disabled="!canSubmit" :loading="submitting">
        创建
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

interface AgentItem {
  id: number
  name: string
  avatar: string | null
  systemPrompt: string
  greeting: string | null
}

const props = defineProps<{
  modelValue: boolean
  agents: AgentItem[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'created', roomId: number): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const form = ref({ name: '', topic: '', agentIds: [] as number[] })
const submitting = ref(false)

const canSubmit = computed(() => form.value.name.trim() && form.value.agentIds.length > 0)

watch(visible, (v) => {
  if (v) {
    form.value = { name: '', topic: '', agentIds: [] }
  }
})

const submit = async () => {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const { createRoom } = await import('@/apis/room')
    const res = await createRoom({
      name: form.value.name.trim(),
      topic: form.value.topic.trim() || undefined,
      agentIds: form.value.agentIds,
    })
    ElMessage.success('聊天室创建成功')
    visible.value = false
    const roomId = (res.data as any).result?.room?.id || (res.data as any).room?.id
    emit('created', roomId)
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '创建失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.agent-checkbox-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.agent-option {
  display: flex;
  align-items: center;
  gap: 6px;
}
.no-agents-hint {
  color: var(--color-text-tertiary);
  font-size: 13px;
}
</style>
