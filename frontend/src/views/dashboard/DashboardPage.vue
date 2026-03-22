<template>
  <div class="dash">
    <!-- 顶栏：标题 + 操作 -->
    <header class="dash-toolbar">
      <div class="dash-toolbar-left">
        <h1 class="dash-toolbar-title">工作台</h1>
        <span class="dash-date-chip">{{ todayDate }}</span>
      </div>
      <a-button class="btn-new-plan" type="primary" @click="router.push('/plans/create')">
        <template #icon>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </template>
        新建测评计划
      </a-button>
    </header>

    <!-- 欢迎横幅 -->
    <section class="dash-welcome-banner" aria-label="欢迎">
      <div class="dash-welcome-inner">
        <div class="dash-welcome-left">
          <div class="dash-welcome-copy">
            <h2 class="dash-welcome-heading">{{ timeGreeting }}，{{ displayName }}老师</h2>
            <p class="dash-welcome-sub">
              今日有
              <span class="dash-welcome-count" :class="{ 'dash-welcome-count--warn': pendingTotal > 0 }">{{ pendingTotal }}</span>
              项待处理 · 与学校一同守护学生心理健康成长
            </p>
          </div>
          <!-- 绿色植物 / 成长主题插画 -->
          <div class="dash-welcome-illust dash-welcome-illust--plant" aria-hidden="true">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="dash-svg-plant">
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
        <div class="dash-welcome-art" aria-hidden="true">
          <!-- 校园氛围：渐变 + 抽象建筑与书本（非照片） -->
          <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="dash-svg-campus">
            <defs>
              <linearGradient id="campusSky" x1="0" y1="0" x2="200" y2="120" gradientUnits="userSpaceOnUse">
                <stop stop-color="#B8E0D2"/>
                <stop offset=".45" stop-color="#E8F5F0"/>
                <stop offset="1" stop-color="#F0FAF7"/>
              </linearGradient>
              <linearGradient id="campusGround" x1="100" y1="85" x2="100" y2="120" gradientUnits="userSpaceOnUse">
                <stop stop-color="#9DCFBF" stop-opacity=".5"/>
                <stop offset="1" stop-color="#C8E6D9" stop-opacity=".35"/>
              </linearGradient>
            </defs>
            <rect width="200" height="120" rx="12" fill="url(#campusSky)"/>
            <rect y="78" width="200" height="42" fill="url(#campusGround)"/>
            <path d="M24 78V48h28l8-10 8 10h28v30" stroke="#2D7A6A" stroke-width="2" fill="#fff" fill-opacity=".85"/>
            <path d="M120 78V52h18l6-8 6 8h18v26" stroke="#24655A" stroke-width="1.8" fill="#fff" fill-opacity=".9"/>
            <rect x="152" y="58" width="36" height="20" rx="2" fill="#fff" fill-opacity=".7" stroke="#2D7A6A" stroke-width="1.2"/>
            <path d="M158 64h24M158 68h18" stroke="#2D7A6A" stroke-width="1" opacity=".5"/>
            <circle cx="170" cy="42" r="10" fill="#FDE68A" opacity=".9"/>
            <circle cx="48" cy="36" r="3" fill="#fff" opacity=".8"/>
            <circle cx="62" cy="30" r="2" fill="#fff" opacity=".6"/>
            <ellipse cx="100" cy="92" rx="40" ry="6" fill="#2D7A6A" opacity=".12"/>
          </svg>
        </div>
      </div>
    </section>

    <!-- KPI 卡片行 -->
    <a-spin :loading="loadingOverview" class="kpi-row-spin">
      <div class="kpi-row">
        <!-- 本周测评 → 测评计划列表 -->
        <router-link
          class="kpi-card kpi-card--green kpi-card--link"
          :class="{ 'kpi-card--force-hover': kpiHoverDemo }"
          to="/plans"
        >
          <span class="kpi-card-arrow" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M5 9l4-4M6 5h3v3"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <div class="kpi-card-top">
            <span class="kpi-card-label">本周测评人次</span>
            <span class="kpi-badge kpi-badge--green"
              :class="overview.weekly_rate_change >= 0 ? '' : 'kpi-badge--red'"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path v-if="overview.weekly_rate_change >= 0"
                  d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path v-else
                  d="M5 2v6M2 5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ overview.weekly_rate_change >= 0 ? '+' : '' }}{{ overview.weekly_rate_change }}%
            </span>
          </div>
          <div class="kpi-card-num">{{ overview.weekly_assessment_count }}</div>
          <div class="kpi-card-sub">覆盖率约 {{ Math.round((overview.weekly_assessment_rate || 0) * 1000) / 10 }}%</div>
          <svg class="kpi-spark" viewBox="0 0 80 32" preserveAspectRatio="none">
            <polyline
              :points="sparkPoints(sparkWeekly, 80, 32)"
              fill="none" stroke="rgba(16,185,129,0.5)" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"
            />
          </svg>
        </router-link>

        <!-- 红色预警 → 红色待处理 -->
        <router-link
          class="kpi-card kpi-card--red kpi-card--link"
          :class="{ 'kpi-card--force-hover': kpiHoverDemo }"
          :to="{ path: '/alerts', query: { level: 'red', status: 'pending' } }"
        >
          <span class="kpi-card-arrow" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M5 9l4-4M6 5h3v3"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <div class="kpi-card-top">
            <span class="kpi-card-label">红色预警</span>
            <span class="kpi-badge kpi-badge--red-pill">待处理</span>
          </div>
          <div class="kpi-card-num">{{ overview.red_alert_pending }}</div>
          <div class="kpi-card-sub">24h 内完成初评</div>
          <svg class="kpi-spark" viewBox="0 0 80 32" preserveAspectRatio="none">
            <polyline
              :points="sparkPoints(sparkRed, 80, 32)"
              fill="none" stroke="rgba(239,68,68,0.5)" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"
            />
          </svg>
        </router-link>

        <!-- 黄色预警 -->
        <router-link
          class="kpi-card kpi-card--amber kpi-card--link"
          :class="{ 'kpi-card--force-hover': kpiHoverDemo }"
          :to="{ path: '/alerts', query: { level: 'yellow' } }"
        >
          <span class="kpi-card-arrow" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M5 9l4-4M6 5h3v3"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <div class="kpi-card-top">
            <span class="kpi-card-label">黄色预警</span>
            <span class="kpi-badge kpi-badge--amber-pill">跟进中</span>
          </div>
          <div class="kpi-card-num">{{ overview.yellow_alert_processing }}</div>
          <div class="kpi-card-sub">超期 {{ overview.yellow_alert_overdue }} 条</div>
          <svg class="kpi-spark" viewBox="0 0 80 32" preserveAspectRatio="none">
            <polyline
              :points="sparkPoints(sparkYellow, 80, 32)"
              fill="none" stroke="rgba(245,158,11,0.5)" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"
            />
          </svg>
        </router-link>

        <!-- 在跟进个案 → 个案管理 -->
        <router-link
          class="kpi-card kpi-card--blue kpi-card--link"
          :class="{ 'kpi-card--force-hover': kpiHoverDemo }"
          to="/cases"
        >
          <span class="kpi-card-arrow" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M5 9l4-4M6 5h3v3"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <div class="kpi-card-top">
            <span class="kpi-card-label">在跟进个案</span>
            <span class="kpi-badge kpi-badge--blue-pill">+{{ overview.case_new_this_week }} 本周</span>
          </div>
          <div class="kpi-card-num">{{ overview.case_active }}</div>
          <div class="kpi-card-sub">本月结案 {{ overview.case_closed_this_month }} 个</div>
          <svg class="kpi-spark" viewBox="0 0 80 32" preserveAspectRatio="none">
            <polyline
              :points="sparkPoints(sparkCase, 80, 32)"
              fill="none" stroke="rgba(59,130,246,0.5)" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"
            />
          </svg>
        </router-link>
      </div>
    </a-spin>

    <!-- 本周统计条（全宽） -->
    <a-spin :loading="loadingWeek" class="week-strip-spin">
      <div class="week-strip">
        <div class="week-strip-item">
          <span class="week-strip-num week-strip-num--red">{{ weeklyStats.newAlerts }}</span>
          <span class="week-strip-label">新增预警</span>
        </div>
        <div class="week-strip-divider" />
        <div class="week-strip-item">
          <span class="week-strip-num week-strip-num--green">{{ weeklyStats.resolved }}</span>
          <span class="week-strip-label">已处置</span>
        </div>
        <div class="week-strip-divider" />
        <div class="week-strip-item">
          <span class="week-strip-num week-strip-num--blue">{{ weeklyStats.newCases }}</span>
          <span class="week-strip-label">新增个案</span>
        </div>
        <div class="week-strip-divider" />
        <div class="week-strip-item">
          <span class="week-strip-num week-strip-num--amber">{{ weeklyStats.sessions }}</span>
          <span class="week-strip-label">会谈次数</span>
        </div>
        <div class="week-strip-divider" />
        <div class="week-strip-item">
          <span class="week-strip-num">{{ weeklyStats.parentComms }}</span>
          <span class="week-strip-label">家长沟通</span>
        </div>
        <div class="week-strip-divider" />
        <div class="week-strip-item">
          <span class="week-strip-num">{{ weeklyStats.notifications }}</span>
          <span class="week-strip-label">发出通知</span>
        </div>
      </div>
    </a-spin>

    <!-- 主内容区 -->
    <div class="dash-body">
      <!-- 左栏 -->
      <div class="dash-col-main">
        <!-- 待处理预警 -->
        <section class="dash-section">
          <div class="section-head">
            <div class="section-head-left">
              <h2 class="section-title">待处理预警</h2>
              <span v-if="pendingTotal > 0" class="section-badge">{{ pendingTotal }}</span>
            </div>
            <a class="section-more" @click="router.push('/alerts')">
              全部预警
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
          <a-spin :loading="loadingAlerts">
            <div v-if="!displayAlerts.length" class="section-empty">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" stroke="#D1D5DB" stroke-width="1.5"/><path d="M16 10v6M16 20v1" stroke="#D1D5DB" stroke-width="2" stroke-linecap="round"/></svg>
              <span>暂无待处理预警</span>
            </div>
            <div v-else class="alert-grid">
              <div
                v-for="alert in displayAlerts"
                :key="alert.id"
                class="alert-tile"
                :class="alert.level === 'red' ? 'alert-tile--red' : 'alert-tile--amber'"
              >
                <div class="alert-tile-accent" aria-hidden="true" />
                <div class="alert-tile-avatar" :title="alert.studentName">
                  {{ studentInitial(alert.studentName) }}
                </div>
                <div class="alert-tile-body">
                  <div class="alert-tile-top">
                    <span class="alert-tile-name">{{ alert.studentName }}</span>
                    <span class="alert-tile-time-rel">{{ alert.timeAgo || '—' }}</span>
                  </div>
                  <div class="alert-tile-scoreline">
                    {{ alert.scaleName }}
                    <template v-if="alert.score != null">
                      （{{ alert.score }}/{{ alert.totalScore }}）
                    </template>
                  </div>
                  <div class="alert-tile-foot">
                    <span class="alert-tile-time-abs">{{ alert.triggerTime }}</span>
                    <button
                      type="button"
                      class="alert-tile-btn"
                      :class="alert.level === 'red' ? 'alert-tile-btn--red' : 'alert-tile-btn--amber'"
                      @click="router.push(`/alerts/${alert.id}`)"
                    >
                      {{ alert.status === 'pending' ? '立即处理' : '查看详情' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </a-spin>
        </section>

        <!-- 进行中测评 -->
        <section class="dash-section">
          <div class="section-head">
            <div class="section-head-left">
              <h2 class="section-title">进行中测评</h2>
            </div>
            <a class="section-more" @click="router.push('/plans/create')">
              新建
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
          <a-spin :loading="loadingPlans">
            <div v-if="!assessmentPlans.length" class="section-empty">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" stroke="#D1D5DB" stroke-width="1.5"/><path d="M10 16h12M16 10v12" stroke="#D1D5DB" stroke-width="2" stroke-linecap="round"/></svg>
              <span>暂无进行中的测评</span>
            </div>
            <div v-else class="plan-list">
              <div v-for="plan in assessmentPlans" :key="plan.id" class="plan-item">
                <div class="plan-item-head">
                  <span class="plan-item-name">{{ plan.name }}</span>
                  <span v-if="plan.urgent" class="plan-urgent">即将截止</span>
                </div>
                <div class="plan-progress-wrap">
                  <div class="plan-progress-bar">
                    <div class="plan-progress-fill" :style="{ width: plan.progress + '%' }" />
                  </div>
                  <span class="plan-progress-text">{{ plan.completed }}/{{ plan.total }}</span>
                </div>
                <div class="plan-item-foot">
                  <span class="plan-deadline">截止 {{ plan.deadline }}</span>
                  <span class="plan-percent">{{ plan.progress }}%</span>
                </div>
              </div>
            </div>
          </a-spin>
        </section>
      </div>

      <!-- 右栏 -->
      <div class="dash-col-side">
        <!-- 待办提醒 -->
        <section class="side-card">
          <div class="side-card-head">
            <h3 class="side-card-title">待办提醒</h3>
            <span class="side-card-count">{{ todoItems.length }}</span>
          </div>
          <ul class="todo-list">
            <li v-for="item in todoItems" :key="item.id" class="todo-item">
              <span
                class="todo-dot"
                :class="`todo-dot--${item.dotColor || todoDotColor(item)}`"
              />
              <span class="todo-text">{{ item.text }}</span>
              <span
                class="todo-time"
                :class="{ 'todo-time--overdue': item.overdue }"
              >{{ item.dueTime }}</span>
            </li>
          </ul>
        </section>

        <!-- 风险趋势图 -->
        <section class="side-card side-card--chart">
          <h3 class="side-card-title side-card-title--mb">风险趋势（近30天）</h3>
          <a-spin :loading="loadingTrend">
            <div ref="trendWrapRef" class="trend-wrap">
              <canvas ref="trendCanvasRef" class="trend-canvas" />
            </div>
            <div class="trend-legend">
              <span class="trend-legend-item trend-legend-item--red">
                <span class="trend-legend-dot" />红色 {{ trendRedSum }}
              </span>
              <span class="trend-legend-item trend-legend-item--amber">
                <span class="trend-legend-dot" />黄色 {{ trendYellowSum }}
              </span>
            </div>
          </a-spin>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { todoItems } from '@/mock/data'
import { useAuthStore } from '@/stores/auth'
import * as dashboardApi from '@/api/dashboard'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

/** 截图用：访问 /dashboard?kpiHover=1 时展示 KPI 卡片 hover 态 */
const kpiHoverDemo = computed(() => route.query.kpiHover === '1')

function todoDotColor(item) {
  if (item.type === 'alert' || item.priority === 'high') return 'red'
  if (item.type === 'follow' || item.priority === 'medium') return 'amber'
  return 'gray'
}

/** 头像占位圆内文字：取姓名首字 */
function studentInitial(name) {
  const s = (name || '').trim()
  if (!s.length) return '?'
  return s[0]
}

function buildSpark7(endVal) {
  const e = Math.max(0, Number(endVal) || 0)
  if (e === 0) return [0, 0, 0, 0, 0, 0, 0]
  const start = Math.max(0, Math.round(e * 0.6))
  const out = []
  for (let i = 0; i < 7; i++) {
    const t = i / 6
    const wobble = Math.sin(i * 1.2) * e * 0.07
    out.push(Math.max(0, Math.round(start + (e - start) * t + wobble)))
  }
  out[6] = Math.round(e)
  return out
}

function sparkPoints(values, w = 80, h = 32) {
  const arr = values?.length ? values : [0, 0, 0, 0, 0, 0, 0]
  const max = Math.max(...arr, 1)
  const min = Math.min(...arr)
  const range = Math.max(max - min, 1e-6)
  const pad = 3
  return arr.map((v, i) => {
    const x = pad + (i / 6) * (w - 2 * pad)
    const y = pad + (1 - (v - min) / range) * (h - 2 * pad)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

const displayName = computed(() => auth.realName || '老师')
const todayDate = computed(() => {
  const d = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
})
const timeGreeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const overview = ref({
  weekly_assessment_count: 0, weekly_assessment_rate: 0, weekly_rate_change: 0,
  red_alert_pending: 0, yellow_alert_processing: 0, yellow_alert_overdue: 0,
  case_active: 0, case_new_this_week: 0, case_closed_this_month: 0,
})
const sparkWeekly = computed(() => buildSpark7(overview.value.weekly_assessment_count))
const sparkRed = computed(() => buildSpark7(overview.value.red_alert_pending))
const sparkYellow = computed(() => buildSpark7(overview.value.yellow_alert_processing))
const sparkCase = computed(() => buildSpark7(overview.value.case_active))

const loadingOverview = ref(true)
const loadingAlerts = ref(true)
const loadingPlans = ref(true)
const loadingWeek = ref(true)
const loadingTrend = ref(true)
const pendingTotal = ref(0)
const displayAlerts = ref([])
const assessmentPlans = ref([])
const weeklyStats = ref({ newAlerts: 0, resolved: 0, newCases: 0, sessions: 0, parentComms: 0, notifications: 0 })
const trendDates = ref([])
const trendRed = ref([])
const trendYellow = ref([])
const trendRedSum = computed(() => trendRed.value.reduce((a, b) => a + b, 0))
const trendYellowSum = computed(() => trendYellow.value.reduce((a, b) => a + b, 0))
const trendCanvasRef = ref(null)
const trendWrapRef = ref(null)

function formatAlertTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function mapOverview(d) {
  overview.value = {
    weekly_assessment_count: d.weekly_assessment_count ?? 0,
    weekly_assessment_rate: d.weekly_assessment_rate ?? 0,
    weekly_rate_change: d.weekly_rate_change ?? 0,
    red_alert_pending: d.red_alert_pending ?? 0,
    yellow_alert_processing: d.yellow_alert_processing ?? 0,
    yellow_alert_overdue: d.yellow_alert_overdue ?? 0,
    case_active: d.case_active ?? 0,
    case_new_this_week: d.case_new_this_week ?? 0,
    case_closed_this_month: d.case_closed_this_month ?? 0,
  }
}

function mapAlerts(data) {
  pendingTotal.value = data.total_pending ?? 0
  displayAlerts.value = (data.list || []).map((a) => ({
    id: a.id,
    level: a.alert_level === 'red' ? 'red' : 'yellow',
    status: a.status || 'pending',
    studentName: a.student_name,
    className: a.class_name,
    scaleName: a.scale_short || a.scale_name,
    score: a.trigger_score,
    totalScore: a.max_score,
    triggerTime: formatAlertTime(a.created_at),
    timeAgo: a.time_ago,
    reason: a.trigger_reason,
  }))
}

function mapPlans(data) {
  assessmentPlans.value = (data.list || []).map((p) => {
    const end = p.end_time ? new Date(p.end_time) : null
    const deadline = end
      ? `${end.getMonth() + 1}/${String(end.getDate()).padStart(2, '0')}`
      : '—'
    return {
      id: p.id, name: p.title,
      progress: Math.min(100, Math.round((p.completion_rate || 0) * 100)),
      completed: p.completed_count, total: p.total_targets,
      deadline, urgent: !!p.is_urgent,
    }
  })
}

function mapWeek(d) {
  weeklyStats.value = {
    newAlerts: d.new_alerts ?? 0, resolved: d.handled_alerts ?? 0,
    newCases: d.new_cases ?? 0, sessions: d.consult_sessions ?? 0,
    parentComms: d.parent_communications ?? 0, notifications: d.notifications_sent ?? 0,
  }
}

function drawTrend() {
  const canvas = trendCanvasRef.value
  const wrap = trendWrapRef.value
  if (!canvas || !wrap || !trendDates.value.length) return
  const dpr = window.devicePixelRatio || 1
  const w = wrap.clientWidth || 320
  const h = 140
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)

  const pL = 4, pR = 4, pT = 8, pB = 16
  const iW = w - pL - pR
  const iH = h - pT - pB
  const reds = trendRed.value
  const yellows = trendYellow.value
  const maxY = Math.max(1, ...reds, ...yellows)

  // grid lines
  ctx.strokeStyle = '#F3F4F6'
  ctx.lineWidth = 1
  for (let i = 0; i <= 3; i++) {
    const y = pT + (iH * i) / 3
    ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(pL + iW, y); ctx.stroke()
  }

  function lineSeries(arr, color, shadow) {
    if (!arr.length) return
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.shadowColor = shadow
    ctx.shadowBlur = 4
    arr.forEach((v, i) => {
      const x = pL + (iW * i) / Math.max(arr.length - 1, 1)
      const y = pT + iH * (1 - v / maxY)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
    ctx.shadowBlur = 0
  }
  lineSeries(yellows, '#F59E0B', 'rgba(245,158,11,0.3)')
  lineSeries(reds, '#EF4444', 'rgba(239,68,68,0.3)')
}

let resizeObs = null

async function loadOverview() {
  loadingOverview.value = true
  try { const res = await dashboardApi.getDashboardOverview(); mapOverview(res.data || {}) } finally { loadingOverview.value = false }
}
async function loadAlerts() {
  loadingAlerts.value = true
  try { const res = await dashboardApi.getPendingAlerts({ limit: 5 }); mapAlerts(res.data || {}) } finally { loadingAlerts.value = false }
}
async function loadPlans() {
  loadingPlans.value = true
  try { const res = await dashboardApi.getActivePlans({ limit: 3 }); mapPlans(res.data || {}) } finally { loadingPlans.value = false }
}
async function loadWeek() {
  loadingWeek.value = true
  try { const res = await dashboardApi.getWeekStats(); mapWeek(res.data || {}) } finally { loadingWeek.value = false }
}
async function loadTrend() {
  loadingTrend.value = true
  try {
    const res = await dashboardApi.getAlertTrend({ days: 30 })
    const d = res.data || {}
    trendDates.value = d.dates || []
    trendRed.value = d.red_counts || []
    trendYellow.value = d.yellow_counts || []
    await nextTick(); drawTrend()
  } finally { loadingTrend.value = false }
}

let pollTimer = null
onMounted(async () => {
  await Promise.all([loadOverview(), loadAlerts(), loadPlans(), loadWeek(), loadTrend()])
  pollTimer = setInterval(loadAlerts, 60_000)
  await nextTick()
  if (trendWrapRef.value) {
    resizeObs = new ResizeObserver(() => drawTrend())
    resizeObs.observe(trendWrapRef.value)
  }
})
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (resizeObs) resizeObs.disconnect()
})
watch([trendDates, trendRed, trendYellow], () => nextTick().then(drawTrend))
</script>

<style scoped>
/* ========== 设计令牌（映射到全局变量）========== */
.dash {
  --c1: var(--color-text-1);
  --c2: var(--color-text-3);
  --c3: var(--gray-400);
  --border: var(--color-border-1);
  --bg-page: var(--color-bg-1);
  --bg-card: var(--color-bg-white, #fff);
  --radius: var(--radius-lg, 12px);
  --gap: 16px;
  --pad: 20px;

  min-height: 100%;
  padding: 28px 28px 32px;
  background: var(--bg-page);
  color: var(--c1);
  line-height: 1.6;
  box-sizing: border-box;
}

/* ========== 顶栏 + 欢迎横幅 ========== */
.dash-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
}

.dash-toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dash-toolbar-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--c1);
  line-height: 1.3;
}

.dash-date-chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  background: var(--color-bg-1);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 12px;
  color: var(--c2);
  font-weight: 500;
}

.dash-welcome-banner {
  min-height: 160px;
  margin: 0 -28px 20px;
  padding: 0 28px;
  background: linear-gradient(135deg, #e8f5f0 0%, #f0faf7 100%);
  border-bottom: 1px solid rgba(45, 122, 106, 0.12);
  box-sizing: border-box;
}

.dash-welcome-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 160px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 0;
}

.dash-welcome-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  flex: 1;
}

