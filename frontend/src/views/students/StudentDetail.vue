<template>
  <div class="page-wrap">
    <a-spin v-if="profileLoading" style="display:block;padding:48px;text-align:center" />
    <template v-else-if="profile">
      <div class="profile-head">
        <a-page-header @back="$router.back()">
          <template #extra>
            <a-button
              v-if="reportStatus !== 'ready'"
              :loading="reportLoading"
              :disabled="reportLoading"
              @click="startExportReport"
            >
              <template #icon><icon-file-pdf /></template>
              {{ reportLoading ? '生成中...' : (isMobile ? '导出报告' : '导出个人报告') }}
            </a-button>
            <a-button
              v-else
              type="primary"
              @click="downloadReport"
            >
              <template #icon><icon-download /></template>
              下载报告
            </a-button>
          </template>
          <template #title>
            <a-space>
              <span>{{ profile.real_name || '学生档案' }}</span>
              <a-tag v-if="profile.special_flag" color="orangered" size="small">重点关注</a-tag>
              <a-tag
                :color="
                  profile.mental_status === 'high_risk'
                    ? 'red'
                    : profile.mental_status === 'attention'
                      ? 'gold'
                      : 'green'
                "
                size="small"
              >
                {{ profile.mental_status_label }}
              </a-tag>
              <a-tag v-if="profile.case_status === 'active'" color="arcoblue" size="small">个案在案</a-tag>
            </a-space>
          </template>
          <template #subtitle>
            {{ profile.grade_name }} {{ profile.class_name }} · 学号 {{ profile.student_no || '-' }} ·
            班主任 {{ profile.homeroom_teacher || '-' }}
          </template>
        </a-page-header>
        <a-descriptions :column="4" size="small" class="head-desc">
          <a-descriptions-item label="性别">{{ profile.gender_label || '-' }}</a-descriptions-item>
          <a-descriptions-item label="年龄">{{ profile.age != null ? profile.age + '岁' : '-' }}</a-descriptions-item>
          <a-descriptions-item label="出生日期">{{ profile.birth_date || '-' }}</a-descriptions-item>
          <a-descriptions-item label="监护人">{{ profile.guardian_name || '-' }}</a-descriptions-item>
          <a-descriptions-item label="联系电话">{{ profile.guardian_phone || '-' }}</a-descriptions-item>
          <a-descriptions-item label="测评次数">{{ profile.total_assessments }}</a-descriptions-item>
          <a-descriptions-item label="预警次数">{{ profile.total_alerts }}</a-descriptions-item>
          <a-descriptions-item label="个案记录">{{ profile.total_sessions }}</a-descriptions-item>
        </a-descriptions>
      </div>

      <a-tabs v-model:active-key="activeTab" type="rounded" @change="onTabChange">
        <a-tab-pane key="assessments" title="测评历史">
          <div class="trend-block" v-if="trendData.labels?.length && trendData.datasets?.length">
            <div class="trend-title">多量表得分趋势（标准化 0–100）</div>
            <svg :viewBox="`0 0 ${chartW} ${chartH}`" class="trend-svg">
              <line
                v-for="(g, i) in gridLines"
                :key="'g'+i"
                :x1="chartPad"
                :y1="g"
                :x2="chartW - chartPad"
                :y2="g"
                class="grid-line"
              />
              <g v-for="(ds, di) in trendData.datasets" :key="'ds'+di">
                <polyline
                  v-if="linePoints(ds).length"
                  :points="linePoints(ds).map((p) => `${p.x},${p.y}`).join(' ')"
                  fill="none"
                  :stroke="lineColors[di % lineColors.length]"
                  stroke-width="2"
                />
              </g>
            </svg>
            <div class="trend-legend">
              <span v-for="(ds, di) in trendData.datasets" :key="'lg'+di" class="leg-item">
                <i :style="{ background: lineColors[di % lineColors.length] }" />
                {{ ds.scale_short || ds.scale_name }}
              </span>
            </div>
          </div>

          <div v-if="isMobile" style="margin-bottom:10px">
            <a-button @click="showAssessFilters = !showAssessFilters">
              <template #icon><icon-filter /></template>
              筛选
            </a-button>
          </div>
          <div v-show="!isMobile || showAssessFilters" class="filter-bar">
            <a-select v-model="assessFilters.scale_id" placeholder="量表" allow-clear style="width:140px">
              <a-option v-for="s in scaleOptions" :key="s.id" :value="s.id">{{ s.shortName || s.name }}</a-option>
            </a-select>
            <a-range-picker v-model="assessFilters.dateRange" style="width:240px" />
            <a-select v-model="assessFilters.alert_level" placeholder="预警关联" allow-clear style="width:120px">
              <a-option value="red">红色</a-option>
              <a-option value="yellow">黄色</a-option>
              <a-option value="normal">无预警</a-option>
            </a-select>
            <a-button type="primary" :loading="assessLoading" @click="loadAssessments">筛选</a-button>
          </div>

          <a-table
            v-if="!isMobile"
            :data="assessList"
            :loading="assessLoading"
            :pagination="assessPagination"
            row-key="task_id"
            size="small"
            @page-change="onAssessPage"
            @page-size-change="onAssessPageSize"
          >
            <template #columns>
              <a-table-column title="计划" data-index="plan_title" ellipsis />
              <a-table-column title="量表" :width="100">
                <template #cell="{ record }">{{ record.scale_short || record.scale_name }}</template>
              </a-table-column>
              <a-table-column title="得分" :width="90">
                <template #cell="{ record }">{{ record.total_score }}/{{ record.max_score }}</template>
              </a-table-column>
              <a-table-column title="结果" :width="100" data-index="result_label" />
              <a-table-column title="预警" :width="80">
                <template #cell="{ record }">
                  <a-tag v-if="record.alert_level === 'red'" color="red" size="small">红</a-tag>
                  <a-tag v-else-if="record.alert_level === 'yellow'" color="orangered" size="small">黄</a-tag>
                  <span v-else>—</span>
                </template>
              </a-table-column>
              <a-table-column title="提交时间" :width="170" data-index="submit_time" />
            </template>
          </a-table>
          <div v-else class="mobile-list">
            <a-card v-for="record in assessList" :key="record.task_id" size="small" class="mobile-item">
              <div class="mi-title">{{ record.plan_title || '-' }}</div>
              <div class="mi-line">{{ record.scale_short || record.scale_name }} · {{ record.total_score }}/{{ record.max_score }}</div>
              <div class="mi-line">结果：{{ record.result_label || '-' }}</div>
              <div class="mi-line">提交：{{ record.submit_time || '-' }}</div>
            </a-card>
          </div>
        </a-tab-pane>

        <a-tab-pane key="alerts" title="预警记录">
          <a-table v-if="!isMobile" :data="alertList" :loading="alertsLoading" :pagination="false" row-key="id" size="small">
            <template #columns>
              <a-table-column title="量表" data-index="scale_name" :width="120" />
              <a-table-column title="等级" :width="80">
                <template #cell="{ record }">
                  <a-tag :color="record.alert_level === 'red' ? 'red' : 'orangered'" size="small">
                    {{ record.alert_level === 'red' ? '红' : '黄' }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column title="得分" :width="70" data-index="trigger_score" />
              <a-table-column title="状态" :width="90" data-index="status_label" />
              <a-table-column title="负责人" :width="100" data-index="assigned_name" />
              <a-table-column title="触发时间" :width="170" data-index="created_at" />
              <a-table-column title="操作" :width="80">
                <template #cell="{ record }">
                  <a-link @click="$router.push(`/alerts/${record.id}`)">详情</a-link>
                </template>
              </a-table-column>
            </template>
          </a-table>
          <div v-else class="mobile-list">
            <a-card v-for="record in alertList" :key="record.id" size="small" class="mobile-item">
              <div class="mi-title">{{ record.scale_name || '-' }}</div>
              <div class="mi-line">等级：{{ record.alert_level === 'red' ? '红' : '黄' }} · 状态：{{ record.status_label || '-' }}</div>
              <div class="mi-line">得分：{{ record.trigger_score ?? '-' }}</div>
              <div class="mi-line">触发：{{ record.created_at || '-' }}</div>
              <a-button type="text" size="small" @click="$router.push(`/alerts/${record.id}`)">详情</a-button>
            </a-card>
          </div>
          <div v-if="!alertsLoading && alertSummary" class="alert-summary">
            红 {{ alertSummary.red_count }} / 黄 {{ alertSummary.yellow_count }}，共 {{ alertSummary.total }} 条
          </div>
        </a-tab-pane>

        <a-tab-pane key="case" title="个案记录">
          <template v-if="caseLoading"><a-spin /></template>
          <template v-else-if="!caseData?.has_case">
            <a-empty description="暂无个案档案">
              <a-button type="primary">为该学生建立个案档案</a-button>
            </a-empty>
          </template>
          <template v-else>
            <a-card title="个案概要" size="small">
              <p>咨询师：{{ caseData.case.counselor_name }} · 状态 {{ caseData.case.status }}</p>
              <p>{{ caseData.case.summary }}</p>
            </a-card>
            <a-collapse v-if="caseData.case.sessions?.length">
              <a-collapse-item
                v-for="s in caseData.case.sessions"
                :key="s.id"
                :header="`第${s.session_no}次 · ${s.record_date}`"
              >
                <pre class="session-pre">{{ s.content }}</pre>
                <div v-if="s.next_plan" class="next-plan">下次计划：{{ s.next_plan }}</div>
              </a-collapse-item>
            </a-collapse>
          </template>
        </a-tab-pane>

        <a-tab-pane key="parent" title="家长沟通">
          <a-button type="primary" @click="parentModalVisible = true">记录家长沟通</a-button>
          <a-empty v-if="!parentHint" description="沟通记录将写入个案档案（无个案时会自动建档）" />
        </a-tab-pane>
      </a-tabs>
    </template>
    <a-empty v-else description="未找到学生" />

    <a-modal
      v-model:visible="parentModalVisible"
      title="记录家长沟通"
      width="520px"
      @before-ok="submitParentComm"
      @cancel="resetParentForm"
    >
      <a-form :model="parentForm" layout="vertical">
        <a-form-item label="沟通方式" required>
          <a-select v-model="parentForm.notify_type" placeholder="请选择">
            <a-option value="phone">电话</a-option>
            <a-option value="sms">短信</a-option>
            <a-option value="meeting">面谈</a-option>
            <a-option value="letter">书信</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="家长姓名">
          <a-input v-model="parentForm.guardian_name" />
        </a-form-item>
        <a-form-item label="联系电话">
          <a-input v-model="parentForm.guardian_phone" />
        </a-form-item>
        <a-form-item label="沟通时间">
          <a-input v-model="parentForm.notify_time" placeholder="如 2025-03-17T10:30:00+08:00" />
        </a-form-item>
        <a-form-item label="沟通内容" required>
          <a-textarea v-model="parentForm.content" :max-length="1000" show-word-limit />
        </a-form-item>
        <a-form-item label="家长态度">
          <a-select v-model="parentForm.guardian_attitude" allow-clear placeholder="可选">
            <a-option value="cooperate">配合</a-option>
            <a-option value="neutral">中立</a-option>
            <a-option value="resistant">抵触</a-option>
            <a-option value="unreachable">无法联系</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="后续跟进">
          <a-textarea v-model="parentForm.follow_up" />
        </a-form-item>
        <a-form-item label="下次联系日期">
          <a-input v-model="parentForm.next_contact_date" placeholder="YYYY-MM-DD" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconFilter } from '@arco-design/web-vue/es/icon'
