<template>
  <div class="h5-page answer-page">
    <div class="answer-progress">
      <a-progress
        :percent="progressPercent"
        :show-text="false"
        size="small"
        color="#4a7c6f"
      />
      <span class="progress-text">第 {{ currentIndex + 1 }} / {{ questions.length }} 题</span>
    </div>

    <div v-if="currentQuestion" class="question-card">
      <div
        v-if="currentQuestion.is_alert_item || currentQuestion.question_no === 9"
        class="critical-banner"
      >
        本题为重要题目，请如实作答
      </div>
      <div class="question-text">{{ currentQuestion.question_text }}</div>

      <div class="option-list">
        <div
          v-for="opt in currentQuestion.options"
          :key="opt.value"
          class="option-item"
          :class="{ selected: answers[currentQuestion.id] === opt.value }"
          @click="selectOption(opt.value)"
        >
          <div class="option-radio" />
          <span>{{ opt.label }}</span>
        </div>
      </div>
    </div>

    <div class="answer-nav">
      <a-button v-if="currentIndex > 0" @click="prevQuestion">上一题</a-button>
      <div v-else />
      <a-button
        v-if="currentIndex < questions.length - 1"
        type="primary"
        :disabled="answers[currentQuestion?.id] == null && currentQuestion?.is_required"
        @click="nextQuestion"
      >
        下一题
      </a-button>
      <a-button
        v-else
        type="primary"
        status="success"
        :loading="finishing"
        @click="goToConfirm"
      >
        完成作答
      </a-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { h5GetQuestions, h5SaveProgress } from '@/api/h5'

const route = useRoute()
const router = useRouter()
const taskId = route.params.id

const questions = ref([])
const currentIndex = ref(0)
const answers = reactive({})
const startedAt = ref(Date.now())
const finishing = ref(false)
let saveTimer = null

const currentQuestion = computed(() => questions.value[currentIndex.value])
const progressPercent = computed(() =>
  questions.value.length
    ? Math.round(((currentIndex.value + 1) / questions.value.length) * 100)
    : 0
)

function buildPayload() {
  return questions.value
    .filter((q) => answers[q.id] != null)
    .map((q) => ({
      question_id: Number(q.id),
      question_no: q.question_no,
      value: answers[q.id],
    }))
}

function selectOption(val) {
  if (currentQuestion.value) answers[currentQuestion.value.id] = val
  scheduleSave()
}

function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(flushSave, 2000)
}

async function flushSave() {
  const list = buildPayload()
  if (list.length === 0) return
  try {
    await h5SaveProgress(taskId, list)
  } catch { /* 静默 */ }
}

function prevQuestion() {
  if (currentIndex.value > 0) currentIndex.value--
}

function nextQuestion() {
  if (currentIndex.value < questions.value.length - 1) currentIndex.value++
  scheduleSave()
}

async function goToConfirm() {
  finishing.value = true
  try {
    await flushSave()
    sessionStorage.setItem(`h5_start_${taskId}`, String(startedAt.value))
    router.push(`/h5/tasks/${taskId}/confirm`)
  } catch {
    Message.error('暂存失败，请重试')
  } finally {
    finishing.value = false
  }
}

onMounted(async () => {
  try {
    const d = await h5GetQuestions(taskId)
    questions.value = (d.questions || []).map((q) => ({
      ...q,
      id: String(q.id),
    }))
    for (const s of d.saved_answers || []) {
      answers[String(s.question_id)] = s.value
    }
    if (!sessionStorage.getItem(`h5_start_${taskId}`)) {
      sessionStorage.setItem(`h5_start_${taskId}`, String(Date.now()))
    }
    startedAt.value = parseInt(sessionStorage.getItem(`h5_start_${taskId}`), 10) || Date.now()
  } catch {
    Message.error('加载题目失败')
    router.back()
  }
})

onUnmounted(() => clearTimeout(saveTimer))
</script>

<style scoped>
.h5-page { max-width: 420px; margin: 0 auto; padding: 18px 20px; min-height: 100vh; background: var(--h5-bg); display: flex; flex-direction: column; }
.answer-progress { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.progress-text { font-size: 13px; color: var(--h5-subtext); white-space: nowrap; }
.critical-banner {
  background: #fff2f0; color: #cf1322; font-size: 12px; padding: 8px 12px; border-radius: 10px;
  margin-bottom: 12px; border-left: 3px solid #cf1322;
}
.question-card {
  background: var(--h5-surface);
  border: 1px solid var(--h5-border);
  border-radius: var(--h5-radius-card);
  box-shadow: var(--h5-shadow);
  padding: 16px;
}
.question-text { font-size: 18px; font-weight: 600; color: var(--h5-text); line-height: 1.6; margin-bottom: 24px; }
.option-list { display: flex; flex-direction: column; gap: 12px; }
.option-item {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border: 1.5px solid var(--h5-border); border-radius: 14px;
  cursor: pointer; transition: all 0.2s;
}
.option-item:hover { border-color: var(--h5-primary); background: rgba(61,139,122,0.05); }
.option-item.selected { border-color: var(--h5-primary); background: rgba(61,139,122,0.11); }
.option-radio {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid #c9cdd4; flex-shrink: 0;
}
.option-item.selected .option-radio {
  border-color: var(--h5-primary); background: var(--h5-primary);
  box-shadow: inset 0 0 0 3px #fff;
}
.answer-nav {
  display: flex; justify-content: space-between; padding: 20px 0;
  margin-top: auto; border-top: 1px solid var(--h5-border);
}
:deep(.arco-btn) { border-radius: 999px !important; }
</style>
