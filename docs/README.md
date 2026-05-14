# 奈克瑟 NEXUS 开发文档

## 项目结构

```
aiconnent/
├── server/          # 后端 Express + TypeScript
├── client/          # Web 前端 Vue 3 + Vite
├── client-miniapp/  # 小程序/App uni-app
└── docs/            # 文档
```

---

## 一、后端 (server/)

### 技术栈
- Express.js + TypeScript
- MySQL（主数据库）
- Redis（缓存/会话）
- WebSocket（Socket.IO + 原生 ws）
- LanceDB（向量存储 / RAG 记忆）

### 目录结构
```
server/src/
├── app.ts               # 入口，Express / CORS / 中间件 / WS 初始化
├── config/index.ts      # 动态配置加载（DB system_settings + env fallback）
├── providers/           # AI 能力抽象层
│   ├── Manager.ts       # ProviderManager — 能力配置、双格式 LLM 调用
│   ├── types.ts         # 能力配置类型定义
│   └── index.ts         # 导出
├── routes/              # 路由层
│   ├── ai.ts            # AI 对话（流式 SSE）、生图、模型配置、游客状态
│   ├── user.ts          # 用户注册/登录/微信登录
│   ├── admin.ts         # 管理后台（用户管理、系统设置、能力配置）
│   ├── upload.ts        # 文件上传（图片/文档/视频）
│   ├── knowledgeBase.ts # 知识库 CRUD + RAG 检索
│   ├── agent.ts         # AI 角色管理
│   ├── room.ts          # 聊天室 CRUD
│   ├── voice.ts         # 语音识别/合成
│   └── mcp.ts           # MCP 协议
├── services/            # 业务逻辑层
│   ├── ai.ts            # AI 对话核心（多模态 + Agent 管线）
│   ├── agent.ts         # 角色系统（角色扮演 / Agent 工具调用）
│   ├── roomChat.ts      # 聊天室自动调度
│   ├── scheduler.ts     # 聊天室角色回复冷却调度
│   ├── ragChain.ts      # RAG 检索增强（查询重写 / 重排 / 混合检索）
│   ├── hybridSearch.ts  # 混合检索（向量 + BM25）
│   ├── vectorStore.ts   # LanceDB 向量存储
│   ├── knowledgeBase.ts # 知识库引擎
│   ├── embedding.ts     # 文本嵌入
│   ├── memoryService.ts # 对话记忆管理（分级检索 + 摘要）
│   ├── guestLimit.ts    # 游客限流（IP 维度 10 次）
│   ├── webSearch.ts     # 联网搜索（Tavily / DuckDuckGo）
│   ├── documentPipeline.ts # 文档解析流水线（PDF / Word / Markdown）
│   ├── documentGenerator.ts # 文档生成（PPTX / DOCX）
│   ├── ttsService.ts    # 语音合成
│   ├── videoProcessor.ts # 视频处理 / 语音识别
│   ├── fileSystem.ts    # MCP 文件系统工具
│   ├── mcp.ts           # MCP 客户端（Playwright 浏览器等）
│   ├── socket.ts        # Socket.IO 服务（Web 端实时）
│   ├── wsBridge.ts      # 小程序 WebSocket 桥接
│   ├── cache.ts         # Redis 缓存
│   ├── emailService.ts  # QQ 邮箱验证码
│   └── rateLimit.ts     # API 限流
├── controllers/         # 控制器（用户注册/登录）
├── models/              # 数据模型（MySQL）
├── middleware/           # 中间件（JWT 认证 / 管理员权限）
└── utils/               # 工具函数
```

### AI 能力架构

系统围绕两大核心能力组织，用户可在前端自由配置：

| 能力 | 配置项 | 存储 |
|------|--------|------|
| **大语言模型 (LLM)** | 供应商名、API Key、接口格式（OpenAI/Anthropic）、baseURL、模型、请求模板 | `system_settings` → `CAPABILITY_LLM` JSON |
| **图片生成 (Image)** | 供应商名、API Key、baseURL、模型、默认尺寸、请求模板 | `system_settings` → `CAPABILITY_IMAGE` JSON |

- 首次使用自动从 `.env` 的 `DASHSCOPE_API_KEY` / `ARK_API_KEY` fallback
- 用户在「能力配置」页面保存后，配置持久化到数据库
- `ProviderManager.chatCompletion()` 自动适配 OpenAI / Anthropic 双格式
- `ProviderManager.chatStreamRaw()` 走 OpenAI 兼容 `/v1/chat/completions` SSE 流

### 启动
```bash
cd server
npm install
cp .env.example .env   # 编辑 .env 填写基础配置
npm run dev             # 开发模式（nodemon）
# 或
npm run build && npm start  # 生产模式
```

### 服务端口
| 服务 | 端口 | 说明 |
|------|------|------|
| HTTP API | 3000 | Express REST |
| WebSocket (小程序) | 3001 | 原生 ws，路径 `/ws` |
| Socket.IO | 3000 | 挂载在 HTTP 上 |

