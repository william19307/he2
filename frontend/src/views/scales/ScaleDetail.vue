<template>
  <div v-if="scale.id" class="page-wrap scale-detail">
    <a-page-header :title="scale.name" @back="$router.back()">
      <template #subtitle>{{ scale.category?.name }} · {{ scale.questionCount }}题</template>
      <template #extra>
        <a-button @click="openPreview">
          <template #icon><IconEdit /></template>
          体验作答
        </a-button>
      </template>
    </a-page-header>

    <a-card title="题目" :bordered="false" class="card">
      <div v-for="q in scale.questions || []" :key="q.id" class="q-row">
        <div class="q-main">
          <span class="q-no">Q{{ q.questionNo }}</span>
          <span class="q-text">{{ q.questionText }}</span>
          <a-tag v-if="q.is_alert_item" color="red" size="small">预警关键题</a-tag>
        </div>
        <div class="q-type">{{ q.questionType || 'likert' }}</div>
        <div v-if="q.options?.length" class="opts">
          <a-radio-group v-if="q.questionType !== 'multi'" disabled>
            <a-radio v-for="(o, i) in q.options" :key="i" :value="o.value">{{ o.label }}</a-radio>
          </a-radio-group>
          <a-checkbox-group v-else disabled>
            <a-checkbox v-for="(o, i) in q.options" :key="i" :value="o.value">{{ o.label }}</a-checkbox>
          </a-checkbox-group>
        </div>
      </div>
    </a-card>

    <a-card title="计分与结果等级" :bordered="false" class="card">
      <a-table :data="levels" :pagination="false" size="small">
        <template #columns>
          <a-table-column title="等级代码" data-index="level" :width="120" />
          <a-table-column title="标签" data-index="label" />
          <a-table-column title="分数区间" :width="160">
            <template #cell="{ record }">
              {{ record.min ?? record.range?.[0] ?? '—' }} ~ {{ record.max ?? record.range?.[1] ?? '—' }}
            </template>
          </a-table-column>
          <a-table-column title="风险" :width="100">
            <template #cell="{ record }">
              <a-tag :color="riskColor(record)">{{ riskLabel(record) }}</a-tag>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
  </div>
  <a-spin v-else style="padding: 48px" />

  <!-- ===== 体验作答 Modal ===== -->
  <a-modal
    v-model:visible="previewVisible"
    title="体验作答"
    :footer="false"
    :width="760"
    :unmount-on-close="true"
    class="preview-modal"
    @cancel="resetPreview"
  >
    <a-alert type="info" banner style="margin-bottom: 20px">
      体验模式，不计入学生数据
    </a-alert>

    <div class="preview-header">
      <span class="preview-scale-name">{{ scale.name }}</span>
      <span class="preview-progress">第 {{ previewIndex + 1 }} / {{ previewQuestions.length }} 题</span>
    </div>

    <a-progress
      :percent="previewPercent"
      :show-text="false"
      size="small"
      status="normal"
      style="margin-bottom: 20px"
    />

    <div v-if="previewCurrentQ" class="preview-question-card">
      <div v-if="previewCurrentQ.is_alert_item" class="critical-banner">
        本题为重要题目，请如实作答
      </div>
      <div class="pq-text">
        <span class="pq-no">Q{{ previewCurrentQ.questionNo }}</span>
        {{ previewCurrentQ.questionText }}
      </div>
      <div class="pq-options">
        <div
          v-for="opt in previewCurrentQ.options || []"
          :key="opt.value"
          class="pq-option"
          :class="{ selected: previewAnswers[previewCurrentQ.id] === opt.value }"
          @click="selectPreviewOpt(opt.value)"
        >
          <div class="pq-radio" />
          <span>{{ opt.label }}</span>
        </div>
      </div>
    </div>

    <div class="preview-nav">
      <a-button v-if="previewIndex > 0" @click="previewIndex--">上一题</a-button>
      <div v-else />
      <a-button
        v-if="previewIndex < previewQuestions.length - 1"
        type="primary"
        :disabled="previewAnswers[previewCurrentQ?.id] == null"
        @click="previewIndex++"
      >
        下一题
      </a-button>
      <a-button
        v-else
        type="primary"
        status="success"
        :loading="submittingPreview"
        :disabled="!previewAllAnswered"
        @click="submitPreview"
      >
        提交查看结果
      </a-button>
    </div>

    <div v-if="!previewAllAnswered && previewIndex === previewQuestions.length - 1" class="unanswered-tip">
      还有 {{ unansweredCount }} 道题未作答，请返回补全后提交
    </div>
  </a-modal>

  <!-- ===== 结果弹窗 ===== -->
  <a-modal
    v-model:visible="resultVisible"
    title="作答结果"
    :width="680"
    :footer="false"
    :unmount-on-close="true"
    class="result-modal"
  >
    <template v-if="previewResult">
      <!-- 得分摘要 -->
      <div class="result-score-block">
        <div class="score-main">
          <span class="score-num">{{ previewResult.total_score }}</span>
          <span class="score-max">/ {{ previewResult.max_score }}</span>
        </div>
        <div
          class="result-level-tag"
          :style="{ background: resultLevelBg, color: resultLevelColor }"
        >
          {{ previewResult.result_label || previewResult.result_level || '—' }}
        </div>
        <div v-if="previewResult.result_description" class="result-desc">
          {{ previewResult.result_description }}
        </div>
      </div>

      <!-- 答题详情 -->
      <a-divider>答题详情</a-divider>
      <a-table
        :data="previewResult.answers_detail || []"
        :pagination="false"
        size="small"
        class="detail-table"
      >
        <template #columns>
          <a-table-column title="题号" data-index="question_no" :width="56" align="center" />
          <a-table-column title="题目" data-index="question_text" ellipsis />
          <a-table-column title="作答" data-index="answer_label" :width="120" />
          <a-table-column title="得分" data-index="score" :width="64" align="center">
            <template #cell="{ record }">
              <span :class="record.is_alert_item ? 'alert-score' : ''">{{ record.score }}</span>
            </template>
          </a-table-column>
          <a-table-column title="" :width="48" align="center">
            <template #cell="{ record }">
              <a-tag v-if="record.is_alert_item" color="red" size="small">关键</a-tag>
            </template>
          </a-table-column>
        </template>
      </a-table>

      <div style="text-align: right; margin-top: 20px">
        <a-button type="primary" @click="resultVisible = false">关闭</a-button>
      </div>
    </template>
  </a-modal>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconEdit } from '@arco-design/web-vue/es/icon'
