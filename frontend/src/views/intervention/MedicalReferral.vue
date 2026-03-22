<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">医疗转介</h2>
      <p class="page-desc">记录需要转介到专业医疗机构的学生信息</p>
    </div>

    <div class="toolbar">
      <a-button type="primary" @click="openCreateModal">
        <template #icon><IconPlus /></template>
        新建转介记录
      </a-button>
    </div>

    <a-card :bordered="false" class="table-card">
      <a-table
        :data="list"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
      >
        <template #columns>
          <a-table-column title="学生姓名" :width="120">
            <template #cell="{ record }">{{ record.student_name || '—' }}</template>
          </a-table-column>
          <a-table-column title="班级" :width="160">
            <template #cell="{ record }">{{ record.class_name || '—' }}</template>
          </a-table-column>
          <a-table-column title="转介日期" :width="120">
            <template #cell="{ record }">{{ record.referral_date || '—' }}</template>
          </a-table-column>
          <a-table-column title="转介机构" ellipsis tooltip>
            <template #cell="{ record }">{{ record.institution || '—' }}</template>
          </a-table-column>
          <a-table-column title="家长知情" :width="100" align="center">
            <template #cell="{ record }">
              <a-tag v-if="record.parent_informed" color="green" size="small">已知情</a-tag>
              <a-tag v-else color="gray" size="small">未告知</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="状态" :width="100" align="center">
            <template #cell="{ record }">
              <a-tag :color="statusColor(record.status)" size="small">
                {{ statusLabel(record.status) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="200" fixed="right">
            <template #cell="{ record }">
              <a-space>
                <a-button type="text" size="small" @click="openDetailModal(record.id)">查看详情</a-button>
                <a-button type="primary" size="small" @click="openStatusModal(record)">更新状态</a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
        <template #empty>
          <a-empty description="暂无转介记录" />
        </template>
      </a-table>
    </a-card>

    <!-- 新建 -->
    <a-modal
      v-model:visible="createVisible"
      title="新建转介记录"
      :width="520"
      :ok-loading="createSubmitting"
      @ok="submitCreate"
      @cancel="closeCreateModal"
    >
      <a-form layout="vertical" class="modal-form">
        <a-form-item label="选择学生" required>
          <a-select
            v-model="createForm.student_id"
            placeholder="输入姓名或学号搜索"
            allow-clear
            allow-search
            :loading="studentLoading"
            :options="studentOptions"
            :filter-option="false"
            @search="onStudentSearch"
          />
        </a-form-item>
        <a-form-item label="转介日期" required>
          <a-date-picker
            v-model="createForm.referral_date"
            style="width: 100%"
            placeholder="选择日期"
          />
        </a-form-item>
        <a-form-item label="转介机构" required>
          <a-input v-model="createForm.institution" placeholder="医疗机构名称" allow-clear />
        </a-form-item>
        <a-form-item label="转介原因" required>
          <a-textarea
            v-model="createForm.reason"
            placeholder="请填写转介原因"
            :rows="4"
            :max-length="2000"
            show-word-limit
          />
        </a-form-item>
        <a-form-item label="家长已知情">
          <a-switch v-model="createForm.parent_informed" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 详情 -->
    <a-modal
      v-model:visible="detailVisible"
      title="转介详情"
      :width="560"
      :footer="false"
      @cancel="detailVisible = false"
    >
      <a-spin :loading="detailLoading">
        <template v-if="detailReferral">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="学生姓名">{{ detailStudent?.real_name || '—' }}</a-descriptions-item>
            <a-descriptions-item label="班级">{{ detailStudent?.class_name || '—' }}</a-descriptions-item>
            <a-descriptions-item label="转介日期">{{ detailReferral.referral_date || '—' }}</a-descriptions-item>
            <a-descriptions-item label="转介机构">{{ detailReferral.institution || '—' }}</a-descriptions-item>
            <a-descriptions-item label="转介原因">{{ detailReferral.reason || '—' }}</a-descriptions-item>
            <a-descriptions-item label="家长知情">
              {{ detailReferral.parent_informed ? '是' : '否' }}
            </a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-tag :color="statusColor(detailReferral.status)" size="small">
                {{ statusLabel(detailReferral.status) }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="跟进备注">{{ detailReferral.follow_up_note || '—' }}</a-descriptions-item>
            <a-descriptions-item label="登记人">{{ detailReferral.counselor_name || '—' }}</a-descriptions-item>
          </a-descriptions>
        </template>
      </a-spin>
    </a-modal>

    <!-- 更新状态 -->
    <a-modal
      v-model:visible="statusVisible"
      title="更新状态"
      :width="480"
      :ok-loading="statusSubmitting"
      @ok="submitStatus"
      @cancel="statusVisible = false"
    >
      <a-form layout="vertical" class="modal-form">
        <a-form-item label="状态" required>
          <a-select v-model="statusForm.status" placeholder="请选择">
            <a-option value="pending">跟进中</a-option>
            <a-option value="completed">已完成</a-option>
            <a-option value="cancelled">已取消</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="跟进备注">
          <a-textarea
            v-model="statusForm.follow_up_note"
            placeholder="选填"
            :rows="4"
            :max-length="2000"
            show-word-limit
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconPlus } from '@arco-design/web-vue/es/icon'
import {
  getReferrals,
  getReferralDetail,
  createReferral,
  updateReferralStatus,
} from '@/api/intervention'
import { getStudents } from '@/api/students'

const list = ref([])
const loading = ref(false)
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showTotal: true,
  showPageSize: true,
})

