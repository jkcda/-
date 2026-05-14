# Web 前端开发文档

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Vue 3 (Composition API) + TypeScript |
| 构建 | Vite |
| UI | Element Plus |
| 状态管理 | Pinia |
| HTTP | Axios |
| 实时通信 | Socket.IO Client |
| Markdown | marked + DOMPurify |
| 路由 | Vue Router 4 |

## 目录结构

```
client/src/
├── main.ts                # 入口：createApp + Pinia + ElementPlus 图标
├── App.vue                # 根组件：<router-view />
├── router/index.ts        # 路由配置 + 导航守卫
├── views/                 # 页面组件
│   ├── Layout/            # 主布局（Header + Content）
│   ├── Home/              # 首页
│   ├── Chat/              # AI 对话（消息区 + 侧边栏）
│   ├── Room/              # 聊天室（列表 + 实时对话）
│   ├── KnowledgeBase/     # 知识库管理
│   ├── Agent/             # 角色管理
│   ├── Admin/             # 管理后台
│   ├── Auth/              # 登录/注册/验证
│   └── Login & Register/  # 旧版页面（重定向到 /auth）
├── apis/                  # API 请求封装
├── stores/                # Pinia Store
├── utils/                 # 工具函数
│   ├── http.ts            # Axios 实例 + 拦截器
│   ├── sse.ts             # SSE 流式解析
│   ├── socket.ts          # Socket.IO 单例
│   ├── voiceRecording.ts  # 浏览器录音
│   └── tts.ts             # TTS 播放
├── styles/                # 全局样式
│   ├── common.scss        # 设计令牌（CSS 变量）+ 全局样式
│   └── element-overrides.scss  # Element Plus 深度主题覆盖
└── assets/                # 静态资源 + 动画
```

## 路由与权限

### 路由表

| 路径 | 组件 | 权限 | 说明 |
|------|------|------|------|
| `/` | Layout > Home | 公开 | 首页 |
| `/chat` | Layout > Chat | 公开（游客） | AI 对话 |
| `/knowledge-base` | Layout > KnowledgeBase | 登录 | 知识库管理 |
| `/agents` | Layout > AgentManager | 登录 | 角色管理 |
| `/rooms` | Layout > Room | 登录 | 聊天室列表 |
| `/room/:id` | Layout > RoomChat | 登录 | 聊天室对话 |
| `/admin` | AdminLayout | 重定向到 providers | 管理后台入口 |
| `/admin/dashboard` | AdminLayout > Dashboard | admin | 对话统计 |
| `/admin/users` | AdminLayout > Users | admin | 用户管理 |
| `/admin/api-keys` | AdminLayout > ApiKeys | admin | 系统设置 |
| `/admin/providers` | AdminLayout > Providers | 登录 | 能力配置（所有用户） |
| `/auth/login` | AuthLayout > Login | 公开 | 登录 |
| `/auth/register` | AuthLayout > Register | 公开 | 注册 |
| `/verify` | VerifyEmail | 公开 | 邮箱验证 |

### 导航守卫流程

```
beforeEach(to, from, next)
  ├─ 有 token?
  │   ├─ 有 → 检查 meta.requiresAdmin
  │   │   ├─ 是 → role === 'admin'? 否 → 踢回首页
  │   │   └─ 否 → 放行
  │   └─ 无 → 当前路径在 guestPages?
  │       ├─ 是 → 放行（游客）
  │       └─ 否 → 跳转 /auth/login
```

游客可访问页面：`/`、`/chat`、`/auth/*`、`/verify`

## 页面组件

### 主布局 `views/Layout/`

- **Header.vue** — 顶部导航栏：logo、导航链接、用户区。未登录者在 `/chat` 显示「游客模式」标签
- **Content.vue** — `<router-view />` 容器
- **index.vue** — flex 列布局：Header + Content

### AI 对话 `views/Chat/`

- **index.vue** — 主控制器：会话管理、消息发送、SSE 接收、类型动画
  - 关键状态：`messages`、`sessionList`、`selectedModel`、`selectedKbId`
  - `sendMessage()` → `fetch('/api/ai/chat')` → `handleSSE()` 流式解析
  - 会话列表缓存于 localStorage (`chatSessions_{uid}`)
- **ChatSidebar.vue** — 左侧栏：新建对话、会话列表、MCP 工具面板
- **ChatMessageArea.vue** — 消息展示 + 输入区
  - Markdown 渲染（marked + DOMPurify）
  - 图片预览（缩放/拖拽/下载）
  - 文件上传、语音录制、TTS 朗读
  - 「+」按钮展开附件功能区（模型选择、知识库、图片比例、朗读开关）

### 首页 `views/Home/home.vue`

