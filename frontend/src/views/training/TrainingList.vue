<template>
  <div class="page-wrap">
    <a-page-header title="培训活动" @back="$router.push('/dashboard')">
      <template v-if="isAdmin" #extra>
        <a-button type="primary" @click="$router.push('/training/create')">新建培训</a-button>
      </template>
    </a-page-header>
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
        <a-table-column v-if="isAdmin" title="人数" :width="72">
          <template #cell="{ record }">{{ record.participant_count }}</template>
        </a-table-column>
        <a-table-column v-if="isAdmin" title="出席率" :width="80">
          <template #cell="{ record }">{{ record.attendance_rate }}%</template>
        </a-table-column>
        <a-table-column v-if="!isAdmin" title="我的状态" :width="100">
          <template #cell="{ record }">{{ record.my_status_label || '—' }}</template>
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
import { ref, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import { getTrainingSessions } from '@/api/training'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const isAdmin = computed(() => ['admin', 'super_admin'].includes(auth.userRole))

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
.tabs {
  margin-bottom: 16px;
}
</style>
