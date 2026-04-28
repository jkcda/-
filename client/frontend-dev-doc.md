# AI 智能对话系统 - 前端开发文档

## 📋 项目概述

本项目是一个基于 **Vue 3 + TypeScript + Vite** 构建的 AI 智能对话系统前端应用。采用前后端分离架构，提供用户注册、登录、AI 对话等核心功能。

### 技术栈

- **框架**: Vue 3.5+ (Composition API)
- **构建工具**: Vite (Beta)
- **语言**: TypeScript 5.9+
- **UI 组件库**: Element Plus 2.13+
- **状态管理**: Pinia 3.0+ (支持持久化)
- **路由**: Vue Router 5.0+
- **HTTP 客户端**: Axios 1.13+
- **CSS 预处理**: Sass/SCSS
- **开发工具**: Vue DevTools

---

## 📁 目录结构

```
client/
├── public/
│   └── favicon.ico                 # 网站图标
├── src/
│   ├── apis/                       # API 接口层
│   │   ├── admin.ts                # 管理员相关接口
│   │   ├── ai.ts                   # AI 相关接口
│   │   └── user.ts                 # 用户相关接口
│   ├── assets/
│   │   └── main.css                # 全局样式
│   ├── router/
│   │   └── index.ts                # 路由配置
│   ├── stores/                     # 状态管理
│   │   ├── counter.ts              # 计数器示例 Store
│   │   └── userStore.ts            # 用户状态管理
│   ├── styles/
│   │   └── common.scss             # 公共样式
│   ├── utils/                      # 工具函数
│   │   ├── http.ts                 # HTTP 请求封装
│   │   └── sse.ts                  # SSE 流式响应处理
│   ├── views/                      # 页面组件
│   │   ├── Admin/                  # 后台管理页面
│   │   │   ├── AdminLayout.vue     # 后台布局主组件（侧边栏+顶栏）
│   │   │   ├── AdminDashboard.vue  # 后台仪表盘页面
│   │   │   ├── AdminUsers.vue      # 用户管理页面（CRUD）
│   │   │   └── components/
│   │   │       └── UserChatStats.vue  # 用户对话统计组件
│   │   ├── Home/
│   │   │   └── home.vue            # 首页
│   │   ├── Layout/
│   │   │   ├── index.vue           # 布局主组件
│   │   │   ├── Chat.vue            # AI 对话页面
│   │   │   └── components/
│   │   │       ├── Header.vue      # 头部导航组件（管理员可见"后台管理"入口）
│   │   │       └── Content.vue     # 内容区域组件
│   │   ├── Login/
│   │   │   └── login.vue           # 登录页面
│   │   └── Register/
│   │       └── Register.vue        # 注册页面
│   ├── App.vue                     # 根组件
│   └── main.ts                     # 应用入口
├── index.html                      # HTML 模板
├── package.json                    # 项目依赖配置
├── vite.config.ts                  # Vite 配置
└── tsconfig.json                   # TypeScript 配置
```

---

## 🔧 核心功能模块

### 1. 用户认证系统

#### 登录功能 ([login.vue](src/views/Login/login.vue))
- 支持普通用户和管理员登录切换
- 表单验证（用户名、密码长度校验）
- JWT Token 存储与管理
- "记住我"功能
- 登录后自动跳转到首页

**关键代码逻辑：**
```typescript
// 登录处理流程
const handleLogin = async () => {
  // 1. 表单验证
  await loginFormRef.value.validate()
  
  // 2. 调用登录 API
  const response = await login({
    username: loginForm.value.username,
    password: loginForm.value.password
  })
  
  // 3. 存储 Token 和用户信息
  userStore.setToken(response.data.result.token)
  userStore.setUserInfo(response.data.result.user)
  
  // 4. 跳转到首页
  router.push('/front/home')
}
```

#### 注册功能 ([Register.vue](src/views/Register/Register.vue))
- 用户名、邮箱、密码输入
- 密码确认验证
- 邮箱格式校验
- 自定义验证规则（两次密码一致性）

**表单验证规则：**
```typescript
const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3-20 之间', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}
```

---

### 2. AI 智能对话系统

#### 对话页面 ([Chat.vue](src/views/Layout/Chat.vue))

