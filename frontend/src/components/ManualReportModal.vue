<template>
  <!-- 悬浮危机上报按钮 -->
  <button
    class="crisis-fab"
    title="人工上报预警"
    aria-label="人工上报预警"
    @click="openModal"
  >
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  </button>

  <!-- 上报 Modal -->
  <a-modal
    v-model:visible="visible"
    title="人工上报危机预警"
    width="600px"
    :mask-closable="false"
    :footer="false"
    unmount-on-close
    @close="resetForm"
  >
    <a-form ref="formRef" :model="form" layout="vertical" class="report-form">
      <!-- 学生搜索 -->
      <a-form-item
        label="选择学生"
        field="student_id"
        :rules="[{ required: true, message: '请选择学生' }]"
      >
        <a-select
          v-model="form.student_id"
          placeholder="输入姓名或学号搜索"
          allow-search
          allow-clear
          :filter-option="false"
          @search="onStudentSearch"
          @change="onStudentChange"
        >
          <a-option
            v-for="s in studentOptions"
            :key="s.student_id"
            :value="s.student_id"
          >
            {{ s.name }} · {{ s.class_name }}{{ s.grade_name }}
            <span class="stu-no">{{ s.student_no }}</span>
          </a-option>
        </a-select>
      </a-form-item>

      <!-- 预警等级 -->
      <a-form-item
        label="预警等级"
        field="alert_level"
        :rules="[{ required: true, message: '请选择预警等级' }]"
      >
        <a-radio-group v-model="form.alert_level" type="button">
          <a-radio value="red">
            <span class="level-opt level-opt--red">🔴 红色预警（危机）</span>
          </a-radio>
          <a-radio value="yellow">
            <span class="level-opt level-opt--yellow">🟡 黄色预警（关注）</span>
          </a-radio>
        </a-radio-group>
      </a-form-item>

      <!-- 紧迫程度（仅红色时显示） -->
      <a-form-item
        v-if="form.alert_level === 'red'"
        label="紧迫程度"
        field="report_urgency"
        :rules="[{ required: true, message: '请选择紧迫程度' }]"
      >
        <a-radio-group v-model="form.report_urgency" type="button">
          <a-radio value="normal">一般</a-radio>
          <a-radio value="urgent">
            <span style="color: var(--color-warning-6)">紧急</span>
          </a-radio>
          <a-radio value="critical">
            <span style="color: var(--color-danger-6); font-weight: 600">极度危机</span>
          </a-radio>
        </a-radio-group>
        <div v-if="form.report_urgency === 'critical'" class="urgency-tip">
          ⚠️ 极度危机将额外通知学校分管领导
        </div>
      </a-form-item>

      <!-- 上报原因 -->
      <a-form-item
        label="上报原因"
        field="report_reason"
        :rules="[
          { required: true, message: '请填写上报原因' },
          { minLength: 20, message: '至少20字' },
        ]"
        extra="请详细描述观察到的异常情况，至少20字"
      >
        <a-textarea
          v-model="form.report_reason"
          placeholder="描述学生的异常表现、言语或行为，为心理老师提供足够判断依据"
          :max-length="1000"
          show-word-limit
          :auto-size="{ minRows: 4, maxRows: 8 }"
        />
      </a-form-item>

      <!-- 佐证描述（选填） -->
      <a-form-item
        label="佐证描述（选填）"
        field="report_evidence"
        extra="目击情况、学生言语原文等"
      >
        <a-textarea
          v-model="form.report_evidence"
          placeholder="如：第三节课课间在走廊目击，学生自述「不想上学了，活着没意思」"
          :max-length="500"
          show-word-limit
          :auto-size="{ minRows: 2, maxRows: 5 }"
        />
      </a-form-item>

      <!-- 指派处置人 -->
      <a-form-item label="指派处置人（可选，不填则通知全部心理老师）" field="assign_to">
        <a-select
          v-model="form.assign_to"
          placeholder="选择心理老师或分管领导"
          allow-search
          allow-clear
          :loading="counselorsLoading"
        >
          <a-option
            v-for="u in counselors"
            :key="u.id"
            :value="u.id"
          >
            {{ u.real_name }}
            <a-tag size="mini" style="margin-left:6px">{{ roleLabel(u.role) }}</a-tag>
          </a-option>
        </a-select>
      </a-form-item>

      <!-- 底部操作 -->
      <div class="form-footer">
        <a-button @click="closeModal">取消</a-button>
        <a-popconfirm
          content="确认上报该预警？提交后将立即通知相关人员。"
          type="warning"
          ok-text="确认上报"
          cancel-text="再看看"
          @ok="submitReport"
        >
          <a-button
            type="primary"
            :status="form.alert_level === 'red' ? 'danger' : 'normal'"
            :loading="submitting"
          >
            {{ form.alert_level === 'red' ? '上报红色预警' : '上报黄色预警' }}
          </a-button>
        </a-popconfirm>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { manualReport, getManualReportCounselors } from '@/api/alerts'
