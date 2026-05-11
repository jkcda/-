import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface AgentItem {
  id: number
  name: string
  avatar: string | null
  systemPrompt: string
  greeting: string | null
  createdAt: string
  updatedAt: string
}

export const useAgentStore = defineStore('agent', () => {
  const agents = ref<AgentItem[]>([])
  const loading = ref(false)

  const agentMap = computed(() => new Map(agents.value.map(a => [a.id, a])))
  const agentOptions = computed(() =>
    agents.value.map(a => ({ id: a.id, name: a.name, avatar: a.avatar }))
  )

  function getAgent(id: number): AgentItem | undefined {
    return agents.value.find(a => a.id === id)
  }

  function getAgentName(id: number): string {
    return agents.value.find(a => a.id === id)?.name || `角色${id}`
  }

  async function load(force = false) {
    if (!force && agents.value.length > 0) return
    loading.value = true
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/agents', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        agents.value = data.result?.agents || data.agents || []
      }
    } catch {} finally {
      loading.value = false
    }
  }

  function clear() {
    agents.value = []
    loading.value = false
  }

  return { agents, loading, agentMap, agentOptions, getAgent, getAgentName, load, clear }
})
