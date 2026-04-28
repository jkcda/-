# AI 智能对话系统 - 后端开发文档

## 📋 项目概述

本项目是基于 **Node.js + Express + TypeScript** 构建的 AI 智能对话系统后端服务。采用 RESTful API 设计，提供用户认证、AI 对话（流式输出）、对话历史管理等核心功能。集成 Anthropic Claude API 实现智能对话能力。

### 技术栈

- **运行时**: Node.js (ESM 模块)
- **框架**: Express 5.2+
- **语言**: TypeScript 6.0+
- **数据库**: MySQL (mysql2/promise)
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
- **AI 服务**: Anthropic SDK (@anthropic-ai/sdk)
- **环境配置**: dotenv
- **跨域支持**: cors
- **开发工具**: nodemon + tsx

---

## 📁 目录结构

```
server/
├── src/
│   ├── app.ts                      # 应用入口文件
│   ├── config/
│   │   └── index.ts                # 配置管理（环境变量）
│   ├── controllers/
│   │   └── user.ts                 # 用户控制器
│   ├── middleware/
│   │   ├── auth.ts                 # JWT 认证中间件
│   │   ├── admin.ts                # 管理员权限中间件
│   │   └── index.ts                # 中间件导出
│   ├── models/
│   │   ├── user.ts                 # 用户数据模型
│   │   └── chatHistory.ts          # 对话历史数据模型
│   ├── routes/
│   │   ├── user.ts                 # 用户路由
│   │   ├── admin.ts                # 管理员路由
│   │   └── ai.ts                   # AI 对话路由
│   ├── services/
│   │   └── ai.ts                   # AI 服务层
│   ├── types/
│   │   └── globel.d.ts             # 全局类型定义
│   └── utils/
│       ├── db.ts                   # 数据库连接池
│       ├── index.ts                # 工具函数导出
│       └── response.ts             # 统一响应工具类
├── .env.example                    # 环境变量示例
├── database.sql                    # 数据库建表脚本
├── package.json                    # 项目依赖配置
├── tsconfig.json                   # TypeScript 配置
└── README.md                       # 项目说明
```

---

## ⚙️ 核心配置

### 环境变量配置 ([config/index.ts](src/config/index.ts))

```typescript
const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000
  },
  
  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ai_chat'
  },
  
  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key',
    expiresIn: '7d'
  },
  
  // AI 配置
  ai: {
    apiKey: process.env.DASHSCOPE_API_KEY || '',
    model: 'Qwen/Qwen3.5-35B-A3B',
    maxTokens: 1024,
    baseURL: 'https://api-inference.modelscope.cn'
  },
  
  // 上下文配置
  context: {
    maxChars: 10000  // 上下文最大字符数
  }
}
```

### 必需的环境变量 (.env)

```env
# 服务器端口
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ai_chat

# JWT 密钥（生产环境必须修改！）
JWT_SECRET=your-super-secret-key

# AI API 密钥
DASHSCOPE_API_KEY=your-api-key
```

---

## 🗄️ 数据库设计

### 数据库表结构 ([database.sql](database.sql))

#### 用户表 (users)

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 用户 ID |
| username | VARCHAR(50) | NOT NULL, UNIQUE | 用户名 |
| email | VARCHAR(100) | NOT NULL, UNIQUE | 邮箱 |
| password | VARCHAR(255) | NOT NULL | 密码（bcrypt 加密） |
| role | ENUM('admin','user') | DEFAULT 'user' | 用户角色 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

#### 对话历史表 (chat_history)

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 历史记录 ID |
| session_id | VARCHAR(100) | NOT NULL | 会话 ID |
| user_id | INT | NULL, FOREIGN KEY | 用户 ID（可为空） |
| role | ENUM('user','assistant') | NOT NULL | 角色 |
| content | TEXT | NOT NULL | 对话内容 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- `idx_session_id`: 会话 ID 索引
- `idx_user_id`: 用户 ID 索引
- 外键约束：`user_id` → `users(id)` ON DELETE CASCADE

---

## 🔌 API 接口文档

### 基础信息

- **Base URL**: `http://localhost:3000/api`
- **Content-Type**: `application/json`
- **认证方式**: Bearer Token (JWT)

### 统一响应格式

**成功响应：**
```json
{
  "success": true,
  "message": "操作成功",
  "result": { ... }
}
```

**错误响应：**
```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息"
}
```

---

### 1. 用户模块 (`/api/user`)

#### 1.1 用户注册

**接口地址:** `POST /api/user/register`

