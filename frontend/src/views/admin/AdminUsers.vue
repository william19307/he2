<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">用户列表</h2>
      <a-button type="primary" @click="$router.push('/admin/students/import')">批量导入学生</a-button>
    </div>
    <a-table
      :data="users"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @page-change="(p) => { page = p; load() }"
    >
      <template #columns>
        <a-table-column title="ID" data-index="id" :width="70" />
        <a-table-column title="用户名" data-index="username" :width="140" />
        <a-table-column title="姓名" data-index="real_name" :width="100" />
        <a-table-column title="角色" :width="100">
          <template #cell="{ record }">
            <a-tag size="small">{{ record.role_label || record.role }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="手机" data-index="phone" :width="120" />
        <a-table-column title="状态" data-index="status_label" :width="80" />
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getAdminUsers } from '@/api/admin'

const loading = ref(false)
const users = ref([])
const page = ref(1)
const total = ref(0)
const pagination = reactive({ pageSize: 20, showTotal: true })

async function load() {
  loading.value = true
  try {
    const res = await getAdminUsers({ page: page.value, page_size: 20 })
    users.value = res.data?.list || []
    total.value = res.data?.total ?? 0
    pagination.total = total.value
  } catch {
    users.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
/* page-wrap / page-header / page-title provided by global.css */
</style>