import request from '@/utils/request'

const route = useRoute()
const scale = ref({})

// ── 量表详情 ──────────────────────────────────
const levels = computed(() => {
  const lv = scale.value.resultLevels || scale.value.result_levels
  return Array.isArray(lv) ? lv : []
})

function riskColor(rec) {
  const l = (rec.level || '').toLowerCase()
  if (l.includes('severe') || l.includes('heavy') || rec.label?.includes('重')) return 'red'
  if (l.includes('moderate') || rec.label?.includes('中')) return 'orangered'
  if (l.includes('mild') || rec.label?.includes('轻')) return 'gold'
  return 'green'
}

function riskLabel(rec) {
  const c = riskColor(rec)
  if (c === 'red') return '高'
  if (c === 'orangered') return '中'
  if (c === 'gold') return '轻'
  return '低'
}

// ── 体验作答 ──────────────────────────────────
const previewVisible = ref(false)
const previewIndex = ref(0)
const previewAnswers = reactive({})
const submittingPreview = ref(false)
const resultVisible = ref(false)
const previewResult = ref(null)

const previewQuestions = computed(() => scale.value.questions || [])
const previewCurrentQ = computed(() => previewQuestions.value[previewIndex.value])

const previewPercent = computed(() => {
  const total = previewQuestions.value.length
  if (!total) return 0
  return Math.round(((previewIndex.value + 1) / total) * 100)
})

const previewAllAnswered = computed(() =>
  previewQuestions.value.every((q) => previewAnswers[q.id] != null)
)

const unansweredCount = computed(() =>
  previewQuestions.value.filter((q) => previewAnswers[q.id] == null).length
)

function openPreview() {
  resetPreview()
  previewVisible.value = true
}

function resetPreview() {
  previewIndex.value = 0
  for (const k of Object.keys(previewAnswers)) delete previewAnswers[k]
  previewResult.value = null
}

function selectPreviewOpt(val) {
  if (previewCurrentQ.value) {
    previewAnswers[previewCurrentQ.value.id] = val
    // 自动进入下一题
    if (previewIndex.value < previewQuestions.value.length - 1) {
      setTimeout(() => { previewIndex.value++ }, 220)
    }
  }
}