**请求参数：**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "123456"
}
```

**参数验证规则：**
- `username`: 必填，3-20 字符
- `email`: 必填，合法邮箱格式
- `password`: 必填，至少 6 位字符

**成功响应 (201):**
```json
{
  "success": true,
  "message": "注册成功",
  "result": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

**错误情况：**
- 400: 参数缺失或格式错误
- 400: 用户名已存在
- 400: 邮箱已被注册
- 500: 服务器内部错误

**实现代码位置:** [controllers/user.ts - register()](src/controllers/user.ts#L8-L50)

---

#### 1.2 用户登录

**接口地址:** `POST /api/user/login`

**请求参数：**
```json
{
  "username": "testuser",
  "password": "123456"
}
```

**成功响应 (200):**
```json
{
  "success": true,
  "message": "登录成功",
  "result": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "role": "user"
    }
  }
}
```

**错误情况：**
- 400: 参数缺失
- 401: 用户名或密码错误
- 500: 服务器内部错误

**实现逻辑：**
1. 验证必填字段
2. 根据用户名查找用户
3. 使用 bcrypt 验证密码
4. 生成 JWT Token（有效期 7 天）
5. 返回 Token 和用户信息

**实现代码位置:** [controllers/user.ts - login()](src/controllers/user.ts#L52-L95)

---

#### 1.3 获取用户信息

**接口地址:** `GET /api/user/info`

**请求头：**
```
Authorization: Bearer <token>
```

**成功响应 (200):**
```json
{
  "success": true,
  "message": "操作成功",
  "result": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "role": "user",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

**错误情况：**
- 401: 未提供 Token 或 Token 无效
- 404: 用户不存在
- 500: 服务器内部错误

**中间件:** 需要 `authMiddleware` 认证

---

#### 1.4 退出登录

**接口地址:** `POST /api/user/logout`

**请求头：**
```
Authorization: Bearer <token>
```

**成功响应 (200):**
```json
{
  "success": true,
  "message": "退出登录成功",
  "result": null
}
```

**说明:** 仅清除服务端状态，保留对话历史数据

---

### 2. AI 对话模块 (`/api/ai`)

#### 2.1 AI 对话（流式输出）

**接口地址:** `POST /api/ai/chat`

**Content-Type:** `text/event-stream` (SSE 流式响应)

**请求参数：**
```json
{
  "message": "你好，请介绍一下自己",
  "session_id": "session_1700000000_abc123",
  "user_id": 1
}
```

**参数说明：**
- `message`: 必填，用户消息内容
- `session_id`: 必填，会话标识符
- `user_id`: 可选，用户 ID（已登录用户）

**SSE 响应格式：**
```
data: {"content":"你"}

data: {"content":"好"}

data: {"content":"！"}

data: [DONE]
```

**实现流程：**
1. 验证参数完整性
2. 设置 SSE 响应头
3. 从数据库获取历史对话（根据 session_id 和 user_id）
4. 构建上下文（限制最大字符数）
5. 保存用户消息到数据库
6. 调用 Anthropic API（流式模式）
7. 实时推送 AI 回复片段
8. 保存完整助手回复到数据库
9. 发送结束标记 `[DONE]`

**上下文构建策略：**
```typescript
function buildContext(messages, maxChars = 2000) {
  // 从最新消息往前拼接
  // 控制总字符数不超过 maxChars
  // 格式: "用户: xxx\n助手: xxx\n"
}
```

**实现代码位置:** 
- 路由: [routes/ai.ts](src/routes/ai.ts#L10-L60)
- 服务: [services/ai.ts - chatWithAIStream()](src/services/ai.ts#L70-L102)

---

#### 2.2 获取对话历史

**接口地址:** `GET /api/ai/history`

**查询参数：**
- `session_id`: 必填，会话 ID
- `user_id`: 可选，用户 ID

**请求示例：**
```
GET /api/ai/history?session_id=session_1700000000_abc123&user_id=1
```

**成功响应 (200):**
```json
{
  "success": true,
  "message": "获取对话历史成功",
  "result": {
    "messages": [
      {
        "role": "user",
        "content": "你好"
      },
      {
        "role": "assistant",
        "content": "你好！我是 AI 助手..."
      }
    ]
  }
}
```

**数据查询逻辑：**
```sql
SELECT * FROM chat_history 
WHERE session_id = ? AND user_id = ?
ORDER BY created_at ASC
```

**说明：** 同时匹配 session_id 和 user_id，确保用户只能看到自己的对话

---

#### 2.3 删除对话历史

**接口地址:** `DELETE /api/ai/history`

**查询参数：**
- `session_id`: 必填，会话 ID
- `user_id`: 可选，用户 ID

**成功响应 (200):**
```json
{
  "success": true,
  "message": "对话历史已清空",
  "result": null
}
```

---

#### 2.4 获取会话列表

**接口地址:** `GET /api/ai/sessions`

**查询参数：**
- `userId`: 可选，用户 ID

**请求示例：**
```
GET /api/ai/sessions?userId=1
```

**成功响应 (200):**
```json
{
  "success": true,
  "message": "获取会话列表成功",
  "result": {
    "sessions": [
      {
        "session_id": "session_1700000000_abc123",
        "created_at": "2026-04-28T10:00:00.000Z",
        "last_active_at": "2026-04-28T12:00:00.000Z",
        "message_count": 8,
        "first_message": "你好，请介绍一下自己"
      }
    ]
  }
}
```

**查询逻辑：**
```sql
SELECT session_id,
  MIN(created_at) AS created_at,
  MAX(created_at) AS last_active_at,
  COUNT(*) AS message_count,
  (SELECT content FROM chat_history c2
   WHERE c2.session_id = ch.session_id AND c2.role = 'user'
   ORDER BY c2.created_at ASC LIMIT 1) AS first_message
FROM chat_history ch
WHERE user_id = ?
GROUP BY session_id
ORDER BY last_active_at DESC
```

**用途:** 前端根据此接口实现多会话切换功能，每个会话显示首条用户消息预览和消息数量。

---

### 3. 管理员模块 (`/api/admin`)

> ⚠️ **注意:** 所有管理员接口需要双重认证：`authMiddleware` + `adminMiddleware`

#### 3.1 后台首页

**接口地址:** `GET /api/admin/dashboard`

**认证要求:** Token + 管理员权限

**成功响应 (200):**
```json
{
  "success": true,
  "message": "欢迎访问后台管理系统",
  "result": {
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  }
}
```

---

#### 3.2 获取用户列表

**接口地址:** `GET /api/admin/users`

**认证要求:** Token + 管理员权限

**成功响应 (200):**
```json
{
  "success": true,
  "message": "获取用户列表成功",
  "result": {
    "users": [
      {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "role": "admin",
        "created_at": "2026-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

#### 3.3 创建用户

**接口地址:** `POST /api/admin/users`

**认证要求:** Token + 管理员权限

**请求参数：**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "123456",
  "role": "user"
}
```

**参数验证规则：**
- `username`: 必填，3-20 字符，不能与已有用户名重复
- `email`: 必填，合法邮箱格式，不能与已有邮箱重复
- `password`: 必填，至少 6 位字符
- `role`: 可选，值为 `admin` 或 `user`，默认 `user`

**成功响应 (201):**
```json
{
  "success": true,
  "message": "创建用户成功",
  "result": {
    "user": {
      "id": 3,
      "username": "newuser",
      "email": "newuser@example.com",
      "role": "user"
    }
  }
}
```

**错误情况：**
- 400: 参数缺失或格式错误
- 400: 用户名已存在
- 400: 邮箱已被注册
- 500: 服务器内部错误

**安全机制：** 密码使用 bcrypt 加盐哈希存储（10 轮）

---

#### 3.4 更新用户

**接口地址:** `PUT /api/admin/users/:id`

**认证要求:** Token + 管理员权限

**路径参数:**
- `id`: 用户 ID

**请求参数（所有字段可选，只更新传入的字段）：**
```json
{
  "username": "updatedname",
  "email": "updated@example.com",
  "password": "newpassword",
  "role": "admin"
}
```

**成功响应 (200):**
```json
{
  "success": true,
  "message": "更新用户成功",
  "result": {
    "user": {
      "id": 3,
      "username": "updatedname",
      "email": "updated@example.com",
      "role": "admin",
      "created_at": "2026-04-26T12:00:00.000Z"
    }
  }
}
```

**说明:** 密码字段留空则不修改密码；编辑模式下支持部分更新。

---

#### 3.5 删除用户

**接口地址:** `DELETE /api/admin/users/:id`

**认证要求:** Token + 管理员权限

**路径参数:**
- `id`: 用户 ID

**成功响应 (200):**
```json
{
  "success": true,
  "message": "删除用户成功",
  "result": null
}
```

**安全限制：**
- 400: 不能删除自己的账号
- 400: 不能删除最后一个管理员账号
- 404: 用户不存在

---

#### 3.6 获取用户对话统计

**接口地址:** `GET /api/admin/chat-stats`

**认证要求:** Token + 管理员权限

**功能说明:** 聚合查询所有用户的对话数据，用于后台可视化展示

**成功响应 (200):**
```json
{
  "success": true,
  "message": "获取对话统计成功",
  "result": {
    "stats": [
      {
        "user_id": 1,
        "username": "testuser",
        "email": "test@example.com",
        "session_count": 3,
        "message_count": 24,
        "user_message_count": 12,
        "assistant_message_count": 12,
        "last_active_at": "2026-04-26T12:00:00.000Z"
      }
    ]
  }
}
```

**查询逻辑:**
```sql
SELECT u.id AS user_id, u.username, u.email,
  COUNT(DISTINCT ch.session_id) AS session_count,
  COUNT(ch.id) AS message_count,
  SUM(CASE WHEN ch.role = 'user' THEN 1 ELSE 0 END) AS user_message_count,
  SUM(CASE WHEN ch.role = 'assistant' THEN 1 ELSE 0 END) AS assistant_message_count,
  MAX(ch.created_at) AS last_active_at
FROM users u
LEFT JOIN chat_history ch ON u.id = ch.user_id
GROUP BY u.id, u.username, u.email
ORDER BY last_active_at DESC
```

---

#### 3.7 获取指定用户对话历史

**接口地址:** `GET /api/admin/chat-history/:userId`

**认证要求:** Token + 管理员权限

**路径参数:**
- `userId`: 用户 ID

**成功响应 (200):**
```json
{
  "success": true,
  "message": "获取对话历史成功",
  "result": {
    "history": [
      {
        "id": 1,
        "session_id": "session_xxx",
        "user_id": 1,
        "role": "user",
        "content": "你好",
        "created_at": "2026-04-26T12:00:00.000Z"
      },
      {
        "id": 2,
        "session_id": "session_xxx",
        "user_id": 1,
        "role": "assistant",
        "content": "你好！我是 AI 助手...",
        "created_at": "2026-04-26T12:00:01.000Z"
      }
    ]
  }
}
```

**实现代码位置:** [routes/admin.ts](src/routes/admin.ts)

---

---

## 🔐 安全机制

### JWT 认证流程 ([middleware/auth.ts](src/middleware/auth.ts))

**Token 生成：**
```typescript
const token = jwt.sign(
  { 
    id: user.id, 
    username: user.username,
    email: user.email,
    role: user.role 
  },
  config.jwt.secret,
  { expiresIn: config.jwt.expiresIn }  // 7天
)
```

**Token 验证中间件：**
```typescript
export const authMiddleware = (req, res, next) => {
  // 1. 提取 Authorization 头
  const authHeader = req.headers.authorization
  
  // 2. 检查 Bearer Token 格式
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiResponse.unauthorized(res, '未提供认证令牌')
  }
  
  // 3. 提取并验证 Token
  const token = authHeader.split(' ')[1]
  const decoded = jwt.verify(token, config.jwt.secret)
  
  // 4. 将用户信息注入 req.user
  req.user = decoded
  
  // 5. 继续处理请求
  next()
}
```

**错误处理：**
- Token 缺失 → 401 未提供认证令牌
- Token 过期 → 401 认证令牌已过期
- Token 无效 → 401 无效的认证令牌

---

### 管理员权限中间件 ([middleware/admin.ts](src/middleware/admin.ts))

**功能说明：** 在 JWT 认证通过后，进一步验证用户角色是否为 `admin`，用于保护后台管理接口。

**核心逻辑：**
```typescript
export const adminMiddleware = (req, res, next) => {
  const user = req.user

  // 1. 检查是否已认证
  if (!user) {
    return ApiResponse.unauthorized(res, '未认证')
  }

  // 2. 检查是否为管理员角色
  if (user.role !== 'admin') {
    return ApiResponse.forbidden(res, '无管理员权限')
  }

  next()
}
```

**错误处理：**
- 用户未认证 → 401 未认证
- 角色非 admin → 403 无管理员权限

**使用方式：** 与 `authMiddleware` 组合使用，先认证再鉴权：
```typescript
router.get('/admin/users', authMiddleware, adminMiddleware, handler)
```

**实现代码位置:** [middleware/admin.ts](src/middleware/admin.ts)

---

### 密码加密 ([bcryptjs](https://github.com/dcodeIO/bcryptjs))

**加密过程：**
```typescript
// 生成盐值 (10轮)
const salt = await bcrypt.genSalt(10)

// 哈希密码
const hashedPassword = await bcrypt.hash(password, salt)
```

**验证过程：**
```typescript
// 比较明文和哈希值
const isPasswordValid = await bcrypt.compare(password, user.password)
```

**安全特性：**
- 自动加盐（salt）
- 抗彩虹表攻击
- 计算密集型（防止暴力破解）

---

### CORS 配置

```typescript
app.use(cors())  // 允许所有来源（开发环境）
```

> ⚠️ 生产环境建议限制允许的源

---

## 🗃️ 数据模型层

### 用户模型 ([models/user.ts](src/models/user.ts))

**TypeScript 接口：**
```typescript
interface User {
  id?: number
  username: string
  email: string
  password: string
  role?: 'admin' | 'user'
  created_at?: Date
}
```

**方法列表：**

| 方法名 | 参数 | 返回值 | 说明 |
|-------|------|--------|------|
| `create(user)` | User 对象（不含 id, created_at） | Promise\<number\> | 创建用户，返回插入的 ID |
| `findByUsername(username)` | 用户名 | Promise\<User \| null\> | 根据用户名查找 |
| `findByEmail(email)` | 邮箱 | Promise\<User \| null\> | 根据邮箱查找 |
| `findById(id)` | 用户 ID | Promise\<User \| null\> | 根据 ID 查找 |

**使用示例：**
```typescript
// 创建用户
const userId = await UserModel.create({
  username: 'test',
  email: 'test@test.com',
  password: hashedPassword,
  role: 'user'
})

// 查找用户
const user = await UserModel.findByUsername('test')
```

---

### 对话历史模型 ([models/chatHistory.ts](src/models/chatHistory.ts))

**TypeScript 接口：**
```typescript
interface ChatHistory {
  id: number
  session_id: string
  user_id: number | null
  role: 'user' | 'assistant'
  content: string
  created_at: Date
}
```

**方法列表：**

| 方法名 | 参数 | 返回值 | 说明 |
|-------|------|--------|------|
| `create(sessionId, userId, role, content)` | 会话ID, 用户ID, 角色, 内容 | Promise\<number\> | 保存单条消息 |
| `getBySessionIdAndUserId(sessionId, userId)` | 会话ID, 用户ID | Promise\<ChatHistory[]\> | 获取会话历史（同时匹配两个条件） |
| `deleteBySessionId(sessionId)` | 会话ID | Promise\<number\> | 删除指定会话的所有记录 |
| `deleteByUserId(userId)` | 用户ID | Promise\<number\> | 删除指定用户的所有记录 |
| `deleteBySessionIdAndUserId(sessionId, userId)` | 会话ID, 用户ID | Promise\<number\> | 删除指定用户的指定会话 |
| `getUserChatStats()` | 无 | Promise\<any[]\> | 获取所有用户的对话统计（管理员用） |
| `getByUserId(userId)` | 用户ID | Promise\<ChatHistory[]\> | 根据用户ID获取对话历史（管理员用） |

**新增方法说明（管理员用）：**

**getUserChatStats() 查询逻辑：**
```sql
SELECT u.id AS user_id, u.username, u.email,
  COUNT(DISTINCT ch.session_id) AS session_count,
  COUNT(ch.id) AS message_count,
  SUM(CASE WHEN ch.role = 'user' THEN 1 ELSE 0 END) AS user_message_count,
  SUM(CASE WHEN ch.role = 'assistant' THEN 1 ELSE 0 END) AS assistant_message_count,
  MAX(ch.created_at) AS last_active_at
FROM users u
LEFT JOIN chat_history ch ON u.id = ch.user_id
GROUP BY u.id, u.username, u.email
ORDER BY last_active_at DESC
```

**getByUserId(userId) 查询逻辑：**
```sql
SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at ASC
```

**关键特性：**
- 支持未登录用户（user_id 可为 NULL）
- 按时间升序排列（created_at ASC）
- 支持多维度删除操作

---

## 🤖 AI 服务层

### Anthropic SDK 集成 ([services/ai.ts](src/services/ai.ts))

**初始化配置：**
```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: config.ai.apiKey,
  baseURL: config.ai.baseURL  // ModelScope 代理
})
```

**支持的模型：**
- 默认模型: `Qwen/Qwen3.5-35B-A3B`
- 最大输出 token: 1024

---

### 同步对话接口

**函数签名：**
```typescript
async function chatWithAI(
  message: string, 
  sessionId: string, 
  userId: number | null = null
): Promise<string>
```

**执行流程：**
1. 查询历史对话
2. 构建上下文字符串
3. 保存用户消息到数据库
4. 调用 Claude API（同步模式）
5. 保存助手回复到数据库
6. 返回完整回复文本

**上下文格式：**
```
用户: 上一条问题
助手: 上一条回答
用户: 当前问题
助手:
```

---

### 流式对话接口（推荐使用）

**函数签名：**
```typescript
async function chatWithAIStream(
  message: string, 
  sessionId: string, 
  userId: number | null = null
): Promise<{ stream: any; sessionId: string }>
```

**优势：**
- 实时输出，用户体验更好
- 降低首字延迟
- 支持长文本逐步展示

**SSE 事件类型：**
- `content_block_delta`: 包含文本片段
- 结束标记: `data: [DONE]`

**内容格式说明：**
- AI 返回的内容为 Markdown 格式（标题 `#`、列表、代码块、加粗等）
- 前端使用 `marked` 库将 Markdown 渲染为格式化 HTML
- 换行和间距通过 `white-space: pre-wrap` 保留

**错误处理：**
- API 调用失败抛出异常
- 网络超时处理
- Token 超限提示

---

## 🛠️ 工具函数库

### 统一响应工具类 ([utils/response.ts](src/utils/response.ts))

**设计模式：** 静态方法类

**可用方法：**

| 方法名 | HTTP 状态码 | 用途 | 示例 |
|-------|------------|------|------|
| `success()` | 200 | 成功响应 | `ApiResponse.success(res, data, '成功')` |
| `created()` | 201 | 创建成功 | `ApiResponse.created(res, data, '创建成功')` |
| `badRequest()` | 400 | 请求参数错误 | `ApiResponse.badRequest(res, '参数错误')` |
| `unauthorized()` | 401 | 未授权 | `ApiResponse.unauthorized(res, '请登录')` |
| `forbidden()` | 403 | 禁止访问 | `ApiResponse.forbidden(res, '无权限')` |
| `notFound()` | 404 | 资源不存在 | `ApiResponse.notFound(res, '未找到')` |
| `internalServerError()` | 500 | 服务器错误 | `ApiResponse.internalServerError(res, '错误', err.message)` |

**使用示例：**
```typescript
// 成功响应
return ApiResponse.success(res, { users }, '获取成功')

// 错误响应
return ApiResponse.badRequest(res, '请输入用户名')

// 401 未授权
return ApiResponse.unauthorized(res, 'Token 已过期')
```

---

### 数据库连接池 ([utils/db.ts](src/utils/db.ts))

**配置：**
```typescript
const pool = mysql.createPool({
  host: config.database.host,
  port: Number(process.env.DB_PORT) || 3306,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
})
```

**特性：**
- 连接池管理（自动复用连接）
- Promise 支持（mysql2/promise）
- 自动重连机制
- 启动时测试连接

**使用方式：**
```typescript
import pool from '../utils/db.js'

// 执行查询
const [rows] = await pool.execute(
  'SELECT * FROM users WHERE id = ?',
  [userId]
)
```

---

## 🚀 应用启动流程

### 入口文件 ([app.ts](src/app.ts))

**启动步骤：**

```typescript
// 1. 导入依赖
import express from 'express'
import cors from 'cors'

// 2. 创建 Express 应用
const app = express()

// 3. 注册中间件
app.use(cors())           // 跨域支持
app.use(express.json())   // JSON 解析

// 4. 挂载路由
app.use('/api/user', userRouter)
app.use('/api/admin', adminRouter)
app.use('/api/ai', aiRouter)

// 5. 启动服务器
const PORT = config.server.port
app.listen(PORT, () => {
  console.log(`🚀 服务运行在 http://localhost:${PORT}`)
})
```

**中间件执行顺序：**
1. CORS（跨域）
2. JSON 解析
3. 路由匹配
4. 认证中间件（如需）
5. 业务逻辑控制器

---

## 📊 系统架构图

```
客户端请求
    ↓
Express App (app.ts)
    ↓
┌─────────────────────────────────────┐
│           中间件层                   │
│  • CORS                             │
│  • JSON Parser                      │
│  • Auth Middleware (可选)            │
│  • Admin Middleware (可选)           │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│           路由层                     │
│  /api/user → userRouter             │
│  /api/admin → adminRouter           │
│  /api/ai → aiRouter                 │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│         控制器层                     │
│  • UserController                   │
│  • AI Controller (内联在路由中)      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│         服务层 / 模型层              │
│  • AIService (Anthropic SDK)        │
│  • UserModel (MySQL)               │
│  • ChatHistoryModel (MySQL)         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│         外部服务                     │
│  • MySQL Database                   │
│  • Anthropic API (Claude)          │
└─────────────────────────────────────┘
```

---

## 🔑 关键设计决策

### 1. 为什么选择 ESM 模块？

```json
{
  "type": "module"  // package.json
}
```

**优势：**
- 原生支持 ES Module 语法（import/export）
- Tree-shaking 优化
- 顶层 await 支持
- 与现代前端工具链一致

**注意事项：**
- 需要在导入路径添加 `.js` 扩展名
- 不能使用 `require()`
- `__dirname` 和 `__filename` 不可用

---

### 2. 为什么使用 SSE 而非 WebSocket？

**SSE (Server-Sent Events) 优势：**
- 单向通信足够（服务器→客户端）
- 自动重连机制
- HTTP 协议，更简单的部署
- 浏览器原生支持（EventSource API）

**适用场景：**
- AI 对话流式输出
- 实时通知推送
- 股票行情更新

**WebSocket 适用场景：**
- 双向实时通信（聊天室、游戏）
- 低延迟要求极高场景

---

### 3. 为什么选择 Anthropic Claude？

**技术特点：**
- 长上下文窗口（200K tokens）
- 强大的推理能力
- 安全性较好
- 支持流式输出

**替代方案：**
- OpenAI GPT 系列
- 国产大模型（通义千问、文心一言等）
- 开源模型（Llama, Mistral）

---

### 4. Session ID 设计策略

**为什么每个用户有独立的 Session？**
- 隔离不同用户的对话历史
- 支持多设备登录（同一用户共享 session）
- 未登录用户也能使用（基于 localStorage）

**Session 生成规则：**
```javascript
// 已登录用户
`chatSessionId_${userId}`

// 未登录用户
'chatSessionId'  // 全局唯一
```

---

## ⚙️ 开发环境搭建

### 1. 前置条件

- Node.js >= 18.0.0
- MySQL >= 8.0
- npm 或 yarn 或 pnpm

### 2. 安装依赖

```bash
cd server
npm install
```

### 3. 配置数据库

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE ai_chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 导入表结构
USE ai_chat;
source database.sql;
```

### 4. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填写实际配置
```

### 5. 启动开发服务器

```bash
# 开发模式（热重载）
npm run dev

# 或者先编译再运行
npm run build
npm start
```

### 6. 验证服务

```bash
# 测试健康检查
curl http://localhost:3000/api/user

# 应返回:
# {"message":"User route"}
```

---

## 🧪 测试 API 接口

### 使用 curl 测试

**注册用户：**
```bash
curl -X POST http://localhost:3000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"123456"}'
```

**登录获取 Token：**
```bash
curl -X POST http://localhost:3000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'
```

**获取用户信息：**
```bash
curl http://localhost:3000/api/user/info \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**AI 对话（流式）：**
```bash
curl -N -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"你好","sessionId":"test123"}'
```

**获取对话历史：**
```bash
curl "http://localhost:3000/api/ai/history?sessionId=test123&userId=1" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📈 性能优化建议

### 1. 数据库优化

**添加索引：**
```sql
-- 已有的索引
INDEX idx_session_id (session_id)
INDEX idx_user_id (user_id)

-- 建议添加复合索引
INDEX idx_session_user (session_id, user_id)
```

**连接池调优：**
```typescript
const pool = mysql.createPool({
  // ...
  connectionLimit: 10,        // 最大连接数
  waitForConnections: true,    // 无连接时等待
  queueLimit: 0               // 等待队列无限制
})
```

### 2. 缓存策略

**Redis 缓存（推荐）：**
- 用户信息缓存（TTL: 1小时）
- 对话历史缓存（TTL: 30分钟）
- Token 黑名单（用于强制登出）

### 3. AI 服务优化

**请求限流：**
- 单用户每分钟最多 10 次请求
- 单次最大 token 数限制

**批处理：**
- 合并短时间内的多次请求
- 预加载常用上下文

---

## 🔒 安全最佳实践

### 1. 生产环境安全清单

- [ ] 修改默认 JWT Secret（强随机字符串）
- [ ] 启用 HTTPS
- [ ] 配置 CORS 白名单
- [ ] 设置 Rate Limiting（速率限制）
- [ ] 输入参数严格校验
- [ ] SQL 注入防护（使用参数化查询 ✓）
- [ ] XSS 防护（输出转义）
- [ ] 日志脱敏（不记录密码等敏感信息）

### 2. 环境变量安全

```bash
# .env 文件必须加入 .gitignore
echo ".env" >> .gitignore

# 不要在代码中硬编码密钥
# ❌ 错误做法
const secret = 'my-hardcoded-secret'

# ✅ 正确做法
const secret = process.env.JWT_SECRET
```

### 3. 密码安全

- ✅ 使用 bcrypt 哈希（salt rounds: 10+）
- ❌ 不存储明文密码
- ❌ 不使用 MD5/SHA1 等弱哈希算法
- ✅ 强制密码复杂度（>= 6位）

---

## 🐛 常见问题排查

### Q1: 数据库连接失败

**错误信息：** `ECONNREFUSED 127.0.0.1:3306`

**解决方案：**
1. 检查 MySQL 服务是否启动
2. 确认 `.env` 中数据库配置正确
3. 验证防火墙设置

```bash
# 测试数据库连接
mysql -h localhost -u root -p -e "SELECT 1"
```

---

### Q2: JWT Token 验证失败

**错误信息：** `JsonWebTokenError: invalid signature`

**解决方案：**
1. 确保前后端使用相同的 `JWT_SECRET`
2. 检查 Token 是否过期
3. 验证 Token 格式（Bearer <token>）

---

### Q3: AI API 调用失败

**错误信息：** `AI调用失败: API key invalid`

**解决方案：**
1. 检查 `.env` 中 `DASHSCOPE_API_KEY` 是否正确
2. 确认 API Key 未过期
3. 验证网络连接（可能需要代理）

---

### Q4: SSE 流式输出中断

**症状：** 客户端只收到部分内容

**解决方案：**
1. 检查 Nginx/代理缓冲设置
2. 增加超时时间
3. 确保客户端正确处理断线重连

**Nginx 配置示例：**
```nginx
location /api/ai/chat {
    proxy_pass http://localhost:3000;
    proxy_buffering off;  # 关闭缓冲
    proxy_cache off;
    proxy_read_timeout 300s;
}
```

---

### Q5: 跨域问题 (CORS)

**错误信息：** `Access-Control-Allow-Origin`

**解决方案：**
1. 开发环境：确认 `cors()` 中间件已启用
2. 生产环境：配置具体的允许域名

```typescript
// 生产环境配置
app.use(cors({
  origin: 'https://yourdomain.com',
  credentials: true
}))
```

---

## 📦 部署指南

### 1. Docker 部署（推荐）

**Dockerfile 示例：**
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY .env .

EXPOSE 3000

CMD ["node", "dist/app.js"]
```

**docker-compose.yml：**
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - mysql
  
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

---

### 2. 传统服务器部署

**步骤：**
1. 安装 Node.js 和 MySQL
2. 上传代码到服务器
3. 安装生产依赖：`npm ci --production`
4. 编译 TypeScript：`npm run build`
5. 使用 PM2 管理进程：
   ```bash
   npm install -g pm2
   pm2 start dist/app.js --name "ai-chat-api"
   pm2 save
   pm2 startup
   ```
6. 配置 Nginx 反向代理
7. 配置 SSL 证书（Let's Encrypt）

---

### 3. 云平台部署

**支持平台：**
- AWS EC2 + RDS
-阿里云 ECS + RDS
-腾讯云 CVM + MySQL
- Heroku + ClearDB
- Railway + PlanetScale

---

## 🔄 API 版本控制策略

**当前版本:** v1

**URL 规范：**
```
/api/v1/user/register
/api/v1/ai/chat
```

**向后兼容原则：**
- 不删除已有字段
- 新增字段使用可选参数
- 废弃接口保留 6 个月过渡期
- 在响应头中添加版本信息

---

## 📊 监控与日志

### 日志级别

```typescript
console.log('普通信息')     // 开发阶段
console.warn('警告信息')     // 需要注意
console.error('错误信息')    // 必须处理
```

**建议升级为专业日志库：**
- Winston
- Pino（性能更好）
- Bunyan

### 监控指标

- **请求量 QPS**: 每秒请求数
- **响应时间 P99**: 99% 请求的响应时间
- **错误率**: 5xx 错误占比
- **数据库连接池使用率**
- **AI API 调用成功率**

**推荐工具：**
- Prometheus + Grafana
- DataDog
- New Relic

---

## 👥 团队协作规范

### Git 分支策略

```
main (生产环境)
  ↑
develop (开发环境)
  ↑
feature/xxx (功能分支)
hotfix/xxx (紧急修复)
```

### 代码规范

- **ESLint**: TypeScript 严格模式
- **Prettier**: 代码格式化
- **Commit Message**: Conventional Commits
  - `feat:` 新功能
  - `fix:` 修复 bug
  - `docs:` 文档更新
  - `refactor:` 重构
  - `test:` 测试相关

### Code Review 清单

- [ ] 类型定义完整
- [ ] 错误处理完善
- [ ] 无硬编码密钥
- [ ] SQL 注入防护
- [ ] 单元测试覆盖

---

## 📚 参考资源

### 官方文档
- [Express.js 文档](https://expressjs.com/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
- [MySQL 文档](https://dev.mysql.com/doc/)
- [Anthropic API 文释](https://docs.anthropic.com/)
- [JWT.io](https://jwt.io/)

### 相关工具
- [Postman](https://www.postman.com/) - API 测试
- [Insomnia](https://insomnia.rest/) - 轻量级 API 客户端
- [DBeaver](https://dbeaver.io/) - 数据库管理
- [Swagger](https://swagger.io/) - API 文档自动生成

---

## 📋 TODO & 未来规划

### 功能增强
- [ ] 用户头像上传
- [ ] 对话导出功能（PDF/Markdown）
- [ ] 多轮对话上下文管理优化
- [ ] AI 模型切换功能
- [ ] 对话分享功能
- [ ] 敏感词过滤

### 性能优化
- [ ] Redis 缓存层
- [ ] 数据库读写分离
- [ ] API 响应压缩（Gzip/Brotli）
- [ ] CDN 静态资源加速

### 安全加固
- [ ] OAuth2.0 第三方登录
- [ ] 双因素认证 (2FA)
- [ ] 操作审计日志
- [ ] IP 白名单/黑名单
- [ ] DDoS 防护

### 运维提升
- [ ] Kubernetes 容器编排
- [ ] CI/CD 自动化流水线
- [ ] 灰度发布机制
- [ ] 自动扩缩容
- [ ] 多区域部署

---

## 📞 技术支持

### 问题反馈渠道
- **Issue Tracker**: GitHub Issues
- **技术讨论**: 项目 Wiki
- **紧急联系**: 项目负责人邮箱

### 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

## 🙏 致谢

感谢以下开源项目和社区：
- [Node.js](https://nodejs.org/) - JavaScript 运行时
- [Express](https://expressjs.com/) - Web 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全
- [Anthropic](https://www.anthropic.com/) - AI 能力支持
- [Element Plus](https://element-plus.org/) - UI 组件库（前端）

---

*本文档最后更新于 2026-04-28 | 由后端开发团队维护*
