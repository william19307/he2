<template>
  <div class="page-wrap">
    <a-page-header :title="session?.title || '培训详情'" @back="$router.push('/training')">
      <template v-if="isAdmin && session" #extra>
        <a-button
          v-if="session.status === 'draft'"
          type="primary"
          status="warning"
          @click="openPublish"
        >发布通知</a-button>
        <a-button
          v-if="session.status === 'published'"
          type="primary"
          @click="onComplete"
        >标记完成</a-button>
        <a-button v-if="session.status === 'draft'" @click="openEdit">编辑</a-button>
      </template>
    </a-page-header>
    <a-spin v-if="loading" />
    <template v-else-if="session">
      <a-card title="基本信息" size="small" class="mb">
        <p>日期：{{ session.training_date }} · 地点：{{ session.location || '—' }}</p>
        <p>状态：{{ session.status }} · 组织者：{{ session.organizer_name }}</p>
        <p v-if="session.description">{{ session.description }}</p>
        <p v-if="session.status === 'draft'">
          通知范围：{{ session.target_scope === 'selected' ? '指定学校与老师' : '本校全部老师' }}
        </p>
      </a-card>
      <a-card title="参与人员" size="small">
        <div v-if="isAdmin && session.status !== 'completed'" class="toolbar">
          <a-button type="primary" :disabled="!selectedIds.length" @click="batchMark('attended')">
            批量标记出席
          </a-button>
          <a-button :disabled="!selectedIds.length" @click="batchMark('absent')">批量标记缺席</a-button>
        </div>
        <a-table
          :data="participants"
          row-key="counselor_id"
          size="small"
          :pagination="false"
        >
          <template #columns>
            <a-table-column v-if="isAdmin && session.status !== 'completed'" title="" :width="48">
              <template #cell="{ record }">
                <a-checkbox
                  :model-value="selectedIds.includes(record.counselor_id)"
                  @change="(v) => toggleSel(record.counselor_id, v)"
                />
              </template>
            </a-table-column>
            <a-table-column title="姓名" data-index="name" />
            <a-table-column title="学校" data-index="school_name" />
            <a-table-column title="状态" data-index="status_label" :width="100" />
            <a-table-column title="参与时间" data-index="attended_at" :width="170" />
          </template>
        </a-table>
      </a-card>
    </template>

    <a-modal v-model:visible="editVisible" title="编辑培训（仅草稿）" width="640px" @before-ok="submitEdit">
      <a-form :model="editForm" layout="vertical">
        <a-form-item label="标题"><a-input v-model="editForm.title" /></a-form-item>
        <a-form-item label="日期"><a-date-picker v-model="editForm.training_date" style="width:100%" value-format="YYYY-MM-DD" /></a-form-item>
        <a-form-item label="地点"><a-input v-model="editForm.location" /></a-form-item>
        <a-form-item label="说明"><a-textarea v-model="editForm.description" /></a-form-item>
        <TrainingAudiencePickers
          v-model:scope="editAudienceScope"
          v-model:tenant-ids="editAudienceTenantIds"
          v-model:counselor-ids="editAudienceCounselorIds"
        />
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="publishVisible"
      title="发布培训通知"
      width="640px"
      :ok-loading="publishSubmitting"
      @before-ok="submitPublish"
    >
      <a-alert type="warning" style="margin-bottom: 12px">
        发布后将向选定范围的老师发送站内通知，且不可撤回。
      </a-alert>
      <TrainingAudiencePickers
        v-model:scope="publishScope"
        v-model:tenant-ids="publishTenantIds"
        v-model:counselor-ids="publishCounselorIds"
      />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { useAuthStore } from '@/stores/auth'
import {
  getTrainingSessionDetail,
  publishTrainingSession,
  completeTrainingSession,
  updateTrainingParticipants,
  updateTrainingSession,
} from '@/api/training'
import TrainingAudiencePickers from './TrainingAudiencePickers.vue'

const route = useRoute()
const auth = useAuthStore()
const isAdmin = computed(() => ['admin', 'super_admin'].includes(auth.userRole))
const id = computed(() => route.params.id)

