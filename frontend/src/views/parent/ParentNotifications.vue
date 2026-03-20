<template>
  <div class="parent-notifications">
    <div class="nav-header">
      <a class="back" @click="$router.back()">← 返回</a>
      <h2>通知列表</h2>
    </div>
    <div class="list" v-if="list.length">
      <div
        v-for="item in list"
        :key="item.id"
        class="list-item"
        :class="{ unread: !item.is_read }"
        @click="openDetail(item)"
      >
        <span v-if="!item.is_read" class="unread-dot" />
        <div class="item-content">
          <div class="item-title">{{ item.title }}</div>
          <div class="item-time">{{ item.created_at }}</div>
        </div>
      </div>
    </div>
    <a-empty v-else-if="!loading" description="暂无通知" />
    <a-spin v-else style="display:block;padding:48px;text-align:center" />

    <a-modal
      v-model:visible="detailVisible"
      :title="detailItem?.title"
      :footer="false"
      unmount-on-close
    >
      <div class="detail-content" v-if="detailItem">{{ detailItem.content }}</div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getParentNotifications } from '@/api/parent'

const list = ref([])
const loading = ref(false)
const detailVisible = ref(false)
const detailItem = ref(null)

function openDetail(item) {
  detailItem.value = item
  detailVisible.value = true
}

onMounted(async () => {
  document.title = '通知 - 心晴平台'
  loading.value = true
  try {
    const res = await getParentNotifications()
    if (res?.code === 0) list.value = res.data?.list || []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.parent-notifications {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 24px;
}
.nav-header {
  background: #fff;
  padding: 12px 16px;
  position: sticky;
  top: 0;
  z-index: 1;
}
.back { color: #165dff; font-size: 14px; cursor: pointer; }
.nav-header h2 { font-size: 18px; margin: 8px 0 0; }
.list { padding: 8px 16px; }
.list-item {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 8px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}
.list-item.unread { background: #f0f9ff; }
.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #165dff;
  flex-shrink: 0;
  margin-top: 6px;
}
.item-content { flex: 1; }
.item-title { font-size: 15px; font-weight: 500; margin-bottom: 4px; }
.item-time { font-size: 12px; color: #999; }
.detail-content { white-space: pre-wrap; line-height: 1.6; }
</style>
