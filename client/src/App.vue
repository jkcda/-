<template>
  <div class="app-root">
    <router-view />
  </div>
</template>
<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>
<style>
.app-root {
  height: 100vh;
  position: relative;
  z-index: 1;
}
</style>