.dash-welcome-copy {
  min-width: 0;
}

.dash-welcome-heading {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: var(--c1);
  line-height: 1.35;
}

.dash-welcome-sub {
  margin: 0;
  font-size: 14px;
  color: var(--c2);
  line-height: 1.55;
}

.dash-welcome-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  margin: 0 2px;
  border-radius: 11px;
  font-size: 13px;
  font-weight: 700;
  background: var(--color-bg-white);
  color: var(--color-primary-6);
  border: 1px solid rgba(45, 122, 106, 0.25);
  vertical-align: middle;
}

.dash-welcome-count--warn {
  background: var(--alert-red-bg);
  border-color: var(--alert-red-border);
  color: var(--color-danger-6);
}

.dash-welcome-illust {
  flex-shrink: 0;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dash-svg-plant {
  width: 100%;
  height: 100%;
}

.dash-welcome-art {
  flex-shrink: 0;
  width: min(240px, 38vw);
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(15, 29, 25, 0.08);
}

.dash-svg-campus {
  width: 100%;
  height: 100%;
  display: block;
}

@media (max-width: 768px) {
  .dash-welcome-banner {
    margin: 0 -16px 16px;
    padding: 0 16px;
  }
  .dash-welcome-inner {
    flex-direction: column;
    align-items: flex-start;
    min-height: auto;
    padding: 12px 0;
  }
  .dash-welcome-art {
    width: 100%;
    max-width: 280px;
  }
}

.btn-new-plan {
  height: 36px !important;
  padding: 0 16px !important;
  font-size: 13.5px !important;
  border-radius: 8px !important;
  background: var(--color-primary-5) !important;
  border-color: var(--color-primary-5) !important;
  font-weight: 500 !important;
  gap: 6px;
}
.btn-new-plan:hover {
  background: var(--color-primary-6) !important;
  border-color: var(--color-primary-6) !important;
}

/* ========== KPI 行 ========== */
.kpi-row-spin { width: 100%; margin-bottom: var(--gap); }

.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.kpi-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 16px 12px;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

/* 可点击 KPI：手型、上移、右上角箭头 */
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

/* 左侧色条 */
.kpi-card::before {
  content: '';
  position: absolute;
  left: 0; top: 12px; bottom: 12px;
  width: 3px;
  border-radius: 0 2px 2px 0;
}
.kpi-card--green::before { background: var(--color-success-6); }
.kpi-card--red::before { background: var(--color-danger-6); }
.kpi-card--amber::before { background: var(--color-warning-6); }
.kpi-card--blue::before { background: var(--color-info-6); }

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
.kpi-badge--green { background: var(--alert-green-bg); color: var(--alert-green-text); }
.kpi-badge--red { background: var(--alert-red-bg); color: var(--color-danger-6); }
.kpi-badge--red-pill { background: var(--alert-red-bg); color: var(--color-danger-6); }
.kpi-badge--amber-pill { background: var(--alert-yellow-bg); color: var(--alert-yellow-text); }
.kpi-badge--blue-pill { background: var(--alert-blue-bg); color: var(--alert-blue-text); }

.kpi-card-num {
  font-family: 'DIN Alternate', 'Helvetica Neue', 'Arial Narrow', sans-serif;
  font-size: 38px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  margin-bottom: 4px;
}

.kpi-card--green .kpi-card-num {
  color: var(--color-success-6);
}
.kpi-card--red .kpi-card-num {
  color: var(--color-danger-6);
}
.kpi-card--amber .kpi-card-num {
  color: var(--color-warning-6);
}
.kpi-card--blue .kpi-card-num {
  color: var(--color-info-6);
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

/* ========== 全宽统计条 ========== */
.week-strip-spin { width: 100%; margin-bottom: var(--gap); }

.week-strip {
  display: grid;
  grid-template-columns: repeat(11, auto);
  align-items: center;
  justify-content: space-between;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 24px;
  gap: 0;
}

.week-strip-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
}

.week-strip-num {
  font-family: 'DIN Alternate', 'Helvetica Neue', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: var(--c1);
  line-height: 1;
}
.week-strip-num--red { color: var(--color-danger-6); }
.week-strip-num--green { color: var(--color-success-6); }
.week-strip-num--blue { color: var(--color-info-6); }
.week-strip-num--amber { color: var(--color-warning-6); }

.week-strip-label {
  font-size: 12px;
  color: var(--c3);
  white-space: nowrap;
}

.week-strip-divider {
  width: 1px;
  height: 32px;
  background: var(--border);
}

/* ========== 主体二栏 ========== */
.dash-body {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: var(--gap);
  align-items: stretch;
}

.dash-col-main {
  display: flex;
  flex-direction: column;
}

.dash-col-main .dash-section:last-child {
  flex: 1;
  margin-bottom: 0;
}

/* ========== Spin 撑满宽度 ========== */
.dash-section :deep(.arco-spin),
.side-card :deep(.arco-spin),
.week-strip-spin :deep(.arco-spin) {
  display: block;
  width: 100%;
}

/* ========== 通用 section ========== */
.dash-section { margin-bottom: var(--gap); }

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--c1);
}

