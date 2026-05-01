<template>
  <div class="layout-content">
    <!-- 内容区域 -->
    <router-view></router-view>
  </div>
</template>

<script setup lang="ts">
// 布局内容组件
// 用于显示路由视图内容
</script>

<style scoped>
.layout-content {
  padding: 20px;
  min-height: calc(100vh - 70px);
  background-color: #f5f5f5;
}

@media (max-width: 768px) {
  .layout-content {
    padding: 10px;
    min-height: calc(100vh - 52px);
  }
}
</style>