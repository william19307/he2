<template>
  <div class="page-wrap">
    <h2 class="page-title" style="margin-bottom:16px">班级看板</h2>
    <a-space wrap style="margin-bottom: 20px">
      <a-select
        v-model="classId"
        placeholder="选择班级"
        allow-clear
        style="width: 200px"
        @change="loadBoard"
      >
        <a-option v-for="c in flatClasses" :key="c.id" :value="c.id">{{ c.label }}</a-option>
      </a-select>
      <a-select
        v-model="planId"
        placeholder="选择测评计划"
        allow-clear
        style="width: 260px"
        @change="loadBoard"
      >
        <a-option v-for="p in plans" :key="p.id" :value="p.id">{{ p.title }}</a-option>
      </a-select>
      <a-button type="primary" :loading="loading" @click="loadBoard">刷新</a-button>
    </a-space>

    <template v-if="data.class">
      <a-alert v-if="data.auto_insight && data.auto_insight.length > 20" type="warning" style="margin-bottom: 16px">
        {{ data.auto_insight }}
      </a-alert>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-card title="风险分布" :bordered="false">
            <svg viewBox="0 0 120 120" class="donut">
              <path
                v-for="(seg, i) in donutSegs"
                :key="i"
                :d="seg.d"
                :fill="seg.color"
                stroke="#fff"
                stroke-width="1"
              />
            </svg>
            <div class="legend">
              <span><i class="dot-green" />正常 {{ data.risk_distribution?.normal ?? 0 }}</span>
              <span><i class="dot-warn" />关注 {{ data.risk_distribution?.yellow ?? 0 }}</span>
              <span><i class="dot-danger" />高风险 {{ data.risk_distribution?.red ?? 0 }}</span>
              <span><i class="dot-muted" />未完成 {{ data.risk_distribution?.incomplete ?? 0 }}</span>
            </div>
          </a-card>
        </a-col>
        <a-col :span="16">
          <a-card title="量表均分：班级 vs 年级" :bordered="false">
            <div class="bar-wrap">
              <div v-for="s in data.scale_scores || []" :key="s.scale_id" class="bar-row">
                <div class="bar-name">{{ s.scale_short }}</div>
                <div class="bars">
                  <div class="bar-item">
                    <span>班 {{ s.class_avg }}</span>
                    <div class="track"><div class="fill class" :style="{ width: barW(s.class_avg) }" /></div>
                  </div>
                  <div class="bar-item">
                    <span>年级 {{ s.grade_avg }}</span>
                    <div class="track"><div class="fill grade" :style="{ width: barW(s.grade_avg) }" /></div>
                  </div>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <a-card title="学生明细" :bordered="false" style="margin-top: 16px">
        <a-table :data="data.students || []" :pagination="false" size="small" row-key="id">
          <template #columns>
            <a-table-column title="姓名" :width="100">
              <template #cell="{ record }">
                <a-link @click="$router.push(`/dashboard/student/${record.id}`)">{{ record.name }}</a-link>
              </template>
            </a-table-column>
            <a-table-column title="学号" data-index="student_no" :width="120" />
            <a-table-column title="综合状态" :width="100">
              <template #cell="{ record }">
                <span :class="statusClass(record.overall_status)">{{ statusText(record.overall_status) }}</span>
              </template>
            </a-table-column>
            <a-table-column title="各量表得分">
              <template #cell="{ record }">
                <span v-for="(v, k) in record.scores || {}" :key="k" class="score-pill" :class="pillClass(v)">
                  {{ k }}:{{ v.score }}
                </span>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </a-card>
      <!-- 历史趋势对比 -->
      <a-card title="历史趋势对比" :bordered="false" style="margin-top: 16px">
        <template #extra>
          <a-select
            v-model="comparePlanIds"
            placeholder="选择对比计划（最多3个）"
            multiple
            :max-tag-count="3"
            style="width: 400px"
            @change="loadCompare"
          >
            <a-option v-for="p in plans" :key="p.id" :value="p.id">{{ p.title }}</a-option>
          </a-select>
        </template>

        <template v-if="compareData.plans?.length">
          <div class="compare-chart">
            <svg :viewBox="`0 0 ${cmpW} ${cmpH}`" class="cmp-svg">
              <line
                v-for="(g, i) in cmpGridLines"
                :key="'cg'+i"
                :x1="cmpPad"
                :y1="g"
                :x2="cmpW - cmpPad"
                :y2="g"
                stroke="#eee"
                stroke-dasharray="4"
              />
              <g v-for="(trend, ti) in compareData.scale_trends || []" :key="'t'+ti">
                <polyline
                  :points="cmpLinePoints(trend).map(p => `${p.x},${p.y}`).join(' ')"
                  fill="none"
                  :stroke="cmpColors[ti % cmpColors.length]"
                  stroke-width="2"
                />
                <circle
                  v-for="(p, pi) in cmpLinePoints(trend)"
                  :key="'c'+pi"
                  :cx="p.x"
                  :cy="p.y"
                  r="4"
                  :fill="cmpColors[ti % cmpColors.length]"
                />
              </g>
              <text
                v-for="(p, pi) in compareData.plans || []"
                :key="'xl'+pi"
                :x="cmpXPos(pi)"
                :y="cmpH - 4"
                text-anchor="middle"
                font-size="11"
                fill="#666"
              >
                {{ p.title?.slice(0, 8) }}
              </text>
            </svg>
            <div class="cmp-legend">
              <span v-for="(trend, ti) in compareData.scale_trends || []" :key="'lg'+ti" class="leg-item">
                <i :style="{ background: cmpColors[ti % cmpColors.length] }" />
                {{ trend.scale_short }}
              </span>
            </div>
          </div>

          <h4 style="margin:16px 0 8px">性别对比</h4>
          <a-table :data="genderRows" :pagination="false" size="small" row-key="scale">
            <template #columns>
              <a-table-column title="量表" data-index="scale" />
              <a-table-column title="男生均分" data-index="male" />
              <a-table-column title="女生均分" data-index="female" />
              <a-table-column title="差值（男-女）">
                <template #cell="{ record }">
                  <span :style="{ color: record.diff < 0 ? '#ef4444' : '#333' }">
                    {{ record.diff }}
                  </span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </template>
        <a-empty v-else description="请选择对比计划" />
      </a-card>
    </template>
    <a-empty v-else-if="!loading" description="请选择班级与计划" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import request from '@/utils/request'
