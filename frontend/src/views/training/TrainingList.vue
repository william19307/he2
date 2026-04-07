<template>
  <div class="page-wrap">
    <a-page-header title="培训管理" @back="$router.push('/dashboard')">
      <template #extra>
        <a-button type="primary" @click="openCreate">新建培训</a-button>
      </template>
    </a-page-header>
    <a-modal v-model:visible="createVisible" title="新建培训" @before-ok="submitCreate">
      <a-form :model="createForm" layout="vertical">
        <a-form-item label="标题" required><a-input v-model="createForm.title" /></a-form-item>
        <a-form-item label="培训日期" required><a-date-picker v-model="createForm.training_date" style="width:100%" value-format="YYYY-MM-DD" /></a-form-item>
        <a-form-item label="地点"><a-input v-model="createForm.location" /></a-form-item>
        <a-form-item label="说明"><a-textarea v-model="createForm.description" /></a-form-item>
      </a-form>
    </a-modal>
    <a-radio-group v-model="tab" type="button" class="tabs" @change="onTabChange">
      <a-radio value="all">全部</a-radio>
      <a-radio value="ongoing">进行中</a-radio>
      <a-radio value="done">已完成</a-radio>
    </a-radio-group>
    <a-table
      :data="list"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      size="small"
      @page-change="onPage"
    >
      <template #columns>
        <a-table-column title="标题" data-index="title" ellipsis />
        <a-table-column title="日期" data-index="training_date" :width="110" />
        <a-table-column title="地点" data-index="location" :width="120" ellipsis />
        <a-table-column title="人数" :width="72">
          <template #cell="{ record }">{{ record.participant_count }}</template>
        </a-table-column>
        <a-table-column title="出席率" :width="80">
          <template #cell="{ record }">{{ record.attendance_rate }}%</template>
        </a-table-column>
        <a-table-column title="状态" :width="90" data-index="status" />
        <a-table-column title="操作" :width="100">
          <template #cell="{ record }">
            <a-link @click="$router.push(`/training/${record.id}`)">详情</a-link>
          </template>
        </a-table-column>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import { getTrainingSessions, createTrainingSession } from '@/api/training'

const router = useRouter()
const createVisible = ref(false)
const createForm = reactive({
  title: '',
  training_date: '',
  location: '',
  description: '',
})

function openCreate() {
  Object.assign(createForm, { title: '', training_date: '', location: '', description: '' })
  createVisible.value = true
}

async function submitCreate() {
  if (!createForm.title || !createForm.training_date) {
    Message.warning('请填写标题与日期')
    return false
  }
  try {
    const res = await createTrainingSession({ ...createForm })
    const id = res.data?.id
    createVisible.value = false
    if (id) router.push(`/training/${id}`)
    else load()
    return true
  } catch {
    return false
  }
}

const tab = ref('all')
const list = ref([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const pageSize = ref(20)

const pagination = computed(() => ({
  total: total.value,
  current: page.value,
  pageSize: pageSize.value,
}))

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize.value }
    if (tab.value !== 'all') params.tab = tab.value
    const res = await getTrainingSessions(params)
    const d = res.data || {}
    list.value = d.list || []
    total.value = d.pagination?.total ?? 0
  } catch {
    list.value = []
    Message.error('加载失败')
  } finally {
    loading.value = false
  }
}

function onPage(p) {
  page.value = p
  load()
}

function onTabChange() {
  page.value = 1
  load()
}

onMounted(load)
</script>

<style scoped>
.tabs { margin-bottom: 16px; }
</style>
