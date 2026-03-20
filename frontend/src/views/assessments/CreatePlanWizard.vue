<template>
  <div class="page-wrap create-wizard">
    <a-page-header title="新建测评计划（向导）" @back="$router.push('/plans')" />
    <a-steps :current="step" class="steps">
      <a-step title="基本信息" />
      <a-step title="选择量表" />
      <a-step title="测评对象" />
      <a-step title="提醒设置" />
      <a-step title="确认保存" />
    </a-steps>

    <a-card v-show="step === 0" :bordered="false">
      <a-form layout="vertical">
        <a-form-item label="计划名称" required>
          <a-input v-model="form.title" placeholder="如：2026春季心理普测" />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model="form.description" :max-length="500" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="开始时间" required>
              <a-date-picker v-model="form.start_time" show-time style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="截止时间" required>
              <a-date-picker v-model="form.end_time" show-time style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <a-card v-show="step === 1" :bordered="false" title="选择量表">
      <a-input
        v-model="scaleSearchQuery"
        allow-clear
        placeholder="搜索量表名称"
        class="scale-search"
      />
      <a-spin :loading="scalesLoading">
        <template v-if="!scalesLoading">
          <a-empty v-if="scales.length === 0" description="暂无量表数据" />
          <template v-else>
            <a-empty v-if="filteredScales.length === 0" description="无匹配量表" />
            <a-checkbox-group v-else v-model="form.scale_ids" direction="vertical">
              <a-checkbox v-for="s in filteredScales" :key="s.id" :value="Number(s.id)">
                {{ s.shortName || s.name }}（{{ s.questionCount }}题）
              </a-checkbox>
            </a-checkbox-group>
          </template>
        </template>
      </a-spin>
    </a-card>

    <a-card v-show="step === 2" :bordered="false" title="选择班级（可多选）">
      <a-spin :loading="gradesLoading">
        <div v-for="g in gradeTree" :key="g.id" class="grade-block">
          <div class="grade-name">{{ g.name }}</div>
          <a-checkbox-group v-model="form.target_ids">
            <a-checkbox v-for="c in g.classes || []" :key="c.id" :value="Number(c.id)">
              {{ c.name }}（{{ c.student_count ?? 0 }}人）
            </a-checkbox>
          </a-checkbox-group>
        </div>
      </a-spin>
      <a-alert v-if="estimateText" type="info" style="margin-top: 16px">
        {{ estimateText }}
      </a-alert>
    </a-card>

    <a-card v-show="step === 3" :bordered="false">
      <a-form layout="vertical">
        <a-form-item label="截止前提醒（天）">
          <a-input-number v-model="form.remind_before" :min="0" :max="30" />
        </a-form-item>
        <a-form-item label="自动预警">
          <a-switch v-model="form.auto_alert" />
        </a-form-item>
      </a-form>
    </a-card>

    <a-card v-show="step === 4" :bordered="false" title="确认">
      <a-descriptions :column="1" bordered size="small">
        <a-descriptions-item label="名称">{{ form.title }}</a-descriptions-item>
        <a-descriptions-item label="量表数">{{ form.scale_ids.length }}</a-descriptions-item>
        <a-descriptions-item label="目标班级数">{{ form.target_ids.length }}</a-descriptions-item>
        <a-descriptions-item label="预估人数">{{ estimateCount || '—' }}</a-descriptions-item>
      </a-descriptions>
      <a-space style="margin-top: 20px">
        <a-button :loading="saving" @click="saveDraft">保存草稿</a-button>
        <a-button type="primary" :loading="saving" @click="saveAndPublish">保存并发布</a-button>
      </a-space>
    </a-card>

    <div class="nav-btns">
      <a-button v-if="step > 0" @click="step--">上一步</a-button>
      <a-button v-if="step < 4" type="primary" @click="nextStep">下一步</a-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import request from '@/utils/request'
import { createPlan, publishPlan, estimatePlan } from '@/api/assessments'

const router = useRouter()
const step = ref(0)
const scales = ref([])
const scaleSearchQuery = ref('')
const scalesLoading = ref(false)

