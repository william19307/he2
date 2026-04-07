<template>
  <div class="page-wrap">
    <a-page-header title="发布培训" @back="$router.push('/training')" />
    <a-card title="新建培训" size="small" class="card">
      <a-form :model="form" layout="vertical" class="form">
        <a-form-item label="标题" required>
          <a-input v-model="form.title" placeholder="培训主题" />
        </a-form-item>
        <a-form-item label="培训日期" required>
          <a-date-picker
            v-model="form.training_date"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </a-form-item>
        <a-form-item label="地点">
          <a-input v-model="form.location" />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model="form.description" />
        </a-form-item>

        <TrainingAudiencePickers
          v-model:scope="audienceScope"
          v-model:tenant-ids="audienceTenantIds"
          v-model:counselor-ids="audienceCounselorIds"
        />

        <a-form-item>
          <a-space>
            <a-button type="primary" :loading="submitting" @click="submit">保存为草稿</a-button>
            <a-button @click="$router.push('/training')">取消</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { createTrainingSession } from '@/api/training'
import TrainingAudiencePickers from './TrainingAudiencePickers.vue'

const router = useRouter()
const form = reactive({
  title: '',
  training_date: '',
  location: '',
  description: '',
})
const audienceScope = ref('all')
const audienceTenantIds = ref([])
const audienceCounselorIds = ref([])
const submitting = ref(false)

async function submit() {
  if (!form.title || !form.training_date) {
    Message.warning('请填写标题与培训日期')
    return
  }
  if (audienceScope.value === 'selected') {
    if (!audienceTenantIds.value.length || !audienceCounselorIds.value.length) {
      Message.warning('定向通知时请至少选择一所学校及一位老师')
      return
    }
  }
  submitting.value = true
  try {
    const res = await createTrainingSession({
      title: form.title,
      training_date: form.training_date,
      location: form.location,
      description: form.description,
      target_scope: audienceScope.value,
      target_counselor_ids:
        audienceScope.value === 'selected' ? audienceCounselorIds.value : undefined,
    })
    const id = res.data?.id
    Message.success('已创建草稿')
    if (id) router.push(`/training/${id}`)
    else router.push('/training')
  } catch {
    /* request 已提示 */
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.card {
  max-width: 720px;
}
.form {
  margin-top: 8px;
}
</style>
