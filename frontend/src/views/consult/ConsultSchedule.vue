<template>
  <div class="page-wrap consult-schedule">
    <div class="page-header">
      <h2 class="page-title">咨询排班</h2>
    </div>
    <div class="schedule-layout">
      <div class="week-board">
        <div v-for="wd in weekdays" :key="wd" class="day-col">
          <div class="day-head">{{ dayLabels[wd - 1] }}</div>
          <div class="day-slots">
            <div
              v-for="s in slotsByDay[wd]"
              :key="s.id"
              class="slot-block"
              :class="{ full: s.booked_count_this_week >= s.max_slots }"
              @click="openEdit(s)"
            >
              <div class="slot-time">{{ s.start_time }}–{{ s.end_time }}</div>
              <div class="slot-loc">{{ s.location || '心理咨询室' }}</div>
              <div class="slot-cap">
                {{ s.booked_count_this_week }}/{{ s.max_slots }} 已约
              </div>
            </div>
            <div v-if="!slotsByDay[wd]?.length" class="day-empty">暂无时段</div>
          </div>
        </div>
      </div>
      <aside class="side-panel card">
        <h3>操作</h3>
        <p class="hint">点击左侧时段可编辑；绿色表示仍有余额，灰色表示本周已满。</p>
        <a-button type="primary" long @click="openCreate">
          <template #icon><icon-plus /></template>
          新增时间段
        </a-button>
        <a-divider />
        <div v-if="editTarget" class="edit-mini">
          <div class="edit-title">已选排班 #{{ editTarget.id }}</div>
          <a-space direction="vertical" fill>
            <a-button size="small" @click="openEditModal(editTarget)">编辑</a-button>
            <a-popconfirm content="确定删除该排班？" @ok="removeSchedule(editTarget.id)">
              <a-button size="small" status="danger">删除</a-button>
            </a-popconfirm>
          </a-space>
        </div>
      </aside>
    </div>

    <a-modal
      v-model:visible="modalVisible"
      :title="modalMode === 'create' ? '新增时间段' : '编辑排班'"
      width="520px"
      @ok="submitModal"
      @cancel="modalVisible = false"
    >
      <a-form v-if="modalMode === 'create'" layout="vertical">
        <a-form-item label="星期（可多选）" required>
          <a-checkbox-group v-model="form.weekdays">
            <a-checkbox v-for="(lab, i) in dayLabels" :key="i + 1" :value="i + 1">
              {{ lab }}
            </a-checkbox>
          </a-checkbox-group>
        </a-form-item>
        <a-form-item label="开始时间" required>
          <a-time-picker v-model="form.start" format="HH:mm" style="width:100%" />
        </a-form-item>
        <a-form-item label="结束时间" required>
          <a-time-picker v-model="form.end" format="HH:mm" style="width:100%" />
        </a-form-item>
        <a-form-item label="最多人数" required>
          <a-input-number v-model="form.max_slots" :min="1" :max="5" style="width:100%" />
        </a-form-item>
        <a-form-item label="咨询地点">
          <a-input v-model="form.location" placeholder="如：心理咨询室A" allow-clear />
        </a-form-item>
        <a-form-item label="生效日期（选填）">
          <a-range-picker v-model="form.effectiveRange" style="width:100%" />
        </a-form-item>
      </a-form>
      <a-form v-else layout="vertical">
        <a-form-item label="星期">
          <a-select v-model="editForm.weekday" :disabled="false">
            <a-option v-for="(lab, i) in dayLabels" :key="i + 1" :value="i + 1">{{ lab }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="开始时间">
          <a-time-picker v-model="editForm.start" format="HH:mm" style="width:100%" />
        </a-form-item>
        <a-form-item label="结束时间">
          <a-time-picker v-model="editForm.end" format="HH:mm" style="width:100%" />
        </a-form-item>
        <a-form-item label="最多人数">
          <a-input-number v-model="editForm.max_slots" :min="1" :max="5" />
        </a-form-item>
        <a-form-item label="咨询地点">
          <a-input v-model="editForm.location" />
        </a-form-item>
        <a-form-item label="生效区间">
          <a-range-picker v-model="editForm.effectiveRange" style="width:100%" />
        </a-form-item>
        <a-form-item label="启用">
          <a-switch v-model="editForm.is_active" :checked-value="1" :unchecked-value="0" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconPlus } from '@arco-design/web-vue/es/icon'
import {
  getConsultSchedules,
  postConsultSchedules,
  putConsultSchedule,
} from '@/api/consult'
import request from '@/utils/request'

const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const weekdays = [1, 2, 3, 4, 5]

const list = ref([])
const editTarget = ref(null)
const modalVisible = ref(false)
const modalMode = ref('create')

const form = reactive({
  weekdays: [1, 2, 3, 4, 5],
  start: undefined,
  end: undefined,
  max_slots: 2,
  location: '',
  effectiveRange: undefined,
})

const editForm = reactive({
  id: null,
  weekday: 1,
  start: undefined,
  end: undefined,
  max_slots: 2,
  location: '',
  effectiveRange: undefined,
  is_active: 1,
})

const slotsByDay = computed(() => {
  const m = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] }
  for (const s of list.value) {
    if (m[s.weekday]) m[s.weekday].push(s)
  }
  for (const k of Object.keys(m)) {
    m[k].sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
  }
  return m
})

function pad2(n) {
  return String(n).padStart(2, '0')
}

function timeToDate(hhmm) {
  if (!hhmm) return undefined
  const [h, m] = String(hhmm).split(':').map(Number)
  const d = new Date()
  d.setHours(h || 0, m || 0, 0, 0)
  return d
}

