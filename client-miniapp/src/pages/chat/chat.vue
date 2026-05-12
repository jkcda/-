<template>
  <view class="chat-page">
    <scroll-view class="msg-scroll" scroll-y :scroll-into-view="scrollToId" scroll-with-animation >
      <view v-if="loadingHistory" class="load-hint">加载中...</view>

      <view v-if="!curSess && !loadingHistory" class="empty">
        <image src="/static/character-avatar.png" class="empty-img" mode="aspectFill" />
        <text class="empty-t1">奈克瑟 NEXUS</text>
        <text class="empty-t2">选择对话，开始同步情报。</text>
      </view>

      <view v-for="(msg, idx) in messages" :key="idx" :id="'m-'+idx"
        v-show="msg.content || !streaming || idx !== messages.length - 1"
        :class="['msg', msg.role === 'user' ? 'msg-u' : 'msg-a']">

        <view v-if="msg.role === 'assistant'" class="msg-avt">
          <image :src="aiAvt" class="avt-img" mode="aspectFill" />
        </view>

        <view :class="['msg-body', msg.role === 'user' ? 'body-u' : 'body-a']">
          <text v-if="msg.role === 'assistant'" class="body-mark">◆</text>
          <view v-if="msg.files?.length" class="msg-files">
            <view v-for="(f, fi) in msg.files" :key="fi" class="msg-file">
              <image v-if="f.type && f.type.startsWith('image/')" :src="getFullUrl(f.url)" class="file-img" mode="aspectFill" @tap="previewImg(getFullUrl(f.url))" />
              <text v-else class="file-doc">{{ f.name }}</text>
            </view>
          </view>
          <view v-if="msg.content" class="msg-txt">
            <rich-text v-if="msg.role === 'assistant'" :nodes="md(msg.content)"></rich-text>
            <text v-else user-select="true">{{ msg.content }}</text>
          </view>
        </view>

        <view v-if="msg.role === 'user'" class="msg-avt msg-avt-u">
          <text class="avt-text">我</text>
        </view>
      </view>

      <view v-if="streaming && strmMsg && !strmMsg.content" class="msg msg-a">
        <view class="msg-avt"><image :src="loadImg" class="avt-img load-gif" mode="aspectFit" /></view>
        <view class="msg-body body-a"><text class="body-mark">◆</text><text class="load-label">{{ stageLabel }}</text></view>
      </view>

      <view id="msg-bottom" style="height:1rpx;"></view>
    </scroll-view>

    <view class="input-area">
      <view class="tools">
        <text class="tool" @tap="showExt = !showExt">{{ curSess?.agentName || '奈克瑟' }}<text :class="['arr', showExt && 'up']">▾</text></text>
        <text v-if="kbList.length" class="tool" @tap="showKb = true">{{ selKb?.name?.slice(0,6) || '知识库' }}</text>
        <text class="tool" @tap="showM = true">{{ mName }}</text>
      </view>

      <view v-if="showExt" class="extras">
        <view class="ext-sec">
          <text class="ext-label">会话</text>
          <view class="ext-item" @tap="addSess(null)"><text>+ 新对话（奈克瑟）</text></view>
          <view v-for="a in agentList" :key="a.id" class="ext-item" @tap="addSess(a)"><image v-if="a.avatar" :src="a.avatar" class="ext-thumb" mode="aspectFill" /><text>+ {{ a.name }}</text></view>
          <view v-for="s in sessList" :key="s.session_id" :class="['ext-item', curSess?.session_id === s.session_id && 'act']" @tap="switchAndClose(s)"><text>{{ s.agentName || '奈克瑟' }}</text><text class="ext-prev">{{ s.first_message || '' }}</text><text class="ext-del" @tap.stop="delSess(s.session_id)">✕</text></view>
        </view>
        <view class="ext-sec"><text class="ext-label">模型</text><view v-for="m in modelList" :key="m.id" :class="['ext-item', selM === m.id && 'act']" @tap="pickM(m.id)"><text>{{ m.name }}</text></view></view>
      </view>

      <view class="input-row">
        <text class="plus" @tap="chooseFile">+</text>
        <textarea class="inp" v-model="inputText" :maxlength="5000" placeholder="输入消息..." :auto-height="true" :cursor-spacing="12" :show-confirm-bar="false" @confirm="send" />
        <view :class="['snd', !canSend && 'snd-dis']" @tap="send"><text class="snd-ico">{{ streaming ? '■' : '↑' }}</text></view>
      </view>
    </view>

    <view v-if="showKb" class="overlay" @tap="showKb = false">
      <view class="sheet" @tap.stop>
        <text class="sh-t">选择知识库</text>
        <view class="sh-i" @tap="pickKb(null)"><text :class="!kbId && 'act'">不使用知识库</text></view>
        <view v-for="k in kbList" :key="k.id" :class="['sh-i', kbId === k.id && 'act']" @tap="pickKb(k.id)"><text>{{ k.name }}</text></view>
        <button class="sh-btn" @tap="showKb = false">关闭</button>
      </view>
    </view>

    <view v-if="showM" class="overlay" @tap="showM = false">
      <view class="sheet" @tap.stop>
        <text class="sh-t">选择模型</text>
        <view v-for="m in modelList" :key="m.id" :class="['sh-i', selM === m.id && 'act']" @tap="pickM(m.id)"><text>{{ m.name }}</text><text class="sh-sub">{{ m.desc }}</text></view>
        <button class="sh-btn" @tap="showM = false">关闭</button>
      </view>
    </view>

    <view v-if="uploading" class="toast">上传中...</view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/userStore'
