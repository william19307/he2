<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">预约管理</h2>
    </div>
    <a-tabs v-model:active-key="tab" type="rounded" @change="load">
      <a-tab-pane key="pending">
        <template #title>
          待确认
          <a-badge v-if="pendingBadge" :count="pendingBadge" :max-count="99" style="margin-left:6px" />
        </template>
      </a-tab-pane>
      <a-tab-pane key="confirmed" title="已确认" />
      <a-tab-pane key="completed" title="已完成" />
      <a-tab-pane key="cancelled" title="已取消" />
    </a-tabs>

    <a-table :data="rows" :loading="loading" :pagination="false" row-key="id" class="appt-table">
      <template #columns>
        <a-table-column title="学生姓名" :width="100">
          <template #cell="{ record }">{{ record.student_name }}</template>
        </a-table-column>
        <a-table-column title="班级" :width="120">
          <template #cell="{ record }">{{ record.class_name || '—' }}</template>
        </a-table-column>
        <a-table-column title="预约时间" :width="200">
          <template #cell="{ record }">
            {{ record.appoint_date }} {{ record.start_time }}–{{ record.end_time }}
          </template>
        </a-table-column>
        <a-table-column title="地点" :width="120">
          <template #cell="{ record }">{{ record.location || '—' }}</template>
        </a-table-column>
        <a-table-column title="预约原因" data-index="reason" ellipsis tooltip />
        <a-table-column title="状态" :width="90">
          <template #cell="{ record }">
            <a-tag size="small">{{ record.status_label || record.status }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" :width="220" fixed="right">
          <template #cell="{ record }">
            <a-space v-if="record.status === 'pending'">
              <a-button type="primary" size="mini" @click="doConfirm(record.id)">确认</a-button>
              <a-button size="mini" @click="openCancel(record)">取消</a-button>
            </a-space>
            <a-space v-else-if="record.status === 'confirmed'">
              <a-button type="primary" size="mini" @click="openComplete(record)">记录完成</a-button>
              <a-button size="mini" @click="openCancel(record)">取消</a-button>
            </a-space>
            <span v-else class="text-muted">—</span>
          </template>
        </a-table-column>
      </template>
    </a-table>

    <a-modal v-model:visible="cancelVisible" title="取消预约" @ok="submitCancel">
      <a-textarea v-model="cancelReason" placeholder="取消原因（必填）" :max-length="500" show-word-limit />
    </a-modal>

    <a-modal
      v-model:visible="completeVisible"
      title="记录完成"
      width="560px"
      :ok-loading="completeLoading"
      @ok="submitComplete"
    >
      <a-form layout="vertical">
        <a-form-item label="实际时长（分钟）">
          <a-input-number v-model="completeForm.duration_mins" :min="5" :max="180" style="width:100%">
            <template #suffix>分钟</template>
          </a-input-number>
        </a-form-item>
        <a-form-item label="会谈内容" required>
          <a-textarea
            v-model="completeForm.content"
            placeholder="必填"
            :auto-size="{ minRows: 6, maxRows: 12 }"
            :max-length="4000"
            show-word-limit
          />
        </a-form-item>
        <a-form-item label="学生情绪（1-5）">
          <a-rate v-model="completeForm.student_mood" :count="5" allow-half />
        </a-form-item>
        <a-form-item label="干预进展">
          <a-radio-group v-model="completeForm.intervention_progress" type="button">
            <a-radio value="much_better">明显改善</a-radio>
            <a-radio value="better">有所改善</a-radio>
            <a-radio value="stable">维持</a-radio>
            <a-radio value="worse">有所退步</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="下次计划">
          <a-space direction="vertical" fill style="width:100%">
            <a-date-picker v-model="completeForm.next_plan_date" style="width:100%" />
            <a-input v-model="completeForm.next_plan_note" placeholder="说明" />
          </a-space>
        </a-form-item>
        <a-form-item v-if="completeTarget && !completeTarget.has_case" label="自动建档（学生暂无个案）">
          <a-switch v-model="completeForm.create_case" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  getConsultAppointments,
  confirmConsultAppointment,
  cancelConsultAppointment,
  completeConsultAppointment,
} from '@/api/consult'

const tab = ref('pending')
const rows = ref([])
const loading = ref(false)
const pendingBadge = ref(0)

const cancelVisible = ref(false)
const cancelReason = ref('')
const cancelId = ref(null)

const completeVisible = ref(false)
const completeLoading = ref(false)
const completeTarget = ref(null)
const completeForm = reactive({
  duration_mins: 50,
  content: '',
  student_mood: 3,
  intervention_progress: 'stable',
  next_plan_date: undefined,
  next_plan_note: '',
  create_case: true,
})

async function load() {
  loading.value = true
  try {
    const res = await getConsultAppointments({ status: tab.value, page_size: 100 })
    const d = res?.data || {}
    rows.value = d.list || []
    if (tab.value === 'pending' && d.pending_count != null) {
      pendingBadge.value = d.pending_count
    }
    if (d.pending_count != null) pendingBadge.value = d.pending_count
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

async function doConfirm(id) {
  try {
    await confirmConsultAppointment(id)
    Message.success('已确认')
    load()
  } catch { /* */ }
}

function openCancel(r) {
  cancelId.value = r.id
  cancelReason.value = ''
  cancelVisible.value = true
}

async function submitCancel() {
  if (!cancelReason.value?.trim()) {
    Message.warning('请填写取消原因')
    return
  }
  await cancelConsultAppointment(cancelId.value, { cancel_reason: cancelReason.value.trim() })
  Message.success('已取消')
  cancelVisible.value = false
  load()
}

function openComplete(r) {
  completeTarget.value = { ...r, has_case: true }
  completeForm.duration_mins = 50
  completeForm.content = ''
  completeForm.student_mood = 3
  completeForm.intervention_progress = 'stable'
  completeForm.next_plan_date = undefined
  completeForm.next_plan_note = ''
  completeForm.create_case = true
  completeVisible.value = true
}

async function submitComplete() {
  if (!completeForm.content?.trim()) {
    Message.warning('请填写会谈内容')
    return
  }
  completeLoading.value = true
  try {
    const np = [
      completeForm.next_plan_date
        ? new Date(completeForm.next_plan_date).toISOString().slice(0, 10)
        : '',
      completeForm.next_plan_note,
    ]
      .filter(Boolean)
      .join(' ')
    await completeConsultAppointment(completeTarget.value.id, {
      duration_mins: completeForm.duration_mins,
      content: completeForm.content.trim(),
      student_mood: Math.round(completeForm.student_mood * 2) / 2 || 3,
      intervention_progress: completeForm.intervention_progress,
      next_plan: np || undefined,
      create_case: completeTarget.value.has_case ? false : completeForm.create_case,
    })
    Message.success('已办结')
    completeVisible.value = false
    load()
  } finally {
    completeLoading.value = false
  }
}

watch(tab, load)
onMounted(load)
</script>

<style scoped>
.appt-table {
  margin-top: 16px;
}
.text-muted {
  color: var(--color-text-4);
}
</style>
