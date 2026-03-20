<template>
  <div class="h5-page">
    <div class="h5-nav-bar">
      <span class="back" @click="router.back()">←</span>
      <span class="title">文章</span>
      <span class="right" />
    </div>

    <div v-if="loading" class="loading-wrap"><a-spin /></div>

    <div v-else-if="!article" class="empty-state">
      <a-empty description="文章不存在或已下架" />
      <a-button type="primary" class="back-btn" @click="router.push('/h5/wellness')">
        返回列表
      </a-button>
    </div>

    <article v-else class="article-body">
      <div class="article-head">
        <div class="article-cat">{{ article.category_label || article.category }}</div>
        <h1>{{ article.title }}</h1>
        <div class="article-meta">
          <span v-if="article.read_mins">{{ article.read_mins }} 分钟阅读</span>
          <span v-if="article.view_count" class="view-count">· {{ article.view_count }} 次阅读</span>
        </div>
      </div>
      <div class="md-content" v-html="htmlContent" />

      <div v-if="article.related && article.related.length" class="related-section">
        <h3 class="related-title">相关推荐</h3>
        <div
          v-for="item in article.related"
          :key="item.id"
          class="related-card"
          @click="goRelated(item.id)"
        >
          <div class="related-info">
            <div class="related-name">{{ item.title }}</div>
            <div class="related-meta" v-if="item.read_mins">{{ item.read_mins }} 分钟阅读</div>
          </div>
          <span class="related-arrow">›</span>
        </div>
      </div>
    </article>

    <H5BottomNav active="wellness" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import { h5WellnessArticleDetail } from '@/api/h5'
import H5BottomNav from '@/components/h5/H5BottomNav.vue'

marked.setOptions({ breaks: true, gfm: true })

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const article = ref(null)

const htmlContent = computed(() => {
  const raw = article.value?.content
  if (!raw) return ''
  return marked.parse(raw)
})

async function load() {
  loading.value = true
  article.value = null
  try {
    const id = route.params.id
    article.value = await h5WellnessArticleDetail(id)
  } catch {
    article.value = null
  } finally {
    loading.value = false
  }
}

function goRelated(id) {
  router.push(`/h5/wellness/${id}`)
}

watch(() => route.params.id, load, { immediate: true })
</script>

<style scoped>
.h5-page { max-width: 420px; margin: 0 auto; padding-bottom: 92px; min-height: 100vh; background: var(--h5-bg); }
.h5-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #fbf9f4;
  border-bottom: 1px solid var(--h5-border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.h5-nav-bar .back {
  font-size: 18px;
  cursor: pointer;
  width: 32px;
}
.h5-nav-bar .title {
  font-size: 16px;
  font-weight: 600;
}
.h5-nav-bar .right {
  width: 32px;
}
.loading-wrap {
  text-align: center;
  padding: 60px 0;
}
.empty-state {
  padding: 48px 16px;
  text-align: center;
}
.back-btn {
  margin-top: 16px;
}
.article-body {
  padding: 16px;
  background: var(--h5-surface);
  margin: 12px 16px;
  border-radius: var(--h5-radius-card);
  border: 1px solid var(--h5-border);
  box-shadow: var(--h5-shadow);
}
.article-head {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f2f3f5;
}
.article-cat { font-size: 13px; color: var(--h5-primary); margin-bottom: 8px; }
.article-head h1 {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
  margin: 0 0 10px;
  color: var(--h5-text);
}
.article-meta {
  font-size: 13px;
  color: var(--h5-subtext);
}
/* Markdown 正文 */
.md-content :deep(h2) {
  font-size: 17px;
  font-weight: 600;
  margin: 22px 0 12px;
  color: var(--h5-text);
}
.md-content :deep(h3) {
  font-size: 15px;
  font-weight: 600;
  margin: 16px 0 8px;
  color: var(--h5-text);
}
.md-content :deep(p) {
  font-size: 15px;
  line-height: 1.75;
  color: var(--h5-subtext);
  margin: 0 0 12px;
}
.md-content :deep(ul),
.md-content :deep(ol) {
  margin: 0 0 12px;
  padding-left: 1.25em;
  font-size: 15px;
  line-height: 1.75;
  color: var(--h5-subtext);
}
.md-content :deep(li) {
  margin-bottom: 6px;
}
.md-content :deep(blockquote) {
  margin: 12px 0;
  padding: 10px 14px;
  border-left: 4px solid var(--h5-primary);
  background: #f7faf9;
  color: var(--h5-subtext);
  font-size: 14px;
}
.md-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  margin: 12px 0;
}
.md-content :deep(th),
.md-content :deep(td) {
  border: 1px solid #e5e6eb;
  padding: 8px 10px;
  text-align: left;
}
.md-content :deep(th) {
  background: #f7f8fa;
}
.md-content :deep(strong) {
  color: #1d2129;
}
.md-content :deep(code) {
  font-size: 13px;
  background: #f2f3f5;
  padding: 2px 6px;
  border-radius: 4px;
}
/* 相关推荐 */
.related-section {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid #f2f3f5;
}
.related-title {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
  margin: 0 0 12px;
}
.related-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: #f7faf9;
  border-radius: 10px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: background 0.2s;
}
.related-card:active {
  background: #eef5f2;
}
.related-info {
  flex: 1;
  min-width: 0;
}
.related-name {
  font-size: 14px;
  font-weight: 500;
  color: #1d2129;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.related-meta {
  font-size: 12px;
  color: #86909c;
  margin-top: 4px;
}
.related-arrow {
  font-size: 18px;
  color: #c9cdd4;
  margin-left: 8px;
  flex-shrink: 0;
}
.view-count {
  margin-left: 4px;
}
</style>
