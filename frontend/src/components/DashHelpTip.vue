<template>
  <a-tooltip
    :content="text"
    position="top"
    :content-style="tooltipContentStyle"
    :popup-container="popupContainer"
  >
    <span
      class="dash-help-tip__icon"
      role="img"
      :aria-label="`说明：${text}`"
      tabindex="0"
      @click.stop.prevent
    >?</span>
  </a-tooltip>
</template>

<script setup>
defineProps({
  text: { type: String, required: true },
  /** 挂到 body 可避免在 overflow 容器内被裁切 */
  popupContainer: { type: [String, Object], default: 'body' },
})

const tooltipContentStyle = {
  maxWidth: '200px',
  fontSize: '12px',
  lineHeight: '1.5',
}
</script>

<style scoped>
.dash-help-tip__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 6px;
  border: 1px solid var(--gray-400, #a3a3a3);
  border-radius: 50%;
  font-size: 12px;
  color: var(--gray-400, #a3a3a3);
  line-height: 1;
  cursor: help;
  flex-shrink: 0;
  box-sizing: border-box;
  user-select: none;
  vertical-align: middle;
}
</style>
