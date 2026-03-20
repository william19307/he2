<template>
  <div class="page-wrap chat-record-page">
    <a-page-header
      title="关联AI倾诉记录"
      @back="$router.push(`/alerts/${route.params.id}`)"
    />

    <a-alert type="warning" class="tip-banner">
      以下内容为学生与小晴的对话记录，查看行为已记录
    </a-alert>

    <a-card class="chat-card" :bordered="false">
      <div v-if="loading" class="loading-wrap"><a-spin /></div>
      <a-empty v-else-if="messages.length === 0" description="暂无对话内容" />
      <div v-else class="chat-body">
        <div v-for="msg in messages" :key="msg.id" class="msg-row" :class="msg.role === 'user' ? 'msg-user' : 'msg-ai'">
          <div v-if="msg.role !== 'user'" class="avatar-ai">晴</div>
          <div class="bubble" :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'">
            <div class="content">{{ msg.content }}</div>
            <div class="time">{{ formatTime(msg.created_at) }}</div>
          </div>
        </div>
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { getAlert } from '@/api/alerts'
import { getAiChatSessionMessages } from '@/api/aiChat'

const route = useRoute()
const loading = ref(false)
const messages = ref([])

function formatTime(iso) {
  if (!iso) return ''
  return String(iso).replace('T', ' ').slice(0, 16)
}

function extractSessionId(raw) {
  if (!raw) return null
  if (typeof raw === 'object') {
    const v = raw.session_id ?? raw.sessionId
    return v != null ? String(v) : null
  }
  const str = String(raw)
  try {
    const obj = JSON.parse(str)
    const v = obj?.session_id ?? obj?.sessionId
    if (v != null) return String(v)
  } catch {
    /* noop */
  }
  const m = str.match(/session[_-]?id[^0-9]*([0-9]+)/i)
  return m?.[1] || null
}

async function resolveSessionId() {
  const fromQuery = route.query.session_id
  if (typeof fromQuery === 'string' && fromQuery.trim()) return fromQuery.trim()
  const detail = await getAlert(route.params.id)
  const data = detail?.data || {}
  return extractSessionId(data.report_evidence) || extractSessionId(data.alert?.report_evidence)
}

async function load() {
  loading.value = true
  try {
    const sid = await resolveSessionId()
    if (!sid) {
      Message.warning('未找到关联会话')
      messages.value = []
      return
    }
    const res = await getAiChatSessionMessages(sid)
    messages.value = res.data?.messages || []
  } catch {
    messages.value = []
    Message.error('加载对话失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.chat-record-page { padding-top: 12px; }
.tip-banner { margin: 8px 0 14px; }
.chat-card { border-radius: var(--radius-md); box-shadow: var(--shadow-card); }
.loading-wrap { text-align: center; padding: 60px 0; }
.chat-body { display: flex; flex-direction: column; gap: 12px; }
.msg-row { display: flex; gap: 8px; align-items: flex-end; }
.msg-ai { justify-content: flex-start; }
.msg-user { justify-content: flex-end; }
.avatar-ai {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #3d8b7a;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bubble {
  max-width: 72%;
  padding: 10px 12px;
  border-radius: 12px;
}
.bubble-ai {
  background: rgba(61, 139, 122, 0.12);
  color: #1b1c19;
}
.bubble-user {
  background: #fff;
  border: 1px solid var(--color-border-1);
}
.content { font-size: 14px; line-height: 1.55; white-space: pre-wrap; }
.time { margin-top: 6px; font-size: 11px; color: var(--color-text-3); text-align: right; }
</style>
