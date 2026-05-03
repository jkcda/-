# AI 智能对话系统 - 前端开发文档

## 项目概述

Vue 3 + TypeScript + Vite 全栈 AI 对话系统前端。**奈克瑟 NEXUS** 角色化界面，含亲密度成长系统、语音输入/播报、联网搜索、知识库 RAG、多模态上传。移动端全面适配。

### 技术栈

- Vue 3.5+ (Composition API + `<script setup>`)
- Vite Beta + TypeScript 5.9+
- Element Plus 2.13+ (auto-import)
- Pinia 3.0+ (持久化)
- Vue Router 5.0+
- Axios + Fetch (SSE)
- Marked (Markdown 渲染)
- @vueuse/core (工具 composables)

---

## 目录结构

```
client/src/
├── apis/                # API 封装
│   ├── ai.ts            # 对话/历史/上传
│   ├── admin.ts         # 管理员
│   ├── knowledgeBase.ts # 知识库
│   └── user.ts          # 用户
├── router/index.ts      # 路由 + 守卫
├── stores/userStore.ts  # 用户状态（Pinia + localStorage）
├── utils/
│   ├── http.ts          # Axios 封装（拦截器）
│   ├── sse.ts           # SSE 流式处理（含 webSearch/retrieval 事件）
│   ├── intimacy.ts      # 亲密度系统（0→100等级、称呼、欢迎台词）
│   ├── tts.ts           # 语音播报（Edge-TTS 合成 → <audio>）
│   └── voiceRecording.ts # 语音输入（MediaRecorder → Whisper 转写）
├── views/
│   ├── Chat/            # 对话页
│   │   ├── index.vue    # 主入口（会话管理、SSE、打字机、自动朗读）
│   │   └── components/
│   │       ├── ChatSidebar.vue   # 侧边栏（奈克瑟卡片、会话列表）
│   │       └── ChatMessageArea.vue # 消息区（Markdown、输入、麦克风、朗读开关）
│   ├── KnowledgeBase/   # 知识库
│   ├── Admin/           # 后台管理
│   ├── Layout/          # 前台布局（Header + Content）
│   ├── Home/            # 首页（奈克瑟角色化）
│   ├── Login/           # 登录
│   └── Register/        # 注册
└── App.vue              # 根组件
```

---

## 核心功能

### 0. 模型切换

输入区左侧模型下拉框（170px），标签格式 `模型名 · 类型`：
- `多模态`：Qwen3.5-397B
- `文本`：DeepSeek-V4 / GLM-5.1 / GLM-5 / DeepSeek-R1
- `生图`：Seedream 4.5（火山引擎）

**统一接口**：所有模型走 `POST /api/ai/chat`，后端按 `model.type` 自动路由：
- `text/multimodal/vision` → SSE 流式
- `image` → 火山引擎 ARK API → JSON 返回图片 URL

**持久化**：`localStorage('nexusSelectedModel')` 保存选择，刷新不丢失。

**供应商**：ModelScope（魔搭，文本模型）/ 火山引擎 ARK（Seedream 文生图）

**宽高比选择**：选择生图模型（Seedream 4.5）后，模型下拉框旁出现宽高比选择器（150px），仅当模型 type==='image' 时可见。支持 8 个预设：1:1、4:3、3:4、16:9（默认）、9:16、3:2、2:3、21:9，对应具体像素尺寸透传至火山引擎 ARK API。选择值通过 `localStorage('nexusImageRatio')` 持久化，刷新不丢失。

### 1. 奈克瑟角色系统

**亲密度 (`utils/intimacy.ts`)**：localStorage 持久化，每次对话 +1（0→100）。影响：
- **称呼**：指挥官 (0)→ 主人 (50)→ 亲爱的 (100)
- **等级**：初次连接 → 伙伴 → 挚友 → 灵魂绑定
- **欢迎台词**：`getWelcomeLine()` 返回角色化问候
- **时间段问候**：`getTimeGreeting()` 凌晨/早安/午后/晚安

**集成点**：
- 侧边栏奈克瑟卡片（头像 + 等级）
- 新对话欢迎消息（问候 + 欢迎台词）
- 空会话列表欢迎提示
- 首页标题和引语

**模式切换**：输入区 `奈克瑟 / AI助手` 开关，关闭后 AI 以标准助手模式回复（不注入人设 system prompt）。

### 2. 对话系统

**SSE 流式 + 打字机**：
- `handleSSE()` 支持 `content`、`webSearch`、`retrieval` 三种事件
- 打字机缓冲区：30ms 逐字释放，积压 >200 字自动加速
- 加载动画：联网/普通两种文案

