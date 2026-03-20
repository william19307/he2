<template>
  <div class="app-shell">
    <!-- 桌面端侧栏 -->
    <aside v-if="!isMobile" class="app-sider" :class="{ 'app-sider--collapsed': appStore.sidebarCollapsed }">
      <AppSidebar />
    </aside>

    <!-- 移动端侧栏 Drawer -->
    <a-drawer
      v-if="isMobile"
      :visible="drawerVisible"
      placement="left"
      :width="240"
      :footer="false"
      :header="false"
      unmount-on-close
      class="mobile-drawer"
      @cancel="drawerVisible = false"
    >
      <AppSidebar @navigate="drawerVisible = false" />
    </a-drawer>

    <!-- 主区域 -->
    <div class="app-main" :class="{ 'app-main--mobile': isMobile }">
      <header class="app-topbar-wrap">
        <AppTopbar
          :is-mobile="isMobile"
          @toggle-drawer="drawerVisible = !drawerVisible"
        />
      </header>

      <main
        class="app-content"
        :class="{
          'app-content--dashboard': isDashboard,
          'app-content--mobile': isMobile,
        }"
      >
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <MobileDesktopHint v-if="showDesktopOnlyHint" />
            <component v-else :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- 全局人工上报悬浮按钮（teacher/counselor/doctor 登录后显示） -->
    <ManualReportModal v-if="showFab" @reported="onReported" />

    <!-- 移动端底部 TabBar -->
    <nav v-if="isMobile" class="tabbar" aria-label="主导航">
      <button
        v-for="tab in tabs"
        :key="tab.path"
        class="tabbar-btn"
        :class="{ 'tabbar-btn--active': isTabActive(tab) }"
        @click="onTabClick(tab)"
      >
        <span class="tabbar-icon"><component :is="tab.icon" :size="20" /></span>
        <span class="tabbar-label">{{ tab.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopbar from '@/components/AppTopbar.vue'
import ManualReportModal from '@/components/ManualReportModal.vue'
import MobileDesktopHint from '@/components/MobileDesktopHint.vue'
import {
  IconDashboard,
  IconExclamationCircle,
  IconUserGroup,
  IconUser,
} from '@arco-design/web-vue/es/icon'

const appStore = useAppStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const isDashboard = computed(() => route.path === '/dashboard' || route.name === 'Dashboard')
const showDesktopOnlyHint = computed(() => isMobile.value && route.meta?.desktopOnly)

/** 仅 teacher/counselor/doctor/admin 登录后可见悬浮按钮 */
const FAB_ROLES = new Set(['teacher', 'counselor', 'doctor', 'admin', 'super_admin'])
const showFab = computed(() => {
  return authStore.isLoggedIn && FAB_ROLES.has(authStore.userRole)
})

function onReported() {
  // 若当前在预警列表页则刷新
  if (route.name === 'AlertList' || route.path === '/alerts') {
    route.meta._refreshKey = Date.now()
    // 通过全局事件总线触发刷新（简单做法：跳转重新进入）
    router.push({ path: '/alerts', query: { _t: Date.now() } })
  }
}

const isMobile = ref(false)
const drawerVisible = ref(false)
let mql = null

function onMqlChange(e) {
  isMobile.value = e.matches
  if (!e.matches) drawerVisible.value = false
}

onMounted(() => {
  mql = window.matchMedia('(max-width: 767px)')
  isMobile.value = mql.matches
  mql.addEventListener('change', onMqlChange)
})
onUnmounted(() => { if (mql) mql.removeEventListener('change', onMqlChange) })

const tabs = [
  { path: '/dashboard', label: '工作台', icon: markRaw(IconDashboard) },
  { path: '/alerts', label: '预警', icon: markRaw(IconExclamationCircle) },
  { path: '/students', label: '学生', icon: markRaw(IconUserGroup) },
  { path: '/admin/users', label: '我的', icon: markRaw(IconUser) },
]

function isTabActive(tab) {
  return route.path === tab.path || route.path.startsWith(tab.path + '/')
}

function onTabClick(tab) {
  if (route.path !== tab.path) router.push(tab.path)
}
</script>

<style scoped>
/* ===== 整体 Shell ===== */
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #F3F4F6;
}

/* ===== 侧栏 ===== */
.app-sider {
  width: 240px;
  flex-shrink: 0;
  transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  z-index: 10;
}

.app-sider--collapsed {
  width: 64px;
}

/* ===== 主区域 ===== */
.app-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== 顶栏 ===== */
.app-topbar-wrap {
  height: 56px;
  flex-shrink: 0;
  border-bottom: 1px solid #E5E7EB;
  background: #fff;
  z-index: 5;
}

/* ===== 内容区 ===== */
.app-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  background: #F3F4F6;
}

.app-content--dashboard {
  padding: 0;
  background: #F3F4F6;
}

.app-content--mobile {
  padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px));
}

.app-content--mobile.app-content--dashboard {
  padding: 0;
  padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px));
}

/* ===== 移动端 Drawer ===== */
.mobile-drawer :deep(.arco-drawer-body) {
  padding: 0;
  background: var(--sidebar-bg, #0F1D19);
}

/* ===== 移动端 TabBar ===== */
.tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 200;
  display: flex;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid #E5E7EB;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.tabbar-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 56px;
  border: none;
  background: none;
  cursor: pointer;
  color: #9CA3AF;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s;
}

.tabbar-btn--active {
  color: #2d7a6a;
}

.tabbar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.tabbar-btn--active .tabbar-icon::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: #2d7a6a;
  border-radius: 1px;
}

.tabbar-label {
  font-size: 10px;
  font-weight: 500;
  line-height: 1;
}

/* ===== 路由过渡 ===== */
.page-enter-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.page-leave-active {
  transition: opacity 0.12s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-leave-to {
  opacity: 0;
}
</style>