import { wsClient } from '../../utils/ws'
import { getSessions, getChatHistory, getModels, deleteChatHistory, type SessionItem, type Message, type ModelItem } from '../../api/ai'
import { get, uploadFile as upFile } from '../../api/request'
import { API_BASE_URL } from '../../config'

const U = useUserStore()

// -- state --
const messages = ref<any[]>([])
const inputText = ref('')
const scrollToId = ref('msg-bottom')
const loadingHistory = ref(false)
const sessList = ref<SessionItem[]>([])
const curSess = ref<SessionItem | null>(null)
const streaming = ref(false)
const strmMsg = ref<any>(null)
const strmStage = ref('')
const modelList = ref<ModelItem[]>([])
const selM = ref('')
const showM = ref(false)
const showKb = ref(false)
const showExt = ref(false)
const kbList = ref<any[]>([])
const kbId = ref<number | null>(null)
const agentList = ref<any[]>([])
const pending = ref<any[]>([])
const uploading = ref(false)

// -- computed --
const selKb = computed(() => kbList.value.find((k: any) => k.id === kbId.value))
const canSend = computed(() => !!inputText.value.trim() && !streaming.value)
const mName = computed(() => modelList.value.find((m: any) => m.id === selM.value)?.name || '模型')
const aiAvt = computed(() => { const u = curSess.value?.agentAvatar; return u ? (u.startsWith('/uploads') ? API_BASE_URL + u : u) : '/static/character-avatar.png' })
const loadImg = computed(() => { const u = curSess.value?.agentAvatar; if (u) return u.startsWith('/uploads') ? API_BASE_URL + u : u; return strmStage.value === 'searching' ? '/static/searching.png' : '/static/thinking.png' })
const stageLabel = computed(() => ({ thinking: '正在解析情报...', searching: '正在穿越数据之海...', retrieving_kb: '正在检索知识库...', recalling: '正在同步记忆回路...', generating_image: '正在绘制魔法画像...', composing: '正在整理情报...' } as any)[strmStage.value] || '正在解析情报...')


// -- init --
const init = async () => {
  if (!(globalThis as any).__nexusLoggedIn()) return
  if (!wsClient.connected) wsClient.connect(U.getToken())
  await Promise.all([loadM(), loadS(), loadK(), loadA()])
  if (sessList.value.length > 0) select(sessList.value[0]); else await addSess(null)
}

