<template>
  <div v-if="loading" class="loading-wrap"><a-spin size="large" /></div>
  <div v-else-if="!detail" class="loading-wrap"><a-empty description="预警不存在" /></div>
  <div v-else class="page-wrap alert-detail-page">
    <a-page-header
      :title="`预警详情 #${route.params.id}`"
      :subtitle="detail.alert?.created_at"
      @back="$router.push('/alerts')"
    >
      <template #extra>
        <a-space>
          <a-tag :color="detail.alert?.level === 'red' ? 'red' : 'orangered'" size="large">
            {{ detail.alert?.level === 'red' ? '红色预警' : '黄色预警' }}
          </a-tag>
          <a-tag :color="statusTagColor">{{ statusText }}</a-tag>
          <a-button
            v-if="['pending', 'processing'].includes(detail.alert?.status)"
            status="danger"
            @click="showCloseConfirm = true"
          >
            {{ isMobile ? '关闭' : '关闭预警' }}
          </a-button>
        </a-space>
      </template>
    </a-page-header>

    <a-modal
      v-model:visible="showLinkedChatModal"
      title="关联 AI 倾诉对话"
      :footer="false"
      width="640px"
      unmount-on-close
      @cancel="onLinkedChatModalClose"
    >
      <a-spin v-if="linkedChatLoading" style="display:block;padding:40px;text-align:center" />
      <template v-else-if="linkedChatError">
        <a-alert type="warning">{{ linkedChatError }}</a-alert>
      </template>
      <div v-else class="linked-chat-modal-body">
        <div v-if="linkedChatSession" class="linked-chat-meta">
          <span>学生：{{ linkedChatSession.student_name }}</span>
          <span class="meta-sep">·</span>
          <span>班级：{{ linkedChatSession.class_name || '—' }}</span>
          <span class="meta-sep">·</span>
          <span>会话 #{{ linkedChatSession.id }}</span>
        </div>
        <div class="linked-chat-messages">
          <div
            v-for="m in linkedChatMessages"
            :key="m.id"
            :class="['linked-msg', m.role === 'user' ? 'linked-msg--user' : 'linked-msg--ai']"
          >
            <div class="linked-msg-role">{{ m.role === 'user' ? '学生' : '小晴' }}</div>
            <div class="linked-msg-content">{{ m.content }}</div>
            <div class="linked-msg-time">{{ formatTime(m.created_at) }}</div>
          </div>
          <a-empty v-if="!linkedChatMessages.length" description="暂无消息" />
        </div>
      </div>
    </a-modal>

    <a-modal v-model:visible="showCloseConfirm" title="关闭预警" :footer="false" width="480px">
      <a-textarea
        v-model="closeNote"
        placeholder="结案说明（必填）"
        :max-length="500"
        show-word-limit
        allow-clear
        :auto-size="{ minRows: 4 }"
      />
      <div style="margin-top: 16px; text-align: right">
        <a-button @click="showCloseConfirm = false">取消</a-button>
        <a-popconfirm content="确定关闭该预警？关闭后不可恢复。" type="warning" @ok="submitClose">
          <a-button type="primary" status="danger" style="margin-left: 8px">确认关闭</a-button>
        </a-popconfirm>
      </div>
    </a-modal>

    <div class="detail-body">
      <aside class="left-panel">
        <a-card :bordered="false" class="student-card">
          <div class="student-header">
            <a-avatar :size="64" class="student-avatar">
              {{ detail.student?.name?.charAt(0) }}
            </a-avatar>
            <h3 class="student-name">{{ detail.student?.name }}</h3>
            <div class="student-meta">
              {{ genderLabel }} · {{ detail.student?.class_name }} {{ detail.student?.grade_name }}
            </div>
            <div class="student-no">学号: {{ detail.student?.student_no }}</div>
          </div>
          <a-divider />
          <a-descriptions :column="1" size="small" layout="vertical">
            <a-descriptions-item label="监护人">
              {{ detail.student?.guardian_name }}
            </a-descriptions-item>
            <a-descriptions-item label="联系电话">
              {{ detail.student?.guardian_phone }}
            </a-descriptions-item>
            <a-descriptions-item label="历史预警">
              共 {{ detail.student?.total_alert_count }} 次
            </a-descriptions-item>
            <a-descriptions-item label="心理状态">
              <a-tag
                :color="
                  detail.mental_status === 'high_risk'
                    ? 'red'
                    : detail.mental_status === 'attention'
                      ? 'orangered'
                      : 'green'
                "
                size="small"
              >
                {{ detail.mental_status_label }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="个案状态">
              <a-tag v-if="detail.student?.case_status === 'active'" color="arcoblue" size="small">
                个案在案
              </a-tag>
              <a-tag v-else-if="detail.student?.case_status === 'closed'" size="small">已结案</a-tag>
              <span v-else class="text-muted">无</span>
            </a-descriptions-item>
          </a-descriptions>
          <a-divider />
          <a-space direction="vertical" fill>
            <a-button long @click="$router.push(`/students/${detail.student?.id}`)">
              <icon-user /> 查看完整档案
            </a-button>
          </a-space>
        </a-card>
      </aside>

      <main class="right-content">
        <a-tabs default-active-key="detail" type="line">
          <a-tab-pane key="detail" title="预警详情">
            <!-- ===== 人工上报：显示上报详情卡片 ===== -->
            <template v-if="isManualReport">
              <a-card :bordered="false" class="score-card manual-report-card">
                <template #title>
                  <a-space>
                    <a-tag color="purple">人工上报</a-tag>
                    上报详情
                  </a-space>
                </template>
                <a-descriptions :column="1" bordered size="medium">
                  <a-descriptions-item label="上报人">
                    {{ detail.reporter_name || detail.alert?.reporter_name || '—' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="上报时间">
                    {{ formatTime(detail.alert?.created_at) }}
                  </a-descriptions-item>
                  <a-descriptions-item label="紧迫程度">
                    <a-tag :color="urgencyColor" size="medium">
                      {{ urgencyLabel }}
                    </a-tag>
                  </a-descriptions-item>
                  <a-descriptions-item label="上报原因">
                    <div class="report-reason-text">
                      {{ detail.alert?.trigger_reason || '—' }}
                    </div>
                  </a-descriptions-item>
                  <a-descriptions-item
                    v-if="detail.report_evidence || detail.alert?.report_evidence"
                    label="佐证描述"
                  >
                    <div class="report-reason-text">
                      {{ detail.report_evidence || detail.alert?.report_evidence }}
                    </div>
                  </a-descriptions-item>
                </a-descriptions>

                <a-button
                  v-if="linkedAiChatSessionId"
                  type="outline"
                  style="margin-top: 12px"
                  @click="openLinkedChatModal"
                >
                  查看关联对话
                </a-button>

                <!-- 该学生历史测评趋势（人工上报也可以参考） -->
                <div class="trend-section" style="margin-top:24px">
                  <h4 class="trend-title">该学生近期测评得分趋势（参考）</h4>
                  <div v-if="spark.pts.length" class="spark-wrap">
                    <svg :viewBox="`0 0 ${spark.w} ${spark.h}`" class="spark-svg">
                      <polyline
                        v-if="spark.poly"
                        :points="spark.poly"
                        fill="none"
                        class="spark-line"
                        stroke-width="2"
                      />
                      <circle
                        v-for="(p, i) in spark.pts"
                        :key="i"
                        :cx="p.x"
                        :cy="p.y"
                        :r="p.last ? 5 : 4"
                        :class="p.last ? 'spark-dot--last' : 'spark-dot'"
                      />
                    </svg>
                    <div class="spark-labels">
                      <span v-for="(p, i) in spark.pts" :key="'l'+i" class="spark-lab">
                        {{ p.date }}<br>
                        <strong>{{ p.score }}分</strong>
                      </span>
                    </div>
                  </div>
                  <a-empty v-else description="暂无历史测评数据" />
                </div>
              </a-card>
            </template>

            <!-- ===== 量表触发预警：原有详情 ===== -->
            <template v-else>
              <a-card :bordered="false" class="score-card">
                <template #title>
                  {{ detail.alert?.scale_name }} 测评结果 —
                  {{ formatTime(detail.assessment_result?.submit_time) }}
                </template>
                <div class="score-display">
                  <span class="score-number numeric">{{ detail.assessment_result?.total_score }}</span>
                  <span class="score-total">/ {{ detail.alert?.max_score }} 分</span>
                  <a-tag color="red" size="large" class="score-level">
                    {{ detail.assessment_result?.result_label }}
                  </a-tag>
                </div>

                <a-table v-if="!isMobile" :data="detail.assessment_result?.answers || []" :pagination="false" size="small" class="score-table">
                  <template #columns>
                    <a-table-column title="题号" :width="60" data-index="question_no" />
                    <a-table-column title="题目" data-index="question_text" ellipsis tooltip />
                    <a-table-column title="作答" :width="120" data-index="answer_label" />
                    <a-table-column title="得分" :width="60" data-index="score" />
                    <a-table-column title="" :width="90">
                      <template #cell="{ record }">
                        <a-tag v-if="record.is_alert_item" color="red" size="small">⚠ 关键题</a-tag>
                      </template>
                    </a-table-column>
                  </template>
                  <template #tr="{ record }">
                    <tr :class="{ 'alert-item-row': record.is_alert_item }" />
                  </template>
                </a-table>
                <div v-else class="mobile-answer-list">
                  <a-card
                    v-for="record in (detail.assessment_result?.answers || [])"
                    :key="record.question_no"
                    size="small"
                    class="mobile-answer-card"
                  >
                    <div class="ma-title">Q{{ record.question_no }} {{ record.answer_label }}（{{ record.score }}分）</div>
                    <div class="ma-text">{{ record.question_text }}</div>
                    <a-tag v-if="record.is_alert_item" color="red" size="small">关键题</a-tag>
                  </a-card>
                </div>

                <a-alert type="error" class="trigger-alert">
                  {{ detail.alert?.trigger_reason }}
                </a-alert>

                <div class="trend-section">
                  <h4 class="trend-title">历史得分趋势</h4>
                  <div v-if="spark.pts.length" class="spark-wrap">
                    <svg :viewBox="`0 0 ${spark.w} ${spark.h}`" class="spark-svg">
                      <polyline
                        v-if="spark.poly"
                        :points="spark.poly"
                        fill="none"
                        class="spark-line"
                        stroke-width="2"
                      />
                      <circle
                        v-for="(p, i) in spark.pts"
                        :key="i"
                        :cx="p.x"
                        :cy="p.y"
                        :r="p.last ? 5 : 4"
                        :class="p.last ? 'spark-dot--last' : 'spark-dot'"
                      />
                    </svg>
                    <div class="spark-labels">
                      <span v-for="(p, i) in spark.pts" :key="'l'+i" class="spark-lab">
                        {{ p.date }}<br >
                        <strong>{{ p.score }}分</strong>
                      </span>
                    </div>
                  </div>
                  <a-empty v-else description="暂无历史测评点" />
                </div>
              </a-card>
            </template>
          </a-tab-pane>

          <a-tab-pane key="process" title="处置流程">
            <a-steps direction="vertical" :current="processStep" class="process-steps">
              <a-step :title="isManualReport ? '人工上报预警' : '系统触发预警'" status="finish">
                <template #description>
                  <div class="step-desc">
                    <div>时间：{{ formatTime(detail.alert?.created_at) }}</div>
                    <div>{{ detail.alert?.trigger_reason }}</div>
                  </div>
                </template>
              </a-step>
              <a-step title="确认接收" :status="detail.alert?.status === 'pending' ? 'process' : 'finish'">
                <template #description>
                  <div v-if="detail.alert?.status === 'pending'" class="step-form-wrap">
                    <a-form layout="vertical" class="step-form" :model="acceptForm">
                      <a-form-item label="负责人" field="assigned_to" :rules="[{ required: true, message: '必选' }]">
                        <a-select v-model="acceptForm.assigned_to" placeholder="选择负责人" allow-search>
                          <a-option
                            v-for="u in detail.assignable_counselors || []"
                            :key="u.id"
                            :value="u.id"
                          >
                            {{ u.real_name }}
                          </a-option>
                        </a-select>
                      </a-form-item>
                      <a-form-item
                        label="确认说明（不少于20字）"
                        field="note"
                        :rules="[{ minLength: 20, message: '至少20字' }]"
                      >
                        <a-textarea
                          v-model="acceptForm.note"
                          placeholder="初步判断与处置计划"
                          :max-length="500"
                          show-word-limit
                        />
                      </a-form-item>
                      <a-form-item label="家长是否已知情" field="parent_notified">
                        <a-radio-group v-model="acceptForm.parent_notified">
                          <a-radio :value="true">是</a-radio>
                          <a-radio :value="false">否</a-radio>
                        </a-radio-group>
                      </a-form-item>
                      <a-form-item
                        v-if="acceptForm.parent_notified === true"
                        label="通知方式"
                        field="parent_notify_method"
                        :rules="[{ required: true, message: '请填写' }]"
                      >
                        <a-select v-model="acceptForm.parent_notify_method" placeholder="phone/sms/later">
                          <a-option value="phone">电话</a-option>
                          <a-option value="sms">短信</a-option>
                          <a-option value="later">稍后通知</a-option>
                        </a-select>
                      </a-form-item>
                      <a-button type="primary" :loading="acceptLoading" @click="submitAccept">
                        确认接收，进入处理
                      </a-button>
                    </a-form>
                  </div>
                  <div v-else class="step-desc">已完成接收，进入跟进阶段</div>
                </template>
              </a-step>
              <a-step
                title="跟进处置"
                :status="detail.alert?.status === 'processing' ? 'process' : detail.alert?.status === 'closed' ? 'finish' : 'wait'"
              />
              <a-step title="结案" :status="detail.alert?.status === 'closed' ? 'finish' : 'wait'" />
            </a-steps>
          </a-tab-pane>

          <a-tab-pane key="log" title="处置日志">
            <a-timeline class="log-timeline">
              <a-timeline-item
                v-for="log in processLogs"
                :key="log.id"
                :dot-color="logDotColor(log.action)"
              >
                <div class="log-entry">
                  <div class="log-header">
                    <a-avatar :size="20" class="avatar-primary">
                      {{ (log.operator_name || '?').charAt(0) }}
                    </a-avatar>
                    <strong>{{ log.operator_name }}</strong>
                    <a-tag size="small" class="log-action-tag">{{ log.action_label }}</a-tag>
                  </div>
                  <div class="log-desc">{{ log.content }}</div>
                  <div class="log-time">{{ log.created_at }}</div>
                </div>
              </a-timeline-item>
            </a-timeline>

            <a-card v-if="detail.alert?.status !== 'closed'" title="添加跟进记录" size="small" class="log-add-card">
              <a-textarea v-model="logForm.content" placeholder="跟进内容" :max-length="1000" show-word-limit />
              <a-row :gutter="12" style="margin-top:8px">
                <a-col :span="8">
                  <a-input v-model="logForm.next_plan_date" placeholder="下次计划日期 YYYY-MM-DD" />
                </a-col>
                <a-col :span="16">
                  <a-input v-model="logForm.next_plan_note" placeholder="下次计划说明" />
                </a-col>
              </a-row>
              <a-button type="primary" style="margin-top:12px" :loading="logLoading" @click="submitLog">
                提交记录
              </a-button>
            </a-card>
          </a-tab-pane>
        </a-tabs>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { getAlert, acceptAlert, addAlertLog, closeAlert } from '@/api/alerts'
import { getAiChatSessionMessages } from '@/api/aiChat'

const route = useRoute()
const loading = ref(true)
const isMobile = ref(false)
const detail = ref(null)
const acceptLoading = ref(false)
const logLoading = ref(false)
const showCloseConfirm = ref(false)
const closeNote = ref('')

const showLinkedChatModal = ref(false)
const linkedChatLoading = ref(false)
const linkedChatError = ref('')
const linkedChatSession = ref(null)
const linkedChatMessages = ref([])

const acceptForm = reactive({
  assigned_to: undefined,
  note: '',
  parent_notified: undefined,
  parent_notify_method: undefined,
})

const logForm = reactive({
  content: '',
  next_plan_date: '',
  next_plan_note: '',
})

/** 是否人工上报 */
const isManualReport = computed(() => {
  return detail.value?.source === 'manual' || detail.value?.alert?.source === 'manual'
})

/** 人工上报且佐证中含 session_id= 时，供心理老师查看关联 AI 对话 */
const linkedAiChatSessionId = computed(() => {
  if (!isManualReport.value) return null
  const raw = detail.value?.report_evidence ?? detail.value?.alert?.report_evidence
  if (raw == null) return null
  const str = String(raw)
  if (!str.includes('session_id=')) return null
  const m = str.match(/session_id=(\d+)/)
  return m ? m[1] : null
})

function onLinkedChatModalClose() {
  linkedChatError.value = ''
  linkedChatSession.value = null
  linkedChatMessages.value = []
}

async function openLinkedChatModal() {
  const sid = linkedAiChatSessionId.value
  if (!sid) return
  showLinkedChatModal.value = true
  linkedChatLoading.value = true
  linkedChatError.value = ''
  linkedChatSession.value = null
  linkedChatMessages.value = []
  try {
    const res = await getAiChatSessionMessages(sid)
    const payload = res?.data ?? res
    linkedChatSession.value = payload?.session ?? null
    linkedChatMessages.value = Array.isArray(payload?.messages) ? payload.messages : []
  } catch (e) {
    linkedChatError.value =
      (typeof e?.message === 'string' && e.message) || '加载对话失败，请稍后重试'
  } finally {
    linkedChatLoading.value = false
  }
}

/** 紧迫程度文字 */
const urgencyLabel = computed(() => {
  const u = detail.value?.report_urgency || detail.value?.alert?.report_urgency || 'normal'
  return { normal: '一般', urgent: '紧急', critical: '极度危机' }[u] || '一般'
})

/** 紧迫程度颜色 */
const urgencyColor = computed(() => {
  const u = detail.value?.report_urgency || detail.value?.alert?.report_urgency || 'normal'
  return { normal: 'green', urgent: 'orange', critical: 'red' }[u] || 'green'
})

const processLogs = computed(() => {
  const logs = detail.value?.process_logs || []
  return [...logs].reverse()
})

const statusText = computed(() => {
  const s = detail.value?.alert?.status
  const m = { pending: '待处理', processing: '处理中', closed: '已关闭', revoked: '已撤销' }
  return m[s] || s
})

const statusTagColor = computed(() => {
  const s = detail.value?.alert?.status
  const m = { pending: 'red', processing: 'blue', closed: 'green', revoked: 'gray' }
  return m[s] || 'gray'
})

const genderLabel = computed(() => {
  const g = detail.value?.student?.gender
  if (g === 1) return '男'
  if (g === 2) return '女'
  return '未知'
})

const processStep = computed(() => {
  const s = detail.value?.alert?.status
  if (s === 'pending') return 1
  if (s === 'processing') return 2
  if (s === 'closed') return 4
  return 1
})

const spark = computed(() => {
  const arr = detail.value?.assessment_result?.history_scores || []
  const w = 400
  const h = 120
  const pad = 24
  if (!arr.length) return { pts: [], poly: '', w, h }
  if (arr.length === 1) {
    const p = arr[0]
    const cx = w / 2
    const cy = h / 2
    return {
      pts: [{ x: cx, y: cy, date: p.date, score: p.score, last: true }],
      poly: '',
      w,
      h,
    }
  }
  const scores = arr.map((x) => x.score)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 1
  const pts = arr.map((p, i) => {
    const x = pad + (i / (arr.length - 1)) * (w - 2 * pad)
    const y = h - pad - ((p.score - min) / range) * (h - 2 * pad)
    return { x, y, date: p.date, score: p.score, last: i === arr.length - 1 }
  })
  const poly = pts.map((p) => `${p.x},${p.y}`).join(' ')
  return { pts, poly, w, h }
})

function logDotColor(action) {
  if (action === 'notify') return 'var(--color-text-4, #D1D5DB)'
  if (action === 'close') return 'var(--color-success-6, #10B981)'
  if (action === 'manual_report') return '#7C3AED'
  return 'var(--color-primary-5, #2d7a6a)'
}

function formatTime(iso) {
  if (!iso) return ''
  return String(iso).replace('T', ' ').slice(0, 19)
}

async function load() {
  loading.value = true
  try {
    const res = await getAlert(route.params.id)
    detail.value = res.data ? { ...res.data, id: Number(route.params.id) } : null
    acceptForm.assigned_to = detail.value?.alert?.assigned_to || undefined
    acceptForm.note = ''
    acceptForm.parent_notified = undefined
    acceptForm.parent_notify_method = undefined
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
}

async function submitAccept() {
  if (!acceptForm.assigned_to) {
    Message.warning('请选择负责人')
    return
  }
  if (!acceptForm.note || acceptForm.note.trim().length < 20) {
    Message.warning('确认说明至少20字')
    return
  }
  if (acceptForm.parent_notified === undefined) {
    Message.warning('请选择家长是否已知情')
    return
  }
  if (acceptForm.parent_notified === true && !acceptForm.parent_notify_method) {
    Message.warning('请填写通知方式')
    return
  }
  acceptLoading.value = true
  try {
    await acceptAlert(route.params.id, {
      assigned_to: acceptForm.assigned_to,
      note: acceptForm.note.trim(),
      parent_notified: acceptForm.parent_notified,
      parent_notify_method: acceptForm.parent_notify_method || undefined,
    })
    Message.success('已确认接收')
    await load()
  } finally {
    acceptLoading.value = false
  }
}

async function submitLog() {
  if (!logForm.content?.trim()) {
    Message.warning('请填写跟进内容')
    return
  }
  logLoading.value = true
  try {
    const newLog = await addAlertLog(route.params.id, {
      content: logForm.content.trim(),
      next_plan_date: logForm.next_plan_date || undefined,
      next_plan_note: logForm.next_plan_note || undefined,
    })
    if (detail.value?.process_logs && newLog.data) {
      detail.value.process_logs.push(newLog.data)
    }
    logForm.content = ''
    logForm.next_plan_date = ''
    logForm.next_plan_note = ''
    Message.success('已添加')
    await load()
  } finally {
    logLoading.value = false
  }
}

async function submitClose() {
  if (!closeNote.value?.trim()) {
    Message.warning('请填写结案说明')
    return
  }
  try {
    await closeAlert(route.params.id, { close_note: closeNote.value.trim() })
    Message.success('预警已关闭')
    showCloseConfirm.value = false
    closeNote.value = ''
    await load()
  } catch {
    /* handled */
  }
}

watch(
  () => route.params.id,
  () => load(),
  { immediate: false }
)

onMounted(load)
onMounted(() => {
  const mql = window.matchMedia('(max-width: 767px)')
  isMobile.value = mql.matches
  mql.addEventListener('change', (e) => { isMobile.value = e.matches })
})
</script>

<style scoped>
.loading-wrap {
  padding: 80px;
  text-align: center;
}

.alert-detail-page { padding: 0; }

.detail-body {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

.left-panel {
  flex: 0 0 320px;
  width: 320px;
}

.student-card {
  box-shadow: var(--shadow-card);
  border-radius: var(--radius-md);
  position: sticky;
  top: 76px;
}

.student-header { text-align: center; }

.student-avatar {
  background: var(--color-primary-2);
  color: var(--color-primary-7);
  font-size: 24px;
  font-weight: 600;
}

.student-name {
  font-size: 18px;
  font-weight: 600;
  margin: 12px 0 4px;
}

.student-meta {
  font-size: 14px;
  color: var(--color-text-2);
  margin-bottom: 4px;
}

.student-no {
  font-size: 12px;
  color: var(--color-text-3);
}

.right-content {
  flex: 1;
  min-width: 0;
}

.right-content :deep(.arco-tabs-content) {
  padding-top: 16px;
}

.score-card {
  box-shadow: var(--shadow-card);
  border-radius: var(--radius-md);
}

.score-display {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 24px;
}

.score-number {
  font-size: 42px;
  font-weight: 600;
  color: var(--color-danger-6);
}

.score-total {
  font-size: 18px;
  color: var(--color-text-3);
}

.score-table { margin-bottom: 16px; }

:deep(.alert-item-row) {
  background: var(--alert-red-bg) !important;
}

.trigger-alert { margin: 16px 0; }

.trend-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-1);
}

.trend-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 16px;
}

.spark-wrap { overflow-x: auto; }

.spark-svg {
  width: 100%;
  max-width: 420px;
  height: 120px;
  display: block;
}

.spark-line { stroke: var(--color-text-3); }
.spark-dot { fill: var(--color-primary-5); }
.spark-dot--last { fill: var(--color-danger-6); }

.spark-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-3);
}