.section-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  background: var(--alert-red-bg);
  color: var(--color-danger-6);
  border: 1px solid var(--alert-red-border);
}

.section-more {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12.5px;
  color: var(--color-primary-5);
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.15s;
}
.section-more:hover { opacity: 0.75; }

.section-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 0;
  color: var(--c3);
  font-size: 13.5px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

/* ========== 待处理预警 · 两列网格卡片 ========== */
.alert-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 900px) {
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
  background: var(--bg-card);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
  transition: box-shadow 0.18s, transform 0.18s;
  overflow: hidden;
}

.alert-tile:hover {
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.alert-tile-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--c1);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alert-tile-time-rel {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--c3);
}

.alert-tile-scoreline {
  font-size: 13px;
  color: var(--c2);
  line-height: 1.4;
  word-break: break-word;
}

.alert-tile-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 2px;
}

.alert-tile-time-abs {
  font-size: 11px;
  color: var(--c3);
}

.alert-tile-btn {
  flex-shrink: 0;
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  color: #fff;
}

.alert-tile-btn--red {
  background: var(--color-danger-6);
}

.alert-tile-btn--red:hover {
  background: #dc2626;
}

.alert-tile-btn--amber {
  background: var(--color-warning-6);
}

.alert-tile-btn--amber:hover {
  background: #d97706;
}