function dateToHHmm(v) {
  if (v == null) return ''
  if (typeof v === 'string' && /^\d{1,2}:\d{2}/.test(v)) return v.slice(0, 5)
  const d = v instanceof Date ? v : new Date(v)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** a-range-picker 可能返回字符串或 Date，禁止对字符串调用 toISOString */
function toEffectiveDateStr(v) {
  if (v == null || v === '') return undefined
  if (typeof v === 'string') return v.length >= 10 ? v.slice(0, 10) : v
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10)
  return String(v).slice(0, 10)
}

async function load() {
  try {
    const res = await getConsultSchedules()
    const raw = res?.data
    list.value = Array.isArray(raw?.list) ? raw.list : Array.isArray(raw) ? raw : []
  } catch {
    list.value = []
  }
}

function openCreate() {
  modalMode.value = 'create'
  form.weekdays = [1, 2, 3, 4, 5]
  form.start = timeToDate('09:00')
  form.end = timeToDate('10:00')
  form.max_slots = 2
  form.location = ''
  form.effectiveRange = undefined
  editTarget.value = null
  modalVisible.value = true
}

function openEdit(s) {
  editTarget.value = s
}

function openEditModal(s) {
  modalMode.value = 'edit'
  editForm.id = s.id
  editForm.weekday = s.weekday
  editForm.start = timeToDate(s.start_time)
  editForm.end = timeToDate(s.end_time)
  editForm.max_slots = s.max_slots
  editForm.location = s.location || ''
  editForm.is_active = s.is_active
  if (s.effective_from || s.effective_until) {
    editForm.effectiveRange = [
      s.effective_from ? new Date(s.effective_from) : undefined,
      s.effective_until ? new Date(s.effective_until) : undefined,
    ].filter(Boolean)
    if (editForm.effectiveRange.length < 2) editForm.effectiveRange = undefined
  } else {
    editForm.effectiveRange = undefined
  }
  modalVisible.value = true
}

async function submitModal() {
  if (modalMode.value === 'create') {
    if (!form.weekdays?.length) {
      Message.warning('请至少选择一个星期')
      return
    }
    const st = dateToHHmm(form.start)
    const en = dateToHHmm(form.end)
    if (!st || !en) {
      Message.warning('请选择开始与结束时间')
      return
    }
    let effFrom
    let effUntil
    if (form.effectiveRange?.[0] != null && form.effectiveRange?.[0] !== '' &&
        form.effectiveRange?.[1] != null && form.effectiveRange?.[1] !== '') {
      effFrom = toEffectiveDateStr(form.effectiveRange[0])
      effUntil = toEffectiveDateStr(form.effectiveRange[1])
    }
    await postConsultSchedules({
      weekdays: form.weekdays,
      start_time: st,
      end_time: en,
      max_slots: form.max_slots,
      location: form.location || undefined,
      effective_from: effFrom,
      effective_until: effUntil,
    })
    Message.success('已创建排班')
  } else {
    const st = dateToHHmm(editForm.start)
    const en = dateToHHmm(editForm.end)
    let effFrom
    let effUntil
    if (editForm.effectiveRange?.[0] != null && editForm.effectiveRange?.[0] !== '' &&
        editForm.effectiveRange?.[1] != null && editForm.effectiveRange?.[1] !== '') {
      effFrom = toEffectiveDateStr(editForm.effectiveRange[0])
      effUntil = toEffectiveDateStr(editForm.effectiveRange[1])
    }
    await putConsultSchedule(editForm.id, {
      weekday: editForm.weekday,
      start_time: st,
      end_time: en,
      max_slots: editForm.max_slots,
      location: editForm.location || null,
      effective_from: effFrom ?? null,
      effective_until: effUntil ?? null,
      is_active: editForm.is_active,
    })
    Message.success('已保存')
  }
  modalVisible.value = false
  await load()
}

async function removeSchedule(id) {
  try {
    await request.put(`/consult/schedules/${id}`, { is_active: 0 })
    Message.success('已停用')
    editTarget.value = null
    await load()
  } catch {
    /* toast */
  }
}

onMounted(load)
</script>

<style scoped>
.consult-schedule .schedule-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}
.week-board {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  min-height: 420px;
}
.day-col {
  background: var(--color-bg-2, #fff);
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--color-border-2);
  overflow: hidden;
}
.day-head {
  padding: 10px;
  text-align: center;
  font-weight: 600;
  background: var(--color-fill-2);
  border-bottom: 1px solid var(--color-border-2);
}
.day-slots {
  padding: 8px;
  min-height: 320px;
}
.slot-block {
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  cursor: pointer;
  background: #e8f5e9;
  border: 1px solid #c8e6c9;
  font-size: 13px;
}
.slot-block.full {
  background: #f5f5f5;
  border-color: #e0e0e0;
  color: var(--color-text-3);
}
.slot-time {
  font-weight: 600;
}
.slot-loc {
  margin: 4px 0;
  color: var(--color-text-2);
}
.slot-cap {
  font-size: 12px;
}
.day-empty {
  color: var(--color-text-4);
  font-size: 13px;
  text-align: center;
  padding: 24px 8px;
}
.side-panel {
  width: 260px;
  flex-shrink: 0;
  padding: 16px;
}
.side-panel h3 {
  margin: 0 0 8px;
}
.hint {
  font-size: 13px;
  color: var(--color-text-3);
  margin-bottom: 16px;
  line-height: 1.5;
}
.edit-mini {
  margin-top: 12px;
}
.edit-title {
  font-weight: 500;
  margin-bottom: 8px;
}
.card {
  box-shadow: var(--shadow-card);
  border-radius: var(--radius-md);
}
@media (max-width: 1100px) {
  .schedule-layout {
    flex-direction: column;
  }
  .side-panel {
    width: 100%;
  }
  .week-board {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
