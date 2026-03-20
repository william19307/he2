<template>
  <div class="page-wrap">
    <a-row :gutter="16">
      <a-col :span="5">
        <a-card title="量表分类" :bordered="false" class="tree-card">
          <a-menu
            :selected-keys="[String(activeCat)]"
            @menu-item-click="(k) => { activeCat = k === 'all' ? 'all' : Number(k); pagination.current = 1; loadScales() }"
          >
            <a-menu-item key="all">全部分类</a-menu-item>
            <a-menu-item v-for="c in categories" :key="String(c.id)">
              {{ c.name }} ({{ c.scale_count ?? 0 }})
            </a-menu-item>
          </a-menu>
        </a-card>
      </a-col>
      <a-col :span="19">
        <div class="toolbar">
          <a-select
            v-model="levelFilter"
            placeholder="学段"
            allow-clear
            style="width: 120px"
            @change="onLevelChange"
          >
            <a-option :value="1">小学</a-option>
            <a-option :value="2">初中</a-option>
            <a-option :value="3">高中</a-option>
          </a-select>
          <a-input-search
            v-model="keyword"
            placeholder="关键词"
            style="width: 240px"
            @search="onSearchKeyword"
          />
        </div>
        <a-alert
          v-if="levelFilter != null && levelFilter !== ''"
          type="info"
          show-icon
          class="level-filter-tip"
        >
          已按学段筛选，部分量表不适用当前学段已隐藏
        </a-alert>
        <a-table
          :data="scales"
          :loading="loading"
          :pagination="pagination"
          row-key="id"
          @page-change="(p) => { pagination.current = p; loadScales() }"
        >
          <template #columns>
            <a-table-column title="量表" :width="200">
              <template #cell="{ record }">
                <a-link @click="$router.push(`/scales/${record.id}`)">
                  {{ record.shortName || record.name }}
                </a-link>
              </template>
            </a-table-column>
            <a-table-column title="全称" data-index="name" ellipsis />
            <a-table-column title="分类" :width="100">
              <template #cell="{ record }">{{ record.category?.name }}</template>
            </a-table-column>
            <a-table-column title="题数" data-index="questionCount" :width="70" />
            <a-table-column title="操作" :width="80">
              <template #cell="{ record }">
                <a-link @click="$router.push(`/scales/${record.id}`)">详情</a-link>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '@/utils/request'

const categories = ref([])
const scales = ref([])
const loading = ref(false)
const activeCat = ref('all')
const keyword = ref('')
const levelFilter = ref(undefined)
const pagination = reactive({ current: 1, pageSize: 20, total: 0, showTotal: true })

async function loadCategories() {
  try {
    const res = await request.get('/scale-categories')
    categories.value = res.data?.list || []
  } catch {
    categories.value = []
  }
}

function onLevelChange() {
  pagination.current = 1
  loadScales()
}

function onSearchKeyword() {
  pagination.current = 1
  loadScales()
}

async function loadScales() {
  loading.value = true
  try {
    const params = {
      page: pagination.current,
      page_size: pagination.pageSize,
      keyword: keyword.value || undefined,
    }
    if (activeCat.value !== 'all') params.category_id = activeCat.value
    if (levelFilter.value != null && levelFilter.value !== '') {
      params.level = levelFilter.value
    }
    const res = await request.get('/scales', { params })
    const list = res.data?.list || []
    scales.value = list
    pagination.total = res.data?.pagination?.total ?? res.data?.total ?? list.length
  } catch {
    scales.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadCategories()
  loadScales()
})
</script>

<style scoped>
.tree-card {
  min-height: 400px;
}
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.level-filter-tip {
  margin-bottom: 12px;
}
</style>
