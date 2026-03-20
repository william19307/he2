<template>
  <div class="h5-page">
    <div class="h5-nav-bar">
      <span class="back" @click="router.back()">←</span>
      <span class="title">我的预约</span>
      <span class="right" />
    </div>

    <a-tabs v-model:active-key="tab" type="capsule" class="my-tabs">
      <a-tab-pane key="upcoming" title="即将到来" />
      <a-tab-pane key="history" title="历史记录" />
    </a-tabs>

    <div v-if="loading" class="loading-wrap"><a-spin /></div>

    <div v-else-if="displayList.length === 0" class="empty-state">
      <a-empty :description="tab === 'upcoming' ? '暂无即将到来的预约' : '暂无历史记录'" />
    </div>

    <div v-else class="appt-list">
      <div v-for="a in displayList" :key="a.id" class="appt-card">
        <div class="appt-top">
          <span class="appt-date">{{ a.appoint_date }}</span>
          <a-tag :color="statusColor(a.status)" size="small">{{ a.status_label }}</a-tag>
        </div>
        <div class="appt-time">{{ a.start_time }} – {{ a.end_time }}</div>
        <div class="appt-info">
          <span>{{ a.location }}</span>
          <span>{{ a.counselor_name }}</span>
        </div>
        <div v-if="a.student_note" class="appt-note">{{ a.student_note }}</div>
        <div v-if="a.status === 'confirmed' && tab === 'upcoming'" class="appt-actions">
          <a-button
            size="small"
            status="warning"
            :loading="cancelingId === a.id"
            @click="openCancel(a)"
          >
            取消预约
          </a-button>
        </div>
      </div>
    </div>

    <a-modal v-model:visible="cancelVisible" title="取消预约" @ok="submitCancel">
      <p>确定要取消 {{ cancelTarget?.appoint_date }} {{ cancelTarget?.start_time }} 的预约吗？</p>
      <a-textarea
        v-model="cancelReason"
        placeholder="取消原因（选填）"
        :auto-size="{ minRows: 2, maxRows: 4 }"
        :max-length="500"
      />
    </a-modal>

    <H5BottomNav active="consult" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { h5ConsultMy, h5ConsultCancel } from '@/api/h5'
import H5BottomNav from '@/components/h5/H5BottomNav.vue'

const router = useRouter()
const tab = ref('upcoming')
const loading = ref(false)
const upcoming = ref([])
const history = ref([])

const cancelVisible = ref(false)
const cancelTarget = ref(null)
const cancelReason = ref('')
const cancelingId = ref(null)

const displayList = computed(() =>
  tab.value === 'upcoming' ? upcoming.value : history.value
)

function statusColor(s) {
  return { pending: 'orangered', confirmed: 'green', completed: 'blue', cancelled: 'gray' }[s] || 'gray'
}

async function load() {
  loading.value = true
  try {
    const res = await h5ConsultMy()
    upcoming.value = res?.upcoming || []
    history.value = res?.history || []
  } catch {
    upcoming.value = []
    history.value = []
  } finally {
    loading.value = false
  }
}

function openCancel(a) {
  cancelTarget.value = a
  cancelReason.value = ''
  cancelVisible.value = true
}

async function submitCancel() {
  if (!cancelTarget.value) return
  cancelingId.value = cancelTarget.value.id
  try {
    await h5ConsultCancel(cancelTarget.value.id, cancelReason.value || '学生取消')
    Message.success('已取消')
    cancelVisible.value = false
    load()
  } catch {
    /* interceptor already toasted */
  } finally {
    cancelingId.value = null
  }
}

onMounted(load)
</script>

<style scoped>
.h5-page { max-width: 420px; margin: 0 auto; padding: 0 0 92px; min-height: 100vh; background: var(--h5-bg); }
.h5-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #fbf9f4;
  border-bottom: 1px solid var(--h5-border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.h5-nav-bar .back { font-size: 18px; cursor: pointer; width: 32px; }
.h5-nav-bar .title { font-size: 16px; font-weight: 600; }
.h5-nav-bar .right { width: 32px; }
.my-tabs { padding: 12px 16px 0; }

.loading-wrap { text-align: center; padding: 60px 0; }
.empty-state { padding: 60px 0; }

.appt-list {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.appt-card {
  background: var(--h5-surface);
  border: 1px solid var(--h5-border);
  border-radius: var(--h5-radius-card);
  padding: 14px 16px;
  box-shadow: var(--h5-shadow);
}
.appt-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.appt-date {
  font-weight: 700;
  font-size: 14px;
  color: var(--h5-text);
}
.appt-time {
  font-size: 15px;
  font-weight: 700;
  color: var(--h5-primary);
  margin-bottom: 4px;
}
.appt-info {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: var(--h5-subtext);
}
.appt-note {
  margin-top: 6px;
  font-size: 13px;
  color: var(--h5-subtext);
  padding: 6px 8px;
  background: #f0eee9;
  border-radius: 6px;
}
.appt-actions {
  margin-top: 10px;
  text-align: right;
}
:deep(.arco-btn) { border-radius: var(--h5-radius-pill) !important; }
</style>
