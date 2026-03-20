<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">学生管理</h2>
      <a-space v-if="!isMobile">
        <a-select v-model="selectedGrade" placeholder="选择年级" allow-clear style="width: 150px" @change="onGradeChange">
          <a-option v-for="g in grades" :key="g.id" :value="g.id">{{ g.name }}</a-option>
        </a-select>
        <a-select v-model="selectedClass" placeholder="选择班级" allow-clear style="width: 150px" @change="loadStudents">
          <a-option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</a-option>
        </a-select>
      </a-space>
      <a-button v-else @click="showFilters = !showFilters">
        <template #icon><icon-filter /></template>
        筛选
      </a-button>
    </div>

    <div v-if="isMobile && showFilters" class="mobile-filter-card">
      <a-space direction="vertical" fill>
        <a-select v-model="selectedGrade" placeholder="选择年级" allow-clear @change="onGradeChange">
          <a-option v-for="g in grades" :key="g.id" :value="g.id">{{ g.name }}</a-option>
        </a-select>
        <a-select v-model="selectedClass" placeholder="选择班级" allow-clear @change="loadStudents">
          <a-option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</a-option>
        </a-select>
      </a-space>
    </div>

    <a-table
      v-if="!isMobile"
      :data="pagedStudents"
      :loading="loading"
      :pagination="{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: students.length,
        showTotal: true,
        showPageSize: true,
        pageSizeOptions: [20, 50, 100]
      }"
      @page-change="onPageChange"
      @page-size-change="onPageSizeChange"
    >
      <template #columns>
        <a-table-column title="学号" :width="120">
          <template #cell="{ record }">{{ record.student_no || '-' }}</template>
        </a-table-column>
        <a-table-column title="姓名" :width="100">
          <template #cell="{ record }">{{ record.name || '-' }}</template>
        </a-table-column>
        <a-table-column title="性别" :width="60">
          <template #cell="{ record }">{{ record.gender_label || '-' }}</template>
        </a-table-column>
        <a-table-column title="联系电话" :width="130">
          <template #cell="{ record }">{{ record.phone || '-' }}</template>
        </a-table-column>
        <a-table-column title="重点关注" :width="90">
          <template #cell="{ record }">
            <a-tag v-if="record.special_flag" color="red" size="small">重点</a-tag>
            <span v-else>-</span>
          </template>
        </a-table-column>
        <a-table-column title="操作" :width="100">
          <template #cell="{ record }">
            <a-link @click="$router.push(`/students/${record.student_id || record.user_id}`)">查看档案</a-link>
          </template>
        </a-table-column>
      </template>
    </a-table>

    <template v-else>
      <a-spin :loading="loading" style="width:100%">
        <div class="mobile-card-list">
          <a-card v-for="record in pagedStudents" :key="record.student_id || record.user_id" size="small">
            <div class="row-1">
              <strong>{{ record.name || '-' }}</strong>
              <a-tag v-if="record.special_flag" color="red" size="small">重点</a-tag>
            </div>
            <div class="row-2">学号：{{ record.student_no || '-' }}</div>
            <div class="row-2">班级：{{ record.grade_name || '-' }} {{ record.class_name || '' }}</div>
            <div class="row-2">电话：{{ record.phone || '-' }}</div>
            <a-button type="text" size="small" @click="$router.push(`/students/${record.student_id || record.user_id}`)">
              查看档案
            </a-button>
          </a-card>
        </div>
      </a-spin>
      <div class="mobile-pagination">
        共 {{ students.length }} 条
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { IconFilter } from '@arco-design/web-vue/es/icon'
import { getGrades, getGradeClasses, getStudents } from '@/api/students'

const loading = ref(false)
const grades = ref([])
const classes = ref([])
const students = ref([])
const selectedGrade = ref(undefined)
const selectedClass = ref(undefined)
const pagination = ref({ current: 1, pageSize: 20 })
const showFilters = ref(false)
const isMobile = ref(false)
let mql = null

const pagedStudents = computed(() => {
  const start = (pagination.value.current - 1) * pagination.value.pageSize
  return students.value.slice(start, start + pagination.value.pageSize)
})

async function loadGrades() {
  try {
    const res = await getGrades()
    grades.value = res.data
  } catch { /* mock fallback handled by API interceptor */ }
}

async function onGradeChange(gradeId) {
  selectedClass.value = undefined
  if (!gradeId) {
    classes.value = []
    loadStudents()
    return
  }
  try {
    const res = await getGradeClasses(gradeId)
    classes.value = res.data
  } catch {
    classes.value = []
  }
  loadStudents()
}

async function loadStudents() {
  loading.value = true
  try {
    const params = {}
    if (selectedClass.value) params.class_id = selectedClass.value
    else if (selectedGrade.value) params.grade_id = selectedGrade.value
    const res = await getStudents(Object.keys(params).length ? params : undefined)
    students.value = Array.isArray(res.data) ? res.data : []
    pagination.value.current = 1
  } catch { students.value = [] }
  finally { loading.value = false }
}

function onPageChange(page) {
  pagination.value.current = page
}

function onPageSizeChange(size) {
  pagination.value.pageSize = size
  pagination.value.current = 1
}

onMounted(async () => {
  mql = window.matchMedia('(max-width: 767px)')
  isMobile.value = mql.matches
  mql.addEventListener('change', (e) => { isMobile.value = e.matches })
  await loadGrades()
  await loadStudents()
})
</script>

<style scoped>
/* page-wrap / page-header / page-title provided by global.css */
.mobile-filter-card {
  margin-bottom: 12px;
  padding: 12px;
  background: #fff;
  border-radius: 10px;
}
.mobile-card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row-1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}
.row-2 { font-size: 13px; color: var(--color-text-2); margin-top: 4px; }
.mobile-pagination {
  margin-top: 10px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-2);
}
</style>