**核心特性：**
- **流式输出**: 使用 SSE (Server-Sent Events) 接收 AI 回复
- **打字机效果**: SSE 数据块先写入缓冲区，再以逐字动画方式呈现（每 30ms 释放 2~5 字符，积压超 200 字符自动加速）
- **多会话管理**: 支持新建对话、切换对话、删除对话，左侧侧边栏展示会话列表（可折叠）
- **会话持久化**: 会话列表存储于 localStorage（按用户隔离），组件挂载时自动从 MySQL 同步历史会话并合并
- **历史记录**: 切换会话时自动加载对应历史对话；登录用户可读取历史遗留的匿名会话（user_id IS NULL）
- **用户隔离**: 已登录和未登录用户独立的会话存储，通过 `chatSessions_{userId}` / `chatSessions_anon` 键隔离

**消息类型定义：**
```typescript
interface Message {
  role: 'user' | 'assistant'
  content: string
}
```

**Session ID 生成策略：**
```typescript
const generateSessionId = () => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}
```

**会话存储键设计（按用户隔离）：**
```typescript
const getStorageKey = () => {
  const uid = userInfo?.id || 'anon'
  return `chatSessions_${uid}`   // 会话列表
}
const getCurrentKey = () => {
  const uid = userInfo?.id || 'anon'
  return `chatCurrentSession_${uid}`  // 当前选中的会话 ID
}
```

**发送消息流程：**
1. 添加用户消息到界面，更新侧边栏会话预览
2. 调用 `/api/ai/chat` 接口（POST，携带当前 sessionId 和 userId）
3. 添加助手消息占位符
4. 启动打字机效果（创建缓冲区和 30ms 定时器）
5. SSE 数据块写入缓冲区，打字机定时器逐字释放到界面
6. 流式传输结束时刷新剩余缓冲字符、停止定时器，并调用 `/api/ai/sessions` 同步元数据
7. 每次更新自动滚动到底部

**组件初始化流程（onMounted）：**
1. 从 localStorage 加载当前用户的会话列表（`loadSessionList`）
2. 调用 `syncSessionsFromBackend()` 从 MySQL 拉取该用户的会话及历史遗留匿名会话，与 localStorage 合并去重
3. 恢复上次选中的会话或选择第一条会话
4. 调用 `/api/ai/history` 加载该会话的历史消息

**会话切换流程：**
1. 停止当前打字机（如有）
2. 保存目标 sessionId 到 localStorage
3. 清空消息列表
4. 调用 `/api/ai/history` 加载新会话的历史记录
5. 侧边栏高亮切换至新会话

**说明：** 会话 ID 对用户完全隐藏，不再显示在页面头部，用户只看到预览文本和消息数量。

**侧边栏折叠设计：** 折叠按钮（`.sidebar-toggle`）位于侧边栏外部、主聊天区域左侧，作为 28px 宽的独立竖条。折叠时侧边栏宽度变为 0 并隐藏内容，但折叠按钮始终可见，点击即可再次展开。

**MySQL 历史会话同步（`syncSessionsFromBackend`）：** 组件挂载时自动调用 `GET /api/ai/sessions`，将后端返回的会话与 localStorage 合并：新会话直接插入列表，已存在的会话更新消息数和预览。合并后按 `lastActiveAt` 降序排列并写回 localStorage。

**打字机效果实现：**
```typescript
// 核心机制：SSE 写入缓冲区，定时器逐字渲染
const startTypewriter = (msgIndex: number) => {
  let fullContent = ''   // SSE 写入的完整内容
  let typedLength = 0    // 已显示到界面的字符数

  const tick = () => {
    const remaining = fullContent.length - typedLength
    if (remaining <= 0) return

    // 每次取 2~5 个字符，积压超 200 字符时加速到 8 个
    let charsPerTick = 2 + Math.floor(Math.random() * 4)
    if (remaining > 200) charsPerTick = 8

    typedLength += charsPerTick
    messages.value[msgIndex].content = fullContent.slice(0, typedLength)
  }

  const timer = setInterval(tick, 30)

  return {
    append: (chunk: string) => { fullContent += chunk },
    flush: () => { clearInterval(timer); /* 显示全部剩余内容 */ }
  }
}
```

**加载状态：** AI 未开始返回内容前，显示三个跳动圆点动画（`typingBounce` CSS 关键帧），内容开始输出后自动切换为逐字渲染。

---

### 3. 布局系统

#### 主布局 ([Layout/index.vue](src/views/Layout/index.vue))
- 采用经典的上中下布局结构
- 包含 Header 和 Content 两个子组件
- 最小高度 100vh，确保全屏显示

