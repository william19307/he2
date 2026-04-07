<template>
  <div class="page-wrap">
    <a-page-header title="我的培训" @back="$router.push('/dashboard')" />
    <a-table :data="list" :loading="loading" row-key="session_id" :pagination="false" size="small">
      <template #columns>
        <a-table-column title="培训名称" data-index="title" />
        <a-table-column title="日期" data-index="training_date" :width="110" />
        <a-table-column title="地点" data-index="location" :width="140" ellipsis />
        <a-table-column title="我的状态" data-index="my_status_label" :width="100" />
        <a-table-column title="操作" :width="90">
          <template #cell="{ record }">
            <a-link @click="$router.push(`/training/${record.session_id}`)">详情</a-link>
          </template>
        </a-table-column>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMyTrainings } from '@/api/training'

const list = ref([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const res = await getMyTrainings()
    list.value = res.data?.list || []
  } finally {
    loading.value = false
  }
})
</script>
