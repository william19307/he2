<template>
  <div class="page-wrap">
    <div class="page-header">
      <div>
        <a-button type="text" class="back-btn" @click="$router.push('/resources/forms')">
          ← 返回工作表格
        </a-button>
        <h2 class="page-title">{{ pageTitle }}</h2>
      </div>
      <a-button type="primary" @click="openCreate">
        <template #icon><IconPlus /></template>
        填写新表
      </a-button>
    </div>

    <div class="toolbar">
      <a-input-search
        v-model="keyword"
        placeholder="按学生姓名搜索"
        style="width: 240px"
        allow-clear
        @search="loadData"
        @clear="loadData"
      />
    </div>

    <a-table
      :data="rows"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @page-change="onPageChange"
      @page-size-change="onPageSizeChange"
    >
      <template #columns>
        <a-table-column title="学生姓名" data-index="studentName" :width="100" />
        <a-table-column title="班级" data-index="className" :width="140" ellipsis tooltip />
        <a-table-column title="填写人" data-index="fillerName" :width="100" />
        <a-table-column title="填写时间" :width="170">
          <template #cell="{ record }">
            {{ fmtTime(record.createdAt) }}
          </template>
        </a-table-column>
        <a-table-column title="状态" :width="100">
          <template #cell="{ record }">
            <a-tag v-if="record.status === 'draft'" color="orangered" size="small">草稿</a-tag>
            <a-tag v-else color="green" size="small">已提交</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" :width="200" fixed="right">
          <template #cell="{ record }">
            <a-space>
              <a-link @click="openView(record)">查看</a-link>
              <a-link v-if="record.status === 'draft'" @click="openEdit(record)">编辑</a-link>
              <a-link v-if="record.status === 'draft'" status="danger" @click="confirmDelete(record)">删除</a-link>
            </a-space>
          </template>
        </a-table-column>
      </template>
    </a-table>

    <FormDrawer
      v-model:visible="drawerVisible"
      :form-type="formType"
      :mode="drawerMode"
      :record="drawerRecord"
      @success="onDrawerSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import { IconPlus } from '@arco-design/web-vue/es/icon'
import { FORM_TYPE_TITLES } from './formConfigs.js'
import { listFormRecords, deleteFormRecord } from '@/api/formRecords.js'
import FormDrawer from './FormDrawer.vue'

const route = useRoute()
const router = useRouter()

const formType = computed(() => String(route.params.formType || ''))

const pageTitle = computed(() => FORM_TYPE_TITLES[formType.value] || '表格记录')

const loading = ref(false)
const rows = ref([])
const keyword = ref('')
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showTotal: true,
  showPageSize: true,
})

const drawerVisible = ref(false)
const drawerMode = ref('view')
const drawerRecord = ref(null)

const VALID = new Set(['interview', 'focus_register', 'focus_tracking', 'crisis_register'])

function fmtTime(t) {
  if (!t) return '—'
  return String(t).replace('T', ' ').slice(0, 19)
}

async function loadData() {
  if (!VALID.has(formType.value)) {
    Message.error('无效的表格类型')
    router.push('/resources/forms')
    return
  }
  loading.value = true
  try {
    const res = await listFormRecords({
      formType: formType.value,
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: keyword.value?.trim() || undefined,
    })
    const d = res.data || {}
    rows.value = d.list || []
    pagination.total = d.pagination?.total ?? 0
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

function onPageChange(p) {
  pagination.current = p
  loadData()
}

function onPageSizeChange(size) {
  pagination.pageSize = size
  pagination.current = 1
  loadData()
}

function openCreate() {
  drawerMode.value = 'create'
  drawerRecord.value = null
  drawerVisible.value = true
}

function openView(rec) {
  drawerMode.value = 'view'
  drawerRecord.value = { ...rec }
  drawerVisible.value = true
}

function openEdit(rec) {
  drawerMode.value = 'edit'
  drawerRecord.value = { ...rec }
  drawerVisible.value = true
}

function confirmDelete(rec) {
  Modal.confirm({
    title: '删除草稿',
    content: '确定删除该条草稿吗？此操作不可恢复。',
    okText: '删除',
    okButtonProps: { status: 'danger' },
    async onOk() {
      await deleteFormRecord(rec.id)
      Message.success('已删除')
      loadData()
    },
  })
}

function onDrawerSuccess() {
  loadData()
}

watch(
  () => route.fullPath,
  () => {
    pagination.current = 1
    loadData()
  }
)

onMounted(() => {
  if (!VALID.has(formType.value)) {
    router.push('/resources/forms')
    return
  }
  loadData()
})
</script>

<style scoped>
.page-wrap {
  max-width: 1100px;
  margin: 0 auto;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}
.back-btn {
  padding-left: 0;
  margin-bottom: 4px;
  color: var(--color-text-2);
}
.page-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}
.toolbar {
  margin-bottom: 12px;
}
</style>
