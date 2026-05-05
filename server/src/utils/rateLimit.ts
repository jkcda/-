// 简单内存限流中间件 — 无需 Redis 依赖

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// 每 5 分钟清理一次过期条目
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 300000).unref()

export function rateLimiter(opts: { windowMs: number; max: number }) {
  return (req: any, res: any, next: any) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown'
    const key = `${ip}:${req.path}`

    const now = Date.now()
    const entry = store.get(key)

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + opts.windowMs })
      return next()
    }

    if (entry.count >= opts.max) {
      res.set('Retry-After', Math.ceil((entry.resetAt - now) / 1000))
      return res.status(429).json({ success: false, message: '请求过于频繁，请稍后再试' })
    }

    entry.count++
    next()
  }
}
