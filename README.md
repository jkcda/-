# AI 智能对话系统

基于大模型接口实现的智能对话系统，支持用户注册登录、AI 对话（含多模态文件上传与 RAG 知识库检索增强）、知识库管理、会话管理、后台管理等完整功能。

## 项目简介

全栈 AI 对话系统，前端 Vue 3 + Element Plus，后端 Node.js + Express + TypeScript，数据库 MySQL。集成 Anthropic SDK 实现 AI 流式对话，通过 **LangChain.js + LanceDB** 实现 RAG（检索增强生成）架构，支持打字机效果输出、多会话管理、图片/文档上传分析、知识库管理。

## 功能特性

- 用户注册与登录
- JWT 身份认证 + 管理员权限控制
- AI 智能对话（SSE 流式输出 + 打字机效果）
- **RAG 知识库**：创建知识库、上传文档、自动分块向量化、语义检索增强生成
- **多模态支持**：图片上传（base64 发送给 AI 分析）、文档上传（txt/md/pdf/docx 文本提取）
- **AI 角色扮演**：创建自定义 AI 角色（人设 + 背景故事 + 初始场景 + 自定义头像），会话级角色绑定
- **角色召唤奈瑟斯**：在角色对话中输入"@奈瑟斯"等关键词可临时唤出奈克瑟 NEXUS 本体
- **真人化回复**：自定义角色使用口语化风格，无 Markdown / emoji，像真人聊天
- 多会话管理（新建、切换、删除历史会话）
- 对话历史持久化（MySQL 存储，用户隔离）
- 管理员后台（用户管理 CRUD、对话统计可视化）
- 响应式界面设计

## 技术栈

### 前端

- Vue 3 + TypeScript (Composition API)
- Element Plus UI 组件库
- Vue Router 路由管理
- Pinia 状态管理（持久化）
- Axios HTTP 封装
- Marked（Markdown 渲染）

### 后端

- Node.js + Express + TypeScript (ESM)
- MySQL 数据库（mysql2）
- JWT 认证（jsonwebtoken）
- bcryptjs 密码加密
- Anthropic AI SDK（通过 ModelScope 代理）
- **LangChain.js**（文本分块、Embedding 封装）
- **LanceDB**（嵌入式向量数据库）
- **DashScope Embedding**（text-embedding-v3，1024 维）
- Multer（文件上传）
- pdf-parse / mammoth（文档解析）

## 项目结构

```
aiconnent/
├── client/                     # 前端项目
│   ├── src/
│   │   ├── apis/              # API 接口层（ai.ts, user.ts, admin.ts）
│   │   ├── router/            # 路由配置与守卫
│   │   ├── stores/            # Pinia 状态管理
│   │   ├── utils/             # 工具函数（HTTP 封装、SSE 处理）
│   │   ├── styles/            # 公共样式
│   │   └── views/             # 页面组件
│   │       ├── Chat/          # AI 对话页面（组件化解耦）
│   │       │   ├── index.vue
│   │       │   └── components/
│   │       │       ├── ChatSidebar.vue  # 侧边栏 + 角色选择弹窗
│   │       │       └── ChatMessageArea.vue
│   │       ├── Agent/          # AI 角色扮演管理页面
│   │       │   └── AgentManager.vue  # 创建/编辑/删除自定义角色
│   │       ├── KnowledgeBase/ # 知识库管理页面
│   │       │   ├── index.vue
│   │       │   └── components/
│   │       │       ├── KBList.vue
│   │       │       └── KBDocumentList.vue
│   │       ├── Layout/        # 前台布局（Header + Content）
│   │       ├── Home/          # 首页
│   │       ├── Login/         # 登录页
│   │       ├── Register/      # 注册页
│   │       └── Admin/         # 后台管理页
│   ├── vite.config.ts         # Vite 配置（含 API/上传代理）
│   └── package.json
├── server/                    # 后端项目
│   ├── src/
│   │   ├── config/            # 配置文件
│   │   ├── controllers/       # 控制器
│   │   ├── middleware/        # 中间件（auth, admin）
│   │   ├── models/            # 数据模型（user, chatHistory, knowledgeBase, kbDocument, kbChunk, agent）
│   │   ├── routes/            # 路由（user, ai, admin, upload, knowledgeBase, agent）
│   │   ├── services/          # 服务层（ai+RAG, embedding, vectorStore, documentPipeline, ragChain）
│   │   ├── types/             # 类型定义
│   │   ├── utils/             # 工具函数（DB 连接池、响应封装）
│   │   └── app.ts             # 应用入口
│   ├── data/lancedb/          # LanceDB 向量数据存储
│   ├── uploads/               # 上传文件存储目录
│   ├── database.sql           # 数据库建表脚本
│   └── package.json
├── README.md                  # 本文档
└── (开发文档见 client/frontend-dev-doc.md 和 server/backend-dev-doc.md)
```