import {
  getStudentProfile,
  getStudentAssessments,
  getStudentAlerts,
  getStudentCase,
  postStudentParentComm,
} from '@/api/students'
import { postStudentReport, getReportTask, getReportDownloadUrl } from '@/api/reports'
import request from '@/utils/request'

const route = useRoute()
const userId = computed(() => route.params.id)
const isMobile = ref(false)
const showAssessFilters = ref(false)

const profile = ref(null)
const profileLoading = ref(true)
const activeTab = ref('assessments')

const reportLoading = ref(false)
const reportStatus = ref('')
const reportTaskId = ref(null)
let reportPollTimer = null

async function startExportReport() {
  reportLoading.value = true
  reportStatus.value = 'generating'
  try {
    const res = await postStudentReport(profile.value?.id || userId.value, {
      include_history: true,
      include_suggestions: true,
    })
    reportTaskId.value = res.data?.task_id
    pollReportStatus()
  } catch (e) {
    Message.error(e?.message || '报告生成失败')
    reportLoading.value = false
    reportStatus.value = ''
  }
}

function pollReportStatus() {
  if (reportPollTimer) clearInterval(reportPollTimer)
  reportPollTimer = setInterval(async () => {
    try {
      const res = await getReportTask(reportTaskId.value)
      const st = res.data?.status
      if (st === 'ready') {
        clearInterval(reportPollTimer)
        reportPollTimer = null
        reportLoading.value = false
        reportStatus.value = 'ready'
      } else if (st === 'failed') {
        clearInterval(reportPollTimer)
        reportPollTimer = null
        reportLoading.value = false
        reportStatus.value = ''
        Message.error(res.data?.error_msg || '报告生成失败，请重试')
      }
    } catch {
      clearInterval(reportPollTimer)
      reportPollTimer = null
      reportLoading.value = false
      reportStatus.value = ''
    }
  }, 2000)
}

