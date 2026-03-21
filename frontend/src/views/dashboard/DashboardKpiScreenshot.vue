<!-- 仅开发：用于截取 KPI 卡片 hover 态，与 Dashboard 样式一致。访问 /dev/kpi-screenshot -->
<template>
  <div class="kpi-shot-page">
    <div class="kpi-row">
      <router-link
        class="kpi-card kpi-card--green kpi-card--link kpi-card--force-hover"
        to="/plans"
      >
        <span class="kpi-card-arrow" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 9l4-4M6 5h3v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <div class="kpi-card-top">
          <span class="kpi-card-label">本周测评人次</span>
          <span class="kpi-badge kpi-badge--green">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            +12%
          </span>
        </div>
        <div class="kpi-card-num">128</div>
        <div class="kpi-card-sub">覆盖率约 68.5%</div>
        <svg class="kpi-spark" viewBox="0 0 80 32" preserveAspectRatio="none">
          <polyline
            :points="sparkPoints(demoWeekly, 80, 32)"
            fill="none"
            stroke="rgba(16,185,129,0.5)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </router-link>

      <router-link
        class="kpi-card kpi-card--red kpi-card--link kpi-card--force-hover"
        :to="{ path: '/alerts', query: { level: 'red', status: 'pending' } }"
      >
        <span class="kpi-card-arrow" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 9l4-4M6 5h3v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <div class="kpi-card-top">
          <span class="kpi-card-label">红色预警</span>
          <span class="kpi-badge kpi-badge--red-pill">待处理</span>
        </div>
        <div class="kpi-card-num">3</div>
        <div class="kpi-card-sub">24h 内完成初评</div>
        <svg class="kpi-spark" viewBox="0 0 80 32" preserveAspectRatio="none">
          <polyline
            :points="sparkPoints(demoRed, 80, 32)"
            fill="none"
            stroke="rgba(239,68,68,0.5)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </router-link>

      <router-link
        class="kpi-card kpi-card--amber kpi-card--link kpi-card--force-hover"
        :to="{ path: '/alerts', query: { level: 'yellow' } }"
      >
        <span class="kpi-card-arrow" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 9l4-4M6 5h3v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <div class="kpi-card-top">
          <span class="kpi-card-label">黄色预警</span>
          <span class="kpi-badge kpi-badge--amber-pill">跟进中</span>
        </div>
        <div class="kpi-card-num">12</div>
        <div class="kpi-card-sub">超期 2 条</div>
        <svg class="kpi-spark" viewBox="0 0 80 32" preserveAspectRatio="none">
          <polyline
            :points="sparkPoints(demoYellow, 80, 32)"
            fill="none"
            stroke="rgba(245,158,11,0.5)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </router-link>

      <router-link
        class="kpi-card kpi-card--blue kpi-card--link kpi-card--force-hover"
        to="/cases"
      >
        <span class="kpi-card-arrow" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 9l4-4M6 5h3v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <div class="kpi-card-top">
          <span class="kpi-card-label">在跟进个案</span>
          <span class="kpi-badge kpi-badge--blue-pill">+2 本周</span>
        </div>
        <div class="kpi-card-num">7</div>
        <div class="kpi-card-sub">本月结案 4 个</div>
        <svg class="kpi-spark" viewBox="0 0 80 32" preserveAspectRatio="none">
          <polyline
            :points="sparkPoints(demoCase, 80, 32)"
            fill="none"
            stroke="rgba(59,130,246,0.5)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </router-link>
    </div>
  </div>
</template>

<script setup>
const demoWeekly = [40, 52, 58, 70, 82, 95, 128]
const demoRed = [1, 2, 2, 3, 3, 2, 3]
const demoYellow = [8, 9, 10, 11, 12, 11, 12]
const demoCase = [4, 5, 5, 6, 6, 7, 7]

function sparkPoints(values, w = 80, h = 32) {
  const arr = values?.length ? values : [0, 0, 0, 0, 0, 0, 0]
  const max = Math.max(...arr, 1)
  const min = Math.min(...arr)
  const range = Math.max(max - min, 1e-6)
  const pad = 3
  return arr
    .map((v, i) => {
      const x = pad + (i / 6) * (w - 2 * pad)
      const y = pad + (1 - (v - min) / range) * (h - 2 * pad)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
</script>

<style scoped>
.kpi-shot-page {
  --c1: var(--color-text-1);
  --c2: var(--color-text-3);
  --c3: var(--gray-400);
  --border: var(--color-border-1);
  --bg-card: var(--color-bg-white, #fff);
  --radius: var(--radius-lg, 12px);
  min-height: 100vh;
  padding: 28px;
  background: var(--color-bg-1);
  box-sizing: border-box;
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  max-width: 1200px;
}

.kpi-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 16px 12px;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
}

.kpi-card--link {
  display: block;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  box-sizing: border-box;
}
.kpi-card--link:visited {
  color: inherit;
}
.kpi-card--link:hover,
.kpi-card--link.kpi-card--force-hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.07);
  transform: translateY(-2px);
}
.kpi-card--link .kpi-card-top {
  padding-right: 22px;
}
.kpi-card-arrow {
  position: absolute;
  top: 14px;
  right: 12px;
  z-index: 2;
  color: var(--c3);
  opacity: 0.5;
  line-height: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
.kpi-card--link:hover .kpi-card-arrow,
.kpi-card--link.kpi-card--force-hover .kpi-card-arrow {
  opacity: 0.9;
}

.kpi-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 2px 2px 0;
}
.kpi-card--green::before {
  background: var(--color-success-6);
}
.kpi-card--red::before {
  background: var(--color-danger-6);
}
.kpi-card--amber::before {
  background: var(--color-warning-6);
}
.kpi-card--blue::before {
  background: var(--color-info-6);
}

.kpi-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.kpi-card-label {
  font-size: 12px;
  color: var(--c2);
  font-weight: 500;
}
.kpi-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 20px;
  padding: 0 7px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.kpi-badge--green {
  background: var(--alert-green-bg);
  color: var(--alert-green-text);
}
.kpi-badge--red-pill {
  background: var(--alert-red-bg);
  color: var(--color-danger-6);
}
.kpi-badge--amber-pill {
  background: var(--alert-yellow-bg);
  color: var(--alert-yellow-text);
}
.kpi-badge--blue-pill {
  background: var(--alert-blue-bg);
  color: var(--alert-blue-text);
}

.kpi-card-num {
  font-family: 'DIN Alternate', 'Helvetica Neue', 'Arial Narrow', sans-serif;
  font-size: 38px;
  font-weight: 800;
  color: var(--c1);
  line-height: 1;
  letter-spacing: -0.03em;
  margin-bottom: 4px;
}
.kpi-card-sub {
  font-size: 11.5px;
  color: var(--c3);
  max-width: calc(100% - 90px);
  line-height: 1.4;
}
.kpi-spark {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 72px;
  height: 30px;
  pointer-events: none;
  opacity: 0.9;
}

@media (max-width: 1100px) {
  .kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
