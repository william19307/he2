<template>
  <div class="history-page">
    <header class="history-nav">
      <button type="button" class="nav-back" aria-label="返回" @click="onBack">‹</button>
      <h1 class="nav-title">历史对话</h1>
    </header>

    <div v-if="loading && !sessions.length" class="history-loading">加载中…</div>
    <div v-else class="history-list">
      <button
        v-for="s in sessions"
        :key="s.session_id"
        type="button"
        class="session-item"
        @click="openSession(s)"
      >
        <div class="session-main">
          <div class="session-title-row">
            <span class="session-title">{{ s.title?.trim() || '未命名对话' }}</span>
            <span v-if="s.risk_level === 'high'" class="risk-dot" aria-label="高风险" />
          </div>
          <div class="session-meta">
            {{ formatWhen(s.last_message_at || s.started_at) }} · {{ s.message_count ?? 0 }} 条消息
            <span v-if="s.is_active !== 1" class="ended-label">已结束</span>
          </div>
        </div>
      </button>
      <p v-if="!loading && !sessions.length" class="empty-tip">暂无历史对话</p>
      <p v-else-if="finished && sessions.length" class="list-finished">没有更多了</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { h5AiChatSessions } from '@/api/h5'

const router = useRouter()
const sessions = ref([])
const loading = ref(false)
const finished = ref(false)

function onBack() {
  router.back()
}

function formatWhen(iso) {
  if (!iso) return '—'
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return '—'
  const mm = String(t.getMonth() + 1).padStart(2, '0')
  const dd = String(t.getDate()).padStart(2, '0')
  const hh = String(t.getHours()).padStart(2, '0')
  const mi = String(t.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

async function loadSessions() {
  loading.value = true
  try {
    const data = await h5AiChatSessions()
    const raw = Array.isArray(data?.sessions) ? data.sessions : []
    sessions.value = raw
    finished.value = true
  } catch {
    Message.error('加载失败')
    finished.value = true
  } finally {
    loading.value = false
  }
}

function openSession(s) {
  if (s.is_active !== 1) {
    Message.warning('该对话已结束，仅可查看记录')
  }
  router.push({
    path: '/h5/ai-chat',
    query: {
      resume_session_id: String(s.session_id),
      ...(s.is_active !== 1 ? { readonly: '1' } : {}),
    },
  })
}

onMounted(() => {
  document.title = '历史对话 - 心晴平台'
  loadSessions()
})
</script>

<style scoped>
.history-page {
  min-height: 100dvh;
  background: var(--h5-bg);
  max-width: 480px;
  margin: 0 auto;
}

.history-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--h5-surface, #fff);
  border-bottom: 1px solid var(--h5-border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.nav-back {
  border: none;
  background: none;
  font-size: 28px;
  line-height: 1;
  color: var(--h5-text);
  padding: 0 4px;
  cursor: pointer;
}
.nav-title {
  flex: 1;
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  text-align: center;
  padding-right: 32px;
}

.history-loading {
  text-align: center;
  padding: 24px;
  font-size: 14px;
  color: var(--h5-subtext);
}

.empty-tip {
  text-align: center;
  padding: 32px 16px;
  font-size: 14px;
  color: var(--h5-subtext);
  margin: 0;
}

.list-finished {
  text-align: center;
  padding: 12px;
  font-size: 12px;
  color: var(--h5-subtext);
  margin: 0;
}

.session-item {
  width: 100%;
  display: block;
  border: none;
  border-bottom: 1px solid var(--h5-border);
  background: var(--h5-surface, #fff);
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
}

.session-item:active {
  background: rgba(61, 139, 122, 0.06);
}

.session-main {
  position: relative;
  padding-right: 20px;
}

.session-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.session-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--h5-text);
  line-height: 1.4;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.risk-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ee0a24;
  flex-shrink: 0;
}

.session-meta {
  margin-top: 6px;
  font-size: 12px;
  color: var(--h5-subtext);
}

.ended-label {
  margin-left: 8px;
  color: #999;
}
</style>
