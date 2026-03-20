<template>
  <div class="h5-page">
    <div class="h5-header">
      <h2>自助调适</h2>
      <p>精选心理科普与自助小技巧</p>
    </div>

    <div class="cat-strip">
      <a-radio-group v-model="categoryKey" type="button" size="small">
        <a-radio value="__all__">全部（{{ totalCount }}）</a-radio>
        <a-radio
          v-for="cat in categories"
          :key="cat.key"
          :value="cat.key"
        >
          {{ cat.label }}（{{ cat.count }}）
        </a-radio>
      </a-radio-group>
    </div>

    <div v-if="loading" class="loading-wrap"><a-spin /></div>

    <div v-else-if="list.length === 0" class="empty-state">
      <a-empty description="该分类下暂无文章" />
    </div>

    <div v-else class="article-list">
      <div
        v-for="item in list"
        :key="item.id"
        class="article-card"
        @click="router.push(`/h5/wellness/${item.id}`)"
      >
        <div class="article-cat">{{ item.category_label || item.category }}</div>
        <div class="article-title">{{ item.title }}</div>
        <div class="article-summary">
          约 {{ item.read_mins || 5 }} 分钟阅读
          <template v-if="item.view_count != null"> · {{ item.view_count }} 次阅读</template>
        </div>
      </div>
    </div>

    <H5BottomNav active="wellness" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { h5WellnessArticles } from '@/api/h5'
import H5BottomNav from '@/components/h5/H5BottomNav.vue'

const router = useRouter()
const loading = ref(true)
const categories = ref([])
const categoryKey = ref('__all__')
const list = ref([])

const totalCount = computed(() =>
  categories.value.reduce((s, c) => s + (Number(c.count) || 0), 0)
)

async function load() {
  loading.value = true
  try {
    const key = String(categoryKey.value || '').trim()
    const params =
      key && key !== '__all__'
        ? { category: key, page_size: 80 }
        : { page_size: 80 }
    const data = await h5WellnessArticles(params)
    categories.value = Array.isArray(data.categories) ? data.categories : []
    list.value = data.list || []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

watch(categoryKey, () => {
  load()
})

onMounted(load)
</script>

<style scoped>
.h5-page { max-width: 420px; margin: 0 auto; padding: 20px 16px 96px; min-height: 100vh; background: var(--h5-bg); }
.h5-header {
  padding: 8px 0 16px;
}
.h5-header h2 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
}
.h5-header p {
  font-size: 13px;
  color: var(--h5-subtext);
  margin: 0;
}
.cat-strip {
  margin-bottom: 14px;
  overflow-x: auto;
}
.cat-strip :deep(.arco-radio-group) {
  flex-wrap: wrap;
  gap: 6px;
}
.loading-wrap {
  text-align: center;
  padding: 48px 0;
}
.empty-state {
  padding: 48px 0;
}
.article-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.article-card {
  background: var(--h5-surface);
  border: 1px solid var(--h5-border);
  border-radius: var(--h5-radius-card);
  padding: 14px 16px;
  box-shadow: var(--h5-shadow);
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.article-card:active {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.article-cat {
  font-size: 12px;
  color: var(--h5-primary);
  margin-bottom: 6px;
}
.article-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--h5-text);
  line-height: 1.4;
  margin-bottom: 8px;
}
.article-summary {
  font-size: 13px;
  color: var(--h5-subtext);
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-meta {
  font-size: 12px;
  color: #c9cdd4;
}
:deep(.arco-radio-button.arco-radio-checked) {
  background: var(--h5-primary);
  border-color: var(--h5-primary);
}
</style>