#### 头部导航 ([Header.vue](src/views/Layout/components/Header.vue))
- 网站标题展示
- 导航菜单（首页、AI对话）
- 用户信息显示与退出登录
- 响应式设计

#### 内容区域 ([Content.vue](src/views/Layout/components/Content.vue))
- 使用 `<router-view>` 显示子路由内容
- 动态高度计算（视口高度 - 头部高度）

---

## 🛠️ 工具函数与封装

### HTTP 请求封装 ([http.ts](src/utils/http.ts))

**Axios 实例配置：**
```typescript
const http = axios.create({
  baseURL: (import.meta.env.VITE_BASE_URL || '') + '/api',
  timeout: 5000,
})
```

**请求拦截器：**
- 自动添加 `Authorization: Bearer <token>` 头

**响应拦截器：**
- 统一错误处理（400/401/403/404/500）
- 错误信息提取和提示
- 网络错误处理

### SSE 流式处理 ([sse.ts](src/utils/sse.ts))

**核心功能：**
- 解析 Server-Sent Events 数据流
- 支持 `data:` 格式的消息解析
- 处理 `[DONE]` 结束标记
- 错误捕获和回调机制

**使用方式（结合打字机效果）：**
```typescript
// 启动打字机
const typewriter = startTypewriter(msgIndex)

await handleSSE(
  response,
  (content) => {
    // 将 SSE 数据块写入打字机缓冲区（而非直接更新界面）
    typewriter.append(content)
  },
  (error) => {
    stopTypewriter()
    ElMessage.error(error.message)
  },
  () => {
    // 完成回调：刷新剩余缓冲，停止打字机
    typewriter.flush()
    isLoading.value = false
  }
)
```

### Markdown 内容渲染 ([Chat.vue](src/views/Layout/Chat.vue))

**说明：** AI 返回的流式内容包含 Markdown 格式（标题、列表、代码块、加粗等），使用 `marked` 库将其渲染为格式化 HTML，提升阅读体验。

**安装依赖：**
```bash
npm install marked
```

**核心配置：**
```typescript
import { marked } from 'marked'

marked.setOptions({
  breaks: true,  // 保留换行符为 <br>
  gfm: true      // 启用 GitHub 风格 Markdown
})

function renderMarkdown(content: string): string {
  if (!content) return ''
  return marked.parse(content) as string
}
```

**模板中使用：**
```html
<div class="message-content" v-html="renderMarkdown(msg.content)"></div>
```

**样式处理：** 通过 `white-space: pre-wrap` 保留原始换行和间距，并为 `h1-h4`、`p`、`ul/ol`、`code`、`pre`、`blockquote` 等标签提供统一样式。

---

## 📦 状态管理 (Pinia)

### 用户状态 Store ([userStore.ts](src/stores/userStore.ts))

**状态定义：**
```typescript
// 状态
userInfo: ref<any>(null)     // 用户信息对象
token: ref<string>('')        // JWT Token
```

**方法列表：**

| 方法名 | 功能描述 |
|--------|----------|
| `setToken(newToken)` | 设置 Token 并存储到 localStorage |
| `getToken()` | 获取 Token（优先从内存，其次从 localStorage） |
| `setUserInfo(info)` | 设置用户信息并持久化 |
| `getUserInfo()` | 获取用户信息（支持从 localStorage 恢复） |
| `clearUserInfo()` | 清除所有用户数据（退出登录） |
| `isLoggedIn()` | 检查是否已登录 |

**持久化配置：**
- Token 存储在 `localStorage.token`
- 用户信息存储在 `localStorage.userInfo`（JSON 格式）

---

## 🚀 路由系统

### 路由配置 ([router/index.ts](src/router/index.ts))

**路由结构：**

```
/ → 重定向到 /front/home
├── /front                    # 前台布局
│   ├── /front/home          # 首页（公开）
│   └── /front/chat          # AI 对话
├── /admin                   # 后台布局（需管理员权限）
│   └── /admin/dashboard     # 对话统计
├── /login                   # 登录页（公开）
└── /register                # 注册页（公开）
```

