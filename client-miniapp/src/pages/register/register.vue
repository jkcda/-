<template>
  <view class="register-page">
    <view class="form-card">
      <text class="form-title">注册账号</text>
      <input class="form-input" v-model="username" placeholder="用户名" maxlength="20" />
      <input class="form-input" v-model="email" placeholder="邮箱" />
      <input class="form-input" v-model="password" type="password" placeholder="密码（6位以上）" />
      <input class="form-input" v-model="confirmPassword" type="password" placeholder="确认密码" />
      <button class="submit-btn" :loading="loading" @tap="handleRegister">注 册</button>
      <text class="switch-link" @tap="goLogin">已有账号？去登录</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { post } from '../../api/request'

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

const handleRegister = async () => {
  if (!username.value || !email.value || !password.value) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }
  if (password.value !== confirmPassword.value) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }
  if (password.value.length < 6) {
    uni.showToast({ title: '密码至少6位', icon: 'none' })
    return
  }
  loading.value = true
  try {
    await post('/api/user/register', {
      username: username.value,
      email: email.value,
      password: password.value,
    })
    uni.showToast({ title: '注册成功，请登录', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  } catch (err: any) {
    uni.showToast({ title: err.message || '注册失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const goLogin = () => uni.navigateBack()
</script>

<style lang="scss" scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: #0f0f23;
}
.form-card {
  width: 100%;
  max-width: 600rpx;
  padding: 48rpx 40rpx;
  background: #1a1a2e;
  border-radius: 20rpx;
  border: 1px solid rgba(212, 175, 55, 0.15);
}
.form-title {
  font-size: 36rpx;
  color: #d4af37;
  font-weight: 600;
  display: block;
  text-align: center;
  margin-bottom: 40rpx;
}
.form-input {
  width: 100%;
  height: 88rpx;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 12rpx;
  padding: 0 24rpx;
  margin-bottom: 20rpx;
  color: #e0e0e0;
  font-size: 28rpx;
  box-sizing: border-box;
}
.submit-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #d4af37, #b8960f);
  color: #fff;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
  margin-top: 16rpx;
}
.switch-link {
  display: block;
  text-align: center;
  font-size: 26rpx;
  color: #8892b0;
  margin-top: 28rpx;
}
</style>
