<template>
  <el-dialog v-model="visible" title="添加AI角色" width="420px">
    <div v-if="availableAgents.length > 0" class="agent-list">
      <div
        v-for="agent in availableAgents" :key="agent.id"
        class="agent-item"
        @click="addAgent(agent.id)"
      >
        <el-avatar :size="36" :src="agent.avatar">{{ agent.name[0] }}</el-avatar>
        <span class="agent-name">{{ agent.name }}</span>
        <el-button size="small" type="primary" circle :icon="Plus" :loading="loadingId === agent.id" />
      </div>
    </div>
    <el-empty v-else description="没有可添加的角色了" />

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

interface AgentItem {
  id: number
  name: string
  avatar: string | null
}

const props = defineProps<{
  modelValue: boolean
  agents: AgentItem[]
  existingAgentIds: number[]
  roomId: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'added'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const loadingId = ref<number | null>(null)

const availableAgents = computed(() =>
  props.agents.filter(a => !props.existingAgentIds.includes(a.id))
)

const addAgent = async (agentId: number) => {
  loadingId.value = agentId
  try {
    const { addAgentToRoom } = await import('@/apis/room')
    await addAgentToRoom(props.roomId, agentId)
    ElMessage.success('角色已添加')
    emit('added')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '添加失败')
  } finally {
    loadingId.value = null
  }
}
</script>

<style scoped>
.agent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.agent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  background: var(--color-bg-secondary);
  transition: background var(--transition-normal);
}
.agent-item:hover {
  background: var(--color-bg-hover);
}
.agent-name {
  flex: 1;
  font-weight: 500;
}
</style>
