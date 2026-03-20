<template>
  <div class="h5-page confirm-page">
    <div class="top-nav">
      <h1 class="nav-title">确认提交</h1>
    </div>

    <div v-if="loading" class="loading-wrap">
      <a-spin />
    </div>

    <div v-else class="confirm-content">
      <a-alert v-if="unansweredCount > 0" type="warning" class="warning-alert">
        <template #title>
          您有 {{ unansweredCount }} 道题目尚未作答，提交后将按 0 分计
        </template>
      </a-alert>

      <div v-else class="success-info">
        <icon-check-circle class="success-icon" />
        <p>您已完成全部 {{ totalCount }} 道题目</p>
      </div>

      <a-card class="summary-card" :bordered="false">
        <div class="summary-row">
          <span class="label">量表名称</span>
          <span class="value">{{ scaleName }}</span>
        </div>
        <div class="summary-row">
          <span class="label">作答题数</span>
          <span class="value">{{ answeredCount }}/{{ totalCount }}</span>
        </div>
        <div class="summary-row">
          <span class="label">用时</span>
          <span class="value">约 {{ elapsedMinutes }} 分钟</span>
        </div>
      </a-card>

      <p class="submit-note">提交后将无法修改，请确认无误后提交。</p>

      <div class="button-group">
        <a-button type="primary" size="large" long class="submit-btn" :loading="submitting" @click="handleSubmit">
          确认提交
        </a-button>
        <a-button type="outline" size="large" long class="back-btn" @click="goBack">
          返回检查
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconCheckCircle } from '@arco-design/web-vue/es/icon'
import { h5GetQuestions, h5SubmitTask } from '@/api/h5'

const router = useRouter()
const route = useRoute()
const taskId = route.params.id

const loading = ref(true)
const submitting = ref(false)
const scaleName = ref('')
const questions = ref([])
const valueByQid = ref({})

const totalCount = computed(() => questions.value.length)
const answeredCount = computed(() =>
  questions.value.filter((q) => valueByQid.value[String(q.id)] != null).length
)
const unansweredCount = computed(() => totalCount.value - answeredCount.value)

const startTs = ref(Date.now())
const elapsedMinutes = computed(() => {
  const sec = (Date.now() - startTs.value) / 1000
  return Math.max(1, Math.round(sec / 60))
})

function goBack() {
  router.push(`/h5/tasks/${taskId}/answer`)
}

function buildSubmitAnswers() {
  return questions.value.map((q) => ({
    question_id: Number(q.id),
    question_no: q.question_no,
    value: valueByQid.value[String(q.id)] ?? 0,
  }))
}

async function handleSubmit() {
  submitting.value = true
  try {
    const res = await h5SubmitTask(taskId, {
      answers: buildSubmitAnswers(),
      duration_seconds: Math.floor((Date.now() - startTs.value) / 1000),
    })
    sessionStorage.removeItem(`h5_start_${taskId}`)
    const next = res?.next_task
    if (next?.task_id) {
      sessionStorage.setItem('xq_h5_next_task', JSON.stringify(next))
    } else {
      sessionStorage.removeItem('xq_h5_next_task')
    }
    Message.success('提交成功')
    router.push(`/h5/tasks/${taskId}/done`)
  } catch (e) {
    const msg = e?.message || ''
    if (msg.includes('已提交') || msg.includes('重复')) {
      Message.warning('该测评已提交')
      router.push('/h5/tasks')
    }
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    const d = await h5GetQuestions(taskId)
    scaleName.value = d.scale_name || '测评'
    questions.value = d.questions || []
    const map = {}
    for (const s of d.saved_answers || []) {
      map[String(s.question_id)] = s.value
    }
    for (const q of questions.value) {
      if (map[String(q.id)] == null && q.question_no != null) {
        const hit = d.saved_answers?.find((x) => x.question_no === q.question_no)
        if (hit) map[String(q.id)] = hit.value
      }
    }
    valueByQid.value = map
    const t = sessionStorage.getItem(`h5_start_${taskId}`)
    if (t) startTs.value = parseInt(t, 10) || Date.now()
  } catch {
    Message.error('加载失败')
    router.push('/h5/tasks')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.confirm-page { max-width: 428px; margin: 0 auto; min-height: 100vh; background: var(--h5-bg); }
.top-nav { padding: 16px; text-align: center; border-bottom: 1px solid var(--h5-border); background: #fbf9f4; }
.nav-title { font-size: 18px; font-weight: 600; margin: 0; }
.loading-wrap { display: flex; justify-content: center; padding: 80px 0; }
.confirm-content { padding: 24px 20px; }
.warning-alert { margin-bottom: 20px; }
.success-info { text-align: center; padding: 24px 0; margin-bottom: 20px; }
.success-icon { font-size: 48px; color: #00b42a; margin-bottom: 12px; }
.success-info p { font-size: 16px; margin: 0; }
.summary-card {
  border-radius: var(--h5-radius-card);
  border: 1px solid var(--h5-border);
  box-shadow: var(--h5-shadow);
  margin-bottom: 20px;
}
.summary-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--h5-border); }
.summary-row:last-child { border-bottom: none; }
.summary-row .label { color: var(--h5-subtext); }
.summary-row .value { font-weight: 500; }
.submit-note { font-size: 14px; color: var(--h5-subtext); margin: 0 0 24px; }
.button-group { display: flex; flex-direction: column; gap: 12px; }
.submit-btn, .back-btn { height: 48px !important; font-size: 16px; border-radius: var(--h5-radius-pill) !important; }
</style>
