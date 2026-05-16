# 后端开发文档

## 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Node.js + TypeScript |
| 框架 | Express.js |
| 数据库 | MySQL（主存储） |
| 缓存 | Redis（可选） |
| 向量存储 | LanceDB（本地嵌入式） |
| 实时通信 | Socket.IO（Web）+ 原生 ws（小程序） |
| AI SDK | Anthropic SDK / OpenAI SDK / LangChain |

## 目录结构

```
server/src/
├── app.ts                 # 入口：Express 配置、中间件、WS 初始化
├── config/index.ts        # 动态配置系统（DB + env 双 fallback）
├── providers/             # AI 能力抽象层
│   ├── Manager.ts         # ProviderManager：LLM/生图双能力调度
│   ├── types.ts           # 能力配置类型
│   └── index.ts           # 导出
├── routes/                # 路由层
│   ├── ai.ts              # AI 对话（SSE）、生图、模型配置、游客状态
│   ├── user.ts            # 注册/登录/微信登录
│   ├── admin.ts           # 管理后台
│   ├── upload.ts          # 文件上传
│   ├── knowledgeBase.ts   # 知识库
│   ├── agent.ts           # AI 角色管理
│   ├── room.ts            # 聊天室
│   ├── voice.ts           # 语音识别/合成
│   └── mcp.ts             # MCP 协议
├── services/              # 业务逻辑层（详见下文）
├── controllers/           # 用户控制器（注册/登录逻辑）
├── models/                # MySQL 数据模型
├── middleware/             # 中间件
│   ├── auth.ts            # JWT 认证
│   └── admin.ts           # 管理员权限
└── utils/                 # 工具函数（DB 连接池、响应格式、限流）
```

## 核心架构

### 能力中心化设计

系统围绕两个核心能力组织，用户可自由配置：

```
CAPABILITY_LLM (JSON)     CAPABILITY_IMAGE (JSON)
├─ name                   ├─ name
├─ apiKey                 ├─ apiKey
├─ format (openai|anthropic) ├─ baseURL
├─ baseURL                ├─ model
├─ model                  ├─ requestTemplate
└─ requestTemplate        └─ defaultSize
```

- 存储在 `system_settings` 表，首次使用从 `.env` fallback
- `ProviderManager.getLLMConfig()` / `getImageConfig()` 统一读取
- 用户通过「能力配置」页面修改后立即生效

### AI 对话管线

```
POST /api/ai/chat
  ├─ 游客限流检查 (IP, 10次)
  ├─ 加载历史记录
  ├─ 保存用户消息
  ├─ 有媒体文件? → 多模态管线
  │   ├─ OpenAI 格式 → chatStreamRaw()
  │   └─ Anthropic 格式 → Anthropic SDK
  └─ 纯文本? → Agent 管线
      ├─ 自定义角色 → rolePlayStream()
      └─ NEXUS 默认 → LangChain Agent + Tools
```

### 游客模式

- 未登录用户访问 `/chat` 不限制
- 后端按 IP 计数，最多 10 次 AI 对话
- 服务重启或每 6 小时重置计数
- 超限返回提示："请注册账号后继续使用"

## 路由 API

### AI 对话 `routes/ai.ts` → `/api/ai`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/chat` | - | AI 对话（SSE 流式），游客限 10 次 |
| GET | `/guest-status` | - | 查询本 IP 游客剩余次数 |
| GET | `/models` | - | 获取 LLM/生图能力配置 + 图片比例列表 |
| GET | `/sessions` | auth | 获取当前用户的会话列表 |
| GET | `/history` | auth | 获取指定会话的对话历史 |
| DELETE | `/history` | auth | 删除会话及关联文件 |
| DELETE | `/memory` | auth + admin | 清空指定用户 RAG 记忆 |
| POST | `/image` | auth | AI 文生图 |

### 用户 `routes/user.ts` → `/api/user`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/register` | - | 注册（发送邮箱验证码） |
| POST | `/verify-email` | - | 验证邮箱完成注册 |
| POST | `/login` | - | 账号密码登录，返回 JWT |
| POST | `/wx-login` | - | 微信小程序登录 |
| GET | `/info` | auth | 获取当前用户信息 |
| POST | `/logout` | - | 退出登录 |

### 管理后台 `routes/admin.ts` → `/api/admin`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/dashboard` | admin | 后台首页 |
| GET/POST | `/users` | admin | 用户列表 / 创建用户 |
| PUT/DELETE | `/users/:id` | admin | 更新 / 删除用户 |
| GET | `/chat-stats` | admin | 对话统计数据 |
| GET | `/chat-history/:userId` | admin | 指定用户的对话历史 |
| GET/PUT | `/settings` | admin | 系统设置（脱敏展示） |
| GET | `/capabilities` | auth | 能力配置（LLM + Image，apiKey 脱敏返回） |
| PUT | `/capabilities/llm` | auth | 更新 LLM 配置（脱敏 key 不覆盖原值） |
| PUT | `/capabilities/image` | auth | 更新图片生成配置（脱敏 key 不覆盖原值） |

### 其他路由

