<template>
  <div class="layout-container">
    <!-- 布局容器 -->
    <!-- 头部导航 -->
    <Header />
    
    <!-- 内容区域 -->
    <Content />
  </div>
</template>

<script setup lang="ts">
// 布局主组件
// 负责整合各个布局子组件

// 导入布局子组件
import Header from './components/Header.vue'
import Content from './components/Content.vue'
</script>

<style scoped>
.layout-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
