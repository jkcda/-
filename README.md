# AI 智能对话系统

基于大模型接口实现的智能对话系统，支持用户注册登录、AI 对话、历史记录等功能。

## 项目简介

这是一个完整的全栈 AI 对话系统，包含前端 Vue3 界面和后端 Node.js 服务，实现了用户认证、AI 对话、历史记录管理等核心功能。

## 功能特性

- 用户注册与登录
- JWT 身份认证
- AI 智能对话（流式输出）
- 对话历史记录与上下文记忆
- 用户数据隔离（不同用户对话历史独立）
- 退出登录时清除对话历史
- 响应式界面设计

## 技术栈

### 前端
- Vue 3 + TypeScript
- Element Plus UI 组件库
- Vue Router 路由管理
- Pinia 状态管理
- Axios HTTP 请求

### 后端
- Node.js + Express
- TypeScript
- MySQL 数据库
- JWT 认证
- Anthropic AI SDK

## 项目结构

```
大模型接口实现/
├── client/                 # 前端项目
│   ├── src/
│   │   ├── apis/          # API 接口
│   │   ├── components/     # 公共组件
│   │   ├── router/         # 路由配置
│   │   ├── stores/         # 状态管理
│   │   ├── utils/          # 工具函数
│   │   └── views/          # 页面组件
│   └── package.json
├── server/                # 后端项目
│   ├── src/
│   │   ├── config/         # 配置文件
│   │   ├── controllers/    # 控制器
│   │   ├── middleware/     # 中间件
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # 路由
│   │   ├── services/       # 业务逻辑
│   │   ├── utils/          # 工具函数
│   │   └── app.ts          # 应用入口
│   ├── .env              # 环境变量
│   ├── database.sql       # 数据库脚本
│   └── package.json
└── README.md
```

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/jkcda/-.git
cd 大模型接口实现
```

### 2. 数据库配置

创建 MySQL 数据库并执行 SQL 脚本：

```bash
mysql -u root -p
CREATE DATABASE project;
USE project;
SOURCE server/database.sql;
```

### 3. 后端配置

```bash
cd server
npm install
```

配置环境变量（创建 `.env` 文件）：

```env
# MySQL数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=project

# JWT配置
JWT_SECRET=your_secret_key

# AI配置
DASHSCOPE_API_KEY=your_api_key
```

启动后端服务：

```bash
npm run dev
```

后端服务将运行在 `http://localhost:3000`

### 4. 前端配置

```bash
cd client
npm install
```

启动前端服务：

```bash
npm run dev
```

前端服务将运行在 `http://localhost:5173`

## 使用说明

### 用户注册

1. 访问 `http://localhost:5173/register`
2. 填写用户名、邮箱和密码
3. 点击注册按钮

### 用户登录

1. 访问 `http://localhost:5173/login`
2. 输入用户名和密码
3. 点击登录按钮

### AI 对话

1. 登录后访问 `http://localhost:5173/front/chat`
2. 在输入框中输入问题
3. 点击发送按钮或按 Enter 键
4. AI 将以流式方式回复

### 退出登录

1. 点击右上角的"退出登录"按钮
2. 系统将清除对话历史并跳转到登录页面

## 数据库表结构

### users 表（用户表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 用户 ID（主键）|
| username | VARCHAR(50) | 用户名（唯一）|
| email | VARCHAR(100) | 邮箱（唯一）|
| password | VARCHAR(255) | 密码（加密）|
| role | ENUM | 用户角色（admin/user）|
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### chat_history 表（对话历史表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 对话历史 ID（主键）|
| session_id | VARCHAR(100) | 会话 ID |
| user_id | INT | 用户 ID（可为空）|
| role | ENUM | 角色（user/assistant）|
| content | TEXT | 对话内容 |
| created_at | TIMESTAMP | 创建时间 |

## API 接口

### 用户相关

- `POST /api/user/register` - 用户注册
- `POST /api/user/login` - 用户登录
- `GET /api/user/info` - 获取用户信息
- `POST /api/user/logout` - 用户退出登录

### AI 相关

- `POST /api/ai/chat` - AI 对话（流式）
- `GET /api/ai/history` - 获取对话历史
- `DELETE /api/ai/history` - 删除对话历史

## 注意事项

1. **环境变量配置**：`.env` 文件包含敏感信息（数据库密码、API 密钥等），不会被提交到 Git 仓库
2. **数据库安全**：生产环境请使用强密码并限制数据库访问权限
3. **API 密钥**：请替换 `.env` 文件中的 `DASHSCOPE_API_KEY` 为你自己的 API 密钥
4. **端口配置**：确保前端和后端的端口没有被占用

## 常见问题

### Q: 为什么 .env 文件没有被提交到 Git？

A: `.env` 文件通常包含敏感信息（数据库密码、API 密钥等），为了安全起见，应该在 `.gitignore` 文件中排除它。项目根目录下有一个 `.env.example` 文件，你可以复制它并重命名为 `.env`，然后填入你自己的配置信息。

### Q: 如何修改 AI 模型？

A: 在 `server/src/config/index.ts` 文件中修改 `ai.model` 配置项，可以更换不同的 AI 模型。

### Q: 如何部署到生产环境？

A: 
1. 修改 `.env` 文件中的配置为生产环境配置
2. 构建前端：`cd client && npm run build`
3. 使用 PM2 或其他进程管理工具启动后端服务
4. 使用 Nginx 或其他 Web 服务器部署前端静态文件

## 许可证

MIT License

## 联系方式

如有问题，请提交 Issue 或 Pull Request。
