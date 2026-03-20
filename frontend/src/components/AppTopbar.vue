<template>
  <header class="topbar">
    <div class="topbar-left">
      <button class="topbar-icon-btn" @click="onMenuToggle">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>

      <template v-if="!isMobile">
        <nav class="topbar-breadcrumb" aria-label="breadcrumb">
          <span
            v-for="(item, index) in breadcrumbs"
            :key="item.path"
            class="breadcrumb-item"
          >
            <router-link
              v-if="index < breadcrumbs.length - 1"
              :to="item.path"
              class="breadcrumb-link"
            >{{ item.title }}</router-link>
            <span v-else class="breadcrumb-current">{{ item.title }}</span>
            <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-sep">/</span>
          </span>
        </nav>
      </template>

      <template v-else>
        <span class="topbar-mobile-title">心晴平台</span>
      </template>
    </div>

    <div class="topbar-right">
      <!-- 通知铃铛 -->
      <div class="topbar-notif-wrap">
        <button class="topbar-icon-btn" @click="notifOpen = true">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 1.5a5.25 5.25 0 0 0-5.25 5.25c0 2.438-.563 3.938-1.125 4.875H15.375c-.562-.937-1.125-2.437-1.125-4.875A5.25 5.25 0 0 0 9 1.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            <path d="M7.5 14.25a1.5 1.5 0 0 0 3 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          <span v-if="unreadCount > 0" class="notif-dot">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </button>
      </div>

      <div class="topbar-divider" />

      <!-- 用户头像 + 下拉 -->
      <a-dropdown trigger="click" position="br">
        <button class="topbar-user-btn">
          <div class="topbar-avatar">{{ avatarLetter }}</div>
          <span v-if="!isMobile" class="topbar-username">{{ authStore.realName }}</span>
          <svg v-if="!isMobile" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <template #content>
          <div class="user-dropdown">
            <div class="user-dropdown-profile">
              <div class="user-dropdown-avatar">{{ avatarLetter }}</div>
              <div>
                <div class="user-dropdown-name">{{ authStore.realName }}</div>
                <div class="user-dropdown-role">{{ roleLabel }}</div>
              </div>
            </div>
            <div class="user-dropdown-divider" />
            <button class="user-dropdown-item user-dropdown-item--danger" @click="handleLogout">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 2H2.5A1.5 1.5 0 0 0 1 3.5v7A1.5 1.5 0 0 0 2.5 12H5M9.5 9.5L13 7l-3.5-2.5M5 7h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              退出登录
            </button>
          </div>
        </template>
      </a-dropdown>
    </div>

    <!-- 通知抽屉 -->
    <a-drawer
      v-model:visible="notifOpen"
      title="通知中心"
      :width="isMobile ? '100%' : 380"
      unmount-on-close
    >
      <template #title>
        <div class="notif-panel-title">
          <span>通知中心</span>
          <span v-if="unreadCount > 0" class="notif-panel-count">{{ unreadCount }} 条未读</span>
        </div>
      </template>
      <a-spin :loading="notifLoading">
        <div v-if="notifications.length" class="notif-list">
          <div
            v-for="item in notifications"
            :key="item.id"
            class="notif-item"
            :class="{ 'notif-item--unread': !item.is_read }"
            @click="onNotifClick(item)"
          >
            <div class="notif-item-dot" :class="{ 'notif-item-dot--unread': !item.is_read }" />
            <div class="notif-item-body">
              <div class="notif-item-title">{{ item.title }}</div>
              <div class="notif-item-desc">{{ item.content }}</div>
              <div class="notif-item-time">{{ item.created_at?.replace('T', ' ').slice(0, 16) }}</div>
            </div>
          </div>
        </div>
        <a-empty v-else-if="!notifLoading" description="暂无通知" style="margin-top: 60px" />
      </a-spin>
    </a-drawer>
  </header>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { getUnreadNotificationCount, getNotifications, markNotificationsRead } from '@/api/notifications'

