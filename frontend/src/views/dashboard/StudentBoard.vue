<template>
  <div v-if="d.student" class="page-wrap">
    <a-page-header :title="`${d.student.name} · 档案看板`" @back="$router.back()">
      <template #subtitle>{{ d.student.class_name }} · {{ d.health_score_label }}</template>
    </a-page-header>

    <a-card title="多量表纵向趋势" :bordered="false" class="card">
      <svg v-if="long.labels?.length" :viewBox="`0 0 ${cw} ${ch}`" class="chart">
        <g v-for="(ds, di) in long.datasets" :key="di">
          <polyline
            :points="linePts(ds)"
            fill="none"
            :stroke="colors[di % colors.length]"
            stroke-width="2"
          />
        </g>
        <g v-for="(ev, ei) in long.events || []" :key="'e'+ei">
          <circle
            v-if="eventX(ev) != null"
            :cx="eventX(ev)"
            :cy="20"
            r="5"
            class="event-dot"
          />
        </g>
      </svg>
      <div class="chart-legend">
        <span v-for="(ds, di) in long.datasets" :key="di" class="leg">
          <i :style="{ background: colors[di % colors.length] }" />
          {{ ds.scale }}
        </span>
      </div>
    </a-card>

    <a-card title="能力雷达（当前 / 上次 / 基线）" :bordered="false" class="card">
      <svg :viewBox="`0 0 ${rw} ${rh}`" class="radar">
        <g v-for="(s, si) in radar.series || []" :key="si">
          <polygon
            :points="radarPoly(s.values)"
            fill="none"
            :stroke="radarColors[si]"
            stroke-width="2"
            opacity="0.85"
          />
        </g>
        <text
          v-for="(dim, i) in radar.dimensions || []"
          :key="'t'+i"
          :x="labelPos(i).x"
          :y="labelPos(i).y"
          font-size="10"
          text-anchor="middle"
        >
          {{ dim }}
        </text>
      </svg>
      <div class="chart-legend">
        <span v-for="(s, si) in radar.series || []" :key="si" class="leg">
          <i :style="{ background: radarColors[si] }" />
          {{ s.name }}
        </span>
      </div>
    </a-card>
  </div>
  <a-spin v-else style="padding: 48px" />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import request from '@/utils/request'

const route = useRoute()
const d = ref({})
const cw = 640
const ch = 200
const rw = 320
const rh = 280
const colors = ['#165dff', '#00b42a', '#ff7d00', '#722ed1']
const radarColors = ['#f53f3f', '#165dff', '#86909c']

const long = computed(() => d.value.longitudinal || { labels: [], datasets: [] })
const radar = computed(() => d.value.radar || { dimensions: [], series: [] })

function linePts(ds) {
  const labels = long.value.labels || []
  if (!labels.length) return ''
  const maxY = 160
  const pad = 40
  const pts = []
  labels.forEach((_, i) => {
    const v = ds.normalized?.[i] ?? ds.scores?.[i]
    if (v == null) return
    const x = pad + (labels.length <= 1 ? (cw - 2 * pad) / 2 : (i / (labels.length - 1)) * (cw - 2 * pad))
    const y = pad + maxY - (v / 100) * maxY
    pts.push(`${x},${y}`)
  })
  return pts.join(' ')
}

function eventX(ev) {
  const labels = long.value.labels || []
  const i = labels.indexOf(ev.date?.slice(0, 10))
  if (i < 0) return null
  const pad = 40
  return pad + (labels.length <= 1 ? (cw - 2 * pad) / 2 : (i / (labels.length - 1)) * (cw - 2 * pad))
}

function radarPoly(values) {
  const dims = radar.value.dimensions || []
  const n = dims.length || 1
  const cx = rw / 2
  const cy = rh / 2 - 10
  const r = 90
  const pts = (values || []).map((v, i) => {
    const a = (-Math.PI / 2 + (2 * Math.PI * i) / n) % (2 * Math.PI)
    const rr = (Number(v) / 100) * r
    return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`
  })
  return pts.join(' ')
}

function labelPos(i) {
  const dims = radar.value.dimensions || []
  const n = dims.length || 1
  const cx = rw / 2
  const cy = rh / 2 - 10
  const r = 105
  const a = (-Math.PI / 2 + (2 * Math.PI * i) / n) % (2 * Math.PI)
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) + 4 }
}

onMounted(async () => {
  try {
    const res = await request.get(`/dashboard/student/${route.params.id}`)
    d.value = res.data || {}
  } catch {
    d.value = {}
  }
})
</script>

<style scoped>
.card { margin-bottom: 16px; }
.chart { width: 100%; max-width: 640px; height: 200px; }
.radar { width: 280px; height: 260px; display: block; margin: 0 auto; }
.event-dot { fill: var(--color-danger-6); }
.chart-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; font-size: 12px; color: var(--color-text-2); }
.leg i { display: inline-block; width: 12px; height: 3px; margin-right: 4px; vertical-align: middle; }
</style>