// -- markdown --
const md = (t: string): string => {
  if (!t) return ''
  let h = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  h = h.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => `<pre style="background:rgba(255,255,255,0.06);padding:10rpx 14rpx;border-radius:6rpx;overflow-x:auto;margin:6rpx 0;border:1rpx solid rgba(255,255,255,0.08);font-size:22rpx;line-height:1.5;"><code style="white-space:pre-wrap;word-break:break-all;">${code.replace(/\n$/, '')}</code></pre>`)
  h = h.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const fullUrl = url.startsWith('http') ? url : API_BASE_URL + url
    return `<img src="${fullUrl}" alt="${alt}" style="max-width:100%;border-radius:6rpx;margin:6rpx 0;" />`
  })
  h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#d4af37;">$1</a>')
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')
  h = h.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:2rpx 6rpx;border-radius:3rpx;font-size:0.92em;">$1</code>')
  h = h.replace(/^### (.+)$/gm, '<h3 style="color:#d4af37;font-weight:600;margin:8rpx 0 4rpx;font-size:1.05em;">$1</h3>')
  h = h.replace(/^## (.+)$/gm, '<h2 style="color:#d4af37;font-weight:600;margin:10rpx 0 4rpx;font-size:1.1em;">$1</h2>')
  h = h.replace(/^# (.+)$/gm, '<h1 style="color:#d4af37;font-weight:600;margin:12rpx 0 4rpx;font-size:1.15em;">$1</h1>')
  h = h.replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3rpx solid #d4af37;padding-left:10rpx;color:#8892b0;margin:6rpx 0;">$1</blockquote>')
  h = h.replace(/^---$/gm, '<hr style="border:none;border-top:1rpx solid rgba(212,175,55,0.2);margin:10rpx 0;" />')
  h = h.replace(/(?:^[\-\*] .+$\n?)+/gm, (m: string) => '<ul style="padding-left:20rpx;margin:4rpx 0;">' + m.trim().split('\n').map((s: string) => `<li style="margin:2rpx 0;">${s.replace(/^[\-\*] /, '')}</li>`).join('') + '</ul>')
  h = h.replace(/(?:^\d+\. .+$\n?)+/gm, (m: string) => '<ol style="padding-left:20rpx;margin:4rpx 0;">' + m.trim().split('\n').map((s: string) => `<li style="margin:2rpx 0;">${s.replace(/^\d+\. /, '')}</li>`).join('') + '</ol>')
  h = h.replace(/\n{2,}/g, '</p><p style="margin:4rpx 0;">')
  h = h.replace(/\n/g, '<br/>')
  return '<p style="margin:4rpx 0;">' + h + '</p>'
}

// -- helper: get full url --
const getFullUrl = (url: string) => url?.startsWith('http') ? url : API_BASE_URL + (url || '')

// -- data --
const loadM = async () => { try { const r = await getModels(); if (r.success) { modelList.value = r.result.models || []; if (!selM.value && modelList.value.length) selM.value = modelList.value[0].id } } catch { } }
const loadS = async () => { try { const r = await getSessions(U.getUserInfo()?.id); if (r.success) sessList.value = r.result.sessions as any[] } catch { } }
const loadK = async () => { try { const r = await get<any>('/api/kb'); if (r.success) kbList.value = r.result.knowledgeBases || [] } catch { } }
const loadA = async () => { try { const r = await get<any>('/api/agents'); if (r.success) agentList.value = r.result.agents || [] } catch { } }

// -- sessions --
const select = async (s: SessionItem) => { curSess.value = s; loadingHistory.value = true; try { const r = await getChatHistory(s.session_id, U.getUserInfo()?.id); messages.value = r.success && r.result.messages?.length ? r.result.messages : [{ role: 'assistant', content: `✦ ${s.agentName || '奈克瑟'} 已就绪。` }] } catch { messages.value = [] } finally { loadingHistory.value = false; scrollEnd() } }
const switchAndClose = (s: SessionItem) => { select(s); showExt.value = false }
const addSess = async (agent: any) => { const uid = U.getUserInfo()?.id || 'anon'; const s: SessionItem = { session_id: `s_${uid}_${Date.now()}_${Math.random().toString(36).substr(2,6)}`, message_count: 0, last_active_at: new Date().toISOString(), created_at: new Date().toISOString(), agent_id: agent?.id || null, agent_name: agent?.name || null, agent_avatar: agent?.avatar || null }; sessList.value.unshift(s); showExt.value = false; await select(s) }
const delSess = async (sid: string) => { try { await deleteChatHistory(sid, U.getUserInfo()?.id) } catch { }; sessList.value = sessList.value.filter(s => s.session_id !== sid); if (curSess.value?.session_id === sid) { curSess.value = null; if (sessList.value.length > 0) select(sessList.value[0]) } }

// -- send --
const send = async () => {
  if (!canSend.value) return; const text = inputText.value.trim(); inputText.value = ''; showExt.value = false
  if (!curSess.value) await addSess(null)
  const files = [...pending.value]; pending.value = []
  messages.value.push({ role: 'user', content: text, files: files.length ? files : undefined }); scrollEnd()
  const ai: any = { role: 'assistant', content: '' }; messages.value.push(ai); strmMsg.value = ai; streaming.value = true; strmStage.value = 'thinking'; let full = ''
  const handlers: [string, Function][] = [
    ['ai:chunk', (d: any) => { full += d.content; ai.content = full; strmStage.value = 'composing'; scrollEnd() }],
    ['ai:tool_call', (d: any) => { const m: any = { search_web: 'searching', query_knowledge_base: 'retrieving_kb', recall_memory: 'recalling', generate_image: 'generating_image' }; strmStage.value = m[d.tool] || d.tool }],
    ['ai:done', () => { streaming.value = false; strmMsg.value = null; cleanWs(); loadS() }],
    ['ai:error', (d: any) => { streaming.value = false; ai.content = `出错: ${d.error}`; strmMsg.value = null; cleanWs() }],
  ]
  const cleanWs = () => handlers.forEach(([e, f]) => wsClient.off(e, f))
  try {
    if (!wsClient.connected) { wsClient.connect(U.getToken()); await new Promise<void>(r => { wsClient.on('__connected__', () => r()); setTimeout(r, 3000) }) }
    handlers.forEach(([e, f]) => wsClient.on(e, f))
    wsClient.send('ai:chat', { message: text, sessionId: curSess.value!.session_id, userId: U.getUserInfo()?.id || null, kbId: kbId.value || undefined, model: selM.value || undefined, agentId: curSess.value!.agent_id || undefined, files: files.length ? files : undefined })
  } catch (e: any) { streaming.value = false; ai.content = `失败: ${e.message}`; strmMsg.value = null; cleanWs() }
}
const chooseFile = () => { uni.showActionSheet({ itemList: ['图片', '文件'], success: (r) => { const up = async (paths: string[]) => { uploading.value = true; for (const p of paths) { try { const u = await upFile(p); pending.value.push(u) } catch { } }; uploading.value = false; if (pending.value.length) uni.showToast({ title: `已选${pending.value.length}个附件`, icon: 'none' }) }; if (r.tapIndex === 0) uni.chooseImage({ count: 3, success: (x) => up(x.tempFilePaths) }); else uni.chooseMessageFile({ count: 3, type: 'all', success: (x) => up(x.tempFiles.map((f: any) => f.path)) }) } }) }
const pickKb = (id: number | null) => { kbId.value = id; showKb.value = false }
const pickM = (id: string) => { selM.value = id; showM.value = false; showExt.value = false }
const previewImg = (url: string) => uni.previewImage({ urls: [getFullUrl(url)] })
const scrollEnd = () => { setTimeout(() => { scrollToId.value = ''; setTimeout(() => scrollToId.value = 'msg-bottom', 60) }, 60) }

onShow(() => { if (!(globalThis as any).__nexusLoggedIn()) { uni.reLaunch({ url: '/pages/login/login' }); return }; init() })
</script>

<style lang="scss" scoped>
.chat-page { height: 100vh; display: flex; flex-direction: column; background: #0f0f23; overflow: hidden; }
.msg-scroll { flex: 1; min-height: 0; padding: 16rpx 24rpx; box-sizing: border-box; overflow: hidden; }
.load-hint { text-align: center; padding: 24rpx; font-size: 24rpx; color: #556; }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80rpx 40rpx; }
.empty-img { width: 160rpx; height: 160rpx; border-radius: 50%; border: 3rpx solid #d4af37; box-shadow: 0 0 24rpx rgba(212,175,55,0.3); opacity: 0.7; margin-bottom: 20rpx; }
.empty-t1 { font-size: 32rpx; color: #d4af37; font-weight: 700; letter-spacing: 4rpx; margin-bottom: 12rpx; }
.empty-t2 { font-size: 24rpx; color: #8892b0; }

.msg { display: flex; margin-bottom: 20rpx; animation: msgIn 0.25s ease-out; }
@keyframes msgIn { from { opacity: 0; transform: translateY(12rpx); } to { opacity: 1; transform: translateY(0); } }
.msg-u { justify-content: flex-end; }
.msg-a { justify-content: flex-start; }

.msg-avt { flex-shrink: 0; width: 48rpx; height: 48rpx; margin-right: 12rpx; align-self: flex-start; }
.msg-avt-u { margin-right: 0; margin-left: 12rpx; }
.avt-img { width: 48rpx; height: 48rpx; border-radius: 50%; border: 2rpx solid #d4af37; box-shadow: 0 0 10rpx rgba(212,175,55,0.2); }
.avt-text { display: flex; width: 48rpx; height: 48rpx; border-radius: 50%; background: linear-gradient(135deg, #d4af37, #b8960f); color: #1a1a2e; font-size: 20rpx; font-weight: 600; align-items: center; justify-content: center; }
.load-gif { animation: float 2s ease-in-out infinite; }
@keyframes float { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-6rpx); } }

.msg-body { max-width: 68%; padding: 10rpx 16rpx; border-radius: 10rpx; position: relative; word-break: break-all; overflow-wrap: anywhere; min-width: 0; box-sizing: border-box; }

.body-u { background: linear-gradient(135deg, #d4af37, #b8960f); border-radius: 10rpx 10rpx 4rpx 10rpx; box-shadow: 0 2rpx 8rpx rgba(212,175,55,0.2); }
.body-u .msg-txt { color: #1a1a2e; }

.body-a { background: rgba(255,255,255,0.05); border: 1rpx solid rgba(255,255,255,0.08); border-radius: 4rpx 10rpx 10rpx 10rpx; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.3); }

.body-mark { position: absolute; top: -8rpx; left: 12rpx; font-size: 14rpx; color: #d4af37; text-shadow: 0 0 6rpx rgba(212,175,55,0.5); }
.msg-txt { font-size: 24rpx; line-height: 1.55; color: #e0e0e0; }
.msg-files { margin-bottom: 6rpx; padding-bottom: 6rpx; border-bottom: 1rpx solid rgba(255,255,255,0.1); }
.body-u .msg-files { border-color: rgba(0,0,0,0.15); }
.msg-file { margin-bottom: 4rpx; }
.file-img { max-width: 200rpx; max-height: 200rpx; border-radius: 6rpx; border: 1rpx solid rgba(255,255,255,0.12); }
.file-doc { font-size: 20rpx; color: #8892b0; padding: 4rpx 10rpx; background: rgba(255,255,255,0.06); border-radius: 4rpx; }
.load-label { font-size: 22rpx; color: #8892b0; }

.input-area { background: #1a1a2e; border-top: 1rpx solid rgba(212,175,55,0.15); padding: 12rpx 20rpx; padding-bottom: calc(12rpx + env(safe-area-inset-bottom)); flex-shrink: 0; }
.tools { display: flex; gap: 8rpx; margin-bottom: 10rpx; flex-wrap: wrap; align-items: center; }
.tool { font-size: 22rpx; color: #8892b0; padding: 6rpx 14rpx; border: 1rpx solid rgba(255,255,255,0.1); border-radius: 14rpx; line-height: 1.2; }
.arr { display: inline-block; transition: transform .2s; margin-left: 2rpx; }
.arr.up { transform: rotate(180deg); }

.extras { margin-bottom: 10rpx; padding: 14rpx; background: rgba(255,255,255,0.03); border-radius: 12rpx; border: 1rpx solid rgba(255,255,255,0.06); max-height: 300rpx; overflow-y: auto; }
.ext-sec { margin-bottom: 12rpx; }
.ext-label { font-size: 20rpx; color: #556; margin-bottom: 6rpx; font-weight: 500; }
.ext-item { display: flex; align-items: center; gap: 10rpx; padding: 12rpx 10rpx; font-size: 24rpx; color: #e0e0e0; border-bottom: 1rpx solid rgba(255,255,255,0.04); }
.ext-item.act { color: #d4af37; }
.ext-prev { flex:1; font-size:20rpx; color:#556; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-left:8rpx; }
.ext-del { font-size:22rpx; color:#ff4757; padding:4rpx 8rpx; flex-shrink:0; }
.ext-thumb { width:32rpx; height:32rpx; border-radius:50%; }

.input-row { display: flex; align-items: center; gap: 12rpx; }
.plus { width:48rpx; height:48rpx; display:flex; align-items:center; justify-content:center; font-size:32rpx; color:#8892b0; border:1rpx solid rgba(255,255,255,0.12); border-radius:50%; flex-shrink:0; }
.inp { flex:1; min-height:48rpx; max-height:120rpx; background:rgba(255,255,255,0.06); border-radius:24rpx; padding:12rpx 20rpx; font-size:26rpx; color:#e0e0e0; }
.snd { width:48rpx; height:48rpx; border-radius:50%; background:linear-gradient(135deg,#d4af37,#b8960f); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 2rpx 10rpx rgba(212,175,55,0.3); }
.snd-dis { opacity:0.35; box-shadow:none; }
.snd-ico { font-size:26rpx; color:#1a1a2e; font-weight:700; }

.overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:flex-end; z-index:100; }
.sheet { width:100%; background:#1a1a2e; border-radius:20rpx 20rpx 0 0; padding:28rpx; max-height:70vh; overflow-y:auto; padding-bottom:calc(28rpx + env(safe-area-inset-bottom)); animation:slideUp .25s ease-out; }
@keyframes slideUp { from{transform:translateY(100%);} to{transform:translateY(0);} }
.sh-t { font-size:30rpx; color:#d4af37; font-weight:600; margin-bottom:20rpx; }
.sh-i { display:flex; align-items:center; gap:10rpx; padding:18rpx 12rpx; font-size:26rpx; color:#e0e0e0; border-bottom:1rpx solid rgba(255,255,255,0.05); }
.sh-i .act { color:#d4af37; }
.sh-sub { font-size:22rpx; color:#556; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sh-btn { width:100%; height:76rpx; line-height:76rpx; background:rgba(255,255,255,0.08); color:#e0e0e0; border-radius:38rpx; font-size:26rpx; border:none; margin-top:20rpx; }
.toast { position:fixed; bottom:200rpx; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.85); color:#e0e0e0; font-size:22rpx; padding:10rpx 28rpx; border-radius:28rpx; z-index:60; }
</style>
