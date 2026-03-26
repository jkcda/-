# 后端 API 接口说明

## 功能说明

本项目实现了用户注册和登录功能，包含以下接口：

### 1. 用户注册
- **接口**: `POST /api/user/register`
- **请求体**:
```json
{
  "username": "用户名",
  "email": "邮箱",
  "password": "密码"
}
```
- **响应示例**:
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "id": 1,
    "username": "用户名",
    "email": "邮箱"
  }
}
```

### 2. 用户登录
- **接口**: `POST /api/user/login`
- **请求体**:
```json
{
  "username": "用户名",
  "password": "密码"
}
```
- **响应示例**:
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "JWT 令牌",
    "user": {
      "id": 1,
      "username": "用户名",
      "email": "邮箱"
    }
  }
}
```

### 3. 获取用户信息（需要认证）
- **接口**: `GET /api/user/info`
- **请求头**: `Authorization: Bearer <token>`
- **响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "用户名",
    "email": "邮箱",
    "created_at": "2026-03-26T10:00:00.000Z"
  }
}
```

## 部署步骤

### 1. 数据库配置

在 MySQL 数据库中执行 `database.sql` 文件中的建表语句：

```bash
mysql -u root -p your_database_name < database.sql
```

或者手动在 MySQL 客户端中执行 SQL 语句。

### 2. 环境变量配置

项目已包含 `.env` 配置文件，请确保其中的数据库配置正确：

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=你的数据库名
```

**注意**：如果 `.env` 文件中缺少 `JWT_SECRET` 配置，系统会使用默认密钥。生产环境建议添加自定义的 JWT 密钥：

```env
JWT_SECRET=your-secret-key-change-this-in-production
```

### 3. 安装依赖

```bash
npm install
```

### 4. 启动服务

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm run build
npm start
```

## 技术栈

- **Express** - Web 框架
- **TypeScript** - 类型安全的 JavaScript
- **MySQL** - 数据库
- **bcryptjs** - 密码加密
- **jsonwebtoken** - JWT 认证

## 安全说明

1. 密码使用 bcrypt 进行加密存储，不会以明文形式保存
2. 登录使用 JWT 令牌认证，令牌有效期为 7 天
3. 生产环境请务必修改 `JWT_SECRET` 为强随机密钥
4. 建议在生产环境使用 HTTPS 协议
