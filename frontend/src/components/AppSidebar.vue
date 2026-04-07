<template>
  <div class="sidebar" :class="{ 'sidebar--collapsed': appStore.sidebarCollapsed }">
    <!-- Logo -->
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">
        <IconHeart :size="18" />
      </div>
      <transition name="fade-text">
        <span v-if="!appStore.sidebarCollapsed" class="sidebar-logo-name">心晴平台</span>
      </transition>
    </div>

    <!-- 导航菜单 -->
    <nav class="sidebar-nav">
      <!-- 主功能 -->
      <div class="nav-group">
        <div v-if="!appStore.sidebarCollapsed" class="nav-group-label">主功能</div>

        <a
          class="nav-item"
          :class="{ 'nav-item--active': isActive('/dashboard') }"
          @click="go('/dashboard')"
        >
          <span class="nav-item-icon"><IconDashboard /></span>
          <span v-if="!appStore.sidebarCollapsed" class="nav-item-text">工作台</span>
          <span v-if="appStore.sidebarCollapsed" class="nav-tooltip">工作台</span>
        </a>

        <div class="nav-item nav-item--parent" :class="{ 'nav-item--open': openKeys.includes('alerts') }">
          <div class="nav-item-trigger" @click.stop="toggleGroup('alerts')">
            <span class="nav-item-icon">
              <IconExclamationCircle />
              <span v-if="appStore.sidebarCollapsed" class="nav-dot nav-dot--red" />
            </span>
            <span v-if="!appStore.sidebarCollapsed" class="nav-item-text">
              预警管理
              <span class="nav-badge nav-badge--red">●</span>
            </span>
            <span v-if="!appStore.sidebarCollapsed" class="nav-chevron">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span v-if="appStore.sidebarCollapsed" class="nav-tooltip">预警管理</span>
          </div>
          <div
            v-if="!appStore.sidebarCollapsed"
            v-show="openKeys.includes('alerts')"
            class="nav-children"
          >
            <a class="nav-child" :class="{ 'nav-child--active': route.path === '/alerts' }" @click="go('/alerts')">
              预警列表
            </a>
          </div>
        </div>

        <div class="nav-item nav-item--parent" :class="{ 'nav-item--open': openKeys.includes('students') }">
          <div class="nav-item-trigger" @click.stop="toggleGroup('students')">
            <span class="nav-item-icon"><IconUserGroup /></span>
            <span v-if="!appStore.sidebarCollapsed" class="nav-item-text">学生管理</span>
            <span v-if="!appStore.sidebarCollapsed" class="nav-chevron">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span v-if="appStore.sidebarCollapsed" class="nav-tooltip">学生管理</span>
          </div>
          <div
            v-if="!appStore.sidebarCollapsed"
            v-show="openKeys.includes('students')"
            class="nav-children"
          >
            <a class="nav-child" :class="{ 'nav-child--active': route.path === '/students' }" @click="go('/students')">
              全部学生
            </a>
            <a
              class="nav-child"
              :class="{ 'nav-child--active': route.path === '/cases' || route.path.startsWith('/cases/') }"
              @click="go('/cases')"
            >
              个案管理
            </a>
            <a
              v-if="isCounselor"
              class="nav-child"
              :class="{ 'nav-child--active': route.path === '/training/my' }"
              @click="go('/training/my')"
            >
              我的培训
            </a>
          </div>
        </div>
      </div>

      <!-- 测评与分析 -->
      <div class="nav-group">
        <div v-if="!appStore.sidebarCollapsed" class="nav-group-label">测评与分析</div>

        <div class="nav-item nav-item--parent" :class="{ 'nav-item--open': openKeys.includes('assessment') }">
          <div class="nav-item-trigger" @click.stop="toggleGroup('assessment')">
            <span class="nav-item-icon"><IconFile /></span>
            <span v-if="!appStore.sidebarCollapsed" class="nav-item-text">测评管理</span>
            <span v-if="!appStore.sidebarCollapsed" class="nav-chevron">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span v-if="appStore.sidebarCollapsed" class="nav-tooltip">测评管理</span>
          </div>
          <div
            v-if="!appStore.sidebarCollapsed"
            v-show="openKeys.includes('assessment')"
            class="nav-children"
          >
            <a class="nav-child" :class="{ 'nav-child--active': route.path === '/plans' }" @click="go('/plans')">测评计划</a>
            <a class="nav-child" :class="{ 'nav-child--active': route.path === '/plans/create' }" @click="go('/plans/create')">新建计划</a>
            <a class="nav-child" :class="{ 'nav-child--active': route.path === '/scales' }" @click="go('/scales')">量表题库</a>
          </div>
        </div>

        <div class="nav-item nav-item--parent" :class="{ 'nav-item--open': openKeys.includes('analytics') }">
          <div class="nav-item-trigger" @click.stop="toggleGroup('analytics')">
            <span class="nav-item-icon"><IconBarChart /></span>
            <span v-if="!appStore.sidebarCollapsed" class="nav-item-text">数据分析</span>
            <span v-if="!appStore.sidebarCollapsed" class="nav-chevron">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span v-if="appStore.sidebarCollapsed" class="nav-tooltip">数据分析</span>
          </div>
          <div
            v-if="!appStore.sidebarCollapsed"
            v-show="openKeys.includes('analytics')"
            class="nav-children"
          >
            <a class="nav-child" :class="{ 'nav-child--active': route.path === '/dashboard/class' }" @click="go('/dashboard/class')">班级看板</a>
          </div>
        </div>
      </div>

      <!-- 咨询预约（counselor / doctor / admin） -->
      <div v-if="isCounselor" class="nav-group">
        <div v-if="!appStore.sidebarCollapsed" class="nav-group-label">咨询预约</div>

        <div class="nav-item nav-item--parent" :class="{ 'nav-item--open': openKeys.includes('consult') }">
          <div class="nav-item-trigger" @click.stop="toggleGroup('consult')">
            <span class="nav-item-icon"><IconHeart /></span>
            <span v-if="!appStore.sidebarCollapsed" class="nav-item-text">咨询管理</span>
            <span v-if="!appStore.sidebarCollapsed" class="nav-chevron">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span v-if="appStore.sidebarCollapsed" class="nav-tooltip">咨询管理</span>
          </div>
          <div
            v-if="!appStore.sidebarCollapsed"
            v-show="openKeys.includes('consult')"
            class="nav-children"
          >
            <a class="nav-child" :class="{ 'nav-child--active': route.path === '/consult/schedule' }" @click="go('/consult/schedule')">咨询排班</a>
            <a class="nav-child" :class="{ 'nav-child--active': route.path === '/consult/appointments' }" @click="go('/consult/appointments')">预约管理</a>
          </div>
        </div>
      </div>

      <!-- 干预管理 -->
      <div v-if="isCounselor" class="nav-group">
        <div v-if="!appStore.sidebarCollapsed" class="nav-group-label">干预管理</div>

        <div class="nav-item nav-item--parent" :class="{ 'nav-item--open': openKeys.includes('intervention') }">
          <div class="nav-item-trigger" @click.stop="toggleGroup('intervention')">
            <span class="nav-item-icon"><IconApps /></span>
            <span v-if="!appStore.sidebarCollapsed" class="nav-item-text">资源入口</span>
            <span v-if="!appStore.sidebarCollapsed" class="nav-chevron">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span v-if="appStore.sidebarCollapsed" class="nav-tooltip">资源入口</span>
          </div>
          <div
            v-if="!appStore.sidebarCollapsed"
            v-show="openKeys.includes('intervention')"
            class="nav-children"
          >
            <a
              class="nav-child"
              :class="{ 'nav-child--active': isInterventionCasesDefault }"
              @click="go('/cases')"
            >个案管理</a>
            <a
              class="nav-child"
              :class="{ 'nav-child--active': isInterventionInterview }"
              @click="goWithQuery('/cases', { tab: '访谈' })"
            >访谈辅导</a>
            <a
              class="nav-child"
              :class="{ 'nav-child--active': route.path === '/consult/appointments' }"
              @click="go('/consult/appointments')"
            >心理咨询</a>
            <a
              class="nav-child"
              :class="{ 'nav-child--active': route.path === '/intervention/referral' }"
              @click="go('/intervention/referral')"
            >医疗转介</a>
            <a
              class="nav-child"
              :class="{ 'nav-child--active': route.path === '/intervention/sandplay' }"
              @click="go('/intervention/sandplay')"
            >沙盘疗法</a>
            <a
              class="nav-child"
              :class="{ 'nav-child--active': route.path === '/intervention/art-therapy' }"
              @click="go('/intervention/art-therapy')"
            >绘画疗法</a>
            <a
              class="nav-child"
              :class="{ 'nav-child--active': route.path === '/intervention/hotlines' }"
              @click="go('/intervention/hotlines')"
            >援助热线</a>
          </div>
        </div>
      </div>

      <!-- 系统管理 -->
      <div v-if="isAdmin" class="nav-group">
        <div v-if="!appStore.sidebarCollapsed" class="nav-group-label">系统</div>

        <div class="nav-item nav-item--parent" :class="{ 'nav-item--open': openKeys.includes('admin') }">
          <div class="nav-item-trigger" @click.stop="toggleGroup('admin')">
            <span class="nav-item-icon"><IconSettings /></span>
            <span v-if="!appStore.sidebarCollapsed" class="nav-item-text">系统管理</span>
            <span v-if="!appStore.sidebarCollapsed" class="nav-chevron">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span v-if="appStore.sidebarCollapsed" class="nav-tooltip">系统管理</span>
          </div>
          <div
            v-if="!appStore.sidebarCollapsed"
            v-show="openKeys.includes('admin')"
            class="nav-children"
          >
            <a class="nav-child" :class="{ 'nav-child--active': route.path === '/admin/users' }" @click="go('/admin/users')">用户列表</a>
            <a class="nav-child" :class="{ 'nav-child--active': route.path === '/admin/students/import' }" @click="go('/admin/students/import')">导入学生</a>
            <a
              class="nav-child"
              :class="{
                'nav-child--active':
                  route.path === '/training' ||
                  (route.path.startsWith('/training/') && route.path !== '/training/my'),
              }"
              @click="go('/training')"
            >培训管理</a>
            <a
              class="nav-child"
              :class="{ 'nav-child--active': route.path === '/transfers/pending' }"
              @click="go('/transfers/pending')"
            >待认领学生</a>
          </div>
        </div>
      </div>
    </nav>

    <!-- 底部用户信息 -->
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-avatar">{{ avatarLetter }}</div>
        <transition name="fade-text">
          <div v-if="!appStore.sidebarCollapsed" class="sidebar-user-info">
            <div class="sidebar-user-name">{{ authStore.realName || '用户' }}</div>
            <div class="sidebar-user-role">{{ roleLabel }}</div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import {
  IconDashboard, IconExclamationCircle, IconUserGroup,
  IconFile, IconBarChart, IconHeart, IconSettings, IconApps,
} from '@arco-design/web-vue/es/icon'