.spark-lab strong { color: var(--color-text-1); }

.process-steps { padding: 16px; }

.step-desc {
  font-size: 13px;
  color: var(--color-text-2);
  line-height: 1.6;
}

.step-form {
  margin-top: 12px;
  max-width: 440px;
}

.log-timeline { padding: 16px 0; }
.log-add-card { margin-top: 16px; }

.avatar-primary {
  background: var(--color-primary-5);
  margin-right: 6px;
}

.log-entry { padding-bottom: 4px; }

.log-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}

.log-desc {
  font-size: 14px;
  color: var(--color-text-2);
  line-height: 1.5;
  margin-bottom: 4px;
  white-space: pre-wrap;
}

.log-time {
  font-size: 12px;
  color: var(--color-text-4);
}

.manual-report-card :deep(.arco-descriptions-item-label) {
  white-space: nowrap;
  font-weight: 500;
}

.report-reason-text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text-1);
  white-space: pre-wrap;
}

.linked-chat-modal-body {
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.linked-chat-meta {
  font-size: 13px;
  color: var(--color-text-2);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border-2);
}
.linked-chat-meta .meta-sep {
  margin: 0 6px;
  opacity: 0.5;
}
.linked-chat-messages {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
}
.linked-msg {
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.55;
}
.linked-msg--ai {
  background: rgba(61, 139, 122, 0.1);
  align-self: flex-start;
  max-width: 92%;
}
.linked-msg--user {
  background: var(--color-fill-2);
  align-self: flex-end;
  max-width: 92%;
}
.linked-msg-role {
  font-size: 12px;
  color: var(--color-text-3);
  margin-bottom: 4px;
}
.linked-msg-content {
  white-space: pre-wrap;
  color: var(--color-text-1);
}
.linked-msg-time {
  font-size: 11px;
  color: var(--color-text-4);
  margin-top: 6px;
}

.mobile-answer-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}
.mobile-answer-card { font-size: 13px; }
.ma-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.ma-text { font-size: 13px; color: var(--color-text-2); margin-bottom: 6px; }

@media (max-width: 768px) {
  .detail-body {
    flex-direction: column;
  }
  .left-panel {
    flex: none;
    width: 100%;
  }
  .student-card {
    position: static;
  }
}
</style>
