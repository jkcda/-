<template>
  <div class="room-page">
    <div class="room-header-bar">
      <h2>聊天室</h2>
      <el-button type="primary" @click="showCreateDialog = true" :icon="Plus">创建聊天室</el-button>
    </div>

    <el-tabs v-model="activeTab" class="room-tabs">
      <el-tab-pane label="我的房间" name="mine">
        <div v-if="roomStore.myRooms.length === 0" class="empty-hint">
          <el-empty description="还没有加入任何房间" :image-size="80" />
        </div>
        <div v-else class="room-grid">
          <div v-for="room in roomStore.myRooms" :key="room.id" class="room-card" @click="enterRoom(room.id)">
            <div class="room-card-header">
              <h3>{{ room.name }}</h3>
              <div class="room-tags">
                <el-tag size="small" round>{{ room.member_count || 1 }} 人</el-tag>
                <el-tag v-if="room.agent_count" size="small" type="success" round>{{ room.agent_count }} 角色</el-tag>
              </div>
            </div>
            <p v-if="room.topic" class="room-topic">{{ room.topic }}</p>
            <div class="room-card-footer">
              <span class="room-time">{{ formatTime(room.updated_at) }}</span>
              <el-button
                v-if="room.owner_id === userStore.getUserInfo()?.id"
                size="small" type="danger" text :icon="Delete"
                @click.stop="deleteRoomConfirm(room.id)"
              />
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="发现房间" name="discover">
        <div v-if="roomStore.discoverList.length === 0" class="empty-hint">
          <el-empty description="暂无公开房间" :image-size="80" />
        </div>
        <div v-else class="room-grid">
          <div v-for="room in roomStore.discoverList" :key="room.id" class="room-card" @click="enterOrJoin(room)">
            <div class="room-card-header">
              <h3>{{ room.name }}</h3>
              <div class="room-tags">
                <el-tag size="small" round>{{ room.member_count }} 人</el-tag>
                <el-tag v-if="room.agent_count" size="small" type="success" round>{{ room.agent_count }} 角色</el-tag>
              </div>
            </div>
            <p v-if="room.topic" class="room-topic">{{ room.topic }}</p>
            <div class="room-card-footer">
              <span class="room-time">{{ formatTime(room.updated_at) }}</span>
              <el-button v-if="!room.is_joined" size="small" type="primary" @click.stop="doJoin(room.id)">
                加入
              </el-button>
              <el-tag v-else size="small" type="info">已加入</el-tag>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <CreateRoomDialog
      v-model="showCreateDialog"
      :agents="agentStore.agents"
      @created="onRoomCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { deleteRoom, joinRoom } from '@/apis/room'
import { useUserStore } from '@/stores/userStore'
import { useAgentStore } from '@/stores/agentStore'
import { useRoomStore } from '@/stores/roomStore'
import CreateRoomDialog from './components/CreateRoomDialog.vue'

const router = useRouter()
const userStore = useUserStore()
const agentStore = useAgentStore()
const roomStore = useRoomStore()

const activeTab = ref('mine')
const showCreateDialog = ref(false)

const enterRoom = (roomId: number) => router.push(`/room/${roomId}`)

const enterOrJoin = async (room: any) => {
  if (!room.is_joined) await doJoin(room.id)
  router.push(`/room/${room.id}`)
}

const doJoin = async (roomId: number) => {
  try {
    await joinRoom(roomId)
    ElMessage.success('已加入房间')
    roomStore.loadMyRooms()
    roomStore.loadDiscover()
    router.push(`/room/${roomId}`)
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '加入失败')
  }
}

const onRoomCreated = (roomId: number) => {
  roomStore.loadMyRooms()
  if (roomId) router.push(`/room/${roomId}`)
}

const deleteRoomConfirm = async (roomId: number) => {
  try {
    await ElMessageBox.confirm('确定删除吗？', '确认', { type: 'warning' })
    await deleteRoom(roomId)
    ElMessage.success('已删除')
    roomStore.loadMyRooms()
  } catch {}
}

const formatTime = (ts: string) => {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(async () => {
  await agentStore.load(true)
  roomStore.loadMyRooms()
  roomStore.loadDiscover()
})
</script>

<style scoped>
.room-page { max-width: 900px; margin: 0 auto; padding: 20px; }
.room-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.room-header-bar h2 { margin: 0; font-family: var(--font-pixel); font-size: 18px; color: var(--color-magic-gold); }
.room-tabs { margin-top: 8px; }
.room-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; margin-top: 12px; }
.room-card { background: var(--color-bg-card); border: var(--border-thin) var(--color-border); border-radius: var(--radius-lg); padding: 16px; cursor: pointer; transition: all var(--transition-normal); }
.room-card:hover { border-color: var(--color-primary); box-shadow: var(--shadow-glow); transform: translateY(-2px); }
.room-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.room-card-header h3 { margin: 0; font-size: 16px; }
.room-tags { display: flex; gap: 4px; flex-shrink: 0; }
.room-topic { color: var(--color-text-tertiary); font-size: 13px; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.room-card-footer { display: flex; justify-content: space-between; align-items: center; }
.room-time { font-size: 12px; color: var(--color-text-tertiary); }
.empty-hint { margin-top: 40px; }
</style>
