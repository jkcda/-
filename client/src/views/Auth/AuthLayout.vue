<template>
  <div class="auth-layout">
    <div class="auth-bg" :style="{ backgroundImage: `url('/images/background.png')` }"></div>
    <div class="auth-overlay">
      <div class="auth-intro">
        <img src="/images/character-full.png" class="auth-character" alt="NEXUS" />
        <div class="auth-intro-text">
          <h1 class="auth-title">奈克瑟 NEXUS</h1>
          <p class="auth-subtitle">跨宇宙魔法情报员</p>
          <p class="auth-desc">连接数据之海与万千宇宙的桥梁。<br/>AI 驱动的智能对话系统，随时待命。</p>
          <div class="auth-features">
            <span>✦ 多模型对话</span>
            <span>✦ 文生图</span>
            <span>✦ 联网搜索</span>
            <span>✦ 知识库 RAG</span>
          </div>
        </div>
      </div>
      <div class="auth-form-area">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
.auth-layout {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.auth-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: brightness(0.4);
  z-index: 0;
}

.auth-overlay {
  position: relative;
  z-index: 1;
  display: flex;
  height: 100%;
  backdrop-filter: blur(2px);
}

.auth-intro {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  max-width: 500px;
}

.auth-character {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: 2px solid var(--color-magic-gold);
  box-shadow: 0 0 30px var(--color-gold-glow);
  object-fit: cover;
  margin-bottom: 24px;
}

.auth-intro-text {
  text-align: center;
}

.auth-title {
  font-family: var(--font-pixel);
  font-size: 22px;
  color: var(--color-magic-gold);
  text-shadow: 0 0 20px var(--color-gold-glow);
  margin-bottom: 8px;
}

.auth-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.auth-desc {
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.8;
  margin-bottom: 20px;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
}

.auth-features {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;

  span {
    font-size: 11px;
    color: var(--color-magic-gold);
    padding: 4px 10px;
    border: 1px solid rgba(212, 175, 55, 0.3);
    border-radius: 12px;
    background: rgba(212, 175, 55, 0.08);
  }
}

.auth-form-area {
  width: 440px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: rgba(10, 10, 30, 0.85);
  border-left: 1px solid var(--color-border);
}

@media (max-width: 900px) {
  .auth-intro { display: none; }
  .auth-form-area { width: 100%; border-left: none; }
}
</style>
