<template>
  <div class="auth-layout">
    <!-- 左侧：背景图 -->
    <div class="auth-left" :style="{ backgroundImage: `url('/images/background.png')` }">
      <div class="auth-intro">
        <img src="/images/character-avatar.png" class="auth-avatar" alt="NEXUS" />
        <div class="auth-intro-text">
          <h1 class="auth-title">奈克瑟 NEXUS</h1>
          <p class="auth-subtitle">跨宇宙魔法情报员</p>
          <p class="auth-desc">连接数据之海与万千宇宙的桥梁，AI 驱动的智能对话系统。</p>
          <div class="auth-features">
            <span>✦ 多模型对话</span>
            <span>✦ 文生图</span>
            <span>✦ 联网搜索</span>
            <span>✦ 知识库 RAG</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：表单区 35% -->
    <div class="auth-right">
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
  position: relative;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.auth-intro {
  position: absolute;
  right: 40px;
  bottom: 60px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(5, 5, 30, 0.75);
  backdrop-filter: blur(12px);
  padding: 20px 28px;
  border-radius: 16px;
  border: 1px solid rgba(212, 175, 55, 0.2);
}

.auth-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px solid var(--color-magic-gold);
  box-shadow: 0 0 20px var(--color-gold-glow);
  object-fit: cover;
  flex-shrink: 0;
}

.auth-intro-text {
  min-width: 0;
}

.auth-title {
  font-family: var(--font-pixel);
  font-size: 16px;
  color: var(--color-magic-gold);
  text-shadow: 0 0 12px var(--color-gold-glow);
  margin-bottom: 4px;
}

.auth-subtitle {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.auth-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.6;
  margin-bottom: 10px;
  max-width: 300px;
}

.auth-features {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  span {
    font-size: 10px;
    color: var(--color-magic-gold);
    padding: 3px 8px;
    border: 1px solid rgba(212, 175, 55, 0.25);
    border-radius: 10px;
    background: rgba(212, 175, 55, 0.06);
  }
}

.auth-right {
  width: 35%;
  min-width: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  background: var(--color-bg-deep);
  overflow-y: auto;
}

@media (max-width: 768px) {
  .auth-layout { flex-direction: column; }
  .auth-left { flex: 0 0 35vh; }
  .auth-right { width: 100%; min-width: unset; padding: 30px 20px; }
  .auth-intro { right: 20px; bottom: 20px; padding: 12px 16px; }
  .auth-avatar { width: 48px; height: 48px; }
  .auth-title { font-size: 14px; }
}
</style>