const loading = ref(true)
const session = ref(null)
const participants = ref([])
const selectedIds = ref([])
const editVisible = ref(false)
const editForm = reactive({
  title: '',
  training_date: '',
  location: '',
  description: '',
})
const editAudienceScope = ref('all')
const editAudienceTenantIds = ref([])
const editAudienceCounselorIds = ref([])

const publishVisible = ref(false)
const publishSubmitting = ref(false)
const publishScope = ref('all')
const publishTenantIds = ref([])
const publishCounselorIds = ref([])

function toggleSel(cid, checked) {
  const set = new Set(selectedIds.value)
  if (checked) set.add(cid)
  else set.delete(cid)
  selectedIds.value = [...set]
}

function syncEditFromSession(s) {
  if (!s) return
  Object.assign(editForm, {
    title: s.title,
    training_date: s.training_date,
    location: s.location || '',
    description: s.description || '',
  })
  editAudienceScope.value = s.target_scope === 'selected' ? 'selected' : 'all'
  editAudienceCounselorIds.value = [...(s.draft_target_counselor_ids || [])]
  editAudienceTenantIds.value = []
}

watch(
  () => session.value,
  (s) => {
    syncEditFromSession(s)
  }
)

function openEdit() {
  syncEditFromSession(session.value)
  if (
    editAudienceScope.value === 'selected' &&
    auth.userInfo?.tenantId &&
    auth.userRole !== 'super_admin'
  ) {
    editAudienceTenantIds.value = [Number(auth.userInfo.tenantId)]
  }
  editVisible.value = true
}

function openPublish() {
  const s = session.value
  if (!s) return
  publishScope.value = s.target_scope === 'selected' ? 'selected' : 'all'
  publishCounselorIds.value = [...(s.draft_target_counselor_ids || [])]
  publishTenantIds.value =
    publishScope.value === 'selected' &&
    auth.userInfo?.tenantId &&
    auth.userRole !== 'super_admin'
      ? [Number(auth.userInfo.tenantId)]
      : []
  publishVisible.value = true
}

async function load() {
  loading.value = true
  try {
    const res = await getTrainingSessionDetail(id.value)
    session.value = res.data?.session || null
    participants.value = res.data?.participants || []
    selectedIds.value = []
  } catch {
    session.value = null
    Message.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function submitPublish() {
  if (publishScope.value === 'selected' && !publishCounselorIds.value.length) {
    Message.warning('定向发布请至少选择一位老师')
    return false
  }
  publishSubmitting.value = true
  try {
    await publishTrainingSession(id.value, {
      target_scope: publishScope.value,
      target_counselors:
        publishScope.value === 'selected' ? publishCounselorIds.value : undefined,
    })
    Message.success('已发布')
    load()
    return true
  } catch {
    return false
  } finally {
    publishSubmitting.value = false
  }
}

async function onComplete() {
  await completeTrainingSession(id.value)
  Message.success('已标记完成')
  load()
}

async function batchMark(status) {
  if (!selectedIds.value.length) return
  const parts = selectedIds.value.map((cid) => ({
    counselor_id: cid,
    status,
    attended_at: status === 'attended' ? new Date().toISOString() : undefined,
  }))
  await updateTrainingParticipants(id.value, { participants: parts })
  Message.success('已更新')
  load()
}

async function submitEdit() {
  try {
    if (editAudienceScope.value === 'selected') {
      if (!editAudienceCounselorIds.value.length) {
        Message.warning('定向通知请至少选择一位老师')
        return false
      }
    }
    await updateTrainingSession(id.value, {
      ...editForm,
      target_scope: editAudienceScope.value,
      target_counselor_ids:
        editAudienceScope.value === 'selected' ? editAudienceCounselorIds.value : [],
    })
    Message.success('已保存')
    editVisible.value = false
    load()
    return true
  } catch {
    return false
  }
}

onMounted(load)
</script>

<style scoped>
.mb { margin-bottom: 16px; }
.toolbar { margin-bottom: 12px; display: flex; gap: 8px; }
</style>
