<template>
  <div class="page-wrap">
    <div class="page-header">
      <h1 class="page-title">心理援助热线</h1>
      <p class="page-desc">遇到心理危机时，请立即拨打以下热线</p>
    </div>

    <div class="hotline-list">
      <a-card
        v-for="item in hotlines"
        :key="item.name"
        class="hotline-card"
        :bordered="false"
      >
        <div class="hotline-inner">
          <div class="hotline-left">
            <div class="phone-icon" aria-hidden="true">
              <IconPhone :size="22" />
            </div>
            <div class="hotline-text">
              <div class="hotline-name">{{ item.name }}</div>
              <div class="hotline-number">{{ item.number }}</div>
              <div class="hotline-note">{{ item.note }}</div>
            </div>
          </div>
          <a-button type="outline" size="small" @click="copyNumber(item.number)">
            复制号码
          </a-button>
        </div>
      </a-card>
    </div>

    <p class="footer-note">各地区可联系管理员配置本地专属热线</p>
  </div>
</template>

<script setup>
import { Message } from '@arco-design/web-vue'
import { IconPhone } from '@arco-design/web-vue/es/icon'

const hotlines = [
  {
    name: '全国心理援助热线',
    number: '400-161-9995',
    note: '24 小时心理援助（请以当地公布为准）',
  },
  {
    name: '北京心理危机热线',
    number: '010-82951332',
    note: '北京地区心理危机干预与咨询',
  },
  {
    name: '青少年心理援助',
    number: '12355',
    note: '共青团青少年服务台',
  },
  {
    name: '生命热线',
    number: '400-821-1215',
    note: '心理支持与危机干预',
  },
  {
    name: '希望24热线',
    number: '400-161-9995',
    note: '生命教育与危机支持',
  },
]

async function copyNumber(num) {
  const text = String(num).replace(/\s/g, '')
  try {
    await navigator.clipboard.writeText(text)
    Message.success('已复制到剪贴板')
  } catch {
    Message.warning('复制失败，请手动复制')
  }
}
</script>

<style scoped>
.page-wrap {
  padding: 24px 24px 40px;
  max-width: 720px;
  margin: 0 auto;
  box-sizing: border-box;
}
.page-header {
  margin-bottom: 24px;
}
.page-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
}
.page-desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-3);
}
.hotline-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.hotline-card {
  border-radius: 12px;
  background: var(--color-bg-2);
}
.hotline-inner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.hotline-left {
  display: flex;
  gap: 14px;
  min-width: 0;
}
.phone-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--color-primary-2);
  color: var(--color-primary-6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hotline-text {
  min-width: 0;
}
.hotline-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-1);
  margin-bottom: 4px;
}
.hotline-number {
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-primary-6);
  letter-spacing: 0.02em;
}
.hotline-note {
  margin-top: 6px;
  font-size: 13px;
  color: var(--color-text-3);
  line-height: 1.5;
}
.footer-note {
  margin-top: 24px;
  font-size: 13px;
  color: var(--color-text-3);
  text-align: center;
}
</style>
