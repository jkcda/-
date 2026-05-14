# 奈克瑟 NEXUS 开发文档

## 项目结构

```
aiconnent/
├── server/          # 后端 Express + TypeScript
├── client/          # Web 前端 Vue 3 + Vite
├── client-miniapp/  # 小程序/App uni-app
└── docs/            # 开发文档
```

## 文档索引

| 文档 | 内容 |
|------|------|
| [backend.md](./backend.md) | 后端：架构设计、路由 API、服务层、数据模型、配置系统 |
| [frontend.md](./frontend.md) | Web 前端：页面组件、路由权限、状态管理、API 封装、样式体系 |
| [../server/.env.example](../server/.env.example) | 环境变量配置示例 |

## 快速启动

```bash
# 后端
cd server && cp .env.example .env && npm install && npm run dev

# Web 前端
cd client && npm install && npm run dev

# 小程序
cd client-miniapp && npm install && npm run dev:mp-weixin
```

## 部署

```bash
# 构建
cd server && npm run build
cd client && npm run build

# Nginx 反代配置参考 backend.md
```

## 常用命令

```bash
git pull
# 服务器冲突时：
git stash && git pull && git stash pop
```
