<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">预警管理</h2>
      <a-button>
        <template #icon><icon-download /></template>
        <span v-if="!isMobile">导出报告</span>
      </a-button>
    </div>

    <a-row :gutter="16" class="stats-row">
      <a-col :span="6">
        <div class="stat-card stat-card--red">
          <div class="stat-label">{{ isMobile ? '红色预警' : '红色预警（待处理）' }}</div>
          <div class="stat-value">{{ stats.red_pending ?? 0 }}</div>
        </div>
      </a-col>
      <a-col :span="6">
        <div class="stat-card stat-card--yellow">
          <div class="stat-label">{{ isMobile ? '黄色预警' : '黄色预警（跟进中）' }}</div>
          <div class="stat-value">{{ stats.yellow_processing ?? 0 }}</div>
        </div>
      </a-col>
      <a-col :span="6">
        <div class="stat-card">
          <div class="stat-label">{{ isMobile ? '已关闭' : '本月已关闭' }}</div>
          <div class="stat-value">{{ stats.closed_this_month ?? 0 }}</div>
        </div>
      </a-col>
      <a-col :span="6">
        <div class="stat-card">
          <div class="stat-label">{{ isMobile ? '平均时长' : '平均处置时长' }}</div>
          <div class="stat-value">
            {{ stats.avg_handle_hours ?? 0 }}<span class="stat-unit">小时</span>
          </div>
        </div>
      </a-col>
    </a-row>

    <div v-if="isMobile" style="margin-bottom:12px">
      <a-button @click="showFilters = !showFilters">
        <template #icon><icon-filter /></template>
        筛选
      </a-button>
    </div>

    <div v-show="!isMobile || showFilters" class="filter-bar">
      <a-select v-model="filters.alert_level" placeholder="预警等级" allow-clear style="width:130px">
        <a-option value="red">🔴 红色预警</a-option>
        <a-option value="yellow">🟡 黄色预警</a-option>
      </a-select>
      <a-select v-model="filters.status" placeholder="处置状态" allow-clear style="width:120px">
        <a-option value="pending">待处理</a-option>
        <a-option value="processing">处理中</a-option>
        <a-option value="closed">已关闭</a-option>
        <a-option value="revoked">已撤销</a-option>
      </a-select>
      <a-select v-model="filters.scale_id" placeholder="触发量表" allow-clear style="width:160px">
        <a-option v-for="s in scales" :key="s.id" :value="s.id">
          {{ s.shortName || s.name }}
        </a-option>
      </a-select>
      <a-range-picker v-model="filters.dateRange" style="width:260px" />
      <a-input-search
        v-model="filters.keyword"
        placeholder="姓名或学号"
        allow-clear
        style="width:180px"
        @search="loadList"
      />
      <a-select v-model="filters.class_id" placeholder="所属班级" allow-clear style="width:160px">
        <a-option v-for="c in flatClasses" :key="c.id" :value="c.id">{{ c.label }}</a-option>
      </a-select>
      <a-select v-model="filters.assigned_to" placeholder="负责人" allow-clear style="width:140px">
        <a-option v-for="u in counselors" :key="u.id" :value="u.id">{{ u.real_name }}</a-option>
      </a-select>
      <a-select v-model="filters.source" placeholder="预警来源" allow-clear style="width:140px">
        <a-option value="assessment">量表评估</a-option>
        <a-option value="manual">人工上报</a-option>
      </a-select>
      <a-button type="primary" :loading="loading" @click="loadList">搜索</a-button>
      <a-button @click="handleReset">重置</a-button>
    </div>

    <a-table
      v-if="!isMobile"
      :data="list"
      :loading="loading"
      :row-selection="rowSelection"
      :scroll="{ x: 1500 }"
      :pagination="pagination"
      :row-class="rowClass"
      row-key="id"
      @page-change="onPageChange"
      @page-size-change="onPageSizeChange"
    >
      <template #columns>
        <a-table-column title="学生姓名" :width="140" fixed="left">
          <template #cell="{ record }">
            <a-link v-if="record.user_id" @click="$router.push(`/students/${record.user_id}`)">
              {{ record.student_name }}
            </a-link>
            <span v-else>{{ record.student_name }}</span>
            <div class="cell-sub">{{ record.grade_name }}{{ record.class_name }}</div>
          </template>
        </a-table-column>
        <a-table-column title="预警等级" :width="110">
          <template #cell="{ record }">
            <a-tag v-if="record.alert_level === 'red'" color="red">
              <template #icon><icon-exclamation-circle-fill /></template>
              红色预警
            </a-tag>
            <a-tag v-else color="orangered">
              <template #icon><icon-exclamation-circle-fill /></template>
              黄色预警
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="触发量表" :width="200">
          <template #cell="{ record }">
            <template v-if="record.source === 'manual'">
              <a-tag color="purple" size="small">人工上报</a-tag>
              <span v-if="record.reporter_name" class="cell-sub" style="margin-left:6px">
                {{ record.reporter_name }}
              </span>
            </template>
            <template v-else>
              {{ record.scale_short || record.scale_name }}
              <a-tag v-if="record.trigger_score != null" color="blue" size="small">
                得分:{{ record.trigger_score }}/{{ record.max_score }}
              </a-tag>
            </template>
          </template>
        </a-table-column>
        <a-table-column title="触发原因" :width="260" ellipsis tooltip>
          <template #cell="{ record }">{{ record.trigger_reason }}</template>
        </a-table-column>
        <a-table-column title="触发时间" :width="170">
          <template #cell="{ record }">
            <div>{{ formatTime(record.created_at) }}</div>
            <div class="cell-sub">{{ record.time_ago }}</div>
          </template>
        </a-table-column>
        <a-table-column title="处置状态" :width="100">
          <template #cell="{ record }">
            <a-badge v-if="record.status === 'pending'" status="danger" text="待处理" />
            <a-badge v-else-if="record.status === 'processing'" status="processing" text="处理中" />
            <a-badge v-else-if="record.status === 'revoked'" status="normal" text="已撤销" />
            <a-badge v-else status="success" text="已关闭" />
          </template>
        </a-table-column>
        <a-table-column title="负责人" :width="100">
          <template #cell="{ record }">
            <template v-if="record.assigned_name">
              <a-avatar :size="24" class="avatar-primary">
                {{ record.assigned_name.charAt(0) }}
              </a-avatar>
              {{ record.assigned_name }}
            </template>
            <span v-else class="text-muted">未指派</span>
          </template>
        </a-table-column>
        <a-table-column title="SLA" :width="130">
          <template #cell="{ record }">
            <span v-if="record.alert_level !== 'red'">—</span>
            <span v-else-if="record.sla_overdue" class="sla-urgent">已超时</span>
            <span v-else-if="record.sla_remaining_hours != null" class="sla-urgent">
              剩余 {{ record.sla_remaining_hours }}h
            </span>
            <span v-else>—</span>
          </template>
        </a-table-column>
        <a-table-column title="操作" :width="180" fixed="right">
          <template #cell="{ record }">
            <a-space>
              <a-button
                v-if="record.status === 'pending'"
                type="primary"
                size="small"
                @click="$router.push(`/alerts/${record.id}`)"
              >
                处理
              </a-button>
              <a-button size="small" @click="$router.push(`/alerts/${record.id}`)">详情</a-button>
            </a-space>
          </template>
        </a-table-column>
      </template>
    </a-table>

    <div v-else class="mobile-alert-list">
      <a-spin :loading="loading" style="width:100%">
        <a-card v-for="record in list" :key="record.id" size="small" class="mobile-alert-card">
          <div class="ma-row1">
            <strong>{{ record.student_name }}</strong>
            <a-tag :color="record.alert_level === 'red' ? 'red' : 'orangered'" size="small">
              {{ record.alert_level === 'red' ? '红' : '黄' }}
            </a-tag>
          </div>
          <div class="ma-row2">{{ record.grade_name }}{{ record.class_name }} · {{ record.student_no || '-' }}</div>
          <div class="ma-row2">{{ record.scale_short || record.scale_name || '人工上报' }}</div>
          <div class="ma-row2">{{ formatTime(record.created_at) }}</div>
          <div class="ma-actions">
            <a-button size="mini" type="outline" @click="$router.push(`/alerts/${record.id}`)">详情</a-button>
            <a-button
              v-if="record.status === 'pending'"
              size="mini"
              type="primary"
              @click="$router.push(`/alerts/${record.id}`)"
            >处理</a-button>
          </div>
        </a-card>
      </a-spin>
      <div class="ma-total">共 {{ total }} 条</div>
    </div>

    <transition name="fade">
      <div v-if="selectedRowKeys.length > 0" class="batch-bar">
        <span>已选 {{ selectedRowKeys.length }} 条</span>
        <a-divider direction="vertical" />
        <a-button size="small" disabled>批量指派</a-button>
        <a-button size="small" disabled>批量关闭</a-button>
        <a-button size="small" disabled>导出选中</a-button>
        <a-button size="small" type="text" @click="selectedRowKeys = []">取消选择</a-button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { IconFilter } from '@arco-design/web-vue/es/icon'
