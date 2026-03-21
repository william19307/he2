<template>
  <a-modal
    :visible="visible"
    title="添加跟进记录"
    width="560px"
    :ok-loading="submitting"
    @update:visible="(v) => $emit('update:visible', v)"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form layout="vertical">
      <a-form-item label="实际时长（分钟）">
        <a-input-number v-model="form.duration_mins" :min="5" :max="180" style="width:100%">
          <template #suffix>分钟</template>
        </a-input-number>
      </a-form-item>
      <a-form-item label="会谈 / 跟进内容" required>
        <a-textarea
          v-model="form.content"
          placeholder="必填"
          :auto-size="{ minRows: 6, maxRows: 12 }"
          :max-length="4000"
          show-word-limit
        />
      </a-form-item>
      <a-form-item label="学生情绪（1-5）">
        <a-rate v-model="form.student_mood" :count="5" allow-half />
      </a-form-item>
      <a-form-item label="干预进展">
        <a-radio-group v-model="form.intervention_progress" type="button">
          <a-radio value="much_better">明显改善</a-radio>
          <a-radio value="better">有所改善</a-radio>
          <a-radio value="stable">维持</a-radio>
          <a-radio value="worse">有所退步</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="下次计划">
        <a-space direction="vertical" fill style="width:100%">
          <a-date-picker v-model="form.next_plan_date" style="width:100%" />
          <a-input v-model="form.next_plan_note" placeholder="说明" />
        </a-space>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { postCaseRecord } from '@/api/cases'

const props = defineProps({
  visible: { type: Boolean, default: false },
  caseId: { type: [String, Number], default: null },
})

const emit = defineEmits(['update:visible', 'success'])

const form = reactive({
  duration_mins: 50,
  content: '',
  student_mood: 3,
  intervention_progress: 'stable',
  next_plan_date: undefined,
  next_plan_note: '',
})

const submitting = ref(false)

watch(
  () => props.visible,
  (v) => {
    if (v) {
      form.duration_mins = 50
      form.content = ''
      form.student_mood = 3
      form.intervention_progress = 'stable'
      form.next_plan_date = undefined
      form.next_plan_note = ''
    }
  }
)

function handleCancel() {
  emit('update:visible', false)
}

async function handleOk() {
  if (!form.content?.trim()) {
    Message.warning('请填写跟进内容')
    return false
  }
  if (!props.caseId) return false
  submitting.value = true
  try {
    const np = [
      form.next_plan_date
        ? new Date(form.next_plan_date).toISOString().slice(0, 10)
        : '',
      form.next_plan_note,
    ]
      .filter(Boolean)
      .join(' ')
    await postCaseRecord(props.caseId, {
      duration_mins: form.duration_mins,
      content: form.content.trim(),
      student_mood: Math.round(form.student_mood * 2) / 2 || 3,
      intervention_progress: form.intervention_progress,
      next_plan: np || undefined,
    })
    Message.success('跟进记录已保存')
    emit('update:visible', false)
    emit('success')
    return true
  } catch {
    return false
  } finally {
    submitting.value = false
  }
}
</script>
