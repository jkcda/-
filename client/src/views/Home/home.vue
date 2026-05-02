<template>
  <div class="home-container">
    <!-- 英雄区域 -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-left">
          <h1>奈克瑟 NEXUS</h1>
          <p>跨宇宙魔法情报员 · 数据之海的守护者</p>
          <p class="hero-quote">"连接成功，指挥官。今日的情报已同步，请指示。"</p>
          <div class="hero-buttons">
            <el-button type="primary" size="large" @click="goToChat">
              开始对话
            </el-button>
            <template v-if="!isLoggedIn">
              <el-button size="large" @click="goToLogin">
                登录
              </el-button>
              <el-button size="large" @click="goToRegister">
                注册账号
              </el-button>
            </template>
          </div>
        </div>
        <div class="hero-right">
          <img :src="characterImg" alt="AI助手" class="hero-character" />
        </div>
      </div>
    </section>

    <!-- 功能亮点 -->
    <section class="features-section">
      <h2>核心功能</h2>
      <div class="features-grid">
        <div class="feature-card">
          <el-icon class="feature-icon"><ChatDotRound /></el-icon>
          <h3>智能对话</h3>
          <p>基于先进的大模型技术，提供流畅自然的对话体验，理解上下文，生成连贯回复</p>
        </div>
        <div class="feature-card">
          <el-icon class="feature-icon"><User /></el-icon>
          <h3>用户系统</h3>
          <p>完整的用户注册、登录系统，确保数据安全，为不同用户提供独立的对话空间</p>
        </div>
        <div class="feature-card">
          <el-icon class="feature-icon"><Timer /></el-icon>
          <h3>历史记录</h3>
          <p>自动保存对话历史，支持查看和管理，让您随时回顾之前的对话内容</p>
        </div>
        <div class="feature-card">
          <el-icon class="feature-icon"><RefreshRight /></el-icon>
          <h3>流式输出</h3>
          <p>AI 回复实时展示，避免等待，提供更加流畅的交互体验</p>
        </div>
      </div>
    </section>

    <!-- 技术优势 -->
    <section class="advantages-section">
      <h2>技术优势</h2>
      <div class="advantages-content">
        <div class="advantage-item">
          <el-icon class="advantage-icon"><Cpu /></el-icon>
          <div>
            <h3>先进的 AI 模型</h3>
            <p>集成最新的大模型技术，提供高质量的智能回复</p>
          </div>
        </div>
        <div class="advantage-item">
          <el-icon class="advantage-icon"><Lock /></el-icon>
          <div>
            <h3>安全可靠</h3>
            <p>完善的认证机制和数据隔离，保护用户隐私和数据安全</p>
          </div>
        </div>
        <div class="advantage-item">
          <el-icon class="advantage-icon"><Grid /></el-icon>
          <div>
            <h3>响应式设计</h3>
            <p>适配不同设备，提供一致的用户体验</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 快速开始 -->
    <section class="start-section">
      <h2>快速开始</h2>
      <div class="start-steps">
        <div class="step-item">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3>注册账号</h3>
            <p>创建您的个人账号，开始智能对话之旅</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3>登录系统</h3>
            <p>使用您的账号登录，进入个人对话空间</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3>开始对话</h3>
            <p>唤醒奈克瑟，探索数据之海的秘密</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ChatDotRound, User, Timer, RefreshRight, Cpu, Lock, Grid } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

const characterImg = '/images/character-full.png'
const isLoggedIn = userStore.isLoggedIn()

// 跳转到对话页面
const goToChat = () => {
  router.push('/front/chat')
}

// 跳转到注册页面
const goToRegister = () => {
  router.push('/register')
}

// 跳转到登录页面
const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.home-container {
  height: 100%;
  overflow-y: auto;
  background: var(--color-bg-deep);
}

.hero-section {
  padding: 80px 0;
  text-align: center;
  background: linear-gradient(180deg, var(--color-bg-deep) 0%, var(--color-bg-card) 50%, var(--color-bg-deep) 100%);
  color: var(--color-silver);
}

.hero-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 60px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.hero-left {
  flex: 1;
  text-align: left;
}

