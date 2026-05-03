<template>
  <div class="auth-layout">
    <!-- 左侧：背景图 -->
    <div class="auth-left" :style="{ backgroundImage: `url('/images/background.png')` }" />

    <!-- 右侧：表单区 35% -->
    <div class="auth-right">
      <div class="auth-intro">
        <img src="/images/character-avatar.png" class="auth-avatar" alt="NEXUS" />
        <div class="auth-intro-text">
          <h1 class="auth-title">奈克瑟 NEXUS</h1>
          <p class="auth-subtitle">跨宇宙魔法情报员</p>
        </div>
      </div>
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
.auth-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.auth-left {
  flex: 1;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.auth-right {
  width: 35%;
  min-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  background: var(--color-bg-deep);
  overflow-y: auto;
}

.auth-intro {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(212, 175, 55, 0.15);
  border-radius: 14px;
  padding: 16px 22px;
  margin-bottom: 36px;
  width: 100%;
  max-width: 360px;
}

.auth-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid var(--color-magic-gold);
  box-shadow: 0 0 16px var(--color-gold-glow);
  object-fit: cover;
  flex-shrink: 0;
}

.auth-intro-text {
  min-width: 0;
}

.auth-title {
  font-family: var(--font-pixel);
  font-size: 14px;
  color: var(--color-magic-gold);
  text-shadow: 0 0 10px var(--color-gold-glow);
  margin-bottom: 2px;
}

.auth-subtitle {
  font-size: 11px;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .auth-layout { flex-direction: column; }
  .auth-left { flex: 0 0 30vh; }
  .auth-right { width: 100%; min-width: unset; padding: 24px 20px; }
}
</style>