function downloadReport() {
  if (!reportTaskId.value) return
  const url = getReportDownloadUrl(reportTaskId.value)
  const a = document.createElement('a')
  a.href = url
  a.download = ''
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

onUnmounted(() => {
  if (reportPollTimer) clearInterval(reportPollTimer)
})

const assessList = ref([])
const assessTotal = ref(0)
const assessPage = ref(1)
const assessPageSize = ref(10)
const assessLoading = ref(false)
const trendData = ref({ labels: [], datasets: [] })
const assessFilters = reactive({
  scale_id: undefined,
  dateRange: undefined,
  alert_level: undefined,
})

const alertList = ref([])
const alertsLoading = ref(false)
const alertSummary = ref(null)

const caseData = ref(null)
const caseLoading = ref(false)

const parentModalVisible = ref(false)
const parentHint = ref(false)
const parentForm = reactive({
  notify_type: undefined,
  guardian_name: '',
  guardian_phone: '',
  notify_time: '',
  content: '',
  guardian_attitude: undefined,
  follow_up: '',
  next_contact_date: '',
})

const scaleOptions = ref([])
const chartW = 640
const chartH = 220
const chartPad = 48
const lineColors = ['#165dff', '#00b42a', '#ff7d00', '#722ed1', '#eb0aa4', '#14c9c9']

const gridLines = computed(() => {
  const n = 5
  const h = chartH - 2 * chartPad
  return Array.from({ length: n }, (_, i) => chartPad + (i / (n - 1)) * h)
})

const assessPagination = computed(() => ({
  total: assessTotal.value,
  current: assessPage.value,
  pageSize: assessPageSize.value,
  showTotal: true,
}))

function linePoints(ds) {
  const labels = trendData.value.labels || []
  if (!labels.length || !ds.normalized_scores?.length) return []
  const n = labels.length
  const w = chartW - 2 * chartPad
  const h = chartH - 2 * chartPad
  const pts = []
  for (let i = 0; i < n; i++) {
    const v = ds.normalized_scores[i]
    if (v == null) continue
    const x = chartPad + (n <= 1 ? w / 2 : (i / (n - 1)) * w)
    const y = chartPad + h - (v / 100) * h
    pts.push({ x, y, v, i })
  }
  return pts
}

async function loadProfile() {
  profileLoading.value = true
  try {
    const res = await getStudentProfile(userId.value)
    profile.value = res.data
  } catch {
    profile.value = null
  } finally {
    profileLoading.value = false
  }
}

async function loadScales() {
  try {
    const res = await request.get('/scales', { params: { page_size: 200 } })
    scaleOptions.value = res.data?.list || []
  } catch {
    scaleOptions.value = []
  }
}

function assessParams() {
  const p = {
    page: assessPage.value,
    page_size: assessPageSize.value,
  }
  if (assessFilters.scale_id) p.scale_id = assessFilters.scale_id
  if (assessFilters.alert_level) p.alert_level = assessFilters.alert_level
  if (assessFilters.dateRange?.[0]) {
    const d = assessFilters.dateRange[0]
    p.start_date = d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10)
  }
  if (assessFilters.dateRange?.[1]) {
    const d = assessFilters.dateRange[1]
    p.end_date = d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10)
  }
  return p
}

