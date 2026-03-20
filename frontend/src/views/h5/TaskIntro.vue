<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { h5GetQuestions, h5StartTask } from '@/api/h5'

const route = useRoute()
const router = useRouter()
const meta = ref({ scale_name: '', instruction: '', question_count: 0, estimated_mins: null })
const loading = ref(false)

async function handleStart() {
  loading.value = true
  try {
    await h5StartTask(route.params.id)
    router.push(`/h5/tasks/${route.params.id}/answer`)
  } catch { /* 已提示 */ }
  finally { loading.value = false }
}

onMounted(async () => {
  try {
    const d = await h5GetQuestions(route.params.id)
    meta.value = {
      scale_name: d.scale_name,
      instruction: d.instruction,
      question_count: d.question_count,
      estimated_mins: d.estimated_mins,
    }
  } catch { /* ignore */ }
})
</script>

<template>
  <div class="h5-page">
    <div class="intro-card">
      <h2>{{ meta.scale_name || '量表' }}</h2>
      <p class="intro-desc">{{ meta.instruction || '请根据最近两周的真实感受作答。' }}</p>
      <div class="intro-meta">
        <div class="meta-item">
          <span class="meta-label">题目数量</span>
          <span class="meta-value">{{ meta.question_count }}题</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">预计时间</span>
          <span class="meta-value">约{{ meta.estimated_mins || '?' }}分钟</span>
        </div>
      </div>
      <div class="intro-tips">
        <h3>作答须知</h3>
        <ul>
          <li>请根据你最近两周的真实感受作答</li>
          <li>没有对错之分，请如实选择</li>
          <li>结果仅心理老师可见，请放心填写</li>
        </ul>
      </div>
      <a-button type="primary" long size="large" @click="handleStart" :loading="loading">
        开始作答
      </a-button>
    </div>
  </div>
</template>

<style scoped>
.h5-page { max-width: 420px; margin: 0 auto; padding: 24px 20px; min-height: 100vh; background: var(--h5-bg); }
.intro-card {
  background: var(--h5-surface);
  border: 1px solid var(--h5-border);
  border-radius: var(--h5-radius-card);
  box-shadow: var(--h5-shadow);
  padding: 18px;
}
.intro-card h2 { font-size: 22px; font-weight: 700; margin: 0 0 12px; color: var(--h5-text); }
.intro-desc { font-size: 14px; color: var(--h5-subtext); line-height: 1.7; margin-bottom: 20px; }
.intro-meta { display: flex; gap: 24px; margin-bottom: 24px; }
.meta-item { display: flex; flex-direction: column; gap: 4px; }
.meta-label { font-size: 12px; color: var(--h5-subtext); }
.meta-value { font-size: 16px; font-weight: 700; color: var(--h5-text); }
.intro-tips { margin-bottom: 32px; }
.intro-tips h3 { font-size: 15px; font-weight: 600; margin: 0 0 8px; }
.intro-tips ul { padding-left: 20px; margin: 0; }
.intro-tips li { font-size: 13px; color: var(--h5-subtext); line-height: 1.8; }
:deep(.arco-btn-primary) { border-radius: var(--h5-radius-pill) !important; }
</style>
