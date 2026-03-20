<template>
  <div class="h5-page">
    <div class="h5-header">
      <h2>首页</h2>
      <p>{{ studentName }}同学，你好 · 我的测评</p>
    </div>

    <a-tabs v-model:active-key="tab" type="capsule" class="task-tabs">
      <a-tab-pane key="pending" title="待完成" />
      <a-tab-pane key="completed" title="已完成" />
    </a-tabs>

    <div v-if="pendingCount > 0 && tab === 'pending'" class="banner-tip">
      您有 {{ pendingCount }} 项测评待完成，请尽快作答
    </div>

    <div class="task-list">
      <div v-if="displayTasks.length === 0" class="empty-state">
        <a-empty :description="tab === 'pending' ? '暂无待完成测评，您很棒！' : '暂无已完成测评'" />
      </div>
      <div
        v-for="task in displayTasks"
        :key="taskKey(task)"
        class="task-card"
        @click="handleTaskClick(task)"
      >
        <div class="task-title">{{ taskTitle(task) }}</div>
        <div class="task-meta">
          <span>{{ task.question_count || task.scale?.questionCount }} 题</span>
          <span>约 {{ task.estimated_mins || task.scale?.estimatedMins || '?' }} 分钟</span>
        </div>
        <div v-if="task.end_time || task.plan?.endTime" class="task-deadline" :class="{ urgent: task.is_urgent }">
          截止 {{ formatEnd(task.end_time || task.plan?.endTime) }}
        </div>
        <a-tag v-if="isCompleted(task)" color="green" size="small">已完成</a-tag>
        <a-tag v-else color="orange" size="small">待完成</a-tag>
      </div>
    </div>

    <H5BottomNav active="home" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { h5GetTasks } from '@/api/h5'
import H5BottomNav from '@/components/h5/H5BottomNav.vue'

const router = useRouter()
const tab = ref('pending')
const pending = ref([])
const completed = ref([])
const studentName = ref('同学')

function loadStudentName() {
  try {
    const s = JSON.parse(sessionStorage.getItem('xq_h5_student') || '{}')
    studentName.value = s.name || '同学'
  } catch {
    studentName.value = '同学'
  }
}

const pendingCount = computed(() => pending.value.length)

const displayTasks = computed(() => (tab.value === 'completed' ? completed.value : pending.value))

function taskKey(task) {
  return task.task_id || task.id || task.scale_name
}

function taskTitle(task) {
  return task.scale_name || task.scale?.name || task.plan_title || task.plan?.title || '测评任务'
}

function isCompleted(task) {
  return task.status === 'completed' || completed.value.includes(task)
}

function formatEnd(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function handleTaskClick(task) {
  if (isCompleted(task)) return
  const id = task.task_id || task.id
  if (!id) return
  router.push(`/h5/tasks/${id}/intro`)
}

async function loadTasks() {
  loadStudentName()
  try {
    const data = await h5GetTasks()
    pending.value = data.pending || []
    completed.value = data.completed || []
  } catch {
    pending.value = []
    completed.value = []
  }
}

onMounted(loadTasks)
</script>

<style scoped>
.h5-page { max-width: 420px; margin: 0 auto; padding: 20px 20px 92px; min-height: 100vh; background: var(--h5-bg); }
.h5-header { padding: 16px 0; }
.h5-header h2 { font-size: 22px; font-weight: 700; margin: 0 0 4px; color: var(--h5-text); }
.h5-header p { font-size: 13px; color: var(--h5-subtext); margin: 0; }
.task-tabs { margin-bottom: 12px; }
.banner-tip {
  font-size: 13px; color: var(--h5-primary); background: rgba(61, 139, 122, 0.12); padding: 10px 14px; border-radius: 14px; margin-bottom: 12px;
}
.task-list { display: flex; flex-direction: column; gap: 12px; }
.task-card {
  background: var(--h5-surface); border-radius: var(--h5-radius-card); padding: 16px; cursor: pointer;
  border: 1px solid var(--h5-border); box-shadow: var(--h5-shadow); transition: all 0.2s;
}
.task-card:hover { transform: translateY(-1px); }
.task-title { font-size: 15px; font-weight: 700; color: var(--h5-text); margin-bottom: 8px; }
.task-meta { font-size: 13px; color: var(--h5-subtext); display: flex; gap: 12px; margin-bottom: 4px; }
.task-deadline { font-size: 12px; color: var(--h5-subtext); margin-top: 4px; }
.task-deadline.urgent { color: #C0392B; font-weight: 500; }
.empty-state { padding: 40px 0; }
</style>
