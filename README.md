# 奈克瑟 NEXUS

全栈 AI 对话平台，支持多模态对话、知识库 RAG、AI 角色扮演、实时聊天室、语音交互。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js + Express + TypeScript |
| 前端 | Vue 3 + Vite + Pinia + Element Plus |
| 小程序 | uni-app |
| 数据库 | MySQL + Redis |
| 向量存储 | LanceDB（本地嵌入式） |
| 实时通信 | Socket.IO / WebSocket |
| AI 能力 | 多供应商可配置（OpenAI 兼容 / Anthropic 格式） |
| 向量化 | 本地模型 bge-small-zh-v1.5（低配服务器自动降级 API） |

## 项目结构

```
aiconnent/
├── server/           # 后端 Express + TypeScript
├── client/           # Web 前端 Vue 3 + Vite
├── client-miniapp/   # 小程序/App uni-app
└── docs/             # 开发文档
```

## 快速启动

```bash
# 后端
cd server
cp .env.example .env
npm install
npm run dev             # http://localhost:3000

# Web 前端
cd client
npm install
npm run dev             # http://localhost:5173
```

## 核心功能

- **多模态 AI 对话** — 文本、图片、视频输入，SSE 流式输出，Agent 工具调用
- **AI 文生图** — 多供应商配置，多种宽高比
- **知识库 RAG** — 文档上传 → 本地向量化 → 混合检索（向量 + BM25）→ LLM 重排
- **AI 角色扮演** — 自定义角色名称、头像、系统提示词、开场白
- **聊天室** — 多角色实时对话，LLM 调度 + @ 提及
- **语音交互** — 语音转写（Whisper 降级 API）+ TTS 合成（Edge-TTS）
- **MCP 协议** — Playwright 浏览器自动化
- **游客模式** — 未登录可体验 10 次对话，IP 限流
- **管理后台** — 用户管理、对话统计、能力配置、API Key 管理

## 环境变量

```env
# 数据库
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ai_chat

# JWT
JWT_SECRET=your-secret-key

# LLM 默认配置（首次未保存能力配置时 fallback）
DASHSCOPE_API_KEY=sk-xxx
ARK_API_KEY=xxx

# 邮箱（注册验证码）
EMAIL_USER=xxx@qq.com
EMAIL_PASS=xxx

# 可选
TAVILY_API_KEY=xxx
REDIS_HOST=localhost
REDIS_PORT=6379
CLIENT_URL=http://localhost:5173
WS_PORT=3001
```

## API 概览

| 模块 | 前缀 | 关键端点 |
|------|------|----------|
| AI 对话 | `/api/ai` | `POST /chat`（SSE 流式）、`GET /sessions`、`GET /history` |
| AI 生图 | `/api/ai` | `POST /image` |
| 用户 | `/api/user` | `POST /register`、`POST /login`、`GET /info` |
| 知识库 | `/api/kb` | CRUD + `POST /:id/documents` + `POST /:id/search` |
| 角色 | `/api/agents` | CRUD |
| 聊天室 | `/api/rooms` | CRUD + 加入/发现 |
| 语音 | `/api/voice` | `/transcribe`、`/tts` |
| 管理后台 | `/api/admin` | 用户管理、对话统计、能力配置 |
| 上传 | `/api` | `/upload`、`/upload/avatar` |

## 部署

```bash
cd server && npm run build && npm start
cd client && npm run build
# dist/ 部署到 nginx，反代 /api、/ws、/uploads 到后端 localhost:3000
```

## 开发文档

详见 [docs/](./docs/) 目录。