import { getAlerts, getAlertFilterCounselors } from '@/api/alerts'
import request from '@/utils/request'
import { getGrades, getGradeClasses } from '@/api/students'

const route = useRoute()

const loading = ref(false)
const list = ref([])
const total = ref(0)
const scales = ref([])
const counselors = ref([])
const grades = ref([])
const flatClasses = ref([])
const selectedRowKeys = ref([])
const isMobile = ref(false)
const showFilters = ref(false)

const stats = reactive({
  red_pending: 0,
  yellow_processing: 0,
  closed_this_month: 0,
  avg_handle_hours: 0,
})

const filters = reactive({
  alert_level: undefined,
  status: undefined,
  scale_id: undefined,
  dateRange: undefined,
  keyword: '',
  class_id: undefined,
  assigned_to: undefined,
  source: undefined,
})

const page = ref(1)
const pageSize = ref(20)

const pagination = computed(() => ({
  total: total.value,
  current: page.value,
  pageSize: pageSize.value,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50, 100],
}))

const rowSelection = reactive({
  type: 'checkbox',
  showCheckedAll: true,
  selectedRowKeys,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
})

function rowClass(record) {
  return record.sla_overdue ? 'sla-overdue-row' : ''
}

function formatTime(iso) {
  if (!iso) return ''
  return String(iso).replace('T', ' ').slice(0, 19)
}

