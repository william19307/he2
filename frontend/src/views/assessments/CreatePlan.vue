<template>
  <div class="page-wrap">
    <a-page-header title="创建测评计划" @back="$router.back()" />

    <a-card :bordered="false">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" @submit="handleSubmit">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="title" label="计划名称">
              <a-input v-model="form.title" placeholder="如：2025年春季心理普测" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="target_type" label="目标范围">
              <a-select v-model="form.target_type" placeholder="选择目标范围">
                <a-option value="class">按班级</a-option>
                <a-option value="grade">按年级</a-option>
                <a-option value="school">全校</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item field="description" label="计划说明">
          <a-textarea v-model="form.description" placeholder="简述本次测评目的..." :max-length="500" />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="start_time" label="开始时间">
              <a-date-picker v-model="form.start_time" show-time style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="end_time" label="截止时间">
              <a-date-picker v-model="form.end_time" show-time style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="选择量表">
          <a-input
            v-model="scaleSearchQuery"
            allow-clear
            placeholder="搜索量表名称"
            style="max-width: 360px; margin-bottom: 12px"
          />
          <a-checkbox-group v-model="form.scale_ids">
            <a-row :gutter="8">
              <a-col v-for="s in filteredAvailableScales" :key="s.id" :span="8">
                <a-checkbox :value="s.id">{{ s.shortName || s.name }} ({{ s.questionCount }}题)</a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>

        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit" :loading="submitting">保存草稿</a-button>
            <a-button @click="$router.back()">取消</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { createPlan } from '@/api/assessments'
import { getScales } from '@/api/scales'
import { scaleList as mockScales } from '@/mock/data'

const router = useRouter()
const formRef = ref()
const submitting = ref(false)
const availableScales = ref([])
const scaleSearchQuery = ref('')

const filteredAvailableScales = computed(() => {
  const k = scaleSearchQuery.value.trim().toLowerCase()
  if (!k) return availableScales.value
  return availableScales.value.filter((s) => {
    const name = String(s.name || '').toLowerCase()
    const shortName = String(s.shortName || '').toLowerCase()
    return name.includes(k) || shortName.includes(k)
  })
})

const form = reactive({
  title: '',
  description: '',
  target_type: 'class',
  target_ids: [],
  scale_ids: [],
  start_time: '',
  end_time: '',
})

const rules = {
  title: [{ required: true, message: '请输入计划名称' }],
  target_type: [{ required: true, message: '请选择目标范围' }],
  start_time: [{ required: true, message: '请选择开始时间' }],
  end_time: [{ required: true, message: '请选择截止时间' }],
}

async function loadScales() {
  try {
    // getScales → GET /api/v1/scales；仅传分页，无 category_id / level / is_system
    const res = await getScales({ page: 1, page_size: 500 })
    availableScales.value = res.data?.list || []
  } catch {
    availableScales.value = mockScales.map((s) => ({ id: s.id, name: s.name, shortName: s.abbr, questionCount: s.questions }))
  }
}

async function handleSubmit({ errors }) {
  if (errors) return
  if (!form.scale_ids.length) return Message.warning('请至少选择一个量表')
  submitting.value = true
  try {
    await createPlan(form)
    Message.success('计划创建成功')
    router.push('/plans')
  } catch { /* interceptor */ }
  finally { submitting.value = false }
}

onMounted(loadScales)
</script>

<style scoped>
/* page-wrap provided by global.css */
</style>
