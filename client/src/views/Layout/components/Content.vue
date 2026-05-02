<template>
  <div class="layout-content">
    <router-view></router-view>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.layout-content {
  flex: 1;
  overflow: hidden;
}

@media (max-width: 768px) {
  .layout-content {
    overflow: hidden;
  }
}
</style>
