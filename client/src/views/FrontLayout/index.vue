<template>
  <div class="front-layout">
    <!-- 前台布局 -->
    <div class="front-nav">
      <router-link to="/front/home">首页</router-link>
      <router-link to="/front/chat">AI对话</router-link>
    </div>
    <div class="front-content">
      <router-view></router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
// 前台布局组件
</script>

<style scoped>
.front-layout {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.front-nav {
  background: white;
  padding: 15px 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 20px;
}

.front-nav a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 4px;
  transition: all 0.3s;
}

.front-nav a:hover {
  background: #409EFF;
  color: white;
}

.front-nav a.router-link-active {
  background: #409EFF;
  color: white;
}

.front-content {
  padding: 20px;
}
</style>