const emit = defineEmits(['navigate'])

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()

const ROLE_MAP = {
  student: '学生', teacher: '班主任', counselor: '心理教师',
  doctor: '校医', admin: '管理员', super_admin: '超级管理员',
}
const roleLabel = computed(() => ROLE_MAP[authStore.userRole] || '用户')
const isAdmin = computed(() => ['admin', 'super_admin'].includes(authStore.userRole))
const isCounselor = computed(() => ['counselor', 'doctor', 'admin', 'super_admin'].includes(authStore.userRole))
const avatarLetter = computed(() => (authStore.realName || '用')[0])

/** 干预侧栏「个案管理」：/cases 列表页且非访谈 tab */
const isInterventionCasesDefault = computed(() => {
  if (route.path !== '/cases') return false
  const t = route.query.tab
  if (t === '访谈' || t === 'interview') return false
  return true
})

/** 干预侧栏「访谈辅导」 */
const isInterventionInterview = computed(() => {
  if (route.path !== '/cases') return false
  const t = route.query.tab
  return t === '访谈' || t === 'interview'
})

// 默认展开包含当前路径的分组
function getDefaultOpenKeys() {
  const p = route.path
  const keys = []
  if (p.startsWith('/alerts')) keys.push('alerts')
  if (p.startsWith('/students') || p.startsWith('/cases')) keys.push('students')
  if (p.startsWith('/plans') || p.startsWith('/scales')) keys.push('assessment')
  if (p.startsWith('/dashboard/class')) keys.push('analytics')
  if (p.startsWith('/consult')) keys.push('consult')
  if (p.startsWith('/intervention') || (p === '/cases' && (route.query.tab === '访谈' || route.query.tab === 'interview'))) {
    keys.push('intervention')
  }
  if (p.startsWith('/admin')) keys.push('admin')
  if (p.startsWith('/training')) keys.push('students')
  if (p.startsWith('/transfers')) keys.push('admin')
  return keys
}

