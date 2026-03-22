<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">个案管理</h2>
    </div>

    <a-tabs v-model:active-key="statusTab" type="rounded" class="case-tabs" @change="onTabChange">
      <a-tab-pane key="active" title="进行中" />
      <a-tab-pane key="closed" title="已结案" />
      <a-tab-pane key="interview" title="访谈辅导" />
    </a-tabs>

    <div class="toolbar">
      <a-input-search
        v-model="keyword"
        placeholder="按学生姓名搜索"
        allow-clear
        style="max-width: 320px"
        @search="onSearch"
        @clear="onSearch"
      />
    </div>

    <a-spin :loading="loading">
      <a-table
        v-if="!isMobile"
        :data="list"
        :pagination="pagination"
        row-key="id"
        class="case-table"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
      >
        <template #columns>
          <a-table-column title="学生" :width="200">
            <template #cell="{ record }">
              <div class="cell-student">
                <span class="name">{{ record.student_name || '—' }}</span>
                <span class="meta">{{ record.class_name || '—' }} · {{ record.student_no || '—' }}</span>
              </div>
            </template>
          </a-table-column>
          <a-table-column title="优先级" :width="100">
            <template #cell="{ record }">
              <a-tag :color="priorityColor(record.priority)" size="small">
                {{ record.priority_label || '—' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="摘要" ellipsis tooltip>
            <template #cell="{ record }">
              {{ record.summary || '—' }}
            </template>
          </a-table-column>
          <a-table-column title="建档时间" :width="170">
            <template #cell="{ record }">{{ formatDt(record.created_at) }}</template>
          </a-table-column>
          <a-table-column title="最近跟进" :width="170">
            <template #cell="{ record }">{{ formatDt(record.last_record_at) || '—' }}</template>
          </a-table-column>
          <a-table-column title="记录数" :width="88" align="center">
            <template #cell="{ record }">{{ record.record_count ?? 0 }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="110" fixed="right">
            <template #cell="{ record }">
              <a-button type="primary" size="mini" @click="$router.push(`/cases/${record.id}`)">
                查看详情
              </a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>

      <div v-else class="mobile-list">
        <a-empty v-if="!list.length" description="暂无个案" />
        <a-card v-for="row in list" :key="row.id" size="small" class="case-card-m">
          <div class="m-row1">
            <strong>{{ row.student_name }}</strong>
            <a-tag :color="priorityColor(row.priority)" size="small">{{ row.priority_label }}</a-tag>
          </div>
          <div class="m-row2">{{ row.class_name }} · {{ row.student_no }}</div>
          <div class="m-summary">{{ row.summary || '暂无摘要' }}</div>
          <div class="m-meta">
            建档 {{ formatDt(row.created_at) }}<br>
            最近跟进 {{ formatDt(row.last_record_at) || '—' }} · 记录 {{ row.record_count ?? 0 }} 条
          </div>
          <a-button type="primary" size="small" long @click="$router.push(`/cases/${row.id}`)">
            查看详情
          </a-button>
        </a-card>
        <div v-if="total > 0" class="m-pager">
          <a-pagination
            v-model:current="page"
            v-model:page-size="pageSize"
            :total="total"
            simple
            size="small"
            @change="loadList"
          />
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCases } from '@/api/cases'

const route = useRoute()
const router = useRouter()

/** 与路由 query.tab 同步：访谈辅导使用 tab=访谈 */
const statusTab = ref('active')

function tabFromRouteQuery() {
  const t = route.query.tab
  if (t === '访谈' || t === 'interview') return 'interview'
  if (t === 'closed') return 'closed'
  return 'active'
}

function queryForTab(tab) {
  if (tab === 'interview') return { tab: '访谈' }
  if (tab === 'closed') return { tab: 'closed' }
  return {}
}
const keyword = ref('')
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const isMobile = ref(false)

let mql = null

const pagination = computed(() => ({
  total: total.value,
  current: page.value,
  pageSize: pageSize.value,
  showTotal: true,
  showPageSize: true,
}))

function priorityColor(p) {
  const map = {
    urgent: 'red',
    high: 'orangered',
    normal: 'arcoblue',
    low: 'gray',
  }
  return map[p] || 'gray'
}

function formatDt(iso) {
  if (!iso) return ''
  return String(iso).replace('T', ' ').slice(0, 19)
}

async function loadList() {
  loading.value = true
  try {
    // 访谈辅导：与进行中共用 active 数据，后续可对接独立筛选
    const status = statusTab.value === 'closed' ? 'closed' : 'active'
    const res = await getCases({
      status,
      page: page.value,
      page_size: pageSize.value,
      ...(keyword.value?.trim() ? { keyword: keyword.value.trim() } : {}),
    })
    const d = res.data || {}
    list.value = d.list || []
    total.value = d.total ?? 0
    page.value = d.page ?? page.value
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onTabChange(key) {
  page.value = 1
  router.replace({ path: '/cases', query: queryForTab(key) })
}

function onSearch() {
  page.value = 1
  loadList()
}

function onPageChange(cur) {
  page.value = cur
  loadList()
}

function onPageSizeChange(size) {
  pageSize.value = size
  page.value = 1
  loadList()
}

function onMql(e) {
  isMobile.value = e.matches
}

watch(
  () => route.query.tab,
  () => {
    if (route.path !== '/cases') return
    const next = tabFromRouteQuery()
    if (next !== statusTab.value) statusTab.value = next
    page.value = 1
    loadList()
  }
)

onMounted(() => {
  mql = window.matchMedia('(max-width: 767px)')
  isMobile.value = mql.matches
  mql.addEventListener('change', onMql)
  statusTab.value = tabFromRouteQuery()
  loadList()
})

onUnmounted(() => {
  if (mql) mql.removeEventListener('change', onMql)
})
</script>

<style scoped>
.page-wrap {
  padding: 20px 24px 32px;
  min-height: 100%;
  box-sizing: border-box;
}
.page-header {
  margin-bottom: 16px;
}
.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.case-tabs {
  margin-bottom: 16px;
}
.toolbar {
  margin-bottom: 16px;
}
.cell-student {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cell-student .name {
  font-weight: 500;
}
.cell-student .meta {
  font-size: 12px;
  color: var(--color-text-3);
}
.case-card-m {
  margin-bottom: 12px;
}
.m-row1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.m-row2 {
  font-size: 12px;
  color: var(--color-text-3);
  margin-bottom: 8px;
}
.m-summary {
  font-size: 13px;
  color: var(--color-text-2);
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.m-meta {
  font-size: 12px;
  color: var(--color-text-3);
  margin-bottom: 12px;
  line-height: 1.5;
}
.m-pager {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