**多模态上传**：图片/文档/视频 + Ctrl+V 粘贴

**联网搜索开关**：开启后 AI 回复底部显示搜索来源链接

**自动朗读**：AI 回复完成后自动播放语音（Edge-TTS），可关闭

### 3. 语音功能

| 功能 | 实现 | 文件 |
|------|------|------|
| 语音输入 | `useVoiceRecording()` → `MediaRecorder` → `POST /api/voice/transcribe` → 文本填入输入框 | `voiceRecording.ts` |
| 语音播报 | `speak()` → 浏览器原生 `SpeechSynthesis` API，无需后端 | `tts.ts` |
| 语音选择 | 浏览器已安装中文女声列表，过滤男声，简短友好名称 | `ChatMessageArea.vue` / `tts.ts` |
| 朗读开关 | `autoSpeakEnabled` localStorage 持久化 | `tts.ts` |
| 朗读按钮 | AI 消息气泡外右下角悬浮，hover 变金色 | `ChatMessageArea.vue` |
| 语音反馈 | 识别成功/未识别/录音未就绪三种 ElMessage 提示 | `ChatMessageArea.vue` |

### 4. 图片预览与导出

**聊天窗口内**：上传图片缩至 180×180，Markdown 图片缩至 240×240，`object-fit: cover`，hover 微放大 + 金色边框。

**点击预览弹窗**（`el-dialog`）：
- 点击图片 → 弹窗放大预览，支持鼠标滚轮缩放（0.25x ~ 3x）
- 工具栏：放大 / 缩小 / 还原 / 导出下载
- 下载：fetch blob → `<a download>` 保留原始格式，跨域图片降级为 `window.open`
- 移动端弹窗宽度 95%

**实现位置**：`ChatMessageArea.vue` — `openPreview()` / `onMessageClick()`（委托点击）/ `downloadImage()` / `onPreviewWheel()`

### 5. 移动端适配

768px 断点：侧边栏 → fixed 抽屉、汉堡菜单、消息气泡放宽至 90%、表格横滚

---

## API 接口速览

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 用户注册 | POST | `/api/user/register` | |
| 用户登录 | POST | `/api/user/login` | 返回 JWT |
| 模型列表 | GET | `/api/ai/models` | 返回可用模型及供应商/类型 |
| AI 对话 | POST | `/api/ai/chat` | 统一入口：SSE 流式（文本）/ JSON（生图），支持 model 切换 |
| 对话历史 | GET | `/api/ai/history` | |
| 删除历史 | DELETE | `/api/ai/history` | 同步清除 RAG 记忆 |
| 文件上传 | POST | `/api/upload` | multipart |
| 语音转写 | POST | `/api/voice/transcribe` | WebM → Whisper |
| 语音合成 | POST | `/api/voice/tts` | 文本 → MP3 |
| 语音列表 | GET | `/api/voice/voices` | 13 种女声 |
| 知识库 CRUD | GET/POST/DELETE | `/api/kb` | |
| 知识库文档 | GET/POST/DELETE | `/api/kb/:id/documents` | |
| 知识库检索 | POST | `/api/kb/:id/search` | |
| 管理员 | GET/POST/PUT/DELETE | `/api/admin/*` | 需 admin 权限 |

---

## 状态管理

**userStore (Pinia)**：token / userInfo，持久化到 localStorage

**会话存储键**：`chatSessions_{userId}` / `chatSessions_anon`，按用户隔离

> **Bug 修复**：新增对话刷新后欢迎消息消失 — `createNewSession()` 的欢迎消息仅存于 `messages.value`（内存），未持久化到后端。刷新后 `loadHistory()` 从 API 获空数组覆盖。修复：`loadHistory()` 检测后端返回空且会话在本地列表时，重新生成欢迎消息。

---

## 路由

```
/ → /front/home
/front/home         公开
/front/chat         需登录
/front/knowledge-base 需登录
/admin/*            需管理员
/login              公开
/register           公开
```

路由守卫：公开页面白名单 + 管理员角色校验

---

## 关键设计

| 决策 | 理由 |
|------|------|
| SSE 而非 WebSocket | 单向推送够用、HTTP 更简单 |
| 打字机延迟 30ms | 平衡流畅度和性能 |
| 移动端 fixed 抽屉 | 保留桌面折叠逻辑，移动端独立 |
| Edge-TTS Python 子进程 | 微软 WebSocket API 鉴权不稳定 |
| 语音 local 记忆 | 用户偏好跨会话保持 |

---

*最后更新: 2026-05-03 | v0.9.1 — 统一对话接口(文本+生图) + 模型localStorage持久化 + 图片预览导出 + 模型类型标签修正 + 生图宽高比选择器*