.hero-right {
  flex-shrink: 0;
}

.hero-character {
  width: 340px;
  aspect-ratio: 9 / 16;
  object-fit: cover;
  border-radius: var(--radius-lg);
  filter: drop-shadow(0 0 24px var(--color-gold-glow));
}

.hero-content h1 {
  font-family: var(--font-pixel);
  font-size: 2rem;
  margin-bottom: 20px;
  color: var(--color-magic-gold);
  text-shadow: 0 0 20px var(--color-gold-glow);
  image-rendering: pixelated;
}

.hero-quote {
  font-style: italic;
  color: var(--color-magic-gold) !important;
  text-shadow: 0 0 8px var(--color-gold-glow);
  font-size: 1rem !important;
  margin-top: -10px !important;
}

.hero-content p {
  font-size: 1.2rem;
  margin-bottom: 40px;
  opacity: 0.9;
  max-width: 600px;
  color: var(--color-text-secondary);
}

.hero-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

/* 功能亮点 */
.features-section {
  padding: 100px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.features-section h2 {
  text-align: center;
  font-family: var(--font-pixel);
  font-size: 1.3rem;
  margin-bottom: 60px;
  color: var(--color-magic-gold);
  text-shadow: 0 0 10px var(--color-gold-glow);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
}

.feature-card {
  background: var(--color-bg-card);
  padding: 40px 30px;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-card);
  border: var(--border-thin) var(--color-border);
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-glow);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 20px;
  color: var(--color-magic-gold);
}

.feature-card h3 {
  font-family: var(--font-pixel);
  font-size: 11px;
  margin-bottom: 15px;
  color: var(--color-text-primary);
}

.feature-card p {
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* 技术优势 */
.advantages-section {
  padding: 100px 20px;
  background: var(--color-bg-card);
}

.advantages-section h2 {
  text-align: center;
  font-family: var(--font-pixel);
  font-size: 1.3rem;
  margin-bottom: 60px;
  color: var(--color-magic-gold);
}

.advantages-content {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.advantage-item {
  display: flex;
  align-items: center;
  gap: 20px;
  background: var(--color-bg-input);
  padding: 30px;
  border-radius: var(--radius-sm);
  border: var(--border-thin) var(--color-border);
  box-shadow: var(--shadow-card);
}

.advantage-icon {
  font-size: 2.5rem;
  color: var(--color-primary);
  flex-shrink: 0;
}

.advantage-item h3 {
  font-size: 1.2rem;
  margin-bottom: 8px;
  color: var(--color-text-primary);
}

.advantage-item p {
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* 快速开始 */
.start-section {
  padding: 100px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.start-section h2 {
  text-align: center;
  font-family: var(--font-pixel);
  font-size: 1.3rem;
  margin-bottom: 60px;
  color: var(--color-magic-gold);
}

.start-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 40px;
}

.step-item {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.step-number {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--color-magic-gold);
  color: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-pixel);
  font-size: 1.2rem;
  flex-shrink: 0;
  image-rendering: pixelated;
}

.step-content h3 {
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: var(--color-text-primary);
}

.step-content p {
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hero-section {
    padding: 40px 20px;
  }

  .hero-content {
    flex-direction: column;
    text-align: center;
    gap: 24px;
  }

  .hero-left {
    text-align: center;
  }

  .hero-character {
    width: 160px;
  }

  .hero-content h1 {
    font-size: 1.4rem;
  }

  .hero-content p {
    font-size: 1rem;
  }

  .hero-buttons {
    flex-direction: column;
    align-items: center;
  }

  .features-section,
  .advantages-section,
  .start-section {
    padding: 40px 16px;
  }

  .features-section h2,
  .advantages-section h2,
  .start-section h2 {
    font-size: 1.6rem;
    margin-bottom: 30px;
  }

  .advantage-item {
    flex-direction: column;
    text-align: center;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .feature-card {
    padding: 24px 20px;
  }

  .start-steps {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .step-item {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .hero-content h1 {
    font-size: 1.6rem;
  }

  .hero-content p {
    font-size: 0.9rem;
  }

  .hero-section {
    padding: 40px 15px;
  }
}
</style>