function statusLabel(status) {
  const m = {
    pending: '跟进中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return m[status] || status || '—'
}

/** pending 黄色系：Arco 用 gold / orange */
function statusColor(status) {
  const m = {
    pending: 'gold',
    completed: 'green',
    cancelled: 'gray',
  }
  return m[status] || 'gray'
}

async function loadList() {
  loading.value = true
  try {
    const res = await getReferrals({
      page: pagination.current,
      page_size: pagination.pageSize,
    })
    const d = res.data || {}
    list.value = d.list || []
    pagination.total = d.total ?? 0
  } catch {
    list.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function onPageChange(page) {
  pagination.current = page
  loadList()
}

function onPageSizeChange(size) {
  pagination.pageSize = size
  pagination.current = 1
  loadList()
}

/* ---------- 新建 ---------- */
const createVisible = ref(false)
const createSubmitting = ref(false)
const createForm = reactive({
  student_id: undefined,
  referral_date: undefined,
  institution: '',
  reason: '',
  parent_informed: false,
})

const studentLoading = ref(false)
const studentOptions = ref([])
let searchTimer = null

function toYmd(v) {
  if (v == null || v === '') return ''
  if (typeof v === 'string') return v.slice(0, 10)
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function fetchStudents(keyword) {
  studentLoading.value = true
  try {
    const res = await getStudents({ keyword: keyword || undefined, page_size: 50 })
    const rows = Array.isArray(res.data) ? res.data : []
    studentOptions.value = rows.map((s) => ({
      label: `${s.name || '—'} · ${s.class_name || '—'}（${s.student_no || '无学号'}）`,
      value: s.student_id ?? s.id,
    }))
  } catch {
    studentOptions.value = []
  } finally {
    studentLoading.value = false
  }
}

function onStudentSearch(keyword) {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchStudents(keyword)
  }, 280)
}

function openCreateModal() {
  createForm.student_id = undefined
  createForm.referral_date = undefined
  createForm.institution = ''
  createForm.reason = ''
  createForm.parent_informed = false
  createVisible.value = true
  fetchStudents('')
}

function closeCreateModal() {
  createVisible.value = false
}

async function submitCreate() {
  if (createForm.student_id == null) {
    Message.warning('请选择学生')
    return
  }
  const rd = toYmd(createForm.referral_date)
  if (!rd) {
    Message.warning('请选择转介日期')
    return
  }
  if (!String(createForm.institution || '').trim()) {
    Message.warning('请填写转介机构')
    return
  }
  if (!String(createForm.reason || '').trim()) {
    Message.warning('请填写转介原因')
    return
  }
  createSubmitting.value = true
  try {
    await createReferral({
      student_id: createForm.student_id,
      referral_date: rd,
      institution: String(createForm.institution).trim(),
      reason: String(createForm.reason).trim(),
      parent_informed: !!createForm.parent_informed,
    })
    Message.success('转介记录已创建')
    createVisible.value = false
    pagination.current = 1
    await loadList()
  } catch {
    /* 拦截器已提示 */
  } finally {
    createSubmitting.value = false
  }
}

/* ---------- 详情 ---------- */
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailReferral = ref(null)
const detailStudent = ref(null)

async function openDetailModal(id) {
  detailReferral.value = null
  detailStudent.value = null
  detailVisible.value = true
  detailLoading.value = true
  try {
    const res = await getReferralDetail(id)
    const d = res.data || {}
    detailReferral.value = d.referral || null
    detailStudent.value = d.student || null
  } catch {
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

/* ---------- 更新状态 ---------- */
const statusVisible = ref(false)
const statusSubmitting = ref(false)
const statusForm = reactive({
  id: null,
  status: 'pending',
  follow_up_note: '',
})

function openStatusModal(record) {
  statusForm.id = record.id
  statusForm.status = record.status || 'pending'
  statusForm.follow_up_note = record.follow_up_note ?? ''
  statusVisible.value = true
}

async function submitStatus() {
  if (!statusForm.id) return
  if (!statusForm.status) {
    Message.warning('请选择状态')
    return
  }
  statusSubmitting.value = true
  try {
    await updateReferralStatus(statusForm.id, {
      status: statusForm.status,
      follow_up_note: statusForm.follow_up_note || undefined,
    })
    Message.success('状态已更新')
    statusVisible.value = false
    await loadList()
  } catch {
    /* 拦截器已提示 */
  } finally {
    statusSubmitting.value = false
  }
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.page-wrap {
  padding: 20px 24px 32px;
  min-height: 100%;
  box-sizing: border-box;
}
.page-header {
  margin-bottom: 16px;
}
.page-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
}
.page-desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-3);
}
.toolbar {
  margin-bottom: 16px;
}
.table-card {
  border-radius: 8px;
}
.modal-form {
  padding-top: 4px;
}
</style>
