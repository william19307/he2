<template>
  <div class="h5-page">
    <div class="h5-nav-bar">
      <span class="back" @click="router.back()">←</span>
      <span class="title">预约咨询</span>
      <span class="right" @click="router.push('/h5/consult/my')">我的预约</span>
    </div>

    <div class="date-strip">
      <div
        v-for="d in dateTabs"
        :key="d.value"
        class="date-tab"
        :class="{ active: selectedDate === d.value }"
        @click="selectedDate = d.value"
      >
        <div class="date-wd">{{ d.weekday }}</div>
        <div class="date-day">{{ d.label }}</div>
      </div>
    </div>

    <div v-if="loading" class="loading-wrap">
      <a-spin />
    </div>

    <div v-else-if="daySlots.length === 0" class="empty-state">
      <a-empty description="当天暂无可约时段" />
    </div>

    <div v-else class="slot-list">
      <div
        v-for="s in daySlots"
        :key="s.schedule_id"
        class="slot-card"
        :class="{ disabled: !s.is_available }"
        @click="pickSlot(s)"
      >
        <div class="slot-left">
          <div class="slot-time">{{ s.start_time }} – {{ s.end_time }}</div>
          <div class="slot-loc">{{ s.location || '心理咨询室' }}</div>
          <div class="slot-counselor">{{ s.counselor_name }}</div>
        </div>
        <div class="slot-right">
          <span v-if="s.is_available" class="avail">可约</span>
          <span v-else class="full">已满</span>
        </div>
      </div>
    </div>

    <!-- 预约确认弹窗 -->
    <a-modal
      v-model:visible="confirmVisible"
      title="确认预约"
      :ok-text="submitting ? '提交中…' : '确认提交'"
      :ok-loading="submitting"
      @ok="submitBooking"
    >
      <div v-if="pickedSlot" class="confirm-body">
        <p><b>日期：</b>{{ selectedDate }}</p>
        <p><b>时间：</b>{{ pickedSlot.start_time }} – {{ pickedSlot.end_time }}</p>
        <p><b>地点：</b>{{ pickedSlot.location || '心理咨询室' }}</p>
        <p><b>咨询师：</b>{{ pickedSlot.counselor_name }}</p>
        <a-divider />
        <a-textarea
          v-model="studentNote"
          placeholder="简要描述你想咨询的问题（选填）"
          :auto-size="{ minRows: 3, maxRows: 6 }"
          :max-length="500"
          show-word-limit
        />
      </div>
    </a-modal>

    <!-- 成功提示 -->
    <a-modal v-model:visible="successVisible" title="预约成功" :footer="false" :mask-closable="false">
      <div class="success-body">
        <div class="success-icon">✓</div>
        <p>您的预约已提交，请等待老师确认。</p>
        <p class="hint">确认结果会通过系统通知您，请留意。</p>
        <a-space>
          <a-button type="primary" @click="successVisible = false">继续预约</a-button>
          <a-button @click="router.push('/h5/consult/my')">查看我的预约</a-button>
        </a-space>
      </div>
    </a-modal>

    <H5BottomNav active="consult" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { h5ConsultAvailableSlots, h5ConsultBook } from '@/api/h5'
import H5BottomNav from '@/components/h5/H5BottomNav.vue'

const router = useRouter()

const WD = ['日', '一', '二', '三', '四', '五', '六']

function buildDateTabs() {
  const tabs = []
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    tabs.push({
      value: `${yyyy}-${mm}-${dd}`,
      label: i === 0 ? '今天' : `${mm}/${dd}`,
      weekday: i === 0 ? '今天' : `周${WD[d.getDay()]}`,
    })
  }
  return tabs
}

const dateTabs = ref(buildDateTabs())
const selectedDate = ref(dateTabs.value[0].value)
const allSlots = ref([])
const loading = ref(false)

const daySlots = computed(() =>
  allSlots.value.filter((s) => s.date === selectedDate.value)
)

const confirmVisible = ref(false)
const pickedSlot = ref(null)
const studentNote = ref('')
const submitting = ref(false)
const successVisible = ref(false)

async function loadSlots() {
  loading.value = true
  try {
    const tabs = dateTabs.value
    const res = await h5ConsultAvailableSlots({
      date_from: tabs[0].value,
      date_to: tabs[tabs.length - 1].value,
    })
    allSlots.value = res?.slots || []
  } catch {
    allSlots.value = []
  } finally {
    loading.value = false
  }
}

function pickSlot(s) {
  if (!s.is_available) {
    Message.warning('该时段已满，请选择其他时段')
    return
  }
  pickedSlot.value = s
  studentNote.value = ''
  confirmVisible.value = true
}

async function submitBooking() {
  if (!pickedSlot.value) return
  submitting.value = true
  try {
    await h5ConsultBook({
      schedule_id: pickedSlot.value.schedule_id,
      appointment_date: selectedDate.value,
      student_note: studentNote.value || undefined,
    })
    confirmVisible.value = false
    successVisible.value = true
    loadSlots()
  } catch {
    /* error already toasted by interceptor */
  } finally {
    submitting.value = false
  }
}

onMounted(loadSlots)
</script>

<style scoped>
.h5-page { max-width: 420px; margin: 0 auto; padding: 0 0 86px; min-height: 100vh; background: var(--h5-bg); }

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
.h5-nav-bar .back {
  font-size: 18px;
  cursor: pointer;
  width: 32px;
}
.h5-nav-bar .title {
  font-size: 16px;
  font-weight: 600;
}
.h5-nav-bar .right { font-size: 13px; color: var(--h5-primary); cursor: pointer; }

.date-strip {
  display: flex;
  gap: 4px;
  padding: 12px 12px 8px;
  overflow-x: auto;
  background: #fbf9f4;
}
.date-tab {
  flex: 1;
  min-width: 48px;
  text-align: center;
  padding: 8px 4px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.date-tab.active {
  background: var(--h5-primary);
  color: #fff;
}
.date-wd {
  font-size: 12px;
  margin-bottom: 2px;
}
.date-day {
  font-size: 13px;
  font-weight: 600;
}

.loading-wrap {
  text-align: center;
  padding: 60px 0;
}

.empty-state {
  padding: 60px 0;
}

.slot-list {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.slot-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--h5-surface);
  border: 1px solid var(--h5-border);
  border-radius: var(--h5-radius-card);
  padding: 14px 16px;
  box-shadow: var(--h5-shadow);
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.slot-card:active {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.slot-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.slot-time {
  font-size: 15px;
  font-weight: 700;
  color: var(--h5-text);
}
.slot-loc {
  font-size: 13px;
  color: var(--h5-subtext);
  margin-top: 2px;
}
.slot-counselor {
  font-size: 12px;
  color: var(--h5-subtext);
  margin-top: 2px;
}
.avail {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 14px;
  background: #e8f5e9;
  color: #2e7d32;
  font-size: 13px;
  font-weight: 500;
}
.full {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 14px;
  background: #f5f5f5;
  color: #999;
  font-size: 13px;
}

.confirm-body p {
  margin: 6px 0;
  font-size: 14px;
}

.success-body {
  text-align: center;
  padding: 16px 0 8px;
}
.success-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: var(--h5-primary);
  color: #fff;
  font-size: 24px;
  line-height: 48px;
}
.success-body .hint {
  font-size: 13px;
  color: var(--h5-subtext);
  margin-bottom: 16px;
}
:deep(.arco-btn) { border-radius: var(--h5-radius-pill) !important; }
</style>
