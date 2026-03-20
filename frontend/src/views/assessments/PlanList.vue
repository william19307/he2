<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">测评计划</h2>
      <a-space>
        <a-input-search
          v-model="keyword"
          placeholder="搜索计划"
          style="width: 200px"
          allow-clear
          @search="loadData"
        />
        <a-select v-model="statusFilter" placeholder="状态" allow-clear style="width: 140px" @change="loadData">
          <a-option value="draft">草稿</a-option>
          <a-option value="published">已发布</a-option>
          <a-option value="ongoing">进行中</a-option>
          <a-option value="completed">已完成</a-option>
        </a-select>
        <a-button type="primary" @click="$router.push('/plans/create')">
          <template #icon><icon-plus /></template>
          新建计划
        </a-button>
      </a-space>
    </div>

    <a-table
      :data="plans"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @page-change="onPageChange"
    >
      <template #columns>
        <a-table-column title="计划名称" data-index="title" :width="220" ellipsis tooltip />
        <a-table-column title="量表" :width="160">
          <template #cell="{ record }">
            {{ (record.scale_names || []).join('、') || '-' }}
          </template>
        </a-table-column>
        <a-table-column title="完成率" :width="200">
          <template #cell="{ record }">
            <a-progress
              v-if="record.completion_rate != null && record.status !== 'draft'"
              :percent="record.completion_rate"
              :stroke-width="8"
              size="small"
            />
            <span v-else>—</span>
          </template>
        </a-table-column>
        <a-table-column title="截止时间" :width="200">
          <template #cell="{ record }">
            <span :class="{ 'text-urgent': record.is_urgent }">{{ fmt(record.end_time) }}</span>
          </template>
        </a-table-column>
        <a-table-column title="状态" :width="100">
          <template #cell="{ record }">
            <a-tag :color="planStatusColor(record.status)" size="small">{{ record.status_label }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="创建人" data-index="creator_name" :width="100" />
        <a-table-column title="操作" :width="160" fixed="right">
          <template #cell="{ record }">
            <a-space>
              <a-link @click="$router.push(`/plans/${record.id}`)">详情</a-link>
              <a-link v-if="record.status === 'draft'" status="success" @click="handlePublish(record)">发布</a-link>
            </a-space>
          </template>
        </a-table-column>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { getPlans, publishPlan } from '@/api/assessments'

const loading = ref(false)
const plans = ref([])
const keyword = ref('')
const statusFilter = ref(undefined)
const pagination = reactive({ current: 1, pageSize: 20, total: 0, showTotal: true })

const STATUS_COLOR = {
  draft: 'gray',
  published: 'blue',
  ongoing: 'green',
  completed: 'cyan',
  cancelled: 'red',
}
const planStatusColor = (s) => STATUS_COLOR[s] || 'gray'

function fmt(t) {
  if (!t) return '-'
  return String(t).replace('T', ' ').slice(0, 16)
}

async function loadData() {
  loading.value = true
  try {
    const res = await getPlans({
      status: statusFilter.value,
      page: pagination.current,
      page_size: pagination.pageSize,
      keyword: keyword.value || undefined,
    })
    const d = res.data || {}
    plans.value = d.list || []
    pagination.total = d.pagination?.total ?? d.total ?? 0
  } catch {
    plans.value = []
  } finally {
    loading.value = false
  }
}

function onPageChange(p) {
  pagination.current = p
  loadData()
}

function handlePublish(record) {
  Modal.confirm({
    title: '确认发布',
    content: `确定发布「${record.title}」？将生成测评任务。`,
    async onOk() {
      try {
        await publishPlan(record.id)
        Message.success('发布成功')
        loadData()
      } catch {
        /* */
      }
    },
  })
}

onMounted(loadData)
</script>

<style scoped>
.text-urgent {
  color: var(--color-danger-6);
  font-weight: 600;
}
</style>