英雄区 + 6 个功能卡片（多模态对话、AI 生图、知识库、角色扮演、聊天室、能力配置）+ 快速开始步骤

### 知识库 `views/KnowledgeBase/`

左侧 KB 列表 + 右侧文档管理：上传（txt/md/pdf/doc/docx）、语义搜索、状态标签

### 角色管理 `views/Agent/`

左侧角色列表 + 右侧编辑器：名称、头像上传、系统提示词、开场白

### 聊天室 `views/Room/`

- **index.vue** — 双标签页（我的房间 / 发现房间），创建/加入/删除
- **RoomChat.vue** — 实时多角色对话，Socket.IO 事件驱动

### 管理后台 `views/Admin/`

- **AdminLayout.vue** — 侧边栏 + 头部面包屑
  - 管理员菜单：对话统计、用户管理、API Key 管理
  - 所有用户：模型供应商配置
- **Providers.vue** — 能力配置页：LLM 和图片生成两块独立配置卡片

## API 封装

### Axios 实例 (`utils/http.ts`)

- `baseURL`: `VITE_BASE_URL + '/api'`
- 请求拦截器：自动附加 `Authorization: Bearer {token}`
- 响应拦截器：提取错误信息，按状态码分类日志

### API 模块 (`apis/`)

| 文件 | 端点前缀 | 主要函数 |
|------|----------|----------|
| `ai.ts` | `/ai` | `getChatHistory`、`chatWithAI`、`getSessions`、`deleteChatHistory`、`uploadFile` |
| `user.ts` | `/user` | `login`、`register`、`getUserInfo`、`verifyEmail` |
| `admin.ts` | `/admin` | `getCapabilities`、`updateLLMConfig`、`updateImageConfig`、`getSettings`、`getUsers` |
| `room.ts` | `/rooms` | `getRooms`、`createRoom`、`joinRoom`、`discoverRooms` |
| `knowledgeBase.ts` | `/kb` | `createKnowledgeBase`、`uploadDocumentsToKB`、`searchKB` |

### 特殊调用

- **SSE 流式**：`Chat/index.vue` 的 `sendMessage()` 使用原生 `fetch()` 直接读 `ReadableStream`（不用 axios，因为需要流式 body）
- **文件上传**：`uploadFile()` 和 `uploadDocumentsToKB()` 使用原生 `fetch()` + `FormData`
- **Socket.IO**：聊天室使用 `stores/socketStore.ts`（Pinia），自动处理连接/断开

## Pinia Store

| Store | 状态 | 用途 |
|-------|------|------|
| `userStore` | token, userInfo | 用户认证、localStorage 持久化 |
| `roomStore` | myRooms, currentRoom, messages | 聊天室状态管理 |
| `agentStore` | agents[], loading | 角色列表缓存 |
| `socketStore` | socket, connected | Socket.IO 连接状态 |

## 工具函数

| 文件 | 功能 |
|------|------|
| `http.ts` | Axios 实例 + 拦截器 |
| `sse.ts` | SSE 流解析（`handleSSE()`） |
| `socket.ts` | Socket.IO 单例（`connectSocket`） |
| `voiceRecording.ts` | 浏览器录音 composable（`useVoiceRecording`） |
| `tts.ts` | TTS 播放（`speak()`、`loadVoices()`） |

## 样式体系

### 设计令牌 (`styles/common.scss`)

```css
--color-primary: #4A90E2
--color-magic-gold: #D4AF37
--color-bg-deep: #0d1b2a
--color-bg-card: #1b3a5c
--color-bg-input: #162d45
--color-text-primary: #f5f5ff
--color-text-secondary: #a0b4cc
--font-pixel: 'Press Start 2P'
--font-body: 'Noto Sans SC'
```

### Element Plus 主题 (`styles/element-overrides.scss`)

通过 CSS 变量映射覆盖 Element Plus 默认主题：
- 按钮、输入框、下拉菜单、表格、对话框 → 深色科技风
- 焦点/Hover 状态 → 金色光晕
- 圆角 → 项目统一 `border-radius`

### 动画 (`assets/animations.css`)

像素淡入、光晕脉冲、粒子弹出、符文旋转等，仅使用 `transform` + `opacity`（GPU 合成），支持 `prefers-reduced-motion`。

## 启动

```bash
cd client
npm install
npm run dev       # 开发服务器 localhost:5173
npm run build     # 构建到 dist/
npm run preview   # 预览构建产物
```

## 环境变量

```env
VITE_BASE_URL=http://localhost:3000   # API 地址
VITE_API_URL=http://localhost:3000    # Socket.IO 地址
```

## 部署

构建 `dist/` 部署到 nginx，反代 `/api`、`/ws`、`/uploads` 到后端 `localhost:3000`。