**路由守卫（双层权限控制）：**
```typescript
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const userInfoStr = localStorage.getItem('userInfo')
  const publicPages = ['/login', '/register', '/front/home']
  const requiresAuth = !publicPages.includes(to.path)

  // 第一层：未登录用户不能访问需要认证的页面
  if (requiresAuth && !token) {
    return next('/login')
  }

  // 第二层：非管理员用户不能访问后台
  if (to.meta.requiresAdmin) {
    const userInfo = JSON.parse(userInfoStr || '{}')
    if (userInfo.role !== 'admin') {
      ElMessage.error('无管理员权限，无法访问后台')
      return next('/front/home')
    }
  }

  next()
})
```

**公开页面（无需登录）：**
- `/login` - 登录页
- `/register` - 注册页
- `/front/home` - 首页

**需要认证的页面：**
- `/front/chat` - AI 对话

---

## 📡 API 接口层

### 用户相关接口 ([apis/user.ts](src/apis/user.ts))

| 接口名称 | 方法 | 路径 | 参数 | 说明 |
|---------|------|------|------|------|
| `register` | POST | `/user/register` | `{username, email, password}` | 用户注册 |
| `login` | POST | `/user/login` | `{username, password}` | 用户登录 |
| `getUserInfo` | GET | `/user/info` | - | 获取当前用户信息 |
| `logout` | POST | `/user/logout` | - | 退出登录 |

### 管理员相关接口 ([apis/admin.ts](src/apis/admin.ts))

| 接口名称 | 方法 | 路径 | 参数 | 说明 |
|---------|------|------|------|------|
| `getDashboard` | GET | `/admin/dashboard` | - | 后台首页数据 |
| `getUsers` | GET | `/admin/users` | - | 获取用户列表 |
| `createUser` | POST | `/admin/users` | `{username, email, password, role?}` | 创建用户 |
| `updateUser` | PUT | `/admin/users/:id` | `{username?, email?, password?, role?}` | 更新用户信息 |
| `deleteUser` | DELETE | `/admin/users/:id` | - | 删除用户 |
| `getUserChatStats` | GET | `/admin/chat-stats` | - | 获取所有用户对话统计 |
| `getUserChatHistory` | GET | `/admin/chat-history/:userId` | `userId` | 获取指定用户的对话历史详情 |

### AI 相关接口 ([apis/ai.ts](src/apis/ai.ts))

| 接口名称 | 方法 | 路径 | 参数 | 说明 |
|---------|------|------|------|------|
| `getSessions` | GET | `/ai/sessions` | `userId?` | 获取用户会话列表 |
| `getChatHistory` | GET | `/ai/history` | `sessionId, userId?` | 获取对话历史 |
| `chatWithAI` | POST | `/ai/chat` | `{message, sessionId, userId?}` | AI 对话（流式） |
| `deleteChatHistory` | DELETE | `/ai/history` | `sessionId, userId?` | 删除对话历史 |

---

## 🎨 样式系统

### 全局样式
- [main.css](src/assets/main.css): Element Plus 基础样式重置
- [common.scss](src/styles/common.scss): 公共 SCSS 变量和混合器

### 样式规范
- 使用 scoped 样式避免冲突
- 采用 BEM 命名约定（可选）
- 响应式设计原则
- Element Plus 主题定制

---

## ⚙️ 开发环境配置

### 环境变量
创建 `.env` 文件配置环境变量：
```env
VITE_BASE_URL=http://localhost:3000  # 后端服务地址
```

### Node.js 版本要求
```json
{
  "engines": {
    "node": "^20.19.0 || >=22.12.0"
  }
}
```

### 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

---

## 🔐 安全机制

### Token 管理
- 登录成功后获取 JWT Token
- Token 存储在 localStorage
- 每次 API 请求自动携带 Authorization 头
- 退出登录时清除 Token

### 路由守卫
- 基于Token的页面访问控制
- 未登录用户自动重定向到登录页
- 公开页面白名单机制

### 数据安全
- 密码在前端不存储明文
- 敏感操作需要 Token 认证
- HTTPS 生产环境建议

---

## 📊 数据流向图

```
用户操作
    ↓
View Component (Vue)
    ↓
API Layer (apis/*.ts)
    ↓
HTTP Utils (utils/http.ts + 拦截器)
    ↓
Backend API (/api/*)
    ↓
Response Handling
    ↓
State Update (Pinia Store)
    ↓
UI Re-render
```

---

## 🎯 关键文件索引

