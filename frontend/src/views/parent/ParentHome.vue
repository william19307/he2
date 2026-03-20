<template>
  <div class="parent-home">
    <div class="top-bar">
      <span class="child-name">{{ summary?.student_name || '-' }}</span>
      <span class="child-class">{{ summary?.class_name || '-' }}</span>
    </div>

    <div class="status-card" :class="statusCardClass">
      <div class="status-icon">
        <span v-if="summary?.overall_status === 'normal'" class="icon-smile">😊</span>
        <span v-else-if="summary?.overall_status === 'needs_attention'" class="icon-smile">😐</span>
        <span v-else class="icon-smile">😟</span>
      </div>
      <div class="status-text">{{ summary?.overall_status_label || '加载中...' }}</div>
      <div class="status-meta">
        <span>上次测评：{{ summary?.last_assessment_date || '暂无' }}</span>
        <span>本学期参与：{{ summary?.assessment_count_this_semester ?? 0 }} 次</span>
      </div>
    </div>

    <div class="suggestions-block">
      <h3>家庭支持建议</h3>
      <div v-for="(s, i) in (summary?.suggestions || [])" :key="i" class="suggestion-card">
        <div class="suggestion-bar" />
        <div class="suggestion-text">{{ s }}</div>
      </div>
    </div>

    <div class="counselor-card" v-if="summary?.counselor_contact">
      <h3>心理老师联系方式</h3>
      <div class="counselor-info">
        <span class="name">{{ summary.counselor_contact.name }}</span>
        <span class="title">{{ summary.counselor_contact.title }}</span>
        <span class="time">{{ summary.counselor_contact.available_time }}</span>
      </div>
    </div>

    <div class="nav-links">
      <a class="nav-link" @click="$router.push('/parent/notifications')">
        查看通知
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getParentHealthSummary } from '@/api/parent'

const summary = ref(null)

const statusCardClass = computed(() => {
  const s = summary.value?.overall_status
  if (s === 'normal') return 'status-normal'
  if (s === 'needs_attention') return 'status-attention'
  if (s === 'urgent') return 'status-urgent'
  return ''
})

onMounted(async () => {
  document.title = '家长首页 - 心晴平台'
  try {
    const res = await getParentHealthSummary()
    if (res?.code === 0) summary.value = res.data
  } catch {
    summary.value = null
  }
})
</script>

<style scoped>
.parent-home {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 16px;
  padding-bottom: 80px;
}
.top-bar {
  background: #fff;
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 16px;
}
.child-name { font-size: 18px; font-weight: 600; display: block; }
.child-class { font-size: 14px; color: #666; }
.status-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  margin-bottom: 32px;
  border-left: 4px solid #10b981;
}
.status-card.status-attention { border-left-color: #f59e0b; }
.status-card.status-urgent { border-left-color: #ef4444; }
.status-icon { font-size: 48px; margin-bottom: 8px; }
.status-text { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
.status-meta { font-size: 13px; color: #666; display: flex; flex-direction: column; gap: 4px; }
.suggestions-block { margin-bottom: 24px; }
.suggestions-block h3 { font-size: 16px; margin: 0 0 12px; font-weight: 600; }
.suggestion-card {
  background: #fff;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 8px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.suggestion-bar { width: 4px; min-height: 40px; background: #10b981; border-radius: 2px; flex-shrink: 0; }
.suggestion-text { font-size: 14px; color: #333; line-height: 1.5; }
.counselor-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 8px;
}
.counselor-card h3 { font-size: 16px; margin: 0 0 12px; font-weight: 600; }
.counselor-info { display: flex; flex-direction: column; gap: 4px; font-size: 14px; color: #333; }
.nav-links { margin-top: 24px; }
.nav-link {
  display: block;
  text-align: center;
  padding: 12px;
  background: #fff;
  border-radius: 12px;
  color: #165dff;
  font-size: 15px;
  text-decoration: none;
}
</style>