## 安装步骤

### 1. 数据库配置

创建 MySQL 数据库并执行 SQL 脚本：

```bash
mysql -u root -p
CREATE DATABASE ai_chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ai_chat;
SOURCE server/database.sql;
```

### 2. 后端配置

```bash
cd server
npm install
```

配置环境变量（创建 `.env` 文件）：

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ai_chat
JWT_SECRET=your_super_secret_key
DASHSCOPE_API_KEY=your_api_key
```

启动后端服务：

```bash
npm run dev
```

服务运行在 `http://localhost:3000`

### 3. 前端配置

```bash
cd client
npm install
npm run dev
```

前端运行在 `http://localhost:5173`，已配置代理转发 `/api` 和 `/uploads` 到后端。

## 使用说明

### 用户注册登录

1. 访问 `http://localhost:5173/register` 注册账号
2. 访问 `http://localhost:5173/login` 登录

### AI 对话

1. 登录后访问 `http://localhost:5173/front/chat`
2. 输入问题，按 Enter 或点击发送
3. AI 以打字机流式效果回复
4. 左侧侧边栏可新建、切换、删除对话

### 多模态上传

1. 在输入区左侧点击 📷 上传图片或 📁 上传文档
2. 已选文件在上方预览条展示
3. 输入问题后发送，AI 将分析文件内容并回复
4. 支持格式：图片（JPEG/PNG/GIF/WebP）、文档（TXT/MD/PDF/DOC/DOCX）

### AI 角色扮演

1. 点击顶部导航栏"角色扮演"进入 `/agents` 管理页面
2. 创建角色：设置角色名、人设背景（system prompt）、初始场景（greeting），可选自定义头像
3. 回到对话页面，点击"新对话"按钮，在弹出的角色选择面板中选择已创建的角色
4. 每个会话锁定一个角色，角色间记忆隔离（不同 session_id）
5. 角色扮演模式下禁用文件上传和工具调用，仅纯对话
6. 在角色对话中发送"@奈瑟斯"或"召唤奈瑟斯"可临时唤出奈克瑟 NEXUS 本体

## 数据库表结构

### users 表（用户表）

| 字段          | 类型           | 说明             |
| ----------- | ------------ | -------------- |
| id          | INT          | 用户 ID（主键）      |
| username    | VARCHAR(50)  | 用户名（唯一）        |
| email       | VARCHAR(100) | 邮箱（唯一）         |
| password    | VARCHAR(255) | 密码（bcrypt 加密）  |
| role        | ENUM         | 角色（admin/user） |
| created\_at | TIMESTAMP    | 创建时间           |
| updated\_at | TIMESTAMP    | 更新时间           |

### chat\_history 表（对话历史表）

| 字段                | 类型           | 说明                         |
| ----------------- | ------------ | -------------------------- |
| id                | INT          | 记录 ID（主键）                  |
| session\_id       | VARCHAR(100) | 会话 ID（格式: session_{userId}_{timestamp}_{random}） |
| user\_id          | INT          | 用户 ID（可为空）                 |
| role              | ENUM         | 角色（user/assistant）         |
| content           | TEXT         | 对话内容                       |
| files             | JSON         | 附件列表 `[{name, url, type}]` |
| kb\_id            | INT          | 关联知识库 ID（RAG）              |
| agent\_id         | INT          | 关联角色 ID（角色扮演）             |
| retrieved\_chunks | JSON         | 检索分块摘要                     |
| created\_at       | TIMESTAMP    | 创建时间                       |

### ai\_agents 表（AI 角色表）