### 主要 API
| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | /api/user/login | - | 用户登录 |
| POST | /api/user/register | - | 用户注册 |
| GET | /api/ai/models | - | 获取 LLM/生图能力配置 |
| GET | /api/ai/guest-status | - | 游客剩余提问次数 |
| POST | /api/ai/chat | - | AI 对话（SSE 流式），游客限 10 次 |
| POST | /api/ai/image | - | AI 文生图 |
| DELETE | /api/ai/memory | admin | 清空用户 RAG 记忆 |
| POST | /api/upload | 登录 | 文件上传 |
| GET/POST | /api/kb | 登录 | 知识库 CRUD |
| GET/POST | /api/agents | 登录 | AI 角色管理 |
| GET/POST | /api/rooms | 登录 | 聊天室 CRUD |
| GET/PUT | /api/admin/capabilities | 登录 | 能力配置（LLM / Image） |
| PUT | /api/admin/capabilities/llm | 登录 | 更新 LLM 配置 |
| PUT | /api/admin/capabilities/image | 登录 | 更新图片生成配置 |
| GET/PUT | /api/admin/settings | admin | 系统设置管理 |
| GET | /api/admin/users | admin | 用户管理 |
| GET | /api/admin/chat-stats | admin | 对话统计 |
| POST | /api/voice/transcribe | 登录 | 语音转文字 |
| GET | /api/fs/download | 登录 | 工作区文件下载 |

### 环境变量（.env）

详见 `server/.env.example`，核心变量：

```
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME  # MySQL
JWT_SECRET                              # JWT 密钥
DASHSCOPE_API_KEY                       # LLM 默认 API Key（首次 fallback）
ARK_API_KEY                             # 生图默认 API Key（首次 fallback）
TAVILY_API_KEY                          # 联网搜索（可选，不填降级 DuckDuckGo）
REDIS_HOST, REDIS_PORT                  # Redis（可选）
EMAIL_USER, EMAIL_PASS                  # QQ 邮箱 SMTP
CORS_ORIGINS                            # 跨域白名单
WS_PORT                                 # 小程序 WS 端口（默认 3001）
```

---

## 二、Web 前端 (client/)

### 技术栈
- Vue 3 + TypeScript + Vite
- Element Plus（UI）
- Pinia（状态管理）
- Axios（HTTP）

### 目录结构
```
client/src/
├── main.ts             # 入口
├── App.vue             # 根组件
├── views/              # 页面
│   ├── Layout/         # 主布局（Header 导航）
│   ├── Home/           # 首页
│   ├── Chat/           # AI 对话页（消息区 + 侧边栏）
│   ├── Room/           # 聊天室
│   ├── KnowledgeBase/  # 知识库管理
│   ├── Agent/          # 角色管理
│   ├── Admin/          # 管理后台
│   │   ├── AdminLayout.vue   # 后台框架
│   │   ├── Dashboard.vue     # 对话统计
│   │   ├── Users.vue         # 用户管理
│   │   ├── ApiKeys.vue       # 系统配置管理
│   │   └── Providers.vue     # 能力配置（LLM/生图）
│   ├── Login/          # 登录
│   └── Register/       # 注册
├── apis/               # API 请求封装
├── stores/             # Pinia Store
├── router/             # 路由配置
├── utils/              # 工具（SSE、语音、WebSocket、HTTP）
├── styles/             # 全局样式/CSS 变量
└── assets/             # 静态资源
```

### 路由与权限

| 路由 | 权限 | 说明 |
|------|------|------|
| `/` | 公开 | 首页 |
| `/chat` | 公开（游客） | AI 对话，游客限 10 次提问 |
| `/rooms` | 登录 | 聊天室 |
| `/agents` | 登录 | 角色管理 |
| `/knowledge-base` | 登录 | 知识库 |
| `/admin/*` | 部分公开 | 管理后台 |
| `/admin/providers` | 登录 | 能力配置（所有用户可用） |
| `/admin/dashboard` | admin | 对话统计 |
| `/admin/users` | admin | 用户管理 |
| `/admin/api-keys` | admin | 系统配置 |

### 游客模式
- 未登录用户可直接进入 `/chat` 进行 AI 对话
- 后端按 IP 限制最多 10 次提问
- 导航栏显示「游客模式」标签
- `/rooms`、`/agents` 需登录（后端 API 要求认证）

### 启动
```bash
cd client
npm install
npm run dev     # 开发服务器 localhost:5173
npm run build   # 构建到 dist/
```

### 生产部署
构建后 `dist/` 部署到 nginx，反代 API 到 `localhost:3000`。

---

## 三、小程序/App (client-miniapp/)

### 技术栈
- uni-app（Vue 3 + Vite）
- uni-ui（跨端组件）

### 启动
```bash
cd client-miniapp
npm install

# 微信小程序
npm run dev:mp-weixin     # 开发
npm run build:mp-weixin   # 构建

# Android App
npm run build:app         # 构建 → 用 HBuilderX 打包
```

### 构建产物
| 命令 | 产物 |
|------|------|
| build:mp-weixin | `dist/build/mp-weixin` → 微信开发者工具导入 |
| build:app | `dist/build/app` → HBuilderX 打包 APK |

---

## 四、Nginx 反代配置参考

```nginx
server {
    listen 443 ssl;
    server_name www.nexusdown.xyz;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # HTTP API
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket（小程序）
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 上传文件
    location /uploads/ {
        proxy_pass http://localhost:3000;
    }
}
```

---

## 五、常用命令

```bash
# 服务器
cd server && npm run dev              # 开发
cd server && npm run build && npm start  # 生产

# Web 端
cd client && npm run dev              # 开发
cd client && npm run build            # 构建

# 小程序
cd client-miniapp && npm run dev:mp-weixin    # 开发
cd client-miniapp && npm run build:mp-weixin  # 构建

# Git
git pull
# 服务器冲突时：
git stash && git pull && git stash pop
```
