import { describe, it, expect, beforeEach } from 'vitest'

// 👆 这三行是固定写法：describe(分组), it(测试用例), expect(断言), beforeEach(每次前重置)

// 测试游客限流模块
// 这个模块的功能：每 IP 最多 10 次 AI 对话，超限后拒绝
import {
  getGuestRemaining,
  consumeGuestQuota,
  isGuestBlocked,
  MAX_GUEST_QUESTIONS,
} from '../services/guestLimit.js'

// 每 6 小时会全清一次，但测试等不了那么久，所以用 beforeEach 每次重置
// 技巧：由于 Map 是模块内部变量，测试之间会互相影响
// 我们直接测试逻辑边界——测试每个函数的行为
describe('guestLimit 游客限流', () => {
  // 测试1：新用户应该有 10 次剩余
  it('新 IP 应该有 10 次剩余', () => {
    const remaining = getGuestRemaining('1.2.3.4')
    expect(remaining).toBe(10)
  })

  // 测试2：消耗一次配额后剩余 9 次
  it('消耗一次配额后剩余减少', () => {
    const ip = '1.2.3.4'
    consumeGuestQuota(ip)
    expect(getGuestRemaining(ip)).toBe(9)
  })

  // 测试3：消耗 10 次后 should be blocked
  it('消耗 10 次后应该被拦截', () => {
    const ip = '1.2.3.4'
    // 循环 10 次消耗完
    for (let i = 0; i < MAX_GUEST_QUESTIONS; i++) {
      consumeGuestQuota(ip)
    }
    expect(getGuestRemaining(ip)).toBe(0)
    expect(isGuestBlocked(ip)).toBe(true)
    // 再消耗应该返回 false（消耗失败）
    expect(consumeGuestQuota(ip)).toBe(false)
  })

  // 测试4：不同 IP 独立计数
  it('不同 IP 的计数互不影响', () => {
    consumeGuestQuota('ip-A')
    consumeGuestQuota('ip-A')
    consumeGuestQuota('ip-B') // 只消耗一次

    expect(getGuestRemaining('ip-A')).toBe(8)
    expect(getGuestRemaining('ip-B')).toBe(9)
  })

  // 测试5：边界值测试——消耗第 10 次后正好为 0
  it('正好用完 10 次后剩余为 0', () => {
    const ip = '1.2.3.4'
    for (let i = 0; i < 10; i++) {
      consumeGuestQuota(ip)
    }
    expect(getGuestRemaining(ip)).toBe(0)
    // 第 11 次应该返回 false
    expect(consumeGuestQuota(ip)).toBe(false)
  })
})
