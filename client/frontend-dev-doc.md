# AI 智能对话系统 - 前端开发文档

## 项目概述

Vue 3 + TypeScript + Vite 全栈 AI 对话系统前端。**奈克瑟 NEXUS** 角色化界面，含亲密度成长系统、语音输入/播报、Agent 工具状态提示、联网搜索、知识库 RAG、多模态上传、**MCP 工具可视化配置**。移动端全面适配。

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

### 0. 模型切换与 Agent 工具

输入区左侧模型下拉框（170px），标签格式 `模型名 · 类型`：
- `多模态`：Qwen3.5-397B
- `文本`：DeepSeek-V4 / GLM-5.1 / GLM-5 / DeepSeek-R1

**Agent 统一调度**：所有消息走 `POST /api/ai/chat` SSE 流式，不再有生图 JSON 分支。AI 自主决定调用工具（`search_web` / `query_knowledge_base` / `recall_memory` / `generate_image`）。

**持久化**：`localStorage('nexusSelectedModel')` 保存模型选择，`localStorage('nexusImageRatio')` 保存默认宽高比。

**供应商**：ModelScope（魔搭，文本模型 → OpenAI 兼容端点）/ 火山引擎 ARK（Seedream 文生图工具）

**宽高比选择**：常驻在模型下拉框旁（150px），作为 `generate_image` 工具的默认参数。支持 8 个预设：1:1、4:3、3:4、16:9（默认）、9:16、3:2、2:3、21:9。

**工具状态提示**：Agent 调用工具时，消息区显示工具调用状态（"正在搜索网络..."、"正在生成图片..."等），工具完成后自动移除提示文本。

**开关语义变化**：

| 开关 | 旧语义 | 新语义 |
|------|--------|--------|
| 联网 | 必定调用 webSearch | 允许 AI 使用 search_web 工具 |
| 知识库 | 必定检索该 KB | 允许 AI 使用 query_knowledge_base 工具 |
| 宽高比 | 生图模型时固定传入 | generate_image 工具的默认偏好 |
| 奈克瑟/朗读 | 不变 | 不变 |

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
- `handleSSE()` 缓冲区按 `\n\n` 分割保证 TCP 分片时消息完整性，`TextDecoder({ stream: true })` 防止中文截断
- 支持 `content`、`tool_call`、`tool_result`、`webSearch`、`retrieval` 等多种 SSE 事件类型
- 打字机缓冲区：30ms 逐字释放，积压 >200 字自动加速
- 加载动画：Agent 阶段动态文案（解析情报→搜索/检索/记忆/生图→整理情报），`searching` 状态切换 `searching.png`
- 生图结果携带 `imageUrl` 直接注入消息气泡

**多模态上传**：图片/文档/视频 + Ctrl+V 粘贴

**联网搜索开关**：开启后 AI 回复强制标注来源编号 [1][2]，末尾列出情报来源 URL

**MCP 工具面板**：侧边栏底部可折叠面板，显示文件系统/Playwright 连接状态、工具数、开关切换

**自动朗读**：AI 回复完成后自动播放语音（服务端 Edge-TTS 合成 MP3），可关闭

### 3. 语音功能

| 功能 | 实现 | 文件 |
|------|------|------|
| 语音输入 | `useVoiceRecording()` → `MediaRecorder` → `POST /api/voice/transcribe` → 文本填入输入框 | `voiceRecording.ts` |
| 语音播报 | `speak()` → `POST /api/voice/tts` → Edge-TTS 合成 MP3 → `<audio>` 播放，PC/手机全兼容 | `tts.ts` |
| 语音列表 | `GET /api/voice/voices` 获取 13 种中文女声，localStorage 持久化选择 | `ChatMessageArea.vue` / `tts.ts` |
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

768px 断点：侧边栏 → fixed 抽屉、汉堡菜单、消息气泡 85% 宽度、`overflow-x: hidden` 防止横向滑动、`<pre>` 限制 `max-width: calc(100vw - 56px)`、`overflow-wrap: anywhere` 强制断行。

**移动端对话输入栏**：仿主流聊天应用（微信/iMessage），底部单行布局：

```
[+] [____输入消息...____] [→]
```

- **"+" 展开面板**：点击"+"旋转 45° 变为"×"，上方滑出面板（`slide-up` 动画），收纳所有辅助功能：
  - **上传区**：图片、文档、视频、语音输入（带文字标签）
  - **设置区**：知识库选择、模型切换、图片比例选择
  - **开关区**：奈克瑟/AI 切换、朗读开关、语音选择
- **输入框**：单行胶囊形（`border-radius: 18px`），Enter 发送
- **发送按钮**：圆形 primary 按钮（`Promotion` 图标，36×36）
- **桌面端不变**：原有选择器行 + 上传按钮 + 多行文本框布局完整保留
- **响应式切换**：`useMediaQuery('(max-width: 768px)')` 声明式判断，与 CSS 断点完全一致，组件卸载自动清理
- **实现位置**：`ChatMessageArea.vue` — `isMobile`（`useMediaQuery`）/ `showMobileExtras` ref，`v-if` 双布局模板

**视口高度适配**：`100vh` → `100dvh`（dynamic viewport height），移动端浏览器底部栏自动扣除适配。输入区、文件预览条、录音条均加 `env(safe-area-inset-bottom)` 刘海屏安全区。`viewport-fit=cover` 在 index.html 中声明。

**知识库移动端**：顶部导航栏常驻（汉堡菜单 + "+" 直接创建），空状态下也有"新建知识库"按钮，不再需要打开侧边栏才能创建。

**图片骨架屏**：消息中所有图片加载前显示 shimmer 扫光占位，`@load` 事件触发后渐变切换到实图。Markdown 图片通过 `MutationObserver` 注入 load 监听。`transition: transform 0.15s, opacity 0.3s ease, border-color 0.15s` 保证 hover 缩放 + 骨架淡入同时生效。

> **Bug 修复 (2026-05-07)**：Markdown 渲染图片（AI 回复中的图片）的骨架屏 shimmer 动画加载完成后不会被清除。根因：`.message-content :deep(img)` 定义了骨架屏背景和动画，但缺少 `.img-loaded` 重置规则（`.msg-image.img-loaded` 有但 markdown 图片没有）。修复：新增 `.message-content :deep(img.img-loaded)` 规则，`background: transparent; animation: none; min-height: 0; min-width: 0`。

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
| 工作区下载 | GET | `/api/fs/download?file=` | 下载 AI 生成的文件（PPT/Word等） |
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
| SSE 缓冲区按 `\n\n` 分割 | TCP 分片导致 JSON 行不完整，手机网络更易触发，导致流式/状态切换失效 |
| 打字机延迟 30ms | 平衡流畅度和性能 |
| 移动端 fixed 抽屉 | 保留桌面折叠逻辑，移动端独立 |
| 移动端 overflow-x: hidden | 长代码块/URL 撑破容器宽度导致横向滑动 |
| 移动端单行输入 + "+" 面板 | 桌面端控件太多（选择器+按钮+开关），直接缩放会占半屏，收纳进可展开面板保持界面简洁 |
| 语音服务端合成 | 统一走 Edge-TTS，全部浏览器兼容，localStorage 保持语音选择 |

---

*最后更新: 2026-05-07 | v1.5.1 — Markdown图片骨架屏load后清除修复*
