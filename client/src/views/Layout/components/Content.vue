<template>
  <div class="layout-content">
    <router-view></router-view>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.layout-content {
  padding: var(--space-xl);
  min-height: calc(100vh - 70px);
}

@media (max-width: 768px) {
  .layout-content {
    padding: var(--space-md);
    min-height: calc(100vh - 52px);
  }
}
</style>