const openKeys = ref(getDefaultOpenKeys())

/** 路由变化时自动展开当前页所在分组（不强制收起用户已折叠的其他组） */
watch(
  () => route.path,
  () => {
    const defaults = getDefaultOpenKeys()
    const next = new Set(openKeys.value)
    defaults.forEach((k) => next.add(k))
    openKeys.value = [...next]
  }
)

function toggleGroup(key) {
  const idx = openKeys.value.indexOf(key)
  if (idx === -1) openKeys.value.push(key)
  else openKeys.value.splice(idx, 1)
}

function isActive(path) {
  return route.path === path
}

function go(path) {
  router.push(path)
  emit('navigate')
}

function goWithQuery(path, query) {
  router.push({ path, query })
  emit('navigate')
}
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 240px;
  background: var(--sidebar-bg, #0F1D19);
  overflow: hidden;
  user-select: none;
}

.sidebar--collapsed {
  width: 64px;
}

/* ===== Logo ===== */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 56px;
  padding: 0 18px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255,255,255,.06);
  overflow: hidden;
}

.sidebar-logo-icon {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #34D399 0%, #2d7a6a 100%);
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.sidebar-logo-name {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

/* ===== Nav ===== */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
  scrollbar-width: none;
}
.sidebar-nav::-webkit-scrollbar { display: none; }

.nav-group {
  padding: 0 0 8px;
}

.nav-group-label {
  padding: 12px 20px 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: rgba(255,255,255,.3);
  white-space: nowrap;
}

/* ===== Nav Item ===== */
.nav-item {
  position: relative;
  margin: 1px 8px;
}

/* 顶层直接导航项 */
a.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 12px;
  border-radius: 7px;
  cursor: pointer;
  color: rgba(255,255,255,.65);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

a.nav-item:hover {
  background: var(--sidebar-hover);
  color: rgba(255,255,255,.9);
}

a.nav-item.nav-item--active {
  background: var(--sidebar-active);
  color: #fff;
}

a.nav-item.nav-item--active::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 18px;
  background: var(--sidebar-accent, #34D399);
  border-radius: 0 3px 3px 0;
}

/* 有子菜单的父项 */
.nav-item-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 12px;
  border-radius: 7px;
  cursor: pointer;
  color: rgba(255,255,255,.65);
  font-size: 13.5px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.nav-item-trigger:hover {
  background: var(--sidebar-hover);
  color: rgba(255,255,255,.9);
}

.nav-item--open > .nav-item-trigger {
  color: rgba(255,255,255,.9);
}

.nav-item-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  position: relative;
}