const props = defineProps({
  isMobile: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle-drawer'])

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()

const unreadCount = ref(0)
const notifOpen = ref(false)
const notifications = ref([])
const notifLoading = ref(false)
let pollTimer = null

const ROLE_MAP = {
  student: '学生', teacher: '班主任', counselor: '心理教师',
  doctor: '校医', admin: '管理员', super_admin: '超级管理员',
}
const roleLabel = computed(() => ROLE_MAP[authStore.userRole] || '用户')
const avatarLetter = computed(() => (authStore.realName || '用')[0])

const breadcrumbs = computed(() => {
  const matched = route.matched.filter((r) => r.meta?.title)
  return matched.map((r, i) => {
    const segments = matched.slice(0, i + 1).map((m) => m.path).filter((p) => p && p !== '/')
    const path = segments.length ? '/' + segments.join('/') : '/'
    return { path, title: r.meta.title }
  })
})

function onMenuToggle() {
  if (props.isMobile) {
    emit('toggle-drawer')
  } else {
    appStore.toggleSidebar()
  }
}

async function pollUnread() {
  try {
    const res = await getUnreadNotificationCount()
    unreadCount.value = res.data?.count ?? 0
  } catch { /* */ }
}

async function loadNotifs() {
  notifLoading.value = true
  try {
    const res = await getNotifications({ page_size: 50 })
    notifications.value = res.data?.list || []
  } finally {
    notifLoading.value = false
  }
}

watch(notifOpen, (v) => { if (v) loadNotifs() })

async function onNotifClick(item) {
  try {
    await markNotificationsRead({ ids: [item.id] })
    item.is_read = 1
    pollUnread()
  } catch { /* */ }
  const t = item.ref_type
  const id = item.ref_id
  if (t === 'alert' && id) router.push(`/alerts/${id}`)
  else if ((t === 'plan' || item.type === 'plan') && id) router.push(`/plans/${id}`)
  notifOpen.value = false
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

onMounted(() => {
  pollUnread()
  pollTimer = setInterval(pollUnread, 30000)
})
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })
</script>

<style scoped>
.topbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 0 20px;
  background: #fff;
  box-sizing: border-box;
}

/* ===== 左侧 ===== */
.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.topbar-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 7px;
  border: none;
  background: none;
  color: #6B7280;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  flex-shrink: 0;
}

.topbar-icon-btn:hover {
  background: #F3F4F6;
  color: #111827;
}

.topbar-breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13.5px;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.breadcrumb-link {
  color: #6B7280;
  text-decoration: none;
  transition: color 0.12s;
}
.breadcrumb-link:hover { color: #111827; }

.breadcrumb-sep {
  color: #D1D5DB;
  font-size: 12px;
}

.breadcrumb-current {
  color: #111827;
  font-weight: 500;
}

.topbar-mobile-title {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

/* ===== 右侧 ===== */
.topbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.topbar-notif-wrap {
  position: relative;
}

.notif-dot {
  position: absolute;
  top: 3px;
  right: 3px;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 8px;
  background: #EF4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  border: 1.5px solid #fff;
  pointer-events: none;
}

.topbar-divider {
  width: 1px;
  height: 20px;
  background: #E5E7EB;
  margin: 0 6px;
}

.topbar-user-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 8px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  color: #374151;
  transition: background 0.12s;
}
.topbar-user-btn:hover { background: #F3F4F6; }

.topbar-avatar {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: linear-gradient(135deg, #34D399 0%, #2d7a6a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.topbar-username {
  font-size: 13.5px;
  font-weight: 500;
  color: #374151;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 用户下拉 ===== */
.user-dropdown {
  min-width: 200px;
  padding: 6px;
}

.user-dropdown-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
}

.user-dropdown-avatar {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: linear-gradient(135deg, #34D399 0%, #2d7a6a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.user-dropdown-name {
  font-size: 13.5px;
  font-weight: 600;
  color: #111827;
}

.user-dropdown-role {
  font-size: 12px;
  color: #9CA3AF;
  margin-top: 2px;
}

.user-dropdown-divider {
  height: 1px;
  background: #F3F4F6;
  margin: 4px 0;
}

.user-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: none;
  background: none;
  font-size: 13.5px;
  cursor: pointer;
  text-align: left;
  color: #374151;
  transition: background 0.12s;
}
.user-dropdown-item:hover { background: #F3F4F6; }
.user-dropdown-item--danger { color: #DC2626; }
.user-dropdown-item--danger:hover { background: #FEF2F2; }

/* ===== 通知面板 ===== */
.notif-panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.notif-panel-count {
  font-size: 12px;
  font-weight: 500;
  color: #EF4444;
  background: #FEF2F2;
  padding: 2px 8px;
  border-radius: 10px;
}

.notif-list {
  display: flex;
  flex-direction: column;
}

.notif-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  border-bottom: 1px solid #F3F4F6;
  transition: background 0.12s;
  align-items: flex-start;
}
.notif-item:hover { background: #F9FAFB; }
.notif-item--unread { background: #FAFFFE; }

.notif-item-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #D1D5DB;
  flex-shrink: 0;
  margin-top: 5px;
}
.notif-item-dot--unread { background: #3B82F6; }

.notif-item-body { flex: 1; min-width: 0; }

.notif-item-title {
  font-size: 13.5px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 3px;
}

.notif-item-desc {
  font-size: 13px;
  color: #6B7280;
  line-height: 1.5;
}

.notif-item-time {
  font-size: 11.5px;
  color: #9CA3AF;
  margin-top: 6px;
}

@media (max-width: 768px) {
  .notif-item-title { font-size: 14px; }
  .notif-item-desc { font-size: 13px; }
  .notif-item-time { font-size: 13px; }
}
</style>
