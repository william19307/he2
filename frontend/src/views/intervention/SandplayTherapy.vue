<template>
  <div class="page-wrap therapy-page">
    <header class="therapy-hero">
      <div class="hero-icon" aria-hidden="true">
        <IconStorage :size="40" />
      </div>
      <h1 class="therapy-title">沙盘游戏疗法</h1>
      <p class="therapy-intro">
        沙盘游戏疗法是一种通过沙盘和微缩模型进行心理治疗的方法，适用于难以用语言表达内心世界的学生。
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
import { IconStorage, IconInfoCircle } from '@arco-design/web-vue/es/icon'

const features = [
  { title: '治疗记录管理', desc: '记录每次沙盘过程与来访者反应，便于追踪辅导脉络。' },
  { title: '案例归档', desc: '个案资料与沙盘作品影像安全归档，支持检索与回顾。' },
  { title: '效果评估', desc: '结合观察与量表，辅助评估干预效果并调整方案。' },
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
  background: linear-gradient(145deg, var(--color-primary-2), var(--color-primary-4));
  color: var(--color-primary-7);
  display: flex;
  align-items: center;
  justify-content: center;
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
  color: var(--color-primary-6);
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