async function loadAssessments() {
  assessLoading.value = true
  try {
    const res = await getStudentAssessments(userId.value, assessParams())
    const d = res.data || {}
    assessList.value = d.list || []
    assessTotal.value = d.total ?? 0
    trendData.value = d.trend_data || { labels: [], datasets: [] }
  } catch {
    assessList.value = []
  } finally {
    assessLoading.value = false
  }
}

function onAssessPage(p) {
  assessPage.value = p
  loadAssessments()
}

function onAssessPageSize(s) {
  assessPageSize.value = s
  assessPage.value = 1
  loadAssessments()
}

async function loadAlerts() {
  alertsLoading.value = true
  try {
    const res = await getStudentAlerts(userId.value)
    alertList.value = res.data?.list || []
    alertSummary.value = {
      total: res.data?.total,
      red_count: res.data?.red_count,
      yellow_count: res.data?.yellow_count,
    }
  } catch {
    alertList.value = []
  } finally {
    alertsLoading.value = false
  }
}

async function loadCase() {
  caseLoading.value = true
  try {
    const res = await getStudentCase(userId.value)
    caseData.value = res.data
  } catch {
    caseData.value = { has_case: false }
  } finally {
    caseLoading.value = false
  }
}

function onTabChange(key) {
  if (key === 'assessments' && !assessList.value.length) loadAssessments()
  if (key === 'alerts' && !alertList.value.length) loadAlerts()
  if (key === 'case' && caseData.value === null) loadCase()
}

