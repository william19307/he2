<template>
  <div class="student-picker">
    <a-select
      :model-value="modelValue"
      :placeholder="placeholder"
      allow-search
      allow-clear
      :disabled="disabled"
      :filter-option="false"
      :loading="searching"
      @update:model-value="onIdChange"
      @search="onSearch"
      @clear="onClear"
    >
      <a-option
        v-for="s in options"
        :key="String(s.student_id)"
        :value="s.student_id"
      >
        {{ s.name }} · {{ s.grade_name }}{{ s.class_name }}
        <span v-if="s.student_no" class="stu-no">{{ s.student_no }}</span>
      </a-option>
    </a-select>
    <div v-if="extraLine" class="extra">{{ extraLine }}</div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import request from '@/utils/request'

const props = defineProps({
  modelValue: { type: [Number, String, undefined], default: undefined },
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: '输入姓名或学号搜索' },
  /** 仅展示用：已有学生时显示一行摘要 */
  summary: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'select'])

const options = ref([])
const searching = ref(false)
let timer = null

const extraLine = computed(() => props.summary || '')

watch(
  () => props.modelValue,
  async (id) => {
    if (id == null || id === '') {
      if (!options.value.length) return
      return
    }
    const hit = options.value.find((x) => String(x.student_id) === String(id))
    if (hit) return
    try {
      const res = await request.get(`/students/${id}`)
      const d = res.data || {}
      options.value = [
        {
          student_id: d.id,
          name: d.real_name,
          student_no: d.student_no,
          class_name: d.class_name || '',
          grade_name: d.grade_name || '',
        },
      ]
    } catch {
      /* 忽略 */
    }
  },
  { immediate: true }
)

function onIdChange(v) {
  emit('update:modelValue', v)
  const hit = options.value.find((x) => String(x.student_id) === String(v))
  if (hit) emit('select', hit)
}

function onClear() {
  emit('update:modelValue', undefined)
  emit('select', null)
  options.value = []
}

function onSearch(kw) {
  if (timer) clearTimeout(timer)
  const q = String(kw || '').trim()
  if (!q) {
    options.value = []
    return
  }
  timer = setTimeout(async () => {
    searching.value = true
    try {
      const res = await request.get('/students', { params: { keyword: q, page_size: 30 } })
      const raw = res.data
      const list = Array.isArray(raw) ? raw : (raw?.list || [])
      options.value = list.map((s) => ({
        student_id: s.student_id ?? s.id,
        name: s.name ?? s.student_name ?? '',
        student_no: s.student_no ?? '',
        class_name: s.class_name ?? '',
        grade_name: s.grade_name ?? '',
      }))
    } catch {
      options.value = []
    } finally {
      searching.value = false
    }
  }, 280)
}
</script>

<style scoped>
.student-picker { width: 100%; }
.stu-no { margin-left: 6px; color: var(--color-text-3); font-size: 12px; }
.extra {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-2);
  line-height: 1.5;
}
</style>
