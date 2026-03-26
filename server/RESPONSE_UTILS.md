# ApiResponse 响应工具类使用文档

## 📦 工具类位置

`src/utils/response.ts`

---

## 🎯 为什么使用 ApiResponse？

### ❌ 重构前（代码重复、混乱）

```typescript
// 在每个 controller 方法中重复写相同的响应格式
res.status(200).json({
  success: true,
  message: '操作成功',
  data: result
})

res.status(400).json({
  success: false,
  message: '客户端错误'
})

res.status(401).json({
  success: false,
  message: '未授权'
})

res.status(500).json({
  success: false,
  message: '服务器错误',
  error: error.message
})
```

### ✅ 重构后（简洁、统一）

```typescript
import { ApiResponse } from '../utils/response.js'

// 成功响应
ApiResponse.success(res, data, '操作成功')

// 创建成功（201）
ApiResponse.created(res, data, '创建成功')

// 错误响应
ApiResponse.badRequest(res, '客户端错误')
ApiResponse.unauthorized(res, '未授权')
ApiResponse.internalServerError(res, '服务器错误', error.message)
```

---

## 📚 API 文档

### 1. `success()` - 成功响应

**签名：**
```typescript
static success<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response
```

**使用示例：**
```typescript
// 默认 200
return ApiResponse.success(res, {
  id: 1,
  username: 'testuser'
}, '获取成功')

// 自定义状态码
return ApiResponse.success(res, data, '操作成功', 200)
```

**返回格式：**
```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "id": 1,
    "username": "testuser"
  }
}
```

---

### 2. `created()` - 创建成功响应（201）

**签名：**
```typescript
static created<T>(
  res: Response,
  data: T,
  message: string = '创建成功'
): Response
```

**使用示例：**
```typescript
// 注册成功
return ApiResponse.created(res, {
  id: userId,
  username,
  email
}, '注册成功')
```

**返回格式：**
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

---

### 3. `error()` - 通用错误响应

**签名：**
```typescript
static error(
  res: Response,
  message: string,
  statusCode: number = 400,
  error?: string
): Response
```

**使用示例：**
```typescript
// 默认 400
return ApiResponse.error(res, '参数错误')

// 自定义状态码和错误详情
return ApiResponse.error(res, '服务器错误', 500, error.message)
```

**返回格式：**
```json
{
  "success": false,
  "message": "参数错误",
  "error": null
}
```

---

### 4. `badRequest()` - 400 错误

**签名：**
```typescript
static badRequest(res: Response, message: string): Response
```

**使用示例：**
```typescript
// 参数验证失败
if (!username || !password) {
  return ApiResponse.badRequest(res, '请填写完整信息')
}

// 密码长度验证
if (password.length < 6) {
  return ApiResponse.badRequest(res, '密码长度不能少于 6 位')
}
```

**返回格式：**
```json
{
  "success": false,
  "message": "请填写完整信息",
  "error": null
}
```

---

### 5. `unauthorized()` - 401 错误

**签名：**
```typescript
static unauthorized(res: Response, message: string = '未授权'): Response
```

**使用示例：**
```typescript
// 用户不存在或密码错误
if (!user) {
  return ApiResponse.unauthorized(res, '用户名或密码错误')
}

// Token 无效
if (!authHeader) {
  return ApiResponse.unauthorized(res, '未提供认证令牌')
}
```

**返回格式：**
```json
{
  "success": false,
  "message": "用户名或密码错误",
  "error": null
}
```

---

### 6. `forbidden()` - 403 错误

**签名：**
```typescript
static forbidden(res: Response, message: string = '禁止访问'): Response
```

**使用示例：**
```typescript
// 权限不足
if (!user.isAdmin) {
  return ApiResponse.forbidden(res, '管理员才能访问')
}
```

**返回格式：**
```json
{
  "success": false,
  "message": "管理员才能访问",
  "error": null
}
```

---

### 7. `notFound()` - 404 错误

**签名：**
```typescript
static notFound(res: Response, message: string = '资源不存在'): Response
```

**使用示例：**
```typescript
// 用户不存在
const user = await UserModel.findById(id)
if (!user) {
  return ApiResponse.notFound(res, '用户不存在')
}
```

**返回格式：**
```json
{
  "success": false,
  "message": "用户不存在",
  "error": null
}
```

---

### 8. `internalServerError()` - 500 错误

**签名：**
```typescript
static internalServerError(
  res: Response,
  message: string = '服务器内部错误',
  error?: string
): Response
```

**使用示例：**
```typescript
try {
  // 业务逻辑
} catch (error: any) {
  console.error('错误:', error)
  return ApiResponse.internalServerError(res, '服务器错误', error.message)
}
```

**返回格式：**
```json
{
  "success": false,
  "message": "服务器错误",
  "error": "详细错误信息"
}
```