| 文件路径 | 功能说明 | 重要程度 |
|---------|---------|---------|
| [main.ts](src/main.ts) | 应用入口，插件注册 | ⭐⭐⭐⭐⭐ |
| [App.vue](src/App.vue) | 根组件 | ⭐⭐⭐⭐⭐ |
| [router/index.ts](src/router/index.ts) | 路由配置与守卫 | ⭐⭐⭐⭐⭐ |
| [stores/userStore.ts](src/stores/userStore.ts) | 用户状态管理 | ⭐⭐⭐⭐⭐ |
| [views/Layout/Chat.vue](src/views/Layout/Chat.vue) | AI 对话核心页面 | ⭐⭐⭐⭐⭐ |
| [views/Login/login.vue](src/views/Login/login.vue) | 登录页面 | ⭐⭐⭐⭐ |
| [views/Register/Register.vue](src/views/Register/Register.vue) | 注册页面 | ⭐⭐⭐⭐ |
| [utils/http.ts](src/utils/http.ts) | HTTP 封装 | ⭐⭐⭐⭐⭐ |
| [utils/sse.ts](src/utils/sse.ts) | SSE 流式处理 | ⭐⭐⭐⭐⭐ |
| [apis/admin.ts](src/apis/admin.ts) | 管理员 API 接口 | ⭐⭐⭐⭐ |
| [apis/user.ts](src/apis/user.ts) | 用户 API 接口 | ⭐⭐⭐⭐ |
| [apis/ai.ts](src/apis/ai.ts) | AI API 接口 | ⭐⭐⭐⭐ |
| [views/Admin/AdminLayout.vue](src/views/Admin/AdminLayout.vue) | 后台管理布局（侧边栏+顶栏） | ⭐⭐⭐⭐⭐ |
| [views/Admin/AdminDashboard.vue](src/views/Admin/AdminDashboard.vue) | 后台仪表盘 | ⭐⭐⭐⭐⭐ |
| [views/Admin/AdminUsers.vue](src/views/Admin/AdminUsers.vue) | 用户管理（增删改查） | ⭐⭐⭐⭐⭐ |
| [views/Admin/components/UserChatStats.vue](src/views/Admin/components/UserChatStats.vue) | 用户对话统计可视化组件 | ⭐⭐⭐⭐⭐ |
| [views/Layout/components/Header.vue](src/views/Layout/components/Header.vue) | 头部导航（管理员入口） | ⭐⭐⭐⭐ |

---

## 🚀 快速开始指南

### 1. 克隆项目
```bash
git clone <repository-url>
cd aiconnent/client
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
```bash
# 创建 .env 文件
echo "VITE_BASE_URL=http://localhost:3000" > .env
```

### 4. 启动开发服务器
```bash
npm run dev
```

### 5. 访问应用
打开浏览器访问 `http://localhost:5173`

---

## 📝 开发注意事项

1. **TypeScript 严格模式**: 所有代码必须符合 TypeScript 类型检查
2. **Composition API**: 统一使用 `<script setup lang="ts">` 语法
3. **Element Plus**: UI 组件统一使用 Element Plus 库
4. **Pinia**: 状态管理使用 Pinia，避免直接操作 localStorage
5. **API 封装**: 所有后端请求通过 apis 层封装
6. **错误处理**: 统一使用 ElMessage 提示用户
7. **响应式设计**: 确保移动端适配

---

## 🔧 故障排查

### 常见问题

**Q: 开发服务器启动失败？**
A: 检查 Node.js 版本是否符合要求（>=20.19.0 或 >=22.12.0）

**Q: API 请求跨域错误？**
A: 确保 `.env` 中 `VITE_BASE_URL` 配置正确，或检查后端 CORS 配置

**Q: Token 无效导致无法访问页面？**
A: 清除浏览器 localStorage 中的 token，重新登录

**Q: SSE 流式输出不工作？**
A: 检查网络连接，确认后端 `/api/ai/chat` 接口正常返回流式数据

---

## 📅 版本信息

- **当前版本**: 0.0.0
- **最后更新**: 2026-04-28
- **维护团队**: AI 对话系统开发组

---

## 📞 技术支持

如遇到开发问题，请参考：
- Vue 3 官方文档: https://cn.vuejs.org/
- Element Plus 文档: https://element-plus.org/zh-CN/
- Vite 官方文档: https://cn.vitejs.dev/
- Pinia 文档: https://pinia.vuejs.org/zh/

---

*本文档由前端开发团队维护，如有疑问请联系项目负责人*