function buildParams() {
  const p = {
    page: page.value,
    page_size: pageSize.value,
  }
  if (filters.alert_level) p.alert_level = filters.alert_level
  if (filters.status) p.status = filters.status === 'revoked' ? 'revoked' : filters.status
  if (filters.scale_id) p.scale_id = filters.scale_id
  if (filters.keyword?.trim()) p.keyword = filters.keyword.trim()
  if (filters.class_id) p.class_id = filters.class_id
  if (filters.assigned_to) p.assigned_to = filters.assigned_to
  if (filters.source) p.source = filters.source
  if (filters.dateRange?.[0]) {
    const d = filters.dateRange[0]
    p.start_date = d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10)
  }
  if (filters.dateRange?.[1]) {
    const d = filters.dateRange[1]
    p.end_date = d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10)
  }
  return p
}

async function loadList() {
  loading.value = true
  selectedRowKeys.value = []
  try {
    const res = await getAlerts(buildParams())
    const d = res.data || {}
    list.value = d.list || []
    total.value = d.total ?? 0
    page.value = d.page ?? page.value
    if (d.stats) {
      stats.red_pending = d.stats.red_pending
      stats.yellow_processing = d.stats.yellow_processing
      stats.closed_this_month = d.stats.closed_this_month
      stats.avg_handle_hours = d.stats.avg_handle_hours
    }
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function onPageChange(cur) {
  page.value = cur
  loadList()
}

function onPageSizeChange(size) {
  pageSize.value = size
  page.value = 1
  loadList()
}

function handleReset() {
  Object.assign(filters, {
    alert_level: undefined,
    status: undefined,
    scale_id: undefined,
    dateRange: undefined,
    keyword: '',
    class_id: undefined,
    assigned_to: undefined,
    source: undefined,
  })
  page.value = 1
  loadList()
}

async function loadScales() {
  try {
    const res = await request.get('/scales', { params: { page_size: 200 } })
    scales.value = res.data?.list || res.data || []
  } catch {
    scales.value = []
  }
}

async function loadCounselors() {
  try {
    const res = await getAlertFilterCounselors()
    counselors.value = res.data || []
  } catch {
    counselors.value = []
  }
}

async function loadClassTree() {
  try {
    const gRes = await getGrades()
    grades.value = gRes.data || []
    const opts = []
    for (const g of grades.value) {
      try {
        const cRes = await getGradeClasses(g.id)
        const cls = cRes.data || []
        for (const c of cls) {
          opts.push({ id: Number(c.id), label: `${g.name} · ${c.name}` })
        }
      } catch {
        /* skip */
      }
    }
    flatClasses.value = opts
  } catch {
    flatClasses.value = []
  }
}

// 人工上报后从 Layout 跳转 /alerts?_t=xxx 触发刷新
watch(() => route.query._t, (val) => { if (val) loadList() })

onMounted(async () => {
  const mql = window.matchMedia('(max-width: 767px)')
  isMobile.value = mql.matches
  mql.addEventListener('change', (e) => { isMobile.value = e.matches })
  await Promise.all([loadScales(), loadCounselors(), loadClassTree()])
  loadList()
})
</script>

<style scoped>
.stats-row { margin-bottom: 20px; }

.stat-card--red { background: var(--alert-red-bg); border-color: var(--alert-red-border); }
.stat-card--yellow { background: var(--alert-yellow-bg); border-color: var(--alert-yellow-border); }

.avatar-primary {
  background: var(--color-primary-5);
  margin-right: 6px;
}

.sla-urgent {
  color: var(--color-danger-6);
  font-weight: 500;
}

:deep(.sla-overdue-row) {
  color: var(--color-danger-6) !important;
}
:deep(.sla-overdue-row .arco-table-td) {
  color: inherit !important;
}

.mobile-alert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mobile-alert-card { font-size: 13px; }
.ma-row1 { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
.ma-row2 { margin-top: 4px; color: var(--color-text-2); font-size: 13px; }
.ma-actions { margin-top: 8px; display: flex; gap: 8px; }
.ma-total { text-align: center; margin-top: 8px; font-size: 13px; color: var(--color-text-2); }

@media (max-width: 768px) {
  .stats-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 12px;
  }
  .stats-row :deep(.arco-col) {
    width: auto;
    max-width: none;
    flex: none;
    padding: 0 !important;
  }
  .stats-row .stat-card {
    height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 10px 12px;
  }
  .stats-row .stat-label {
    font-size: 11px;
    white-space: nowrap;
    line-height: 1.2;
  }
  .stats-row .stat-value {
    font-size: 28px;
    font-weight: 600;
    line-height: 1.2;
    margin-top: 4px;
    display: flex;
    align-items: baseline;
    gap: 2px;
  }
  .stats-row .stat-unit {
    font-size: 12px;
  }
}
</style>
