<template>
  <div class="case-detail">
    <a-page-header title="个案详情" @back="router.push('/cases')" />

    <a-spin :loading="loading">
      <template v-if="caseInfo">
        <!-- 学生基本信息 -->
        <a-card title="学生信息" class="block-card" :bordered="false">
          <a-descriptions :column="isMobile ? 1 : 3" size="large">
            <a-descriptions-item label="姓名">
              <a-link v-if="caseInfo.user_id" @click="router.push(`/students/${caseInfo.user_id}`)">
                {{ caseInfo.student_name }}
              </a-link>
              <span v-else>{{ caseInfo.student_name }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="班级">{{ caseInfo.class_name || '—' }}</a-descriptions-item>
            <a-descriptions-item label="学号">{{ caseInfo.student_no || '—' }}</a-descriptions-item>
            <a-descriptions-item label="预警等级">
              <a-tag v-if="caseInfo.alert_level === 'red'" color="red">红色预警</a-tag>
              <a-tag v-else-if="caseInfo.alert_level === 'yellow'" color="orangered">黄色预警</a-tag>
              <span v-else class="text-muted">暂无进行中的预警</span>
            </a-descriptions-item>
            <a-descriptions-item label="负责老师">{{ caseInfo.counselor_name || '—' }}</a-descriptions-item>
            <a-descriptions-item label="个案状态">
              <a-tag :color="caseInfo.status === 'active' ? 'green' : 'gray'">
                {{ caseInfo.status === 'active' ? '进行中' : '已结案' }}
              </a-tag>
            </a-descriptions-item>
          </a-descriptions>
          <p v-if="caseInfo.summary" class="case-summary">摘要：{{ caseInfo.summary }}</p>
        </a-card>

        <!-- 干预进展时间线 -->
        <a-card title="干预进展" class="block-card" :bordered="false">
          <a-empty v-if="!records.length" description="暂无跟进记录" />
          <a-timeline v-else class="record-timeline">
            <a-timeline-item
              v-for="rec in records"
              :key="rec.id"
              dot-color="rgb(var(--primary-6))"
            >
              <div class="rec-head">
                <span class="rec-time">{{ formatDt(rec.record_date) }}</span>
                <span class="rec-op">{{ rec.operator_name }}</span>
                <a-tag v-if="rec.record_type" size="small">{{ recordTypeLabel(rec.record_type) }}</a-tag>
              </div>
              <div class="rec-emotion" v-if="parseCaseRecordEmotion(rec.content) != null">
                <span class="label">情绪评级：</span>
                <a-rate
                  :model-value="parseCaseRecordEmotion(rec.content)"
                  :count="5"
                  allow-half
                  disabled
                />
                <span class="emo-num">{{ parseCaseRecordEmotion(rec.content) }}/5</span>
              </div>
              <div v-else class="rec-emotion text-muted">情绪评级：—</div>
              <pre class="rec-content">{{ mainContent(rec.content) }}</pre>
            </a-timeline-item>
          </a-timeline>
        </a-card>

        <div v-if="caseInfo.status === 'active'" class="actions">
          <a-button type="primary" @click="followVisible = true">添加跟进记录</a-button>
          <a-button status="danger" @click="closeVisible = true">结案</a-button>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="个案不存在或无权查看" />
    </a-spin>

    <CaseFollowUpModal
      v-model:visible="followVisible"
      :case-id="caseId"
      @success="loadDetail"
    />

    <a-modal
      v-model:visible="closeVisible"
      title="结案"
      :ok-loading="closeLoading"
      @ok="submitClose"
    >
      <p class="close-tip">结案后不可再添加跟进记录，请填写原因。</p>
      <a-textarea
        v-model="closeReason"
        placeholder="结案原因（必填）"
        :max-length="500"
        show-word-limit
      />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { getCaseDetail, postCaseClose } from '@/api/cases'
import { parseCaseRecordEmotion } from '@/utils/caseRecordFormat'
import CaseFollowUpModal from '@/components/CaseFollowUpModal.vue'

const route = useRoute()
const router = useRouter()
const caseId = computed(() => route.params.id)

const loading = ref(true)
const caseInfo = ref(null)
const records = ref([])
const followVisible = ref(false)
const closeVisible = ref(false)
const closeReason = ref('')
const closeLoading = ref(false)
const isMobile = ref(false)

let mql = null

function formatDt(iso) {
  if (!iso) return ''
  return String(iso).replace('T', ' ').slice(0, 19)
}

function recordTypeLabel(t) {
  const m = {
    session: '会谈',
    consult: '咨询',
    parent: '家长沟通',
    other: '其他',
  }
  return m[t] || t
}

/** 展示时去掉已结构化展示的情绪行等（保留主文案） */
function mainContent(content) {
  const lines = String(content || '').split('\n')
  const skip = (line) =>
    /^实际时长：/.test(line) ||
    /^学生情绪（1-5）：/.test(line) ||
    /^干预进展：/.test(line) ||
    /^下次计划：/.test(line)
  return lines.filter((l) => !skip(l)).join('\n').trim() || content
}

async function loadDetail() {
  loading.value = true
  try {
    const res = await getCaseDetail(caseId.value)
    const d = res.data || {}
    caseInfo.value = d.case || null
    records.value = d.records || []
  } catch {
    caseInfo.value = null
    records.value = []
  } finally {
    loading.value = false
  }
}

async function submitClose() {
  const r = closeReason.value?.trim()
  if (!r) {
    Message.warning('请填写结案原因')
    return false
  }
  closeLoading.value = true
  try {
    await postCaseClose(caseId.value, { close_reason: r })
    Message.success('已结案')
    closeVisible.value = false
    closeReason.value = ''
    await loadDetail()
    return true
  } catch {
    return false
  } finally {
    closeLoading.value = false
  }
}

function onMql(e) {
  isMobile.value = e.matches
}

watch(
  caseId,
  () => {
    loadDetail()
  },
  { immediate: true }
)

onMounted(() => {
  mql = window.matchMedia('(max-width: 767px)')
  isMobile.value = mql.matches
  mql.addEventListener('change', onMql)
})

onUnmounted(() => {
  if (mql) mql.removeEventListener('change', onMql)
})
</script>

<style scoped>
.case-detail {
  padding: 16px 24px 40px;
  max-width: 960px;
  box-sizing: border-box;
}
.block-card {
  margin-bottom: 16px;
  border-radius: 8px;
}
.case-summary {
  margin: 12px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-2);
  font-size: 13px;
  color: var(--color-text-2);
}
.record-timeline {
  margin-top: 8px;
}
.rec-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.rec-time {
  font-weight: 600;
  color: var(--color-text-1);
}
.rec-op {
  font-size: 13px;
  color: var(--color-text-3);
}
.rec-emotion {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}
.rec-emotion .label {
  color: var(--color-text-3);
}
.emo-num {
  color: var(--color-text-3);
  font-size: 12px;
}
.rec-content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-2);
}
.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.text-muted {
  color: var(--color-text-3);
}
.close-tip {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--color-text-3);
}
</style>