.nav-item-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-badge {
  font-size: 8px;
  margin-left: 4px;
  line-height: 1;
}

.nav-badge--red { color: #F87171; }

.nav-dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: 1.5px solid var(--sidebar-bg, #0F1D19);
}

.nav-dot--red { background: #F87171; }

/* chevron 箭头旋转 */
.nav-chevron {
  color: rgba(255,255,255,.3);
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.nav-item--open > .nav-item-trigger .nav-chevron {
  transform: rotate(180deg);
  color: rgba(255,255,255,.5);
}

/* ===== 子菜单 ===== */
/* 未展开时隐藏子项（仅依赖 openKeys + nav-item--open；此前子菜单一直显示导致「无法收起」） */
.nav-item.nav-item--parent:not(.nav-item--open) .nav-children {
  display: none;
}

.nav-children {
  overflow: hidden;
  padding: 2px 0 4px;
}

.nav-child {
  display: block;
  padding: 6px 12px 6px 40px;
  font-size: 13px;
  color: rgba(255,255,255,.5);
  cursor: pointer;
  border-radius: 6px;
  margin: 1px 0;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
  text-decoration: none;
}

.nav-child:hover {
  background: var(--sidebar-hover);
  color: rgba(255,255,255,.8);
}

.nav-child--active {
  color: #fff;
  background: var(--sidebar-active);
}

/* ===== Tooltip（折叠状态） ===== */
.nav-tooltip {
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  background: #1F2937;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 6px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0,0,0,.25);
}

.nav-tooltip::before {
  content: '';
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 5px solid transparent;
  border-right-color: #1F2937;
}

.nav-item:hover .nav-tooltip,
a.nav-item:hover .nav-tooltip {
  opacity: 1;
}

/* ===== 底部用户区 ===== */
.sidebar-footer {
  flex-shrink: 0;
  padding: 12px 10px;
  border-top: 1px solid rgba(255,255,255,.06);
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.sidebar-user:hover {
  background: var(--sidebar-hover);
}

.sidebar-avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(135deg, #34D399 0%, #2d7a6a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  letter-spacing: 0;
}

.sidebar-user-info {
  overflow: hidden;
}

.sidebar-user-name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-user-role {
  font-size: 11px;
  color: rgba(255,255,255,.4);
  margin-top: 1px;
  white-space: nowrap;
}

/* ===== 折叠时隐藏文字 ===== */
.sidebar--collapsed .nav-item-text,
.sidebar--collapsed .nav-chevron,
.sidebar--collapsed .nav-children,
.sidebar--collapsed .nav-group-label,
.sidebar--collapsed .nav-badge {
  display: none;
}

.sidebar--collapsed a.nav-item,
.sidebar--collapsed .nav-item-trigger {
  justify-content: center;
  padding: 0;
}

.sidebar--collapsed .sidebar-user {
  justify-content: center;
  padding: 8px 0;
}

/* ===== 折叠展开文字过渡 ===== */
.fade-text-enter-active,
.fade-text-leave-active {
  transition: opacity 0.15s, width 0.2s;
}
.fade-text-enter-from,
.fade-text-leave-to {
  opacity: 0;
}
</style>