/* ========== 测评列表 ========== */
.plan-list {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.plan-item {
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-bg-2);
}
.plan-item:last-child { border-bottom: none; }

.plan-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.plan-item-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--c1);
}

.plan-urgent {
  display: inline-block;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 600;
  color: var(--alert-red-text);
  background: var(--alert-red-bg);
  border-radius: 5px;
}

.plan-progress-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.plan-progress-bar {
  flex: 1;
  height: 5px;
  background: var(--color-bg-1);
  border-radius: 3px;
  overflow: hidden;
}

.plan-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-5) 0%, var(--sidebar-accent) 100%);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.plan-progress-text {
  font-size: 12px;
  color: var(--c3);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.plan-item-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.plan-deadline {
  font-size: 12px;
  color: var(--c3);
}

.plan-percent {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-primary-5);
}

/* ========== 右侧卡片 ========== */
.side-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: var(--gap);
}

.side-card-title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--c1);
}

.side-card-title--mb { margin-bottom: 12px; }

.side-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.side-card-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  background: var(--color-bg-1);
  color: var(--c2);
  border: 1px solid var(--border);
}

/* ===== 待办 ===== */
.todo-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  border-bottom: 1px solid var(--color-bg-2);
}
.todo-item:last-child { border-bottom: none; }

.todo-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.todo-dot--red { background: var(--color-danger-6); }
.todo-dot--amber { background: var(--color-warning-6); }
.todo-dot--yellow { background: var(--color-warning-6); }
.todo-dot--gray { background: var(--gray-300); }

