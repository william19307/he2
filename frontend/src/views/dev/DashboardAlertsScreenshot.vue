<!-- 开发：无登录预览工作台左右分栏 + 紧凑预警。访问 /dev/dashboard-alerts-screenshot -->
<template>
  <div class="shot-root">
    <div class="shot-split">
      <div class="shot-main">
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
              <div>
                <h2 class="shot-banner-h">下午好，张老师</h2>
                <p class="shot-banner-sub">
                  今日有 <span class="shot-count">4</span> 项待处理 · 与学校一同守护学生心理健康成长
                </p>
              </div>
              <div class="shot-plant" aria-hidden="true">
                <img src="/images/dashboard-banner-left.png" alt="" class="shot-banner-left-img" width="64" height="64" decoding="async" />
              </div>
            </div>
            <div class="shot-campus">
              <img src="/images/dashboard-banner-right.png" alt="" class="shot-banner-right-img" width="200" height="120" decoding="async" />
            </div>
          </div>
        </section>

        <div class="shot-kpi">
          <div v-for="k in kpiDemo" :key="k.label" class="shot-kpi-card" :class="k.cls">
            <div class="shot-kpi-label">{{ k.label }}</div>
            <div class="shot-kpi-num">{{ k.num }}</div>
          </div>
        </div>

        <section class="shot-section">
          <div class="shot-sec-head">
            <span class="shot-sec-title">待处理预警</span>
            <span class="shot-badge">4</span>
          </div>
          <div class="alert-list alert-list--compact">
            <div
              v-for="a in mockAlerts"
              :key="a.id"
              class="alert-row"
              :class="a.level === 'red' ? 'alert-row--red' : 'alert-row--amber'"
            >
              <div class="alert-row-bar" />
              <div class="alert-row-mid">
                <span :class="a.level === 'red' ? 'alert-tag--red' : 'alert-tag--amber'">
                  {{ a.level === 'red' ? '红色预警' : '黄色预警' }}
                </span>
                <div class="alert-row-identity">
                  <span class="alert-row-name">{{ a.studentName }}</span>
                  <span class="alert-row-class">{{ a.className }}</span>
                </div>
                <div class="alert-row-scale-wrap">
                  <span class="alert-row-scale">{{ a.scaleName }}</span>
                  <span class="alert-score-green">{{ a.score }}/{{ a.totalScore }}分</span>
                </div>
              </div>
              <div class="alert-row-aside">
                <span class="alert-row-time">{{ a.timeRel }}</span>
                <button
                  type="button"
                  class="alert-row-action"
                  :class="a.level === 'red' ? 'alert-row-action--red' : 'alert-row-action--amber'"
                >
                  立即处理
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside class="shot-side" aria-label="右侧栏预览">
        <section class="shot-side-card">
          <div class="shot-side-head">待办提醒 <span class="shot-side-n">3</span></div>
          <ul class="shot-todo">
            <li>跟进红色预警 · 高一(2)</li>
            <li>完成个案周报</li>
            <li>预约家长沟通</li>
          </ul>
        </section>
        <section class="shot-side-card">
          <div class="shot-side-head shot-side-head--row">
            <span>进行中测评</span>
            <span class="shot-link">新建 ›</span>
          </div>
          <div v-for="p in planDemo" :key="p.name" class="shot-plan">
            <div class="shot-plan-title">{{ p.name }}</div>
            <div class="shot-plan-bar-wrap">
              <div class="shot-plan-bar">
                <div class="shot-plan-fill" :style="{ width: p.pct + '%' }" />
              </div>
              <span class="shot-plan-num">{{ p.done }}/{{ p.total }}</span>
            </div>
            <div class="shot-plan-foot">
              <span>截止 {{ p.end }}</span>
              <span class="shot-plan-pct">{{ p.pct }}%</span>
            </div>
          </div>
        </section>
        <section class="shot-side-card">
          <div class="shot-side-head">风险趋势（近30天）</div>
          <div class="shot-chart-placeholder">折线图区域</div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
const kpiDemo = [
  { label: '本周测评', num: '128', cls: 'shot-kpi--g' },
  { label: '红色预警', num: '4', cls: 'shot-kpi--r' },
  { label: '黄色预警', num: '12', cls: 'shot-kpi--a' },
  { label: '个案', num: '6', cls: 'shot-kpi--b' },
]

const mockAlerts = [
  { id: 1, level: 'red', studentName: '张同学', className: '初三(2)班', scaleName: 'PHQ-9', score: 22, totalScore: 27, timeRel: '1天前' },
  { id: 2, level: 'yellow', studentName: '李同学', className: '初二(1)班', scaleName: 'GAD-7', score: 12, totalScore: 21, timeRel: '昨天' },
]

const planDemo = [
  { name: '2025春季心理健康普查', done: 120, total: 200, pct: 60, end: '4/30' },
  { name: '初三考前情绪测评', done: 45, total: 48, pct: 94, end: '3/25' },
]
</script>