| 字段             | 类型           | 说明                     |
| -------------- | ------------ | ---------------------- |
| id             | INT          | 角色 ID（主键）              |
| user\_id       | INT          | 所属用户 ID（CASCADE 删除）    |
| name           | VARCHAR(100) | 角色名                    |
| avatar         | VARCHAR(500) | 头像 URL                  |
| system\_prompt | TEXT         | 人设 + 背景故事（写入 system prompt） |
| greeting       | TEXT         | 初始场景（首次对话的上下文，不直接输出）    |
| model\_config  | JSON         | 可选模型覆盖                 |
| is\_default    | BOOLEAN      | 是否默认角色                 |
| created\_at    | TIMESTAMP    | 创建时间                   |
| updated\_at    | TIMESTAMP    | 更新时间                   |

### knowledge\_bases 表（知识库表）

| 字段                   | 类型           | 说明         |
| -------------------- | ------------ | ---------- |
| id                   | INT          | 知识库 ID（主键） |
| user\_id             | INT          | 所属用户 ID    |
| name                 | VARCHAR(200) | 知识库名称      |
| description          | TEXT         | 知识库描述      |
| lancedb\_table\_name | VARCHAR(100) | LanceDB 表名 |
| document\_count      | INT          | 文档数量       |
| chunk\_count         | INT          | 分块总数       |

### kb\_documents 表（知识库文档表）

| 字段           | 类型           | 说明                                        |
| ------------ | ------------ | ----------------------------------------- |
| id           | INT          | 文档 ID（主键）                                 |
| kb\_id       | INT          | 所属知识库 ID                                  |
| filename     | VARCHAR(500) | 原始文件名                                     |
| file\_type   | VARCHAR(100) | MIME 类型                                   |
| status       | ENUM         | 处理状态（pending/processing/completed/failed） |
| chunk\_count | INT          | 分块数量                                      |

> 向量嵌入数据存储在 LanceDB 嵌入式数据库中（`server/data/lancedb/`），MySQL 仅存储元数据索引。

## API 接口

### 用户模块

- `POST /api/user/register` — 注册
- `POST /api/user/login` — 登录
- `GET /api/user/info` — 获取用户信息
- `POST /api/user/logout` — 退出登录

### AI 对话模块

- `POST /api/ai/chat` — AI 对话（SSE 流式输出，支持多模态 files 参数，支持 agentId 指定角色）
- `GET /api/ai/history` — 获取对话历史
- `DELETE /api/ai/history` — 删除对话历史
- `GET /api/ai/sessions` — 获取会话列表（含 agent_id / agent_name / agent_avatar）

### 文件上传

- `POST /api/upload` — 上传文件（图片/文档）
- `POST /api/upload/avatar` — 上传角色头像（仅图片，2MB 限制）

### AI 角色模块

- `GET /api/agents` — 获取当前用户的所有自定义角色
- `POST /api/agents` — 创建角色（name, systemPrompt, greeting?, avatar?）
- `PUT /api/agents/:id` — 更新角色信息
- `DELETE /api/agents/:id` — 删除角色

### 知识库模块（RAG）

- `POST /api/kb` — 创建知识库
- `GET /api/kb` — 获取知识库列表
- `GET /api/kb/:kbId` — 获取知识库详情
- `DELETE /api/kb/:kbId` — 删除知识库
- `POST /api/kb/:kbId/documents` — 上传文档（自动解析分块向量化）
- `GET /api/kb/:kbId/documents` — 获取知识库文档列表
- `DELETE /api/kb/:kbId/documents/:docId` — 删除知识库文档
- `POST /api/kb/:kbId/search` — 在知识库中检索

### 管理员模块

- `GET /api/admin/dashboard` — 后台首页
- `GET /api/admin/users` — 用户列表
- `POST /api/admin/users` — 创建用户
- `PUT /api/admin/users/:id` — 更新用户
- `DELETE /api/admin/users/:id` — 删除用户
- `GET /api/admin/chat-stats` — 对话统计
- `GET /api/admin/chat-history/:userId` — 用户对话历史

## 开发文档

详细开发文档：

- [前端开发文档](client/frontend-dev-doc.md)
- [后端开发文档](server/backend-dev-doc.md)

## 常见问题

### 图片在前端不显示？

Vite 开发服务器需代理 `/uploads` 到后端 `localhost:3000`，已在 `vite.config.ts` 中配置。

### 数据库 migrate？

若 chat\_history 表已存在，需手动执行：

```sql
ALTER TABLE chat_history ADD COLUMN files JSON NULL COMMENT '附件列表' AFTER content;
```

### 如何修改 AI 模型？

在 `server/src/config/index.ts` 中修改 `ai.model` 和 `ai.baseURL` 配置项。

## 许可证

MIT License
