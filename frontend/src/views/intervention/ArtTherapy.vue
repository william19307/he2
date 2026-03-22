<template>
  <div class="page-wrap therapy-page">
    <header class="therapy-hero">
      <div class="hero-icon hero-icon--art" aria-hidden="true">
        <IconPalette :size="40" />
      </div>
      <h1 class="therapy-title">绘画疗法</h1>
      <p class="therapy-intro">
        绘画疗法通过绘画创作帮助来访者表达情绪与冲突，在轻松、非言语的情境中促进自我觉察与心理整合，适合各年龄段学生。
      </p>
    </header>

    <div class="feature-grid">
      <a-card v-for="f in features" :key="f.title" class="feature-card" :bordered="false">
        <h3 class="feature-title">{{ f.title }}</h3>
        <p class="feature-desc">{{ f.desc }}</p>
      </a-card>
    </div>

    <div class="coming-card">
      <IconInfoCircle class="coming-icon" />
      <span>即将上线，敬请期待</span>
    </div>
  </div>
</template>

<script setup>
import { IconPalette, IconInfoCircle } from '@arco-design/web-vue/es/icon'

const features = [
  { title: '治疗记录管理', desc: '保存主题画、自由画等过程记录，支持主题与情绪标签。' },
  { title: '案例归档', desc: '作品图像与辅导纪要分类归档，便于督导与家校沟通。' },
  { title: '效果评估', desc: '结合作品序列与行为观察，辅助评估干预进展。' },
]
</script>

<style scoped>
.page-wrap {
  padding: 24px 24px 40px;
  max-width: 960px;
  margin: 0 auto;
  box-sizing: border-box;
}
.therapy-hero {
  text-align: center;
  margin-bottom: 28px;
}
.hero-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-icon--art {
  background: linear-gradient(145deg, #fef3c7, #fcd34d);
  color: #b45309;
}
.therapy-title {
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 600;
  color: var(--color-text-1);
}
.therapy-intro {
  margin: 0 auto;
  max-width: 640px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--color-text-2);
  text-align: left;
}
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}
.feature-card {
  border-radius: 12px;
  background: var(--color-bg-2);
  min-height: 120px;
}
.feature-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #b45309;
}
.feature-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-2);
}
.coming-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px 24px;
  border: 2px dashed var(--color-primary-4);
  border-radius: 12px;
  background: var(--color-primary-1);
  color: var(--color-primary-7);
  font-size: 15px;
  font-weight: 500;
}
.coming-icon {
  font-size: 20px;
  flex-shrink: 0;
}
</style>