<style scoped>
.shot-root {
  min-height: 100vh;
  background: #f3f4f6;
  box-sizing: border-box;
}
.shot-split {
  display: flex;
  max-width: 1280px;
  margin: 0 auto;
  min-height: calc(100vh - 24px);
  overflow: hidden;
  border-radius: 0;
}
.shot-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 16px 20px 24px;
  background: #f3f4f6;
}
.shot-side {
  width: 340px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 16px 14px 24px;
  background: #f7f8fa;
  border-left: 1px solid #e5e7eb;
  box-sizing: border-box;
}
.shot-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.shot-toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.shot-toolbar-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}
.shot-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: var(--color-text-3);
}

.shot-banner {
  background: linear-gradient(135deg, #e8f5f0, #f0faf7);
  border: 1px solid rgba(45, 122, 106, 0.12);
  border-radius: 10px;
  margin-bottom: 12px;
  padding: 12px 14px;
}
.shot-banner-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.shot-banner-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.shot-banner-h {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
}
.shot-banner-sub {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-3);
}
.shot-count {
  display: inline-flex;
  min-width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 12px;
  background: #fff;
  color: var(--color-danger-6);
  border: 1px solid rgba(245, 63, 63, 0.3);
}
.shot-plant {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.shot-banner-left-img {
  width: 64px;
  height: 64px;
  object-fit: contain;
  display: block;
}
.shot-campus {
  width: 140px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}
.shot-banner-right-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.shot-kpi {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
@media (max-width: 700px) {
  .shot-kpi {
    grid-template-columns: repeat(2, 1fr);
  }
  .shot-side {
    display: none;
  }
  .shot-split {
    min-height: auto;
  }
}

.shot-kpi-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}
.shot-kpi-label {
  font-size: 11px;
  color: var(--color-text-3);
  margin-bottom: 4px;
}
.shot-kpi-num {
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
}
.shot-kpi--g .shot-kpi-num {
  color: var(--color-success-6);
}
.shot-kpi--r .shot-kpi-num {
  color: var(--color-danger-6);
}
.shot-kpi--a .shot-kpi-num {
  color: var(--color-warning-6);
}
.shot-kpi--b .shot-kpi-num {
  color: var(--color-info-6);
}

.shot-section {
  margin-top: 4px;
}
.shot-sec-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.shot-sec-title {
  font-size: 13px;
  font-weight: 700;
}
.shot-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 8px;
  background: var(--color-danger-light-1);
  color: var(--color-danger-6);
  border: 1px solid var(--color-danger-light-3);
}

.alert-list--compact {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}
.alert-row {
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 6px 10px 6px 0;
  border-bottom: 1px solid var(--color-bg-2);
}
.alert-row:last-child {
  border-bottom: none;
}
.alert-row-bar {
  width: 4px;
  align-self: stretch;
  margin-right: 8px;
  border-radius: 0 2px 2px 0;
}
.alert-row--red .alert-row-bar {
  background: var(--color-danger-6);
}
.alert-row--amber .alert-row-bar {
  background: var(--color-warning-6);
}
.alert-row-mid {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
}
.alert-tag--red,
.alert-tag--amber {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}
.alert-tag--red {
  background: var(--color-danger-light-1);
  color: var(--color-danger-6);
}
.alert-tag--amber {
  background: var(--color-warning-light-1);
  color: var(--color-warning-6);
}
.alert-row-identity {
  display: flex;
  gap: 4px;
  align-items: baseline;
}
.alert-row-name {
  font-weight: 700;
  font-size: 13px;
}
.alert-row-class {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-2);
}
.alert-row-scale-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}
.alert-row-scale {
  font-size: 12px;
  color: var(--color-text-3);
}
.alert-score-green {
  font-size: 11px;
  font-weight: 600;
  color: #047857;
  background: #d1fae5;
  padding: 2px 6px;
  border-radius: 4px;
}
.alert-row-aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  padding-left: 6px;
}
.alert-row-time {
  font-size: 10px;
  color: var(--color-text-4);
}
.alert-row-action {
  height: 26px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  color: #fff;
}
.alert-row-action--red {
  background: var(--color-danger-6);
}
.alert-row-action--amber {
  background: var(--color-warning-6);
}

.shot-side-card {
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
}
.shot-side-head {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.shot-side-n {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 8px;
  background: #f3f4f6;
  color: var(--color-text-3);
}
.shot-todo {
  margin: 0;
  padding: 0 0 0 16px;
  font-size: 12px;
  color: var(--color-text-2);
  line-height: 1.8;
}
.shot-link {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-primary-6);
}
.shot-plan {
  padding: 10px 0;
  border-top: 1px solid #f0f0f0;
}
.shot-plan:first-of-type {
  border-top: none;
  padding-top: 0;
}
.shot-plan-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-1);
  margin-bottom: 6px;
  line-height: 1.35;
}
.shot-plan-bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.shot-plan-bar {
  flex: 1;
  height: 5px;
  background: #eef2f6;
  border-radius: 3px;
  overflow: hidden;
}
.shot-plan-fill {
  height: 100%;
  background: linear-gradient(90deg, #2d7a6a, #4a9d8c);
  border-radius: 3px;
}
.shot-plan-num {
  font-size: 11px;
  color: var(--color-text-4);
  white-space: nowrap;
}
.shot-plan-foot {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--color-text-4);
}
.shot-plan-pct {
  font-weight: 700;
  color: var(--color-primary-6);
}
.shot-chart-placeholder {
  height: 100px;
  background: linear-gradient(180deg, #f9fafb, #f3f4f6);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--color-text-4);
}
</style>
