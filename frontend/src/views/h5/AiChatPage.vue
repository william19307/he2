<template>
  <div class="aichat-page">
    <div class="chat-header">
      <button class="back-btn" @click="$router.back()">‹</button>
      <div class="header-title">
        <span class="title-main">小晴（心理陪伴）</span>
        <span class="title-sub">随时在线 · 保密倾听</span>
      </div>
      <button type="button" class="history-btn" @click="goHistory">
        历史记录
      </button>
    </div>

    <div
      class="chat-body"
      ref="chatBodyRef"
      @scroll.passive="onChatScroll"
    >
      <div class="chat-top-state">
        <div v-if="loadingOlder" class="load-more-top">
          <span class="load-spinner" aria-label="加载中" />
        </div>
        <div
          v-else-if="showAllLoadedTip"
          class="all-loaded-tip"
        >
          已显示全部对话记录
        </div>
      </div>

      <div v-for="(item, index) in messages" :key="item.clientKey" class="msg-wrapper">
        <div v-if="index % 5 === 0 && index !== 0" class="timestamp">
          {{ formatTime(item.time) }}
        </div>

        <div v-if="item.type === 'crisis'" class="crisis-card">
          <div class="crisis-bar" />
          <div class="crisis-body">
            <p class="crisis-text">我注意到你可能需要更多支持，<br>学校心理老师随时可以帮助你。</p>
            <div class="crisis-btns">
              <button
                class="btn-contact"
                :disabled="item.contacted || chatReadonly"
                @click="contactCounselor(item)"
              >
                {{ item.contacted ? '已通知心理老师' : '联系心理老师' }}
              </button>
              <button class="btn-continue" @click="dismissCrisis(item)">继续聊天</button>
            </div>
          </div>
        </div>

        <div v-else-if="item.role === 'assistant'" class="msg-row msg-ai">
          <div class="avatar-ai">晴</div>
          <div class="bubble bubble-ai">{{ item.content }}</div>
        </div>

        <div v-else-if="item.role === 'user'" class="msg-row msg-user">
          <div class="bubble bubble-user">{{ item.content }}</div>
        </div>
      </div>

      <div v-if="replying" class="msg-row msg-ai">
        <div class="avatar-ai">晴</div>
        <div class="bubble bubble-ai">
          <div class="typing-dots">
            <span /><span /><span />
          </div>
        </div>
      </div>
    </div>

    <div class="chat-input-bar">
      <textarea
        ref="inputRef"
        v-model="inputText"
        class="msg-input"
        :disabled="chatReadonly"
        placeholder="和小晴说说你的心情..."
        rows="1"
        maxlength="500"
        @keydown.enter.exact.prevent="sendMessage"
        @input="autoResize"
      />
      <button
        class="send-btn"
        :disabled="!inputText.trim() || replying || !sessionId || chatReadonly"
        @click="sendMessage"
      >
        发送
      </button>
    </div>

    <div v-if="chatReadonly" class="readonly-bar">
      该对话已结束，仅可查看记录
    </div>

    <div v-if="showDisclaimer" class="disclaimer-mask">
      <div class="disclaimer-box">
        <div class="disclaimer-icon">💙</div>
        <h3 class="disclaimer-title">开始前请了解</h3>
        <p class="disclaimer-text">
          对话内容保密保存。<br>
          如检测到危机情况，系统会通知学校心理老师。<br>
          心理老师可在必要时申请查看记录。
        </p>
        <button class="disclaimer-btn" :disabled="starting" @click="acceptDisclaimer">
          {{ starting ? '正在连接...' : '我了解，开始聊天' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  h5AiChatCreateSession,
  h5AiChatSendMessage,
  h5AiChatSessionMessages,
} from '@/api/h5'
import h5Request from '@/utils/h5Request'

const AI_GREETING =
  '你好，我是小晴，学校心理健康陪伴助手。你可以说说今天的心情或困扰，我会认真听。'

const route = useRoute()
const router = useRouter()
const chatBodyRef = ref(null)
const inputRef = ref(null)
const inputText = ref('')
const messages = ref([])
const sessionId = ref(null)
const replying = ref(false)
const showDisclaimer = ref(false)
const starting = ref(false)

const hasMoreOlder = ref(false)
const loadingOlder = ref(false)
const initialFetchDone = ref(false)

let clientKeySeq = 0
function nextClientKey(prefix = 'c') {
  clientKeySeq += 1
  return `${prefix}-${clientKeySeq}`
}

const chatReadonly = computed(() => route.query.readonly === '1')

const showAllLoadedTip = computed(
  () =>
    initialFetchDone.value &&
    !hasMoreOlder.value &&
    !loadingOlder.value &&
    !!sessionId.value
)

function mapServerMessage(m) {
  return {
    clientKey: `s-${m.id}`,
    serverId: m.id,
    role: m.role,
    content: m.content,
    time: m.created_at ? new Date(m.created_at) : new Date(),
  }
}

function greetingBubble() {
  return {
    clientKey: nextClientKey('g'),
    serverId: null,
    role: 'assistant',
    content: AI_GREETING,
    time: new Date(),
  }
}

function getOldestServerId() {
  const ids = messages.value.map((m) => m.serverId).filter((x) => x != null)
  if (!ids.length) return null
  return Math.min(...ids)
}

function formatTime(d) {
  if (!d) return ''
  const t = d instanceof Date ? d : new Date(d)
  const h = String(t.getHours()).padStart(2, '0')
  const m = String(t.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

async function scrollToBottom() {
  await nextTick()
  if (chatBodyRef.value) {
    chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
  }
}

function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  const maxH = 3 * 22 + 16
  el.style.height = Math.min(el.scrollHeight, maxH) + 'px'
}

function goHistory() {
  router.push('/h5/ai-chat/history')
}

async function fetchRecentPage(scrollToEnd) {
  if (!sessionId.value) return
  loadingOlder.value = false
  const data = await h5AiChatSessionMessages(sessionId.value, { limit: 20 })
  const rows = (data.messages || []).map(mapServerMessage)
  messages.value = rows
  hasMoreOlder.value = data.has_more === true
  initialFetchDone.value = true
  if (scrollToEnd) await scrollToBottom()
}

async function loadOlderMessages() {
  if (loadingOlder.value || !hasMoreOlder.value || !sessionId.value) return
  const beforeId = getOldestServerId()
  if (beforeId == null) return

  loadingOlder.value = true
  const el = chatBodyRef.value
  const oldH = el?.scrollHeight ?? 0
  const oldTop = el?.scrollTop ?? 0

  try {
    const data = await h5AiChatSessionMessages(sessionId.value, {
      limit: 20,
      before_id: beforeId,
    })
    const prepend = (data.messages || []).map(mapServerMessage)
    messages.value = [...prepend, ...messages.value]
    hasMoreOlder.value = data.has_more === true
    await nextTick()
    if (el) {
      el.scrollTop = el.scrollHeight - oldH + oldTop
    }
  } catch {
    Message.error('加载更早消息失败')
  } finally {
    loadingOlder.value = false
  }
}

let scrollTicking = false
function onChatScroll() {
  const el = chatBodyRef.value
  if (!el || loadingOlder.value || !hasMoreOlder.value || !sessionId.value) return
  if (scrollTicking) return
  scrollTicking = true
  requestAnimationFrame(() => {
    scrollTicking = false
    if (el.scrollTop <= 48) {
      loadOlderMessages()
    }
  })
}

async function initFromRoute() {
  const rid = route.query.resume_session_id
  if (rid != null && String(rid).trim() !== '') {
    const sid = Number(rid)
    if (Number.isNaN(sid)) {
      Message.error('会话无效')
      return
    }
    starting.value = true
    try {
      sessionId.value = sid
      showDisclaimer.value = false
      initialFetchDone.value = false
      await fetchRecentPage(true)
    } catch {
      Message.error('加载会话失败')
      sessionId.value = null
      messages.value = []
      showDisclaimer.value = true
    } finally {
      starting.value = false
    }
    return
  }

  sessionId.value = null
  messages.value = []
  hasMoreOlder.value = false
  initialFetchDone.value = false
  showDisclaimer.value = true
}

async function acceptDisclaimer() {
  starting.value = true
  try {
    const data = await h5AiChatCreateSession()
    sessionId.value = data.session_id
    showDisclaimer.value = false
    await fetchRecentPage(true)
    if (messages.value.length === 0) {
      messages.value = [greetingBubble()]
    }
  } catch {
    Message.error('连接失败，请重试')
  } finally {
    starting.value = false
  }
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || replying.value || !sessionId.value || chatReadonly.value) return

  inputText.value = ''
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
  }

  messages.value.push({
    clientKey: nextClientKey('u'),
    serverId: null,
    role: 'user',
    content: text,
    time: new Date(),
  })
  await scrollToBottom()

  replying.value = true
  try {
    const data = await h5AiChatSendMessage(sessionId.value, text)
    replying.value = false
    messages.value.push({
      clientKey: nextClientKey('a'),
      serverId: null,
      role: 'assistant',
      content: data.reply,
      time: new Date(),
    })

    if (data.crisis_prompt?.show) {
      messages.value.push({
        clientKey: nextClientKey('x'),
        serverId: null,
        type: 'crisis',
        contacted: false,
        dismissed: false,
        time: new Date(),
      })
    }
    await scrollToBottom()
  } catch (e) {
    replying.value = false
    Message.error(e?.message || '发送失败，请重试')
    await scrollToBottom()
  }
}

