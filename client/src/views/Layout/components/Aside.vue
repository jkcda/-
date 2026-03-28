<template>
    <div class="aside-wrapper">
        
        <!-- 菜单区域 -->
        <el-menu
            :default-active="activeMenu"
            :collapse="isCollapse"
            background-color="#304156"
            text-color="#bfcbd9"
            active-text-color="#409EFF"
            router
            class="side-menu"
        >
            <!-- 首页 -->
            <el-menu-item index="/admin/home">
                <el-icon><House /></el-icon>
                <template #title>首页</template>
            </el-menu-item>
            
            <!-- 用户管理 -->
            <el-sub-menu index="user">
                <template #title>
                    <el-icon><User /></el-icon>
                    <span>用户管理</span>
                </template>
                <el-menu-item index="/admin/user/list">用户列表</el-menu-item>
                <el-menu-item index="/admin/user/role">角色管理</el-menu-item>
            </el-sub-menu>
            
            <!-- 内容管理 -->
            <el-sub-menu index="content">
                <template #title>
                    <el-icon><Document /></el-icon>
                    <span>内容管理</span>
                </template>
                <el-menu-item index="/admin/content/article">文章管理</el-menu-item>
                <el-menu-item index="/admin/content/category">分类管理</el-menu-item>
            </el-sub-menu>
            
            <!-- 系统设置 -->
            <el-sub-menu index="system">
                <template #title>
                    <el-icon><Setting /></el-icon>
                    <span>系统设置</span>
                </template>
                <el-menu-item index="/admin/system/basic">基础设置</el-menu-item>
                <el-menu-item index="/admin/system/log">日志管理</el-menu-item>
            </el-sub-menu>
        </el-menu>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
    House,
    User,
    Document,
    Setting,
    ElementPlus
} from '@element-plus/icons-vue'

// 定义 props
interface Props {
    isCollapse?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    isCollapse: false
})

const route = useRoute()

// 当前激活的菜单
const activeMenu = computed(() => {
    return route.path
})
</script>