import { getPlans } from '@/api/assessments'
import { getGrades } from '@/api/students'
import { getClassCompare } from '@/api/dashboard'

const loading = ref(false)
const classId = ref(undefined)
const planId = ref(undefined)
const plans = ref([])
const flatClasses = ref([])
const data = ref({})

function polar(cx, cy, r, a1, a2) {
  const x1 = cx + r * Math.cos(a1)
  const y1 = cy + r * Math.sin(a1)
  const x2 = cx + r * Math.cos(a2)
  const y2 = cy + r * Math.sin(a2)
  const large = a2 - a1 > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
}

const donutSegs = computed(() => {
  const r = data.value.risk_distribution || {}
  const parts = [
    { v: r.normal || 0, color: 'var(--color-success-6, #10B981)' },
    { v: r.yellow || 0, color: 'var(--color-warning-6, #F59E0B)' },
    { v: r.red || 0, color: 'var(--color-danger-6, #EF4444)' },
    { v: r.incomplete || 0, color: 'var(--gray-400, #9CA3AF)' },
  ]
  const sum = parts.reduce((a, b) => a + b.v, 0) || 1
  let a = -Math.PI / 2
  const segs = []
  const cx = 60
  const cy = 60
  const rad = 50
  for (const p of parts) {
    if (!p.v) continue
    const span = (p.v / sum) * 2 * Math.PI
    const a2 = a + span
    segs.push({ d: polar(cx, cy, rad, a, a2), color: p.color })
    a = a2
  }
  return segs
})

function barW(score) {
  const m = 27
  return `${Math.min(100, Math.round((Number(score) / m) * 100))}%`
}

function statusClass(s) {
  if (s === 'high_risk') return 'text-red'
  if (s === 'attention') return 'text-orange'
  return 'text-green'
}

function statusText(s) {
  if (s === 'high_risk') return '高风险'
  if (s === 'attention') return '需关注'
  return '正常'
}

function pillClass(v) {
  if (v?.alert === 'red') return 'pill-red'
  if (v?.alert === 'yellow') return 'pill-yellow'
  return ''
}

async function loadClasses() {
  try {
    const gRes = await getGrades()
    const grades = gRes.data || []
    const opts = []
    for (const g of grades) {
      const cRes = await request.get(`/grades/${g.id}/classes`)
      const cls = cRes.data || []
      for (const c of cls) opts.push({ id: Number(c.id), label: `${g.name} · ${c.name}` })
    }
    flatClasses.value = opts
  } catch {
    flatClasses.value = []
  }
}

