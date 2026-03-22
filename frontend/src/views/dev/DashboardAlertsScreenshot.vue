<!-- 开发：无登录截取「待处理预警」紧凑列表。访问 /dev/dashboard-alerts-screenshot -->
<template>
  <div class="shot-page">
    <section class="shot-section">
      <div class="shot-head">
        <h2 class="shot-title">待处理预警</h2>
        <span class="shot-badge">4</span>
      </div>
      <div class="alert-list alert-list--compact">
        <div
          v-for="a in mockAlerts"
          :key="a.id"
          class="alert-row"
          :class="a.level === 'red' ? 'alert-row--red' : 'alert-row--amber'"
        >
          <div class="alert-row-bar" aria-hidden="true" />
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
            <span class="alert-row-time">{{ a.time }}</span>
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
</template>

<script setup>
const mockAlerts = [
  {
    id: 1,
    level: 'red',
    studentName: '张同学',
    className: '初三(2)班',
    scaleName: 'PHQ-9 抑郁筛查',
    score: 22,
    totalScore: 27,
    time: '2小时前',
  },
  {
    id: 2,
    level: 'yellow',
    studentName: '李同学',
    className: '初二(1)班',
    scaleName: 'GAD-7 焦虑',
    score: 12,
    totalScore: 21,
    time: '昨天 15:20',
  },
  {
    id: 3,
    level: 'red',
    studentName: '王同学',
    className: '高一(3)班',
    scaleName: 'PHQ-9 抑郁筛查',
    score: 19,
    totalScore: 27,
    time: '昨天 09:08',
  },
  {
    id: 4,
    level: 'yellow',
    studentName: '赵同学',
    className: '六年级(4)班',
    scaleName: '学习倦怠量表',
    score: 45,
    totalScore: 90,
    time: '3天前',
  },
]
</script>

<style scoped>
.shot-page {
  min-height: 100vh;
  padding: 28px;
  background: var(--color-bg-1, #f3f4f6);
  box-sizing: border-box;
}
.shot-section {
  max-width: 880px;
  margin: 0 auto;
}
.shot-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.shot-title {
  margin: 0;
  font-size: 16px;
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

/* 与 DashboardPage 待处理预警紧凑列表对齐 */
.alert-list--compact {
  background: var(--color-bg-white, #fff);
  border-radius: 12px;
  overflow: hidden;
}
.alert-row {
  display: flex;
  align-items: center;
  min-height: 60px;
  padding: 8px 12px 8px 0;
  border-bottom: 1px solid var(--color-bg-2);
}
.alert-row:last-child {
  border-bottom: none;
}
.alert-row-bar {
  width: 4px;
  flex-shrink: 0;
  align-self: stretch;
  min-height: 44px;
  border-radius: 0 2px 2px 0;
  margin-right: 10px;
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
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
}
.alert-tag--red {
  display: inline-flex;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 600;
  color: rgb(var(--danger-6, 245 63 63));
  background: var(--color-danger-light-1);
  border-radius: 4px;
  flex-shrink: 0;
}
.alert-tag--amber {
  display: inline-flex;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 600;
  color: rgb(var(--warning-6, 255 125 0));
  background: var(--color-warning-light-1);
  border-radius: 4px;
  flex-shrink: 0;
}
.alert-row-identity {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  flex: 1 1 140px;
}
.alert-row-name,
.alert-row-class {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.alert-row-class {
  font-size: 13px;
}
.alert-row-scale-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.alert-row-scale {
  font-size: 13px;
  color: var(--color-text-3);
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.alert-score-green {
  display: inline-flex;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #047857;
  background: #d1fae5;
  border-radius: 4px;
}
.alert-row-aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
  padding-left: 8px;
}
.alert-row-time {
  font-size: 11px;
  color: var(--color-text-4);
  white-space: nowrap;
}
.alert-row-action {
  height: 28px;
  padding: 0 10px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: default;
}
.alert-row-action--red {
  background: var(--color-danger-6);
  color: #fff;
}
.alert-row-action--amber {
  background: var(--color-warning-6);
  color: #fff;
}
</style>
