<template>
  <div class="layout-container">
    <Header />
    <Content />
  </div>
</template>

<script setup lang="ts">
import Header from './components/Header.vue'
import Content from './components/Content.vue'
</script>

<style scoped>
.layout-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
