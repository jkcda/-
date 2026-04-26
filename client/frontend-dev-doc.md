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
│   │   ├── Home/
│   │   │   └── home.vue            # 首页
│   │   ├── Layout/
│   │   │   ├── index.vue           # 布局主组件
│   │   │   ├── Chat.vue            # AI 对话页面
│   │   │   └── components/
│   │   │       ├── Header.vue      # 头部导航组件
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
- **流式输出**: 使用 SSE (Server-Sent Events) 实现实时打字效果
- **会话管理**: 基于 Session ID 的多会话支持
- **历史记录**: 自动加载和显示历史对话
- **用户隔离**: 已登录和未登录用户的独立会话

**消息类型定义：**
```typescript
interface Message {
  role: 'user' | 'assistant'
  content: string
}
```

**Session ID 生成策略：**
```typescript
const getSessionId = (): string => {
  const userInfo = userStore.getUserInfo()
  const userId = userInfo?.id
  
  if (userId) {
    // 已登录用户：使用 userId 作为 key 存储 sessionid
    const storageKey = `chatSessionId_${userId}`
    let id = localStorage.getItem(storageKey)
    if (!id) {
      id = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem(storageKey, id)
    }
    return id
  } else {
    // 未登录用户：使用默认的 sessionid
    // ...
  }
}
```

**发送消息流程：**
1. 添加用户消息到界面
2. 调用 `/api/ai/chat` 接口（POST）
3. 使用 SSE 工具函数处理流式响应
4. 实时更新助手回复内容
5. 自动滚动到底部

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

**使用方式：**
```typescript
await handleSSE(
  response,
  (content) => {
    // 处理收到的内容片段
    assistantMessage += content
  },
  (error) => {
    // 错误处理
    ElMessage.error(error.message)
  },
  () => {
    // 完成回调
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
│   ├── /front/home          # 首页
│   └── /front/chat          # AI 对话
├── /login                   # 登录页
└── /register                # 注册页
```

**路由守卫（权限控制）：**
```typescript
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const publicPages = ['/login', '/register', '/front/home']
  const requiresAuth = !publicPages.includes(to.path)
  
  if (requiresAuth && !token) {
    next('/login')  // 未登录跳转登录页
  } else {
    next()          // 允许访问
  }
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

### AI 相关接口 ([apis/ai.ts](src/apis/ai.ts))

| 接口名称 | 方法 | 路径 | 参数 | 说明 |
|---------|------|------|------|------|
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
| [apis/user.ts](src/apis/user.ts) | 用户 API 接口 | ⭐⭐⭐⭐ |
| [apis/ai.ts](src/apis/ai.ts) | AI API 接口 | ⭐⭐⭐⭐ |

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
- **最后更新**: 2026-04-26
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
