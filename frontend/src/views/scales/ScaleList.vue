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

        <div class="scale-grid-wrap">
          <!-- 不要用 v-if="!loading" 包住整块内容：loading 时插槽为空 + 过渡动画易导致「全白无 Spin」 -->
          <a-spin
            :loading="loading"
            tip="加载中..."
            class="scale-spin"
            style="width: 100%; min-height: 240px; display: block"
          >
            <div class="scale-spin-inner">
              <a-empty v-if="!loading && !scales.length" description="暂无量表" />
              <div v-else-if="scales.length" class="scale-card-grid">
              <div
                v-for="record in scales"
                :key="String(record.id)"
                class="scale-card"
                role="button"
                tabindex="0"
                @click="goDetail(record)"
                @keydown.enter="goDetail(record)"
              >
                <div class="card-top">
                  <span class="abbr">{{ record.shortName || record.short_name || record.name }}</span>
                  <a-tag v-if="record.category?.name" size="small" class="cat-tag" color="arcoblue">
                    {{ record.category.name }}
                  </a-tag>
                </div>
                <div class="card-mid">
                  <div class="full-name">{{ record.name }}</div>
                  <div v-if="applicableLevels(record).length" class="level-tags">
                    <span
                      v-for="lv in applicableLevels(record)"
                      :key="lv"
                      class="level-pill"
                      :class="`level-pill--${lv}`"
                    >
                      {{ levelLabel(lv) }}
                    </span>
                  </div>
                  <div class="q-count">
                    {{ record.questionCount ?? record.question_count ?? 0 }} 道题
                  </div>
                </div>
                <div class="card-divider" />
                <div class="card-bottom">
                  <span class="usage-tag">
                    已使用 {{ usageCount(record) }} 次
                  </span>
                  <a-button type="primary" size="small" @click.stop="goDetail(record)">
                    查看详情
                  </a-button>
                </div>
              </div>
              </div>
            </div>
          </a-spin>

          <div v-if="pagination.total > 0" class="scale-pager">
            <a-pagination
              v-model:current="pagination.current"
              v-model:page-size="pagination.pageSize"
              :total="pagination.total"
              show-total
              show-page-size
              @change="loadScales"
              @page-size-change="onPageSizeChange"
            />
          </div>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()
const categories = ref([])
const scales = ref([])
const loading = ref(false)
const activeCat = ref('all')
const keyword = ref('')
const levelFilter = ref(undefined)
const pagination = reactive({ current: 1, pageSize: 20, total: 0, showTotal: true })

function applicableLevels(record) {
  const raw = record.applicableLevels ?? record.applicable_levels
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.map((x) => Number(x)).filter((n) => [1, 2, 3].includes(n)))].sort(
    (a, b) => a - b
  )
}

function levelLabel(lv) {
  const m = { 1: '小学', 2: '初中', 3: '高中' }
  return m[lv] || ''
}

function usageCount(record) {
  const u = record.usage_count
  if (u != null && u !== '') return Number(u) || 0
  const v = record.view_count ?? record.viewCount
  if (v != null && v !== '') return Number(v) || 0
  return 0
}

function goDetail(record) {
  router.push(`/scales/${record.id}`)
}

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

function onPageSizeChange() {
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
    const payload = res.data
    const list = Array.isArray(payload?.list)
      ? payload.list
      : Array.isArray(payload)
        ? payload
        : []
    scales.value = list
    pagination.total =
      payload?.pagination?.total ?? payload?.total ?? list.length
  } catch {
    scales.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadCategories()
})

/**
 * 列表数据加载：未对路由页做 KeepAlive，onActivated 不会在「详情→返回」时触发；
 * 用 watch 保证进入 /scales 时必拉列表（与 MainLayout 路由过渡修复配合）。
 */
watch(
  () => route.path,
  (p) => {
    if (p === '/scales') loadScales()
  },
  { immediate: true }
)
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

.scale-grid-wrap {
  padding: 24px;
  background: var(--gray-50, #f9fafb);
  border-radius: 8px;
  min-height: 320px;
}
.scale-spin {
  width: 100%;
  min-height: 200px;
}
.scale-spin-inner {
  min-height: 200px;
}
.scale-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.scale-card {
  background: #fff;
  border-radius: 12px;
  border: 0.5px solid var(--gray-200, #e5e7eb);
  padding: 16px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  min-height: 200px;
}
.scale-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}
.abbr {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary-5, #2d7a6a);
  line-height: 1.3;
  word-break: break-all;
}
.cat-tag {
  flex-shrink: 0;
}

.card-mid {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.full-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--gray-800, #1f2937);
  line-height: 1.4;
  word-break: break-word;
}
.level-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.level-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.level-pill--1 {
  background: #ecfdf5;
  color: #047857;
}
.level-pill--2 {
  background: #eff6ff;
  color: #1d4ed8;
}
.level-pill--3 {
  background: #faf5ff;
  color: #7c3aed;
}
.q-count {
  font-size: 12px;
  color: var(--gray-500, #6b7280);
}

.card-divider {
  height: 0.5px;
  background: var(--gray-200, #e5e7eb);
  margin: 12px 0;
}

.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.usage-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: var(--color-primary-1, #edf7f4);
  color: var(--color-primary-6, #24655a);
  border: 1px solid var(--color-primary-3, #a3d9cd);
}

.scale-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 8px;
}
</style>