async function contactCounselor(item) {
  if (!sessionId.value) {
    Message.error('会话无效，请刷新页面后重试')
    return
  }
  let studentPk = ''
  try {
    const raw = sessionStorage.getItem('xq_h5_student')
    const s = raw ? JSON.parse(raw) : {}
    studentPk = s.student_pk ? String(s.student_pk).trim() : ''
  } catch {
    /* noop */
  }
  if (!studentPk) {
    Message.error('身份信息缺失，请重新验证登录后再试')
    return
  }
  try {
    await h5Request.post('/alerts/manual-report', {
      student_id: studentPk,
      alert_level: 'red',
      report_urgency: 'urgent',
      report_reason:
        '我在AI倾诉对话中感到需要心理老师帮助，希望尽快得到学校心理支持。',
      ai_chat_session_id: String(sessionId.value),
    })
    item.contacted = true
    Message.success('已通知心理老师，请等待联系')
  } catch {
    /* h5Request 拦截器 */
  }
}

function dismissCrisis(item) {
  item.dismissed = true
  const idx = messages.value.indexOf(item)
  if (idx !== -1) messages.value.splice(idx, 1)
}

watch(
  () => route.query.resume_session_id,
  () => {
    if (route.path !== '/h5/ai-chat') return
    initFromRoute()
  }
)

