import { defineStore } from 'pinia'
import { ref } from 'vue'

interface UserInfo {
  id: number
  username: string
  email: string
  role: string
}

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null)
  const token = ref<string>('')
  const isLoggingIn = ref(false)

  function restore() {
    token.value = uni.getStorageSync('token') || ''
    try {
      const raw = uni.getStorageSync('userInfo')
      if (raw) userInfo.value = JSON.parse(raw)
    } catch {}
  }

  function setToken(t: string) {
    token.value = t
    uni.setStorageSync('token', t)
  }

  function setUserInfo(info: UserInfo) {
    userInfo.value = info
    uni.setStorageSync('userInfo', JSON.stringify(info))
  }

  function getToken(): string {
    return token.value || uni.getStorageSync('token') || ''
  }

  function getUserInfo(): UserInfo | null {
    return userInfo.value || (() => {
      try {
        const raw = uni.getStorageSync('userInfo')
        return raw ? JSON.parse(raw) : null
      } catch { return null }
    })()
  }

  function isLoggedIn(): boolean {
    return !!getToken()
  }

  function clear() {
    userInfo.value = null
    token.value = ''
    uni.removeStorageSync('token')
    uni.removeStorageSync('userInfo')
  }

  return {
    userInfo, token, isLoggingIn,
    restore, setToken, setUserInfo, getToken, getUserInfo, isLoggedIn, clear,
  }
})