---

### 9. `noContent()` - 空响应

**签名：**
```typescript
static noContent(
  res: Response,
  message?: string,
  statusCode: number = 200
): Response
```

**使用示例：**
```typescript
// 删除成功，无数据返回
return ApiResponse.noContent(res, '删除成功')
```

**返回格式：**
```json
{
  "success": true,
  "message": "删除成功",
  "data": null
}
```

---

## 🔄 完整使用示例

### Controller 层示例

```typescript
import { Request, Response } from 'express'
import { ApiResponse } from '../utils/response.js'
import { UserModel } from '../models/user.js'

// 注册接口
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body

    // 参数验证
    if (!username || !email || !password) {
      return ApiResponse.badRequest(res, '请填写完整信息')
    }

    if (password.length < 6) {
      return ApiResponse.badRequest(res, '密码长度不能少于 6 位')
    }

    // 检查唯一性
    const existingUser = await UserModel.findByUsername(username)
    if (existingUser) {
      return ApiResponse.badRequest(res, '用户名已存在')
    }

    const existingEmail = await UserModel.findByEmail(email)
    if (existingEmail) {
      return ApiResponse.badRequest(res, '邮箱已被注册')
    }

    // 创建用户
    const hashedPassword = await bcrypt.hash(password, 10)
    const userId = await UserModel.create({ username, email, password: hashedPassword })

    return ApiResponse.created(res, {
      id: userId,
      username,
      email
    }, '注册成功')

  } catch (error: any) {
    console.error('注册错误:', error)
    return ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
}

// 登录接口
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return ApiResponse.badRequest(res, '请填写完整信息')
    }

    const user = await UserModel.findByUsername(username)
    if (!user) {
      return ApiResponse.unauthorized(res, '用户名或密码错误')
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return ApiResponse.unauthorized(res, '用户名或密码错误')
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    return ApiResponse.success(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    }, '登录成功')

  } catch (error: any) {
    console.error('登录错误:', error)
    return ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
}

// 获取用户信息
export const getUserInfo = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    
    const user = await UserModel.findById(userId)
    if (!user) {
      return ApiResponse.notFound(res, '用户不存在')
    }

    return ApiResponse.success(res, {
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at
    })

  } catch (error: any) {
    console.error('获取用户信息错误:', error)
    return ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
}
```

---

### Middleware 层示例

```typescript
import { Request, Response, NextFunction } from 'express'
import { ApiResponse } from '../utils/response.js'
import jwt from 'jsonwebtoken'

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, '未提供认证令牌')
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    
    req.user = decoded
    next()
    
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, '认证令牌已过期')
    }
    
    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.unauthorized(res, '无效的认证令牌')
    }
    
    return ApiResponse.internalServerError(res, '服务器错误', error.message)
  }
}
```

---

## 📊 状态码速查表

| 方法 | HTTP 状态码 | 使用场景 |
|------|-----------|---------|
| `success()` | 200 | 一般成功响应 |
| `created()` | 201 | 创建资源成功 |
| `noContent()` | 200 | 成功但无数据 |
| `badRequest()` | 400 | 客户端请求错误 |
| `unauthorized()` | 401 | 未授权/认证失败 |
| `forbidden()` | 403 | 权限不足 |
| `notFound()` | 404 | 资源不存在 |
| `internalServerError()` | 500 | 服务器内部错误 |

---

## ✅ 重构优势

### 代码可读性提升
- ✅ 一行代码完成响应，清晰明了
- ✅ 方法名即语义（如 `badRequest`、`unauthorized`）

### 维护性提升
- ✅ 统一的响应格式
- ✅ 修改响应结构只需改一处

### 开发效率提升
- ✅ 减少重复代码
- ✅ 智能提示完善

### 类型安全
- ✅ 完整的 TypeScript 支持
- ✅ 泛型支持，数据类型安全

---

## 🎯 最佳实践

1. **Controller 层只关心业务逻辑**
   ```typescript
   // ✅ 好
   const user = await UserModel.create(data)
   return ApiResponse.created(res, user, '创建成功')
   
   // ❌ 不好
   res.status(201).json({ success: true, message: '...', data: user })
   ```

2. **错误处理统一**
   ```typescript
   try {
     // 业务逻辑
   } catch (error: any) {
     return ApiResponse.internalServerError(res, '服务器错误', error.message)
   }
   ```

3. **参数验证在前**
   ```typescript
   if (!username || !password) {
     return ApiResponse.badRequest(res, '请填写完整信息')
   }
   ```

4. **中间件也使用 ApiResponse**
   ```typescript
   if (!token) {
     return ApiResponse.unauthorized(res, '未提供令牌')
   }
   ```

---

现在你的代码更加整洁、专业了！🎉
