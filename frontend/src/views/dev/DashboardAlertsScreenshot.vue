<!-- 开发：无登录预览工作台横幅 + 待处理预警网格。访问 /dev/dashboard-alerts-screenshot -->
<template>
  <div class="shot-page">
    <header class="shot-toolbar">
      <div class="shot-toolbar-left">
        <h1 class="shot-toolbar-title">工作台</h1>
        <span class="shot-chip">3月17日 周一</span>
      </div>
      <a-button type="primary" size="small">新建测评计划</a-button>
    </header>

    <section class="shot-banner">
      <div class="shot-banner-inner">
        <div class="shot-banner-left">
          <div class="shot-banner-copy">
            <h2 class="shot-banner-h">下午好，张老师</h2>
            <p class="shot-banner-sub">
              今日有 <span class="shot-count">4</span> 项待处理 · 与学校一同守护学生心理健康成长
            </p>
          </div>
          <div class="shot-plant" aria-hidden="true">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="shot-svg-plant">
              <ellipse cx="60" cy="108" rx="36" ry="8" fill="#C8E6D9" opacity=".6"/>
              <path d="M48 102c0-28 12-44 28-52-8 16-6 36 4 50" stroke="#2D7A6A" stroke-width="2.5" stroke-linecap="round" fill="none"/>
              <path d="M72 102c0-24-10-40-24-48 10 14 12 34 6 48" stroke="#3D9B87" stroke-width="2.5" stroke-linecap="round" fill="none"/>
              <path d="M60 52c10-18 28-24 40-20-14 8-22 24-24 40" fill="#5CB88A"/>
              <path d="M60 56C50 38 32 32 20 38c14 8 22 26 24 42" fill="#7BC99A"/>
              <path d="M60 60c-6-22-26-34-44-30 16 10 28 28 32 46" fill="#4AA67E"/>
              <circle cx="60" cy="48" r="6" fill="#FBBF24" opacity=".35"/>
            </svg>
          </div>
        </div>
        <div class="shot-campus" aria-hidden="true">
          <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="shot-svg-campus">
            <defs>
              <linearGradient id="shotCampusSky" x1="0" y1="0" x2="200" y2="120" gradientUnits="userSpaceOnUse">
                <stop stop-color="#B8E0D2"/>
                <stop offset=".45" stop-color="#E8F5F0"/>
                <stop offset="1" stop-color="#F0FAF7"/>
              </linearGradient>
              <linearGradient id="shotCampusG" x1="100" y1="85" x2="100" y2="120" gradientUnits="userSpaceOnUse">
                <stop stop-color="#9DCFBF" stop-opacity=".5"/>
                <stop offset="1" stop-color="#C8E6D9" stop-opacity=".35"/>
              </linearGradient>
            </defs>
            <rect width="200" height="120" rx="12" fill="url(#shotCampusSky)"/>
            <rect y="78" width="200" height="42" fill="url(#shotCampusG)"/>
            <path d="M24 78V48h28l8-10 8 10h28v30" stroke="#2D7A6A" stroke-width="2" fill="#fff" fill-opacity=".85"/>
            <path d="M120 78V52h18l6-8 6 8h18v26" stroke="#24655A" stroke-width="1.8" fill="#fff" fill-opacity=".9"/>
            <rect x="152" y="58" width="36" height="20" rx="2" fill="#fff" fill-opacity=".7" stroke="#2D7A6A" stroke-width="1.2"/>
            <circle cx="170" cy="42" r="10" fill="#FDE68A" opacity=".9"/>
          </svg>
        </div>
      </div>
    </section>

    <section class="shot-kpi">
      <div v-for="k in kpiDemo" :key="k.label" class="shot-kpi-card" :class="k.cls">
        <div class="shot-kpi-label">{{ k.label }}</div>
        <div class="shot-kpi-num">{{ k.num }}</div>
        <div class="shot-kpi-sub">{{ k.sub }}</div>
      </div>
    </section>

    <section class="shot-section">
      <div class="shot-head">
        <h2 class="shot-title">待处理预警</h2>
        <span class="shot-badge">4</span>
      </div>
      <div class="alert-grid">
        <div
          v-for="a in mockAlerts"
          :key="a.id"
          class="alert-tile"
          :class="a.level === 'red' ? 'alert-tile--red' : 'alert-tile--amber'"
        >
          <div class="alert-tile-accent" aria-hidden="true" />
          <div class="alert-tile-avatar">{{ a.studentName.slice(0, 1) }}</div>
          <div class="alert-tile-body">
            <div class="alert-tile-top">
              <span class="alert-tile-name">{{ a.studentName }}</span>
              <span class="alert-tile-time-rel">{{ a.timeRel }}</span>
            </div>
            <div class="alert-tile-scoreline">
              {{ a.scaleName }}（{{ a.score }}/{{ a.totalScore }}）
            </div>
            <div class="alert-tile-foot">
              <span class="alert-tile-time-abs">{{ a.timeAbs }}</span>
              <button type="button" class="alert-tile-btn" :class="a.level === 'red' ? 'alert-tile-btn--red' : 'alert-tile-btn--amber'">
                立即处理
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const kpiDemo = [
  { label: '本周测评人次', num: '128', sub: '覆盖率约 68%', cls: 'shot-kpi-card--g' },
  { label: '红色预警', num: '4', sub: '待处理', cls: 'shot-kpi-card--r' },
  { label: '黄色预警', num: '12', sub: '跟进中', cls: 'shot-kpi-card--a' },
  { label: '在跟进个案', num: '6', sub: '本月结案 2', cls: 'shot-kpi-card--b' },
]

