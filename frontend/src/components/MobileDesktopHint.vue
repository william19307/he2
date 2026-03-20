<template>
  <div class="mobile-desktop-hint">
    <div class="hint-icon">💻</div>
    <h3 class="hint-title">请使用电脑访问</h3>
    <p class="hint-desc">此功能在电脑端操作体验更佳</p>
    <a-button type="primary" @click="copyCurrentUrl">复制链接</a-button>
  </div>
</template>

<script setup>
import { Message } from '@arco-design/web-vue'

async function copyCurrentUrl() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    Message.success('链接已复制')
  } catch {
    Message.error('复制失败，请手动复制地址栏')
  }
}
</script>

<style scoped>
.mobile-desktop-hint {
  min-height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
  padding: 20px;
}

.hint-icon {
  font-size: 40px;
  line-height: 1;
}

.hint-title {
  margin: 0;
  font-size: 20px;
}

.hint-desc {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--color-text-2);
}
</style>