async function loadPlans() {
  try {
    const res = await getPlans({ page_size: 50, status: 'ongoing' })
    let list = res.data?.list || []
    if (!list.length) {
      const r2 = await getPlans({ page_size: 50 })
      list = r2.data?.list || []
    }
    plans.value = list.filter((p) => ['ongoing', 'published', 'completed'].includes(p.status))
  } catch {
    plans.value = []
  }
}

async function loadBoard() {
  if (!classId.value || !planId.value) {
    data.value = {}
    return
  }
  loading.value = true
  try {
    const res = await request.get(`/dashboard/class/${classId.value}`, {
      params: { plan_id: planId.value },
    })
    data.value = res.data || {}
  } catch {
    data.value = {}
  } finally {
    loading.value = false
  }
}

const comparePlanIds = ref([])
const compareData = ref({})
const cmpW = 600
const cmpH = 260
const cmpPad = 48
const cmpColors = ['#165dff', '#00b42a', '#ff7d00', '#722ed1', '#eb0aa4', '#14c9c9']

const cmpGridLines = computed(() => {
  const n = 5
  const h = cmpH - 2 * cmpPad
  return Array.from({ length: n }, (_, i) => cmpPad + (i / (n - 1)) * h)
})

function cmpXPos(index) {
  const n = compareData.value.plans?.length || 1
  const w = cmpW - 2 * cmpPad
  return cmpPad + (n <= 1 ? w / 2 : (index / (n - 1)) * w)
}

function cmpLinePoints(trend) {
  const plans = compareData.value.plans || []
  if (!plans.length) return []
  const maxVal = Math.max(
    ...((compareData.value.scale_trends || []).flatMap((t) =>
      (t.data || []).map((d) => d.class_avg)
    )),
    1
  )
  const h = cmpH - 2 * cmpPad
  return (trend.data || []).map((d, i) => ({
    x: cmpXPos(i),
    y: cmpPad + h - (d.class_avg / (maxVal * 1.2)) * h,
  }))
}

const genderRows = computed(() => {
  const gc = compareData.value.gender_compare || {}
  const male = gc.male || {}
  const female = gc.female || {}
  const allKeys = [...new Set([...Object.keys(male), ...Object.keys(female)])]
  return allKeys.map((scale) => {
    const m = male[scale] ?? 0
    const f = female[scale] ?? 0
    return {
      scale,
      male: m,
      female: f,
      diff: Math.round((m - f) * 10) / 10,
    }
  })
})

async function loadCompare() {
  if (!classId.value || !comparePlanIds.value?.length) {
    compareData.value = {}
    return
  }
  try {
    const res = await getClassCompare(classId.value, comparePlanIds.value)
    compareData.value = res.data || {}
  } catch {
    compareData.value = {}
  }
}

onMounted(async () => {
  await loadClasses()
  await loadPlans()
  if (plans.value[0]) planId.value = plans.value[0].id
  if (flatClasses.value[0]) classId.value = flatClasses.value[0].id
  loadBoard()
})
</script>

<style scoped>
.donut { width: 160px; height: 160px; display: block; margin: 0 auto; }

.legend { display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; margin-top: 12px; justify-content: center; }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; }
.dot-green { background: var(--color-success-6); }
.dot-warn { background: var(--color-warning-6); }
.dot-danger { background: var(--color-danger-6); }
.dot-muted { background: var(--gray-400); }

.bar-row { margin-bottom: 16px; }
.bar-name { font-weight: 600; margin-bottom: 6px; }
.bars { display: flex; flex-direction: column; gap: 6px; }
.track { height: 10px; background: var(--color-bg-1); border-radius: 4px; overflow: hidden; flex: 1; max-width: 400px; }
.fill { height: 100%; border-radius: 4px; }
.fill.class { background: var(--color-info-6); }
.fill.grade { background: var(--gray-400); }
.bar-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }

.text-red { color: var(--color-danger-6); font-weight: 600; }
.text-orange { color: var(--color-warning-6); }
.text-green { color: var(--color-success-6); }

.score-pill { display: inline-block; margin: 2px 6px 2px 0; padding: 2px 8px; background: var(--color-bg-1); border-radius: 4px; font-size: 12px; }
.pill-red { background: var(--alert-red-bg); color: var(--color-danger-6); }
.pill-yellow { background: var(--alert-yellow-bg); color: var(--color-warning-6); }

.compare-chart { margin-bottom: 16px; }
.cmp-svg { width: 100%; max-height: 260px; display: block; }
.cmp-legend { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; margin-top: 8px; }
.cmp-legend .leg-item { display: flex; align-items: center; gap: 4px; }
.cmp-legend i { display: inline-block; width: 12px; height: 3px; border-radius: 2px; }
</style>
