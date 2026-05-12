<template>
  <view class="login-page">
    <view class="login-hero">
      <image class="logo-img" src="/static/logo.png" mode="aspectFit" />
      <text class="app-title">奈克瑟 NEXUS</text>
      <text class="app-desc">跨宇宙魔法情报员 · 数据之海的守护者</text>
    </view>
    <view class="login-section">
      <!-- #ifdef MP-WEIXIN -->
      <button class="wx-login-btn" :loading="loading" @tap="handleWxLogin">
        <text class="btn-text">微信一键登录</text>
      </button>
      <text class="divider-text">———— 开发测试用 ————</text>
      <!-- #endif -->
      <view class="pwd-login-form">
        <input class="form-input" v-model="username" placeholder="用户名" />
        <input class="form-input" v-model="password" type="password" placeholder="密码" />
        <button class="submit-btn" :loading="loading" @tap="handlePwdLogin">
          <text class="btn-text">账密登录</text>
        </button>
      </view>
      <!-- #ifndef MP-WEIXIN -->
      <text class="switch-link" @tap="goRegister">没有账号？立即注册</text>
      <!-- #endif -->
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { wxLogin } from '../../api/user'
import { useUserStore } from '../../store/userStore'
import { post } from '../../api/request'

const userStore = useUserStore()
const loading = ref(false)
const username = ref('')
const password = ref('')

const handleWxLogin = async () => {
  loading.value = true
  try {
    const loginRes = await uni.login({ provider: 'weixin' })
    const code = loginRes.code
    if (!code) throw new Error('获取登录凭证失败')
    const res = await wxLogin(code)
    if (res.success && res.result) {
      userStore.setToken(res.result.token)
      userStore.setUserInfo(res.result.user)
      ;(globalThis as any).__nexusSetLoggedIn(true)
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => { uni.switchTab({ url: '/pages/chat/chat' }) }, 500)
    }
  } catch (err: any) {
    uni.showToast({ title: err.message || '登录失败', icon: 'none' })
  } finally { loading.value = false }
}

const goRegister = () => uni.navigateTo({ url: '/pages/register/register' })

const handlePwdLogin = async () => {
  if (!username.value || !password.value) {
    uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const res = await post<{ token: string; user: any }>('/api/user/login', {
      username: username.value, password: password.value,
    })
    if (res.success && res.result) {
      userStore.setToken(res.result.token)
      userStore.setUserInfo(res.result.user)
      ;(globalThis as any).__nexusSetLoggedIn(true)
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => { uni.switchTab({ url: '/pages/chat/chat' }) }, 500)
    }
  } catch (err: any) {
    uni.showToast({ title: err.message || '登录失败', icon: 'none' })
  } finally { loading.value = false }
}
</script>

<style lang="scss" scoped>
.login-page { min-height:100vh; display:flex; flex-direction:column; align-items:center; padding:80rpx 40rpx 40rpx; background:linear-gradient(180deg,#0f0f23 0%,#1a1a2e 50%,#0f0f23 100%); }
.login-hero { display:flex; flex-direction:column; align-items:center; margin-bottom:120rpx; }
.logo-img { width:120rpx; height:120rpx; margin-bottom:24rpx; }
.app-title { font-size:40rpx; font-weight:700; color:#d4af37; margin-bottom:12rpx; letter-spacing:4rpx; }
.app-desc { font-size:24rpx; color:#8892b0; }
.login-section { width:100%; max-width:600rpx; display:flex; flex-direction:column; align-items:center; }
.wx-login-btn { width:100%; height:88rpx; background:#07c160; border-radius:44rpx; display:flex; align-items:center; justify-content:center; border:none; }
.wx-login-btn::after { border:none; }
.btn-text { font-size:32rpx; color:#fff; font-weight:600; }
.pwd-login-form { width:100%; }
.divider-text { display:block; text-align:center; font-size:22rpx; color:#556; margin:24rpx 0; }
.form-input { width:100%; height:88rpx; background:rgba(255,255,255,0.06); border:1px solid rgba(212,175,55,0.2); border-radius:16rpx; padding:0 24rpx; margin-bottom:24rpx; color:#e0e0e0; font-size:28rpx; box-sizing:border-box; }
.submit-btn { width:100%; height:88rpx; background:linear-gradient(135deg,#d4af37,#b8960f); border-radius:44rpx; display:flex; align-items:center; justify-content:center; border:none; }
.switch-link { display:block; text-align:center; font-size:26rpx; color:#8892b0; margin-top:28rpx; }
</style>