import request from '@/utils/request'

const emit = defineEmits(['reported'])

const visible = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const studentOptions = ref([])
const counselors = ref([])
const counselorsLoading = ref(false)
let studentSearchTimer = null

const form = reactive({
  student_id: undefined,
  alert_level: undefined,
  report_urgency: 'normal',
  report_reason: '',
  report_evidence: '',
  assign_to: undefined,
})

function roleLabel(role) {
  const m = { counselor: '心理老师', doctor: '心理医生', admin: '管理员', super_admin: '超级管理员' }
  return m[role] || role
}

function openModal() {
  visible.value = true
  loadCounselors()
}

function closeModal() {
  visible.value = false
  resetForm()
}

function resetForm() {
  if (formRef.value) formRef.value.resetFields()
  form.student_id = undefined
  form.alert_level = undefined
  form.report_urgency = 'normal'
  form.report_reason = ''
  form.report_evidence = ''
  form.assign_to = undefined
  studentOptions.value = []
}

async function loadCounselors() {
  if (counselors.value.length) return
  counselorsLoading.value = true
  try {
    const res = await getManualReportCounselors()
    counselors.value = res.data?.counselors || []
  } catch {
    counselors.value = []
  } finally {
    counselorsLoading.value = false
  }
}

function onStudentSearch(kw) {
  if (studentSearchTimer) clearTimeout(studentSearchTimer)
  if (!kw?.trim()) { studentOptions.value = []; return }
  studentSearchTimer = setTimeout(async () => {
    try {
      const res = await request.get('/students', { params: { keyword: kw.trim(), page_size: 20 } })
      // 后端 success 包装为 { code, data }，data 为数组；兼容 { list: [...] }
      const raw = res.data
      const list = Array.isArray(raw) ? raw : (raw?.list || [])
      studentOptions.value = list.map((s) => ({
        student_id: s.student_id ?? s.id,
        name: s.name ?? s.student_name,
        student_no: s.student_no ?? '',
        class_name: s.class_name ?? '',
        grade_name: s.grade_name ?? '',
      }))
    } catch {
      studentOptions.value = []
    }
  }, 300)
}

function onStudentChange() {
  // 可以后续展示学生信息预览
}

// 切换预警等级时，重置紧迫程度
watch(() => form.alert_level, (val) => {
  if (val !== 'red') form.report_urgency = 'normal'
  else if (!form.report_urgency) form.report_urgency = 'normal'
})

async function submitReport() {
  if (!formRef.value) return
  const valid = await formRef.value.validate()
  if (valid) return

  if (!form.student_id) { Message.warning('请选择学生'); return }
  if (!form.alert_level) { Message.warning('请选择预警等级'); return }
  if (form.alert_level === 'red' && !form.report_urgency) {
    Message.warning('请选择紧迫程度'); return
  }
  if (!form.report_reason?.trim() || form.report_reason.trim().length < 20) {
    Message.warning('上报原因至少20字'); return
  }

  submitting.value = true
  try {
    const payload = {
      student_id: form.student_id,
      alert_level: form.alert_level,
      report_reason: form.report_reason.trim(),
      report_evidence: form.report_evidence?.trim() || undefined,
      report_urgency: form.alert_level === 'red' ? form.report_urgency : 'normal',
      assign_to: form.assign_to ?? null,
    }
    const res = await manualReport(payload)
    const notifyCount = res.data?.notify_count ?? 0
    Message.success(`预警已上报，已通知 ${notifyCount} 名相关人员`)
    closeModal()
    emit('reported', res.data)
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || '上报失败，请重试'
    Message.error(msg)
  } finally {
    submitting.value = false
  }
}

defineExpose({ openModal })
</script>

<style scoped>
.crisis-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1000;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #D92D20;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(217, 45, 32, 0.45);
  transition: transform 0.18s, box-shadow 0.18s;
}
.crisis-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 24px rgba(217, 45, 32, 0.55);
}
.crisis-fab:active {
  transform: scale(0.96);
}

/* 移动端底部 TabBar 上方留空 */
@media (max-width: 767px) {
  .crisis-fab {
    bottom: 72px;
  }
}

.report-form { padding: 4px 0 0; }

.stu-no {
  margin-left: 6px;
  color: var(--color-text-3);
  font-size: 12px;
}

.level-opt--red { color: var(--color-danger-6); font-weight: 500; }
.level-opt--yellow { color: #D97706; font-weight: 500; }

.urgency-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-danger-6);
  background: var(--alert-red-bg, #fff2f0);
  border-radius: 4px;
  padding: 4px 8px;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-1);
}
</style>
