<template>
  <div>
    <a-form-item label="通知范围">
      <a-radio-group v-model="scope" :disabled="disabled" direction="vertical">
        <a-radio value="all">{{ allLabel }}</a-radio>
        <a-radio value="selected">指定学校与老师（仅通知所选老师）</a-radio>
      </a-radio-group>
    </a-form-item>
    <template v-if="scope === 'selected'">
      <a-form-item label="选择学校" required>
        <a-select
          v-model="tenantIds"
          multiple
          allow-search
          :loading="tenantLoading"
          placeholder="搜索并选择学校"
          :options="tenantSelectOptions"
          :disabled="disabled"
          style="width: 100%"
          @popup-visible-change="onTenantPopup"
        />
      </a-form-item>
      <a-form-item label="选择老师" required>
        <a-select
          v-model="counselorIds"
          multiple
          allow-search
          placeholder="先选学校后选择老师"
          :options="counselorSelectOptions"
          :disabled="disabled || !tenantIds.length"
          style="width: 100%"
        />
      </a-form-item>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { searchTenants, getCounselorsForTenant } from '@/api/adminExtra'

const props = defineProps({
  disabled: { type: Boolean, default: false },
})

const scope = defineModel('scope', { type: String, default: 'all' })
const tenantIds = defineModel('tenantIds', { type: Array, default: () => [] })
const counselorIds = defineModel('counselorIds', { type: Array, default: () => [] })

const auth = useAuthStore()
const isSuperAdmin = computed(() => auth.userRole === 'super_admin')
const myTenantId = computed(() => auth.userInfo?.tenantId)

const allLabel = computed(() =>
  isSuperAdmin.value
    ? '全部学校（本校租户内全部心理老师、班主任与校医）'
    : '全部学校（本校全部心理老师、班主任与校医）'
)

const tenantLoading = ref(false)
const tenantList = ref([])

const tenantSelectOptions = computed(() =>
  tenantList.value.map((t) => ({
    label: t.city ? `${t.name}（${t.city}）` : t.name,
    value: Number(t.id),
  }))
)

const counselorSelectOptions = ref([])

async function loadTenants() {
  tenantLoading.value = true
  try {
    const res = await searchTenants({})
    let list = res.data?.list || []
    if (!isSuperAdmin.value && myTenantId.value) {
      list = list.filter((t) => String(t.id) === String(myTenantId.value))
    }
    tenantList.value = list
  } finally {
    tenantLoading.value = false
  }
}

function onTenantPopup(open) {
  if (open && !tenantList.value.length) loadTenants()
}

watch(
  tenantIds,
  async (ids) => {
    if (!ids?.length) {
      counselorSelectOptions.value = []
      counselorIds.value = []
      return
    }
    const opts = []
    const seen = new Set()
    for (const tid of ids) {
      try {
        const res = await getCounselorsForTenant(tid)
        const school =
          tenantList.value.find((t) => String(t.id) === String(tid))?.name || `学校${tid}`
        for (const u of res.data?.list || []) {
          if (seen.has(u.id)) continue
          seen.add(u.id)
          opts.push({
            value: u.id,
            label: `${u.real_name}（${school}）`,
          })
        }
      } catch {
        /* ignore */
      }
    }
    counselorSelectOptions.value = opts
    counselorIds.value = counselorIds.value.filter((id) => seen.has(id))
  },
  { deep: true }
)

watch(scope, (s) => {
  if (s === 'all') {
    tenantIds.value = []
    counselorIds.value = []
    counselorSelectOptions.value = []
  } else if (!isSuperAdmin.value && myTenantId.value) {
    loadTenants().then(() => {
      if (!tenantIds.value.length) tenantIds.value = [Number(myTenantId.value)]
    })
  }
})

onMounted(() => {
  if (scope.value === 'selected' && !isSuperAdmin.value && myTenantId.value) {
    loadTenants().then(() => {
      if (!tenantIds.value.length) tenantIds.value = [Number(myTenantId.value)]
    })
  }
})
</script>
