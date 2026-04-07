<template>
  <div class="print-page">
    <div class="no-print print-toolbar">
      <a-button type="primary" @click="doPrint">打印</a-button>
      <a-button @click="doClose">关闭</a-button>
    </div>

    <a-spin v-if="loading" class="print-spin" />
    <div v-else-if="profile" class="print-doc">
      <header class="print-header">
        <div>心晴·中小学生心理健康管理平台 | 学生心理健康档案</div>
        <div class="print-date">打印日期：{{ printDate }}</div>
      </header>

      <section class="print-section">
        <h2>一、基本信息</h2>
        <table class="print-table">
          <tbody>
            <tr>
              <th>姓名</th><td>{{ profile.real_name }}</td>
              <th>性别</th><td>{{ profile.gender_label || '—' }}</td>
            </tr>
            <tr>
              <th>出生日期</th><td>{{ profile.birth_date || '—' }}</td>
              <th>年级班级</th><td>{{ profile.grade_name }} {{ profile.class_name }}</td>
            </tr>
            <tr>
              <th>学号</th><td>{{ profile.student_no || '—' }}</td>
              <th>监护人</th><td>{{ profile.guardian_name || '—' }}</td>
            </tr>
            <tr>
              <th>联系电话</th><td colspan="3">{{ profile.guardian_phone || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="print-section">
        <h2>二、体测记录（最近3条）</h2>
        <table v-if="physicalPreview.length" class="print-table">
          <thead>
            <tr>
              <th>日期</th><th>身高(cm)</th><th>体重(kg)</th><th>BMI</th>
              <th>左视力</th><th>右视力</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in physicalPreview" :key="p.id">
              <td>{{ p.record_date }}</td>
              <td>{{ fmtNum(p.height) }}</td>
              <td>{{ fmtNum(p.weight) }}</td>
              <td>{{ p.bmi != null ? p.bmi + (p.bmi_status ? ' ' + p.bmi_status : '') : '—' }}</td>
              <td>{{ fmtVision(p.vision_left) }}</td>
              <td>{{ fmtVision(p.vision_right) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="print-empty">暂无体测记录</p>
      </section>

      <section class="print-section">
        <h2>三、测评历史</h2>
        <p class="print-hint">以下为结果等级，不含具体得分。</p>
        <table v-if="assessRows.length" class="print-table">
          <thead>
            <tr>
              <th>测评时间</th><th>量表</th><th>结果等级</th><th>是否触发预警</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in assessRows" :key="a.task_id">
              <td>{{ a.submit_time }}</td>
              <td>{{ a.scale_short || a.scale_name }}</td>
              <td>{{ a.result_label || a.result_level || '—' }}</td>
              <td>{{ a.alert_level === 'red' ? '红色' : a.alert_level === 'yellow' ? '黄色' : '无' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="print-empty">暂无测评记录</p>
      </section>

      <section class="print-section">
        <h2>四、预警记录</h2>
        <table v-if="alertRows.length" class="print-table">
          <thead>
            <tr>
              <th>预警时间</th><th>等级</th><th>触发原因摘要</th><th>处置状态</th><th>处置人</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in alertRows" :key="r.id">
              <td>{{ r.created_at }}</td>
              <td>{{ r.alert_level === 'red' ? '红色' : '黄色' }}</td>
              <td>{{ r.summary || '—' }}</td>
              <td>{{ r.status_label }}</td>
              <td>{{ r.assigned_name || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="print-empty">暂无预警记录</p>
      </section>

      <section class="print-section">
        <h2>五、个案记录</h2>
        <template v-if="caseBlock">
          <p>建档时间：{{ caseBlock.open_date || '—' }} · 会谈次数：{{ caseBlock.total_sessions }} · 状态：{{ caseBlock.status }}</p>
          <p>干预进展摘要：{{ caseBlock.summary || '—' }}</p>
          <p>结案状态：{{ caseBlock.status === 'closed' ? '已结案' : '进行中' }}</p>
        </template>
        <p v-else class="print-empty">暂无个案记录</p>
      </section>

      <footer class="print-footer">
        本档案仅供学校心理健康工作使用，请妥善保管，不得对外泄露。
      </footer>
    </div>
    <a-empty v-else description="无法加载学生档案" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import {
  getStudentProfile,
  getStudentPhysicals,
  getStudentAssessments,
  getStudentAlerts,
  getStudentCase,
} from '@/api/students'

const route = useRoute()
const id = computed(() => route.params.id)
const loading = ref(true)
const profile = ref(null)
const physicalList = ref([])
const assessRows = ref([])
const alertRows = ref([])
const caseBlock = ref(null)

const printDate = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const physicalPreview = computed(() => physicalList.value.slice(0, 3))

function fmtNum(v) {
  return v != null && v !== '' ? v : '—'
}
function fmtVision(v) {
  return v != null && v !== '' ? v : '—'
}

function doPrint() {
  window.print()
}
function doClose() {
  window.close()
}

onMounted(async () => {
  try {
    const uid = id.value
    const [pr, ph, as, al, cs] = await Promise.all([
      getStudentProfile(uid),
      getStudentPhysicals(uid).catch(() => ({ data: { list: [] } })),
      getStudentAssessments(uid, { page: 1, page_size: 100 }).catch(() => ({ data: { list: [] } })),
      getStudentAlerts(uid).catch(() => ({ data: { list: [] } })),
      getStudentCase(uid).catch(() => ({ data: { has_case: false } })),
    ])
    profile.value = pr.data
    physicalList.value = ph.data?.list || []
    assessRows.value = as.data?.list || []
    alertRows.value = al.data?.list || []
    caseBlock.value = cs.data?.has_case ? cs.data.case : null
  } finally {
    loading.value = false
    await nextTick()
    setTimeout(() => window.print(), 400)
  }
})
</script>

<style scoped>
.print-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
  background: #fff;
  color: #111;
}

.print-toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
}

.print-spin {
  padding: 48px;
  text-align: center;
}

.print-doc {
  font-size: 12px;
  line-height: 1.5;
}

.print-header {
  text-align: center;
  border-bottom: 1px solid #333;
  padding-bottom: 10px;
  margin-bottom: 16px;
  font-weight: 600;
}

.print-date {
  font-weight: normal;
  margin-top: 6px;
  font-size: 11px;
}

.print-section {
  margin-bottom: 20px;
  page-break-inside: avoid;
}

.print-section h2 {
  font-size: 13px;
  margin: 0 0 8px;
  border-left: 3px solid #333;
  padding-left: 8px;
}

.print-hint {
  font-size: 11px;
  color: #666;
  margin: 0 0 6px;
}

.print-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.print-table th,
.print-table td {
  border: 1px solid #999;
  padding: 6px 8px;
  text-align: left;
}

.print-table th {
  background: #f5f5f5;
  width: 12%;
}

.print-empty {
  color: #666;
  margin: 0;
}

.print-footer {
  margin-top: 24px;
  padding-top: 12px;
  border-top: 1px solid #ccc;
  font-size: 11px;
  color: #555;
  text-align: center;
}

@media print {
  .no-print {
    display: none !important;
  }
  .print-page {
    padding: 0;
    max-width: none;
  }
  @page {
    size: A4 portrait;
    margin: 2cm;
  }
  .print-table {
    page-break-inside: avoid;
  }
}
</style>