| 模块 | 前缀 | 鉴权 | 关键端点 |
|------|------|------|----------|
| 知识库 | `/api/kb` | auth | CRUD + 文档上传 + 语义搜索 |
| 角色 | `/api/agents` | auth | CRUD |
| 聊天室 | `/api/rooms` | auth | CRUD + 加入/发现 |
| 上传 | `/api` | - | `/upload`、`/upload/avatar` |
| 语音 | `/api/voice` | - | `/transcribe`、`/voices`、`/tts` |
| MCP | `/api/mcp` | - | `/status`、`/toggle` |
| 文件下载 | `/api/fs/download` | - | 工作区文件下载（路径越界保护） |

## 服务层

### AI 核心

| 文件 | 职责 |
|------|------|
| `services/ai.ts` | 对话编排：历史加载、多模态解析、Agent/Anthropic 路径分发 |
| `services/agent.ts` | Agent 系统：`agentStream()`、`createChatAgent()`、LangChain Tools |
| `services/ragChain.ts` | RAG 管线：查询重写 → 向量检索 → 混合检索 → Small-to-Big → LLM 重排 |
| `services/embedding.ts` | 向量嵌入（本地模型 + Redis 缓存，低配服务器自动降级 API） |
| `services/memoryService.ts` | 对话记忆：用户/助手消息配对、分批摘要、分级检索 |
| `services/webSearch.ts` | 联网搜索（Tavily 主，DuckDuckGo 降级） |

### 房间 & 实时

| 文件 | 职责 |
|------|------|
| `services/roomChat.ts` | 多角色聊天室编排：广播、调度、并行生成 |
| `services/scheduler.ts` | 角色回复调度：LLM 决策 + @ 提及 fallback + 冷却 |
| `services/socket.ts` | Socket.IO 服务（Web 端） |
| `services/wsBridge.ts` | 原生 WebSocket 桥接（小程序端，端口 3001） |

### 其他

| 文件 | 职责 |
|------|------|
| `services/knowledgeBase.ts` | 知识库 CRUD + 文档解析入库 |
| `services/hybridSearch.ts` | BM25 + 向量混合检索融合 |
| `services/vectorStore.ts` | LanceDB 向量存储操作 |
| `services/documentPipeline.ts` | 文档解析（PDF/Word/Markdown） |
| `services/documentGenerator.ts` | 文档生成（PPTX/DOCX） |
| `services/videoProcessor.ts` | 视频处理（帧提取 + 语音识别） |
| `services/ttsService.ts` | 语音合成（Edge-TTS） |
| `services/fileSystem.ts` | Agent 文件系统工具（读写删列） |
| `services/mcp.ts` | MCP 客户端（Playwright 浏览器） |
| `services/cache.ts` | Redis 缓存封装 |
| `services/emailService.ts` | QQ 邮箱验证码 |
| `services/guestLimit.ts` | 游客 IP 限流 |

## 数据模型

| 表 | 模型文件 | 关键字段 |
|------|----------|----------|
| `users` | `models/user.ts` | id, username, email, password, role, email_verified |
| `verification_codes` | `models/verificationCode.ts` | email, code(6位), username, password |
| `chat_history` | `models/chatHistory.ts` | session_id, user_id, role, content, files(JSON), kb_id, agent_id, room_id |
| `ai_agents` | `models/agent.ts` | user_id, name, avatar, system_prompt, greeting |
| `knowledge_bases` | `models/knowledgeBase.ts` | user_id, name, lancedb_table_name |
| `kb_documents` | `models/kbDocument.ts` | kb_id, filename, file_type, status |
| `kb_chunks` | `models/kbChunk.ts` | doc_id, kb_id, chunk_index |
| `chat_rooms` | `models/room.ts` | owner_id, name, topic |
| `chat_room_agents` | 同上 | room_id, agent_id |
| `chat_room_members` | 同上 | room_id, user_id |
| `system_settings` | 无模型（直接 SQL） | key_name, value |
| `wechat_users` | `models/user.ts` | openid, user_id |

## 配置系统

`config/index.ts` 的动态配置机制：

```
优先级：数据库 system_settings > 环境变量 .env > 硬编码默认值
```

- `initDynamicConfig()` — 启动时从 DB 加载全部配置到内存 Map
- `getSetting(key)` — 读取配置值
- `updateSetting(key, value)` — 写入 DB + 更新内存
- `SETTING_KEYS` 白名单控制可动态修改的配置项

### 环境变量

```
DB_HOST / DB_USER / DB_PASSWORD / DB_NAME   # MySQL
JWT_SECRET                                    # JWT 密钥
DASHSCOPE_API_KEY                            # LLM 默认 API Key（首次 fallback）
ARK_API_KEY                                  # 生图默认 API Key（首次 fallback）
TAVILY_API_KEY                               # 联网搜索（可选）
REDIS_HOST / REDIS_PORT                      # Redis（可选）
EMAIL_USER / EMAIL_PASS                      # QQ 邮箱 SMTP
CLIENT_URL                                    # 前端地址（邮件链接）
CORS_ORIGINS                                  # 跨域白名单
WS_PORT                                       # 小程序 WS 端口（默认 3001）
```

## 启动

```bash
cd server
cp .env.example .env
npm install
npm run dev       # nodemon 热重载
npm run build     # tsc 编译
npm start         # 生产运行
```

## 端口

| 端口 | 服务 |
|------|------|
| 3000 | HTTP API + Socket.IO |
| 3001 | 原生 WebSocket（小程序） |
