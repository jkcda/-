<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useUserStore } from './store/userStore'

let _loggedIn = false
// 挂到全局以便各页面读取
;(globalThis as any).__nexusLoggedIn = () => _loggedIn
;(globalThis as any).__nexusSetLoggedIn = (v: boolean) => { _loggedIn = v }

onLaunch(() => {
  const userStore = useUserStore()
  userStore.restore()
  _loggedIn = userStore.isLoggedIn()

  const pages = getCurrentPages()
  const currentPage = pages.length > 0 ? pages[pages.length - 1] : null
  const isLoginPage = currentPage?.route === 'pages/login/login'

  if (!_loggedIn && !isLoginPage) {
    uni.reLaunch({ url: '/pages/login/login' })
  }
})
</script>
<style lang="scss">
page {
  background-color: #0f0f23;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 全局滚动条 */
::-webkit-scrollbar { width: 0; height: 0; }
</style>
