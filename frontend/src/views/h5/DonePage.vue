<template>
  <div class="h5-page done-page">
    <div class="done-content">
      <icon-check-circle class="done-icon-svg" />
      <h2>{{ encourageTitle }}</h2>
      <p class="done-message">{{ encourageSub }}</p>
      <p class="done-sub">
        您的测评结果将由学校心理老师查看分析。如您近期情绪有困扰，欢迎主动找心理老师聊聊。
      </p>

      <a-card v-if="nextTask" class="next-card" :bordered="false">
        <p class="next-hint">还有一份待完成：{{ nextTask.scale_name }}（约 {{ nextTask.question_count }} 题）</p>
        <a-button type="primary" long @click="goNext">继续作答</a-button>
      </a-card>

      <a-space direction="vertical" fill class="actions">
        <a-button long @click="$router.push('/h5/tasks')">返回任务列表</a-button>
      </a-space>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IconCheckCircle } from '@arco-design/web-vue/es/icon'

const router = useRouter()
const nextTask = ref(null)

const titles = [
  '很好，你完成了这次测评 🌿',
  '感谢你的配合！你的心情很重要',
  '完成啦！学校的老师在关心你',
]
const subs = [
  '每一次认真作答，都是在更好地认识自己。',
  '你做得很好，请继续照顾好自己。',
]

const encourageTitle = ref(titles[Math.floor(Math.random() * titles.length)])
const encourageSub = ref(subs[Math.floor(Math.random() * subs.length)])

function goNext() {
  if (!nextTask.value?.task_id) return
  router.push(`/h5/tasks/${nextTask.value.task_id}/intro`)
}

onMounted(() => {
  try {
    const raw = sessionStorage.getItem('xq_h5_next_task')
    if (raw) nextTask.value = JSON.parse(raw)
  } catch {
    nextTask.value = null
  }
})
</script>

<style scoped>
.h5-page { max-width: 420px; margin: 0 auto; padding: 24px 20px; min-height: 100vh; background: var(--h5-bg); }
.done-content { text-align: center; padding-top: 48px; }
.done-icon-svg { font-size: 64px; color: var(--h5-primary); margin-bottom: 20px; }
.done-content h2 { font-size: 22px; font-weight: 700; color: var(--h5-text); margin: 0 0 12px; }
.done-message { font-size: 15px; color: var(--h5-subtext); margin: 0 0 8px; }
.done-sub { font-size: 13px; color: var(--h5-subtext); margin: 0 0 28px; line-height: 1.6; }
.next-card {
  margin-bottom: 24px;
  text-align: left;
  border-radius: var(--h5-radius-card);
  border: 1px solid var(--h5-border);
  box-shadow: var(--h5-shadow);
}
.next-hint { font-size: 14px; margin-bottom: 12px; color: var(--h5-text); }
.actions { margin-top: 8px; }
:deep(.arco-btn) { border-radius: var(--h5-radius-pill) !important; }
</style>
