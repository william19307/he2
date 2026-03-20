<template>
  <div class="page-wrap">
    <a-page-header :title="plan.title || '计划详情'" @back="$router.back()">
      <template #extra>
        <a-space>
          <a-button @click="batchModalVisible = true">
            <template #icon><icon-download /></template>
            批量导出学生报告
          </a-button>
          <a-tag :color="planStatusColor(plan.status)" size="large">{{ planStatusLabel(plan.status) }}</a-tag>
        </a-space>
      </template>
    </a-page-header>

    <a-modal
      v-model:visible="batchModalVisible"
      title="批量导出学生报告"
      :ok-loading="batchLoading"
      :ok-text="batchStatus === 'ready' ? '下载报告' : '确认导出'"
      @ok="batchStatus === 'ready' ? doBatchDownload() : doBatchExport()"
      @cancel="batchModalVisible = false"
    >
      <template v-if="batchStatus === 'ready'">
        <a-result status="success" title="报告已生成，点击下载" />
      </template>
      <template v-else-if="batchLoading">
        <div style="text-align:center;padding:24px">
          <a-spin />
          <p style="margin-top:12px">正在生成，完成后自动可下载...</p>
        </div>
      </template>
      <template v-else>
        <a-form layout="vertical">
          <a-form-item label="选择班级">
            <a-select v-model="batchClassId" placeholder="请选择班级">
              <a-option
                v-for="c in progress.class_progress || []"
                :key="c.class_id"
                :value="c.class_id"
              >
                {{ c.class_name }}
              </a-option>
            </a-select>
          </a-form-item>
          <a-form-item label="选择范围">
            <a-radio-group v-model="batchScope">
              <a-radio value="all">全部完成学生</a-radio>
              <a-radio value="high_risk">仅高风险学生</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-form>
      </template>
    </a-modal>

    <a-row :gutter="16">
      <a-col :span="14">
        <a-card title="基本信息" :bordered="false" class="info-card">
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="计划名称" :span="2">{{ plan.title }}</a-descriptions-item>
            <a-descriptions-item label="创建人">{{ plan.creator?.realName || '-' }}</a-descriptions-item>
            <a-descriptions-item label="状态">{{ planStatusLabel(plan.status) }}</a-descriptions-item>
            <a-descriptions-item label="开始">{{ plan.startTime }}</a-descriptions-item>
            <a-descriptions-item label="截止">{{ plan.endTime }}</a-descriptions-item>
            <a-descriptions-item label="说明" :span="2">{{ plan.description || '无' }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
      <a-col :span="10">
        <a-card title="整体进度" :bordered="false" class="info-card">
          <div class="progress-center">
            <a-progress type="circle" :percent="progress.completionRate || 0" />
            <div class="progress-text">
              <span class="num">{{ progress.completed ?? 0 }}</span> / {{ progress.total ?? 0 }}
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-card title="各班完成率" :bordered="false" class="info-card">
      <a-table :data="progress.class_progress || []" :pagination="false" size="small" row-key="class_id">
        <template #columns>
          <a-table-column title="班级" data-index="class_name" />
          <a-table-column title="完成/总数" :width="120">
            <template #cell="{ record }">{{ record.completed }}/{{ record.total }}</template>
          </a-table-column>
          <a-table-column title="完成率" :width="200">
            <template #cell="{ record }">
              <a-progress :percent="record.completion_rate" size="small" />
            </template>
          </a-table-column>
          <a-table-column title="红预警" data-index="red_alert_count" :width="80" />
          <a-table-column title="黄预警" data-index="yellow_alert_count" :width="80" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { getPlan, getPlanProgress } from '@/api/assessments'
import { postBatchReport, getReportTask, getReportDownloadUrl } from '@/api/reports'

const route = useRoute()
const plan = ref({})
const progress = ref({
  completionRate: 0,
  completed: 0,
  total: 0,
  class_progress: [],
})

const STATUS_MAP = {
  draft: '草稿',
  published: '已发布',
  ongoing: '进行中',
  completed: '已完成',
  cancelled: '已取消',
}
const STATUS_COLOR = {
  draft: 'gray',
  published: 'blue',
  ongoing: 'green',
  completed: 'cyan',
  cancelled: 'red',
}
const planStatusLabel = (s) => STATUS_MAP[s] || s
const planStatusColor = (s) => STATUS_COLOR[s] || 'gray'

async function loadData() {
  try {
    const [planRes, progressRes] = await Promise.all([
      getPlan(route.params.id),
      getPlanProgress(route.params.id),
    ])
    plan.value = planRes.data || {}
    const p = progressRes.data || {}
    progress.value = {
      completionRate: p.completionRate ?? p.completion_rate ?? 0,
      completed: p.completed ?? p.plan?.completed_count,
      total: p.total ?? 0,
      class_progress: p.class_progress || [],
    }
  } catch {
    /* */
  }
}

const batchModalVisible = ref(false)
const batchClassId = ref(undefined)
const batchScope = ref('all')
const batchLoading = ref(false)
const batchStatus = ref('')
const batchTaskId = ref(null)
let batchPollTimer = null

async function doBatchExport() {
  if (!batchClassId.value) {
    Message.warning('请选择班级')
    return
  }
  batchLoading.value = true
  batchStatus.value = 'generating'
  try {
    const res = await postBatchReport(batchClassId.value, {
      plan_id: Number(route.params.id),
      scope: batchScope.value,
    })
    batchTaskId.value = res.data?.task_id
    pollBatchStatus()
  } catch (e) {
    Message.error(e?.message || '导出失败')
    batchLoading.value = false
    batchStatus.value = ''
  }
}

function pollBatchStatus() {
  if (batchPollTimer) clearInterval(batchPollTimer)
  batchPollTimer = setInterval(async () => {
    try {
      const res = await getReportTask(batchTaskId.value)
      const st = res.data?.status
      if (st === 'ready') {
        clearInterval(batchPollTimer)
        batchPollTimer = null
        batchLoading.value = false
        batchStatus.value = 'ready'
      } else if (st === 'failed') {
        clearInterval(batchPollTimer)
        batchPollTimer = null
        batchLoading.value = false
        batchStatus.value = ''
        Message.error(res.data?.error_msg || '报告生成失败')
      }
    } catch {
      clearInterval(batchPollTimer)
      batchPollTimer = null
      batchLoading.value = false
      batchStatus.value = ''
    }
  }, 2000)
}

function doBatchDownload() {
  if (!batchTaskId.value) return
  const url = getReportDownloadUrl(batchTaskId.value)
  const a = document.createElement('a')
  a.href = url
  a.download = ''
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  batchModalVisible.value = false
}

onUnmounted(() => {
  if (batchPollTimer) clearInterval(batchPollTimer)
})

onMounted(loadData)
</script>

<style scoped>
.info-card {
  margin-bottom: 16px;
}
.progress-center {
  text-align: center;
  padding: 16px 0;
}
.progress-text {
  margin-top: 12px;
}
.progress-text .num {
  font-size: 22px;
  font-weight: 600;
}
</style>
