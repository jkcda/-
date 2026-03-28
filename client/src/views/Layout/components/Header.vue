<template>
    <div class="header-wrapper">
        <div class="header-left">
            <el-icon class="collapse-btn" @click="handleToggle">
                <Fold v-if="!props.isCollapse" />
                <Expand v-else />
            </el-icon>
            <el-breadcrumb separator="/">
                <el-breadcrumb-item>首页</el-breadcrumb-item>
                <el-breadcrumb-item v-if="currentTitle">{{ currentTitle }}</el-breadcrumb-item>
            </el-breadcrumb>
        </div>
        
        <div class="header-right">
            
            <!-- 全屏切换 -->
            <el-icon class="icon-button" @click="toggleFullscreen">
                <FullScreen v-if="!isFullscreen" />
                <Close v-else />
            </el-icon>
            
            <!-- 用户信息 -->
            <el-dropdown trigger="click">
                <div class="user-info">
                    <el-avatar :size="32" :icon="UserFilled" />
                    <span class="username">管理员</span>
                </div>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item>个人中心</el-dropdown-item>
                        <el-dropdown-item>系统设置</el-dropdown-item>
                        <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import router from '@/router/index'
// 引入 Element Plus 图标组件
import {
    Fold,
    Expand,
    Bell,
    FullScreen,
    Close,
    UserFilled
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 定义 props
interface Props {
    isCollapse?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    isCollapse: false
})

// 定义 emits
const emit = defineEmits<{
    toggle: []
}>()

const route = useRoute()
const isFullscreen = ref(false)

// 当前路由标题
const currentTitle = computed(() => {
    return route.meta.title as string || ''
})

// 处理折叠切换
const handleToggle = () => {
    emit('toggle')
}

// 切换全屏
const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
        isFullscreen.value = true
    } else {
        document.exitFullscreen()
        isFullscreen.value = false
    }
}

// 退出登录
const handleLogout = () => {
    ElMessage.info('退出登录')
    // TODO: 实现退出登录逻辑
    router.replace('/login')
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
}
</script>

<style scoped lang="scss">
.header-wrapper {
    height: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    
    .header-left {
        display: flex;
        align-items: center;
        gap: 20px;
        
        .collapse-btn {
            font-size: 20px;
            cursor: pointer;
            transition: color 0.3s;
            
            &:hover {
                color: #409EFF;
            }
        }
        
        :deep(.el-breadcrumb) {
            white-space: nowrap;
        }
    }
    
    .header-right {
        display: flex;
        align-items: center;
        gap: 20px;
        
        .notification {
            cursor: pointer;
            
            :deep(.el-badge__content.is-fixed) {
                top: 5px;
                right: 5px;
            }
        }
        
        .icon-button {
            font-size: 18px;
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
            transition: all 0.3s;
            
            &:hover {
                background-color: #f5f7fa;
                color: #409EFF;
            }
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 4px;
            transition: background-color 0.3s;
            
            &:hover {
                background-color: #f5f7fa;
            }
            
            .username {
                font-size: 14px;
                color: #606266;
                white-space: nowrap;
            }
        }
    }
}
</style>