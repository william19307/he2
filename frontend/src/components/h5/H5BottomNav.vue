<template>
  <div class="h5-bottom-nav">
    <div
      class="nav-tab"
      :class="{ active: active === 'home' }"
      @click="router.push('/h5/tasks')"
    >
      <div class="nav-icon">🏠</div>
      <div class="nav-label">首页</div>
    </div>
    <div
      class="nav-tab"
      :class="{ active: active === 'wellness' }"
      @click="router.push('/h5/wellness')"
    >
      <div class="nav-icon">🌿</div>
      <div class="nav-label">调适</div>
    </div>
    <div
      class="nav-tab"
      :class="{ active: active === 'aichat' }"
      @click="router.push('/h5/ai-chat')"
    >
      <div class="nav-icon">💬</div>
      <div class="nav-label">倾诉</div>
    </div>
    <div
      class="nav-tab"
      :class="{ active: active === 'consult' }"
      @click="router.push('/h5/consult')"
    >
      <div class="nav-icon">📅</div>
      <div class="nav-label">预约</div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

defineProps({
  active: {
    type: String,
    default: 'home',
    validator: (v) => ['home', 'wellness', 'aichat', 'consult'].includes(v),
  },
})

const router = useRouter()
</script>

<style scoped>
.h5-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 420px;
  display: flex;
  background: #fbf9f4;
  box-shadow: 0 -10px 30px rgba(63, 73, 70, 0.08);
  border-top: none;
  border-radius: 24px 24px 0 0;
  padding: 8px 8px env(safe-area-inset-bottom, 10px);
  z-index: 100;
}
.nav-tab {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  border-radius: 16px;
  cursor: pointer;
  color: #9ca3af;
  transition: all 0.2s;
}
.nav-tab.active {
  color: #3d8b7a;
  background: rgba(61, 139, 122, 0.12);
}
.nav-icon {
  font-size: 18px;
  line-height: 1;
}
.nav-label {
  font-size: 10px;
  margin-top: 3px;
  font-weight: 600;
}
</style>