function resetParentForm() {
  Object.assign(parentForm, {
    notify_type: undefined,
    guardian_name: profile.value?.guardian_name || '',
    guardian_phone: '',
    notify_time: '',
    content: '',
    guardian_attitude: undefined,
    follow_up: '',
    next_contact_date: '',
  })
}

watch(parentModalVisible, (v) => {
  if (v) parentForm.guardian_name = profile.value?.guardian_name || ''
})

async function submitParentComm() {
  if (!parentForm.notify_type) {
    Message.warning('请选择沟通方式')
    return false
  }
  if (!parentForm.content?.trim()) {
    Message.warning('请填写沟通内容')
    return false
  }
  try {
    await postStudentParentComm(userId.value, { ...parentForm })
    Message.success('已记录')
    parentHint.value = true
    resetParentForm()
    return true
  } catch {
    return false
  }
}

onMounted(async () => {
  const mql = window.matchMedia('(max-width: 767px)')
  isMobile.value = mql.matches
  mql.addEventListener('change', (e) => { isMobile.value = e.matches })
  await loadProfile()
  await loadScales()
  loadAssessments()
})
</script>

<style scoped>
/* page-wrap provided by global.css */

.profile-head { margin-bottom: 16px; }

.head-desc {
  padding: 0 24px 16px;
  background: var(--color-bg-2);
  border-radius: var(--radius-md);
}

.trend-block {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--color-bg-white);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.trend-title {
  font-weight: 600;
  margin-bottom: 12px;
}

.trend-svg {
  width: 100%;
  max-width: 640px;
  height: 220px;
}

.grid-line { stroke: var(--color-border-1); }

.trend-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-2);
}

.leg-item i {
  display: inline-block;
  width: 12px;
  height: 3px;
  margin-right: 6px;
  vertical-align: middle;
}

/* filter-bar provided by global.css */

.alert-summary {
  margin-top: 12px;
  color: var(--color-text-3);
  font-size: 13px;
}

.session-pre {
  white-space: pre-wrap;
  margin: 0;
  font-family: inherit;
  font-size: 14px;
}

.next-plan {
  margin-top: 8px;
  color: var(--color-text-3);
}

.mobile-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mobile-item { font-size: 13px; }
.mi-title { font-size: 14px; font-weight: 600; }
.mi-line { margin-top: 4px; color: var(--color-text-2); font-size: 13px; }
</style>
