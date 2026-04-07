<template>
  <div class="page-wrap">
    <a-page-header title="待认领学生" @back="$router.push('/dashboard')" />
    <a-table :data="list" :loading="loading" row-key="id" :pagination="false" size="small">
      <template #columns>
        <a-table-column title="学生" data-index="student_name" />
        <a-table-column title="原学校" data-index="from_school" ellipsis />
        <a-table-column title="升学去向" data-index="to_school" ellipsis />
        <a-table-column title="迁移日期" data-index="transfer_date" :width="110" />
        <a-table-column title="操作" :width="200">
          <template #cell="{ record }">
            <a-link @click="openClaim(record)">分配给老师</a-link>
            <a-link status="danger" @click="onArchive(record)">归档</a-link>
          </template>
        </a-table-column>
      </template>
    </a-table>

    <a-modal v-model:visible="claimVisible" title="认领并分配" @before-ok="submitClaim">
      <a-form layout="vertical">
        <a-form-item label="班级" required>
          <a-select v-model="claimForm.class_id" :options="classOptions" placeholder="本校班级" allow-search />
        </a-form-item>
        <a-form-item label="心理老师" required>
          <a-select v-model="claimForm.counselor_id" :options="counselorOptions" placeholder="本校老师" allow-search />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { useAuthStore } from '@/stores/auth'
import { getPendingTransfers, claimTransfer, archiveTransfer } from '@/api/transfers'
import { getClassesForTenant, getCounselorsForTenant } from '@/api/adminExtra'

const auth = useAuthStore()
const tenantId = computed(() => Number(auth.userInfo?.tenantId || auth.userInfo?.tenant_id || 0))

const list = ref([])
const loading = ref(false)
const claimVisible = ref(false)
const currentTransferId = ref(null)
const claimForm = reactive({ class_id: undefined, counselor_id: undefined })
const classOptions = ref([])
const counselorOptions = ref([])

async function load() {
  loading.value = true
  try {
    const res = await getPendingTransfers()
    list.value = res.data?.list || []
  } finally {
    loading.value = false
  }
}

async function openClaim(record) {
  currentTransferId.value = record.id
  claimForm.class_id = undefined
  claimForm.counselor_id = undefined
  const tid = tenantId.value
  if (!tid) {
    Message.error('无法解析当前租户')
    return
  }
  try {
    const [cRes, uRes] = await Promise.all([
      getClassesForTenant(tid),
      getCounselorsForTenant(tid),
    ])
    classOptions.value = (cRes.data?.list || []).map((c) => ({ value: c.id, label: c.name }))
    counselorOptions.value = (uRes.data?.list || []).map((u) => ({ value: u.id, label: u.real_name }))
  } catch { /* */ }
  claimVisible.value = true
}

async function submitClaim() {
  if (claimForm.class_id == null || claimForm.counselor_id == null) {
    Message.warning('请选择班级与老师')
    return false
  }
  try {
    await claimTransfer(currentTransferId.value, {
      class_id: claimForm.class_id,
      counselor_id: claimForm.counselor_id,
    })
    Message.success('已认领')
    claimVisible.value = false
    load()
    return true
  } catch {
    return false
  }
}

function onArchive(record) {
  Modal.confirm({
    title: '归档',
    content: '确认无法认领并归档？',
    onOk: async () => {
      await archiveTransfer(record.id)
      Message.success('已归档')
      load()
    },
  })
}

onMounted(load)
</script>
