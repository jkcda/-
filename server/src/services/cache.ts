import { Redis } from 'ioredis'
import config from '../config/index.js'

let redis: Redis | null = null

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      retryStrategy: (times: number) => Math.min(times * 200, 5000),
      maxRetriesPerRequest: 3,
      lazyConnect: false
    })
    redis.on('connect', () => console.log('Redis 连接成功'))
    redis.on('error', (err: Error) => console.warn('Redis 连接警告:', err.message))
  }
  return redis
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await getRedis().get(key)
    return val ? JSON.parse(val) : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: any, ttl: number): Promise<void> {
  try {
    await getRedis().setex(key, ttl, JSON.stringify(value))
  } catch { /* 静默失败，缓存不可用不影响业务 */ }
}

export async function cacheDel(pattern: string): Promise<void> {
  try {
    const keys = await getRedis().keys(pattern)
    if (keys.length > 0) await getRedis().del(...keys)
  } catch { /* 静默失败 */ }
}

export function hashKey(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(16)
}