async function submitPreview() {
  if (!previewAllAnswered.value) {
    Message.warning('还有题目未作答，请补全后提交')
    return
  }
  submittingPreview.value = true
  try {
    const answers = previewQuestions.value.map((q) => ({
      question_id: Number(q.id),
      question_no: q.questionNo,
      value: previewAnswers[q.id],
    }))
    const res = await request.post(`/scales/${route.params.id}/preview-submit`, { answers })
    previewResult.value = res.data
    previewVisible.value = false
    resultVisible.value = true
  } catch {
    /* request interceptor already shows error toast */
  } finally {
    submittingPreview.value = false
  }
}

// ── 结果着色 ──────────────────────────────────
const resultLevelBg = computed(() => {
  const lvl = (previewResult.value?.result_level || '').toLowerCase()
  const label = previewResult.value?.result_label || ''
  if (lvl.includes('severe') || label.includes('重度')) return '#fff1f0'
  if (lvl.includes('moderate') || label.includes('中度')) return '#fff7e6'
  if (lvl.includes('mild') || label.includes('轻度')) return '#fffbe6'
  return '#f6ffed'
})

const resultLevelColor = computed(() => {
  const lvl = (previewResult.value?.result_level || '').toLowerCase()
  const label = previewResult.value?.result_label || ''
  if (lvl.includes('severe') || label.includes('重度')) return '#cf1322'
  if (lvl.includes('moderate') || label.includes('中度')) return '#d46b08'
  if (lvl.includes('mild') || label.includes('轻度')) return '#ad8b00'
  return '#389e0d'
})

// ── 挂载 ──────────────────────────────────────
onMounted(async () => {
  try {
    const res = await request.get(`/scales/${route.params.id}`)
    scale.value = res.data || {}
  } catch {
    scale.value = {}
  }
})
</script>

<style scoped>
.card {
  margin-bottom: 16px;
}
.q-row {
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border-2);
}
.q-main {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}
.q-no {
  font-weight: 600;
  color: var(--color-primary-6);
  flex-shrink: 0;
}
.q-type {
  font-size: 12px;
  color: var(--color-text-3);
  margin: 4px 0;
}
.opts {
  margin-top: 8px;
}

/* ── 体验作答 Modal ── */
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.preview-scale-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-1);
}
.preview-progress {
  font-size: 13px;
  color: var(--color-text-3);
}
.preview-question-card {
  background: #fafafa;
  border: 1px solid var(--color-border-2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}
.critical-banner {
  background: #fff2f0;
  color: #cf1322;
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 14px;
  border-left: 3px solid #cf1322;
}
.pq-text {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.6;
  color: var(--color-text-1);
  margin-bottom: 20px;
}
.pq-no {
  font-weight: 700;
  color: rgb(var(--primary-6));
  margin-right: 6px;
}
.pq-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pq-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1.5px solid var(--color-border-2);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s;
  user-select: none;
}
.pq-option:hover {
  border-color: rgb(var(--primary-6));
  background: rgba(var(--primary-6), 0.05);
}
.pq-option.selected {
  border-color: rgb(var(--primary-6));
  background: rgba(var(--primary-6), 0.08);
}
.pq-radio {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #c9cdd4;
  flex-shrink: 0;
  transition: all 0.18s;
}
.pq-option.selected .pq-radio {
  border-color: rgb(var(--primary-6));
  background: rgb(var(--primary-6));
  box-shadow: inset 0 0 0 3px #fff;
}
.preview-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.unanswered-tip {
  text-align: center;
  font-size: 13px;
  color: var(--color-danger-6, #f53f3f);
  margin-top: 10px;
}

/* ── 结果 Modal ── */
.result-score-block {
  text-align: center;
  padding: 24px 0 16px;
}
.score-main {
  margin-bottom: 16px;
}
.score-num {
  font-size: 56px;
  font-weight: 800;
  line-height: 1;
  color: var(--color-text-1);
}
.score-max {
  font-size: 22px;
  color: var(--color-text-3);
  margin-left: 4px;
}
.result-level-tag {
  display: inline-block;
  font-size: 22px;
  font-weight: 700;
  padding: 6px 28px;
  border-radius: 999px;
  margin-bottom: 12px;
}
.result-desc {
  font-size: 13px;
  color: var(--color-text-2);
  max-width: 420px;
  margin: 0 auto;
  line-height: 1.7;
}
.alert-score {
  color: #cf1322;
  font-weight: 700;
}
</style>