const mockAlerts = [
  {
    id: 1,
    level: 'red',
    studentName: '张同学',
    scaleName: 'PHQ-9 抑郁筛查',
    score: 22,
    totalScore: 27,
    timeRel: '1天前',
    timeAbs: '3/21 10:16',
  },
  {
    id: 2,
    level: 'yellow',
    studentName: '李同学',
    scaleName: 'GAD-7 焦虑',
    score: 12,
    totalScore: 21,
    timeRel: '昨天 15:20',
    timeAbs: '3/20 15:20',
  },
  {
    id: 3,
    level: 'red',
    studentName: '王同学',
    scaleName: 'PHQ-9 抑郁筛查',
    score: 19,
    totalScore: 27,
    timeRel: '昨天 09:08',
    timeAbs: '3/20 09:08',
  },
  {
    id: 4,
    level: 'yellow',
    studentName: '赵同学',
    scaleName: '学习倦怠量表',
    score: 45,
    totalScore: 90,
    timeRel: '3天前',
    timeAbs: '3/18 14:00',
  },
]
</script>

<style scoped>
.shot-page {
  min-height: 100vh;
  padding: 20px 28px 40px;
  background: #f3f4f6;
  box-sizing: border-box;
  max-width: 1100px;
  margin: 0 auto;
}

.shot-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.shot-toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.shot-toolbar-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-1);
}
.shot-chip {
  font-size: 12px;
  padding: 0 10px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  border-radius: 20px;
  border: 1px solid var(--color-border-2);
  color: var(--color-text-3);
  background: #fff;
}

.shot-banner {
  min-height: 160px;
  margin-bottom: 16px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #e8f5f0 0%, #f0faf7 100%);
  border-radius: 12px;
  border: 1px solid rgba(45, 122, 106, 0.12);
  box-sizing: border-box;
}
.shot-banner-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 128px;
}
.shot-banner-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.shot-banner-h {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-1);
}
.shot-banner-sub {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-3);
}
.shot-count {
  display: inline-flex;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  font-weight: 700;
  font-size: 13px;
  background: #fff;
  color: var(--color-danger-6);
  border: 1px solid rgba(245, 63, 63, 0.3);
  margin: 0 2px;
}
.shot-plant {
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}
.shot-svg-plant {
  width: 100%;
  height: 100%;
}
.shot-campus {
  width: 240px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(15, 29, 25, 0.08);
  flex-shrink: 0;
}
.shot-svg-campus {
  width: 100%;
  height: 100%;
  display: block;
}

.shot-kpi {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
@media (max-width: 900px) {
  .shot-kpi {
    grid-template-columns: repeat(2, 1fr);
  }
  .shot-banner-inner {
    flex-direction: column;
    align-items: flex-start;
  }
  .shot-campus {
    width: 100%;
    max-width: 280px;
  }
}

.shot-kpi-card {
  background: #fff;
  border: 1px solid var(--color-border-2);
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}
.shot-kpi-label {
  font-size: 12px;
  color: var(--color-text-3);
  margin-bottom: 8px;
}
.shot-kpi-num {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 4px;
}
.shot-kpi-sub {
  font-size: 11px;
  color: var(--color-text-4);
}
.shot-kpi-card--g .shot-kpi-num {
  color: var(--color-success-6);
}
.shot-kpi-card--r .shot-kpi-num {
  color: var(--color-danger-6);
}
.shot-kpi-card--a .shot-kpi-num {
  color: var(--color-warning-6);
}
.shot-kpi-card--b .shot-kpi-num {
  color: var(--color-info-6);
}

.shot-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.shot-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-1);
}
.shot-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  background: var(--color-danger-light-1);
  color: var(--color-danger-6);
  border: 1px solid var(--color-danger-light-3);
}

.alert-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
@media (max-width: 700px) {
  .alert-grid {
    grid-template-columns: 1fr;
  }
}

.alert-tile {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 12px 14px 12px 0;
  background: #fff;
  border-radius: 12px;
  border: 1px solid var(--color-border-2);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
  overflow: hidden;
}
.alert-tile-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 0 2px 2px 0;
}
.alert-tile--red .alert-tile-accent {
  background: var(--color-danger-6);
}
.alert-tile--amber .alert-tile-accent {
  background: var(--color-warning-6);
}
.alert-tile-avatar {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  margin-left: 8px;
  border-radius: 50%;
  background: linear-gradient(145deg, #e8f5f0, #d1ebe0);
  border: 1px solid rgba(45, 122, 106, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-primary-6);
}
.alert-tile-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.alert-tile-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.alert-tile-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.alert-tile-time-rel {
  font-size: 12px;
  color: var(--color-text-4);
  flex-shrink: 0;
}
.alert-tile-scoreline {
  font-size: 13px;
  color: var(--color-text-3);
  line-height: 1.4;
}
.alert-tile-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.alert-tile-time-abs {
  font-size: 11px;
  color: var(--color-text-4);
}
.alert-tile-btn {
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  cursor: default;
}
.alert-tile-btn--red {
  background: var(--color-danger-6);
}
.alert-tile-btn--amber {
  background: var(--color-warning-6);
}
</style>
