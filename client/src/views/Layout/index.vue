<template>
    <el-container class="container">
        <!-- 头部 -->
        <el-header class="header">
            <Header :is-collapse="isCollapse" @toggle="toggleCollapse" />
        </el-header>
        
        <!-- 主体区域 -->
        <el-container class="main-container">
            <!-- 侧边栏 -->
            <el-aside class="aside" :class="{ 'collapsed': isCollapse }">
                <Aside :is-collapse="isCollapse" />
            </el-aside>
            
            <!-- 主内容区 -->
            <el-main class="main-content">
                <router-view v-slot="{ Component }">
                    <transition name="fade" mode="out-in">
                        <component :is="Component" />
                    </transition>
                </router-view>
            </el-main>
        </el-container>
    </el-container>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Aside from './components/Aside.vue'
import Header from './components/Header.vue'

// 折叠状态 - 在父组件中统一管理
const isCollapse = ref(false)

// 切换折叠状态
const toggleCollapse = () => {
    isCollapse.value = !isCollapse.value
}

// 监听折叠状态变化并保存（可选）
watch(isCollapse, (newValue) => {
    localStorage.setItem('sidebarCollapsed', String(newValue))
})

// 从 localStorage 恢复折叠状态（可选）
const savedCollapse = localStorage.getItem('sidebarCollapsed')
if (savedCollapse !== null) {
    isCollapse.value = savedCollapse === 'true'
}
</script>

<style scoped lang="scss">
.container {
    height: 100vh;
    width: 100%;
    background-color: #f0f2f5;
    
    .header {
        height: 60px;
        background-color: #fff;
        box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
        padding: 0;
        margin: 0;
    }
    
    .main-container {
        flex: 1;
        overflow: hidden;
        
        .aside {
            width: 200px;
            background-color: #304156;
            overflow-x: hidden;
            transition: width 0.3s ease;
            
            &.collapsed {
                width: 64px;
            }
        }
        
        .main-content {
            padding: 20px;
            overflow-y: auto;
        }
    }
}

// 页面切换动画
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