.todo-text {
  flex: 1;
  font-size: 13px;
  color: var(--c1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-time {
  font-size: 11.5px;
  color: var(--c3);
  flex-shrink: 0;
}
.todo-time--overdue { color: var(--color-danger-6); font-weight: 600; }

/* ===== 趋势图 ===== */
.side-card--chart {}

.trend-wrap { width: 100%; }

.trend-canvas { display: block; width: 100%; }

.trend-legend {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  justify-content: center;
}

.trend-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--c2);
}

.trend-legend-dot {
  width: 8px;
  height: 3px;
  border-radius: 2px;
}

.trend-legend-item--red .trend-legend-dot { background: var(--color-danger-6); }
.trend-legend-item--amber .trend-legend-dot { background: var(--color-warning-6); }

/* ========== 响应式 ========== */
@media (max-width: 1280px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 1100px) {
  .dash-body { grid-template-columns: 1fr; }
  .dash-col-side { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--gap); }
  .side-card { margin-bottom: 0; }
  .side-card--chart { grid-column: 1 / -1; }
}

@media (max-width: 768px) {
  .dash {
    padding: 16px;
    --gap: 12px;
    --pad: 14px;
  }

  .dash-toolbar { flex-direction: column; align-items: stretch; gap: 12px; }
  .btn-new-plan { width: 100% !important; justify-content: center; }

  .dash-welcome-banner {
    margin: 0 -16px 16px;
    padding: 0 16px;
  }

  .kpi-row { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .kpi-card-num { font-size: 30px; }
  .kpi-card-sub { max-width: 100%; font-size: 11px; }

  .week-strip {
    grid-template-columns: repeat(5, auto);
    padding: 12px 16px;
    gap: 8px 0;
  }
  .week-strip-divider:nth-child(6) { display: none; }
  .week-strip-item { padding: 4px 8px; }
  .week-strip-num { font-size: 20px; }

  .dash-col-side { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .dash { padding: 12px; }
  .kpi-row { grid-template-columns: 1fr; }
  .kpi-spark { display: none; }
  .kpi-card-sub { max-width: 100%; }

  .week-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    padding: 12px;
  }
  .week-strip-divider { display: none; }
  .week-strip-item {
    padding: 8px 4px;
    background: var(--color-bg-2);
    border-radius: var(--radius-md);
  }
}
</style>