onMounted(async () => {
  document.title = '小晴 - 心晴平台'
  await initFromRoute()
})
</script>

<style scoped>
.aichat-page {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: var(--h5-bg);
  max-width: 480px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fbf9f4;
  border-bottom: 1px solid var(--h5-border);
  flex-shrink: 0;
}
.history-btn {
  margin-left: auto;
  border: 1px solid var(--h5-border);
  background: #fff;
  border-radius: 999px;
  font-size: 12px;
  color: var(--h5-text);
  padding: 6px 10px;
  cursor: pointer;
}
.back-btn {
  background: none;
  border: none;
  font-size: 26px;
  color: #333;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.header-title {
  display: flex;
  flex-direction: column;
}
.title-main {
  font-size: 16px;
  font-weight: 700;
  color: var(--h5-text);
}
.title-sub {
  font-size: 11px;
  color: var(--h5-primary);
}

.chat-top-state {
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.load-more-top {
  padding: 10px 0 6px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.load-spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 2px solid var(--h5-border);
  border-top-color: var(--h5-primary);
  border-radius: 50%;
  animation: load-spin 0.75s linear infinite;
}
@keyframes load-spin {
  to {
    transform: rotate(360deg);
  }
}
.all-loaded-tip {
  font-size: 12px;
  color: var(--h5-subtext);
  padding: 8px 0 4px;
  text-align: center;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.msg-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.timestamp {
  text-align: center;
  font-size: 11px;
  color: #aaa;
  margin: 4px 0;
}

.msg-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.msg-ai {
  justify-content: flex-start;
}
.msg-user {
  justify-content: flex-end;
}

.avatar-ai {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--h5-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.5;
  word-break: break-word;
}
.bubble-ai {
  background: rgba(61, 139, 122, 0.13);
  border-radius: 2px 12px 12px 12px;
  color: #1a1a1a;
}
.bubble-user {
  background: #fff;
  border: 1px solid var(--h5-border);
  border-radius: 12px 2px 12px 12px;
  color: #1a1a1a;
}

.typing-dots {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 2px 0;
}
.typing-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--h5-primary);
  animation: bounce 1.2s infinite ease-in-out;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40% { transform: translateY(-6px); opacity: 1; }
}

.crisis-card {
  display: flex;
  background: #fff1f0;
  border-radius: 8px;
  overflow: hidden;
  margin: 4px 0;
}
.crisis-bar {
  width: 4px;
  background: #ef4444;
  flex-shrink: 0;
}
.crisis-body {
  padding: 12px 14px;
  flex: 1;
}
.crisis-text {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  margin: 0 0 10px;
}
.crisis-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.btn-contact {
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
}
.btn-contact:disabled {
  background: #ccc;
  cursor: default;
}
.btn-continue {
  background: #fff;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
}

.chat-input-bar {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  background: #fbf9f4;
  border-top: 1px solid var(--h5-border);
  flex-shrink: 0;
}
.readonly-bar {
  text-align: center;
  font-size: 12px;
  color: #999;
  padding: 6px 12px;
  background: #f5f5f5;
  border-top: 1px solid var(--h5-border);
}
.msg-input {
  flex: 1;
  border: 1px solid var(--h5-border);
  border-radius: 18px;
  padding: 9px 14px;
  font-size: 15px;
  resize: none;
  outline: none;
  font-family: inherit;
  line-height: 1.4;
  background: #fff;
  min-height: 38px;
  max-height: 80px;
  overflow-y: auto;
  transition: border-color 0.2s;
}
.msg-input:focus {
  border-color: var(--h5-primary);
}
.msg-input:disabled {
  opacity: 0.6;
  background: #f9f9f9;
}
.send-btn {
  background: var(--h5-primary);
  color: #fff;
  border: none;
  border-radius: 18px;
  padding: 9px 18px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
}
.send-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.disclaimer-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 200;
}
.disclaimer-box {
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding: 28px 24px 40px;
  width: 100%;
  text-align: center;
}
.disclaimer-icon {
  font-size: 40px;
  margin-bottom: 12px;
}
.disclaimer-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 14px;
}
.disclaimer-text {
  font-size: 14px;
  color: #555;
  line-height: 1.8;
  margin: 0 0 24px;
}
.disclaimer-btn {
  background: var(--h5-primary);
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 13px 0;
  width: 100%;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}
.disclaimer-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