/** 本地搜索（不请求接口）；名称 / 简称 模糊匹配 */
const filteredScales = computed(() => {
  const k = scaleSearchQuery.value.trim().toLowerCase()
  if (!k) return scales.value
  return scales.value.filter((s) => {
    const name = String(s.name || '').toLowerCase()
    const shortName = String(s.shortName || '').toLowerCase()
    return name.includes(k) || shortName.includes(k)
  })
})
const gradeTree = ref([])
const gradesLoading = ref(false)
const estimateText = ref('')
const estimateCount = ref(0)
const saving = ref(false)
const planId = ref(null)

let estimateTimer = null

const form = reactive({
  title: '',
  description: '',
  start_time: '',
  end_time: '',
  scale_ids: [],
  target_type: 'class',
  target_ids: [],
  remind_before: 1,
  auto_alert: true,
})

function toISO(d) {
  if (!d) return ''
  const x = d instanceof Date ? d : new Date(d)
  return Number.isNaN(x.getTime()) ? '' : x.toISOString()
}

async function loadScales() {
  scalesLoading.value = true
  try {
    const res = await request.get('/scales', { params: { page_size: 500 } })
    scales.value = res.data?.list || []
  } finally {
    scalesLoading.value = false
  }
}

async function loadGrades() {
  gradesLoading.value = true
  try {
    const res = await request.get('/grades', { params: { include_classes: 1 } })
    gradeTree.value = res.data?.list || res.data || []
  } finally {
    gradesLoading.value = false
  }
}

async function runEstimate() {
  if (form.target_type !== 'class' || !form.target_ids.length) {
    estimateText.value = ''
    estimateCount.value = 0
    return
  }
  try {
    const res = await estimatePlan({
      target_type: 'class',
      target_ids: form.target_ids,
      scale_ids: form.scale_ids,
    })
    const d = res.data || {}
    estimateCount.value = d.estimated_count ?? 0
    estimateText.value = `预估覆盖学生约 ${estimateCount.value} 人；发布后将生成约 ${d.estimated_count * Math.max(1, form.scale_ids.length) || d.estimated_tasks || 0} 条任务`
  } catch {
    estimateText.value = ''
  }
}

watch(
  () => [...form.target_ids, ...form.scale_ids],
  () => {
    clearTimeout(estimateTimer)
    estimateTimer = setTimeout(runEstimate, 500)
  }
)

function nextStep() {
  if (step.value === 0 && (!form.title || !form.start_time || !form.end_time)) {
    Message.warning('请填写名称与时间')
    return
  }
  if (step.value === 1 && !form.scale_ids.length) {
    Message.warning('请至少选一个量表')
    return
  }
  if (step.value === 2 && !form.target_ids.length) {
    Message.warning('请选择班级')
    return
  }
  step.value++
}

async function buildPayload(statusDraft) {
  return {
    title: form.title,
    description: form.description,
    start_time: toISO(form.start_time),
    end_time: toISO(form.end_time),
    scale_ids: form.scale_ids,
    target_type: 'class',
    target_ids: form.target_ids,
    remind_before: form.remind_before,
    auto_alert: form.auto_alert ? 1 : 0,
    status: statusDraft ? 'draft' : 'draft',
  }
}

async function saveDraft() {
  saving.value = true
  try {
    const payload = await buildPayload(true)
    const res = await createPlan(payload)
    planId.value = res.data?.id ?? planId.value
    Message.success('草稿已保存')
    router.push('/plans')
  } finally {
    saving.value = false
  }
}

async function saveAndPublish() {
  saving.value = true
  try {
    const payload = await buildPayload(true)
    const res = await createPlan(payload)
    const id = res.data?.id
    if (!id) throw new Error('no id')
    await publishPlan(id)
    Message.success('已发布')
    router.push(`/plans/${id}`)
  } catch (e) {
    Message.error(e?.message || '发布失败：请确认草稿中已选量表与班级')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadScales()
  loadGrades()
})
</script>

<style scoped>
.create-wizard {
  max-width: 900px;
}
.steps {
  margin: 24px 0;
}
.scale-search {
  max-width: 360px;
  margin-bottom: 16px;
}
.grade-block {
  margin-bottom: 16px;
}
.grade-name {
  font-weight: 600;
  margin-bottom: 8px;
}
.nav-btns {
  margin-top: 24px;
  display: flex;
  gap: 12px;
}
</style>
