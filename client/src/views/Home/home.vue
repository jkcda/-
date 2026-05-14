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
          <h3>多模态对话</h3>
          <p>支持文本、图片、视频、文档多种输入，AI 实时流式回复</p>
        </div>
        <div class="feature-card">
          <el-icon class="feature-icon"><PictureFilled /></el-icon>
          <h3>AI 生图</h3>
          <p>输入描述词即可生成高质量图片，支持多种尺寸比例</p>
        </div>
        <div class="feature-card">
          <el-icon class="feature-icon"><Collection /></el-icon>
          <h3>知识库</h3>
          <p>上传文档构建个人知识库，AI 基于你的资料精准回答</p>
        </div>
        <div class="feature-card">
          <el-icon class="feature-icon"><UserFilled /></el-icon>
          <h3>角色扮演</h3>
          <p>自定义 AI 角色的性格、背景和语气，打造专属对话伙伴</p>
        </div>
        <div class="feature-card">
          <el-icon class="feature-icon"><Connection /></el-icon>
          <h3>聊天室</h3>
          <p>多个 AI 角色同时互动，自动调度发言，模拟真实群聊</p>
        </div>
        <div class="feature-card">
          <el-icon class="feature-icon"><Setting /></el-icon>
          <h3>能力配置</h3>
          <p>自由配置大语言模型和生图供应商，自定义 API Key 和模型</p>
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
            <h3>注册登录</h3>
            <p>创建账号并登录，进入奈克瑟的世界</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3>配置能力</h3>
            <p>在「能力配置」中设置自己的 API Key 和模型</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3>开始对话</h3>
            <p>选择 AI 对话、角色扮演或聊天室，自由探索</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ChatDotRound, PictureFilled, Collection, UserFilled, Connection, Setting } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

const characterImg = '/images/character-full.png'
const isLoggedIn = userStore.isLoggedIn()

// 跳转到对话页面
const goToChat = () => {
  router.push('/chat')
}

// 跳转到注册页面
const goToRegister = () => {
  router.push('/auth/register')
}

// 跳转到登录页面
const goToLogin = () => {
  router.push('/auth/login')
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