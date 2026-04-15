<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">工作表格</h2>
      <p class="page-desc">选择表格类型进行填写或查看历史记录</p>
    </div>

    <div class="form-grid-wrap">
      <a-spin :loading="loading" class="grid-spin">
        <div class="form-card-grid">
          <div
            v-for="card in FORM_CARDS"
            :key="card.formType"
            class="form-card"
          >
            <div class="card-top">
              <span class="card-icon"><component :is="iconFor(card.icon)" :size="22" /></span>
              <a-tag size="small" color="arcoblue">{{ counts[card.formType] ?? 0 }} 条</a-tag>
            </div>
            <div class="card-title">{{ card.title }}</div>
            <div class="card-desc">{{ card.description }}</div>
            <div class="card-actions">
              <a-button type="primary" size="small" @click="openCreate(card.formType)">
                填写新表
              </a-button>
              <a-button size="small" @click="goRecords(card.formType)">查看记录</a-button>
            </div>
          </div>
        </div>
      </a-spin>
    </div>

    <FormDrawer
      v-model:visible="drawerVisible"
      :form-type="drawerFormType"
      :mode="drawerMode"
      :record="drawerRecord"
      @success="onDrawerSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  IconEdit,
  IconUserAdd,
  IconRefresh,
  IconExclamationCircle,
} from '@arco-design/web-vue/es/icon'
import { FORM_CARDS } from './formConfigs.js'
import { listFormRecords } from '@/api/formRecords.js'
import FormDrawer from './FormDrawer.vue'

const router = useRouter()
const loading = ref(false)
const counts = reactive({
  interview: 0,
  focus_register: 0,
  focus_tracking: 0,
  crisis_register: 0,
})

const drawerVisible = ref(false)
const drawerFormType = ref('interview')
const drawerMode = ref('create')
const drawerRecord = ref(null)

const ICON_MAP = {
  IconEdit,
  IconUserAdd,
  IconRefresh,
  IconExclamationCircle,
}

function iconFor(name) {
  return ICON_MAP[name] || IconEdit
}

async function loadCounts() {
  loading.value = true
  try {
    await Promise.all(
      FORM_CARDS.map(async (c) => {
        try {
          const res = await listFormRecords({
            formType: c.formType,
            page: 1,
            pageSize: 1,
          })
          counts[c.formType] = res.data?.pagination?.total ?? 0
        } catch {
          counts[c.formType] = 0
        }
      })
    )
  } finally {
    loading.value = false
  }
}

function openCreate(formType) {
  drawerFormType.value = formType
  drawerMode.value = 'create'
  drawerRecord.value = null
  drawerVisible.value = true
}

function goRecords(formType) {
  router.push(`/resources/forms/${formType}/records`)
}

function onDrawerSuccess() {
  loadCounts()
}

onMounted(loadCounts)
</script>

<style scoped>
.page-wrap {
  max-width: 1200px;
  margin: 0 auto;
}
.page-header {
  margin-bottom: 20px;
}
.page-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 6px;
  color: var(--color-text-1);
}
.page-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-3);
}

.form-grid-wrap {
  padding: 20px;
  background: var(--color-fill-2);
  border-radius: 10px;
  min-height: 280px;
}
.grid-spin {
  width: 100%;
  display: block;
}
.form-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.form-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid var(--color-border-2);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 200px;
  transition: box-shadow 0.2s;
}
.form-card:hover {
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-icon {
  color: var(--color-primary-6);
  display: flex;
}
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-1);
  line-height: 1.4;
}
.card-desc {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-3);
  line-height: 1.55;
}
.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
</style>
