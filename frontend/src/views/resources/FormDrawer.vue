<template>
  <a-drawer
    :visible="visible"
    :width="640"
    :title="drawerTitle"
    unmount-on-close
    :footer="false"
    @cancel="close"
    @update:visible="(v) => emit('update:visible', v)"
  >
    <div v-if="formType === 'focus_tracking' && trackingOrdinal > 0" class="banner">
      第 {{ trackingOrdinal }} 次追踪
    </div>

    <a-form layout="vertical" class="drawer-form">
      <!-- 学生 -->
      <a-form-item label="学生" :required="true">
        <StudentPicker
          v-model="studentId"
          :disabled="readonly || lockStudent"
          :summary="studentSummary"
          @select="onStudentPicked"
        />
      </a-form-item>

      <!-- A1 -->
      <template v-if="formType === 'interview'">
        <template v-for="f in interviewFields" :key="f.key">
          <a-form-item
            :label="f.label"
            :required="f.required"
            :extra="f.tip"
          >
            <template v-if="f.type === 'datetime'">
              <a-date-picker
                v-model="interview[f.key]"
                show-time
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm"
                style="width: 100%"
                :disabled="readonly"
              />
            </template>
            <template v-else-if="f.type === 'slider'">
              <div class="slider-row">
                <a-slider
                  v-model="interview[f.key]"
                  :min="f.min"
                  :max="f.max"
                  :marks="sliderMarks(f.min, f.max)"
                  :disabled="readonly"
                  style="flex: 1"
                />
                <span class="slider-val">{{ interview[f.key] }}</span>
              </div>
            </template>
            <template v-else-if="f.type === 'textarea'">
              <a-textarea
                v-model="interview[f.key]"
                :placeholder="f.placeholder"
                :auto-size="{ minRows: 2, maxRows: 6 }"
                :disabled="readonly"
              />
            </template>
            <template v-else-if="f.type === 'select'">
              <a-select v-model="interview[f.key]" allow-clear :disabled="readonly" placeholder="请选择">
                <a-option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</a-option>
              </a-select>
            </template>
          </a-form-item>
        </template>
      </template>

      <!-- A3 -->
      <template v-if="formType === 'focus_register'">
        <a-form-item
          v-for="f in focusRegisterFields"
          :key="f.key"
          :label="f.label"
          :required="f.required"
        >
          <a-textarea
            v-if="f.type === 'textarea'"
            v-model="focusReg[f.key]"
            :placeholder="f.placeholder"
            :auto-size="{ minRows: 2, maxRows: 6 }"
            :disabled="readonly"
          />
          <a-date-picker
            v-else-if="f.type === 'date'"
            v-model="focusReg[f.key]"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            :disabled="readonly"
          />
        </a-form-item>

        <div class="subform-head">
          <span class="subform-title">帮扶记录</span>
          <a-button v-if="!readonly" type="outline" size="mini" @click="addHelpRow">
            <template #icon><IconPlus /></template>
            添加一行
          </a-button>
        </div>
        <div v-for="(row, idx) in focusReg.helpRecords" :key="idx" class="help-card">
          <div class="help-card-hd">
            <span>记录 {{ idx + 1 }}</span>
            <a-button
              v-if="!readonly && focusReg.helpRecords.length > 1"
              type="text"
              status="danger"
              size="mini"
              @click="removeHelpRow(idx)"
            >
              删除
            </a-button>
          </div>
          <a-form-item label="时间" :required="true">
            <a-date-picker
              v-model="row.time"
              show-time
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              style="width: 100%"
              :disabled="readonly"
            />
          </a-form-item>
          <a-form-item label="地点">
            <a-input v-model="row.location" :disabled="readonly" />
          </a-form-item>
          <a-form-item label="措施" :required="true">
            <a-textarea v-model="row.measure" :auto-size="{ minRows: 2 }" :disabled="readonly" />
          </a-form-item>
          <a-form-item label="帮扶人" :required="true">
            <a-input v-model="row.helper" :disabled="readonly" />
          </a-form-item>
        </div>
      </template>

      <!-- A4 -->
      <template v-if="formType === 'focus_tracking'">
        <a-form-item
          v-for="f in focusTrackingFields"
          :key="f.key"
          :label="f.label"
          :required="f.required"
        >
          <a-input
            v-if="f.type === 'text'"
            v-model="focusTr[f.key]"
            :disabled="readonly"
          />
          <a-textarea
            v-else-if="f.type === 'textarea'"
            v-model="focusTr[f.key]"
            :placeholder="f.placeholder"
            :auto-size="{ minRows: 2, maxRows: 6 }"
            :disabled="readonly"
          />
          <a-date-picker
            v-else-if="f.type === 'date'"
            v-model="focusTr[f.key]"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            :disabled="readonly"
          />
        </a-form-item>
      </template>

      <!-- A10 -->
      <template v-if="formType === 'crisis_register'">
        <a-descriptions v-if="crisisStudentLines.length" :column="1" size="small" class="crisis-meta">
          <a-descriptions-item v-for="(line, i) in crisisStudentLines" :key="i" :label="line.label">
            {{ line.value }}
          </a-descriptions-item>
        </a-descriptions>

        <a-form-item label="家庭住址">
          <a-input v-model="crisis.homeAddress" :disabled="readonly" />
        </a-form-item>
        <a-form-item label="学习情况" :required="true">
          <a-select v-model="crisis.academicLevel" placeholder="请选择" :disabled="readonly">
            <a-option v-for="o in academicLevelOptions" :key="o.value" :value="o.value">{{ o.label }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="身体状况" :required="true">
          <a-radio-group v-model="crisis.healthStatus" :disabled="readonly">
            <a-radio value="健康">健康</a-radio>
            <a-radio value="疾病">疾病（填写病名）</a-radio>
          </a-radio-group>
          <a-input
            v-if="crisis.healthStatus === '疾病'"
            v-model="crisis.healthDiseaseName"
            class="mt-8"
            placeholder="病名"
            :disabled="readonly"
          />
        </a-form-item>

        <a-form-item label="严重心理危机症状（一类）" :required="true">
          <a-checkbox-group v-model="crisis.severeCrisis" :disabled="readonly" direction="vertical">
            <a-checkbox v-for="t in crisisSevereOptions" :key="t" :value="t">{{ t }}</a-checkbox>
          </a-checkbox-group>
          <a-input
            v-if="crisis.severeCrisis.includes('其他')"
            v-model="crisis.severeCrisisOther"
            class="mt-8"
            placeholder="请说明其他情况"
            :disabled="readonly"
          />
        </a-form-item>

        <a-form-item label="重大心理危机症状（二类）" :required="true">
          <a-checkbox-group v-model="crisis.majorCrisis" :disabled="readonly" direction="vertical">
            <a-checkbox v-for="t in crisisMajorOptions" :key="t" :value="t">{{ t }}</a-checkbox>
          </a-checkbox-group>
          <a-input
            v-if="crisis.majorCrisis.includes('其他')"
            v-model="crisis.majorCrisisOther"
            class="mt-8"
            placeholder="请说明其他情况"
            :disabled="readonly"
          />
        </a-form-item>

        <a-form-item label="是否已密切观察" :required="true">
          <a-radio-group v-model="crisis.hasObserved" type="button" :disabled="readonly">
            <a-radio value="是">是</a-radio>
            <a-radio value="否">否</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="是否已建议家长就医" :required="true">
          <a-radio-group v-model="crisis.hasSuggestedMedical" type="button" :disabled="readonly">
            <a-radio value="是">是</a-radio>
            <a-radio value="否">否</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="班级措施" :required="true">
          <a-checkbox-group v-model="crisis.classMeasures" :disabled="readonly" direction="vertical">
            <a-checkbox v-for="t in crisisClassMeasuresOptions" :key="t" :value="t">{{ t }}</a-checkbox>
          </a-checkbox-group>
        </a-form-item>
        <a-form-item label="其他措施">
          <a-textarea v-model="crisis.otherMeasures" :auto-size="{ minRows: 2 }" :disabled="readonly" />
        </a-form-item>
        <a-form-item label="补充说明">
          <a-textarea v-model="crisis.supplement" :auto-size="{ minRows: 2 }" :disabled="readonly" />
          <a-upload
            v-if="!readonly"
            list-type="picture-card"
            :file-list="crisisFileList"
            image-preview
            :custom-request="onCrisisUpload"
            @remove="onCrisisRemove"
          />
          <div v-else-if="(crisis.supplementImageUrls || []).length" class="img-preview-row">
            <a-image
              v-for="(u, i) in crisis.supplementImageUrls"
              :key="i"
              :src="u"
              width="80"
              class="img-thumb"
            />
          </div>
        </a-form-item>
      </template>
    </a-form>

    <div v-if="mode !== 'view'" class="drawer-actions">
      <a-space>
        <a-button @click="close">取消</a-button>
        <a-button type="primary" :loading="submitting" @click="submit">提交</a-button>
      </a-space>
    </div>
  </a-drawer>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconPlus } from '@arco-design/web-vue/es/icon'
import StudentPicker from './StudentPicker.vue'
import {
  FORM_TYPE_TITLES,
  interviewFields,
  focusRegisterFields,
  focusTrackingFields,
  crisisSevereOptions,
  crisisMajorOptions,
  crisisClassMeasuresOptions,
  academicLevelOptions,
} from './formConfigs.js'
import request from '@/utils/request'
import { createFormRecord, updateFormRecord, listFormRecords, uploadFormFile } from '@/api/formRecords.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  formType: { type: String, required: true },
  mode: { type: String, default: 'create' }, // create | edit | view
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'success'])

const readonly = computed(() => props.mode === 'view')
const lockStudent = computed(() => props.mode === 'edit' || props.mode === 'view')

const drawerTitle = computed(() => {
  const t = FORM_TYPE_TITLES[props.formType] || '工作表格'
  if (props.mode === 'view') return `查看 · ${t}`
  if (props.mode === 'edit') return `编辑 · ${t}`
  return t
})

const studentId = ref(undefined)
const studentSummary = ref('')
const submitting = ref(false)
const trackingOrdinal = ref(0)

const interview = reactive({})
const focusReg = reactive({ helpRecords: [] })
const focusTr = reactive({})
const crisis = reactive({
  homeAddress: '',
  academicLevel: undefined,
  healthStatus: '健康',
  healthDiseaseName: '',
  severeCrisis: [],
  severeCrisisOther: '',
  majorCrisis: [],
  majorCrisisOther: '',
  hasObserved: undefined,
  hasSuggestedMedical: undefined,
  classMeasures: [],
  otherMeasures: '',
  supplement: '',
  supplementImageUrls: [],
})

const crisisStudentLines = ref([])

const crisisFileList = computed(() =>
  (crisis.supplementImageUrls || []).map((url, i) => ({
    uid: `img-${i}-${url}`,
    url,
    name: String(url).split('/').pop() || `图片${i + 1}`,
  }))
)

function sliderMarks(min, max) {
  const m = {}
  for (let i = min; i <= max; i += 1) m[i] = String(i)
  return m
}

function nowDatetimeStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function todayStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function resetInterview() {
  interviewFields.forEach((f) => {
    if (f.type === 'slider') interview[f.key] = 5
    else if (f.defaultNow) interview[f.key] = nowDatetimeStr()
    else interview[f.key] = f.type === 'select' ? undefined : ''
  })
}

function resetFocusReg() {
  focusRegisterFields.forEach((f) => {
    if (f.type === 'date' && f.defaultToday) focusReg[f.key] = todayStr()
    else focusReg[f.key] = ''
  })
  focusReg.helpRecords = [
    { time: nowDatetimeStr(), location: '', measure: '', helper: '' },
  ]
}

function resetFocusTr() {
  focusTrackingFields.forEach((f) => {
    if (f.type === 'date' && f.defaultToday) focusTr[f.key] = todayStr()
    else focusTr[f.key] = ''
  })
}

function resetCrisis() {
  crisis.homeAddress = ''
  crisis.academicLevel = undefined
  crisis.healthStatus = '健康'
  crisis.healthDiseaseName = ''
  crisis.severeCrisis = []
  crisis.severeCrisisOther = ''
  crisis.majorCrisis = []
  crisis.majorCrisisOther = ''
  crisis.hasObserved = undefined
  crisis.hasSuggestedMedical = undefined
  crisis.classMeasures = []
  crisis.otherMeasures = ''
  crisis.supplement = ''
  crisis.supplementImageUrls = []
  crisisStudentLines.value = []
}

function mergeInterview(fd) {
  resetInterview()
  Object.assign(interview, fd)
  interviewFields.forEach((f) => {
    if (f.type === 'slider') {
      const n = Number(interview[f.key])
      interview[f.key] = Number.isFinite(n) ? n : 5
    }
  })
}

function mergeFocusReg(fd) {
  resetFocusReg()
  focusRegisterFields.forEach((f) => {
    if (fd[f.key] != null) focusReg[f.key] = fd[f.key]
  })
  if (Array.isArray(fd.helpRecords) && fd.helpRecords.length) {
    focusReg.helpRecords = fd.helpRecords.map((r) => ({
      time: r.time || '',
      location: r.location || '',
      measure: r.measure || '',
      helper: r.helper || '',
    }))
  }
}

function mergeFocusTr(fd) {
  resetFocusTr()
  Object.assign(focusTr, fd)
}

function mergeCrisis(fd) {
  resetCrisis()
  Object.assign(crisis, {
    homeAddress: fd.homeAddress || '',
    academicLevel: fd.academicLevel,
    healthStatus: fd.healthStatus || '健康',
    healthDiseaseName: fd.healthDiseaseName || '',
    severeCrisis: Array.isArray(fd.severeCrisis) ? [...fd.severeCrisis] : [],
    severeCrisisOther: fd.severeCrisisOther || '',
    majorCrisis: Array.isArray(fd.majorCrisis) ? [...fd.majorCrisis] : [],
    majorCrisisOther: fd.majorCrisisOther || '',
    hasObserved: fd.hasObserved,
    hasSuggestedMedical: fd.hasSuggestedMedical,
    classMeasures: Array.isArray(fd.classMeasures) ? [...fd.classMeasures] : [],
    otherMeasures: fd.otherMeasures || '',
    supplement: fd.supplement || '',
    supplementImageUrls: Array.isArray(fd.supplementImageUrls) ? [...fd.supplementImageUrls] : [],
  })
}

function initFromRecord() {
  const rec = props.record
  if (!rec) return
  studentId.value = rec.studentId
  studentSummary.value = `${rec.studentName || ''} ${rec.className || ''}`.trim()
  const fd = rec.formData && typeof rec.formData === 'object' ? { ...rec.formData } : {}
  if (props.formType === 'interview') mergeInterview(fd)
  if (props.formType === 'focus_register') mergeFocusReg(fd)
  if (props.formType === 'focus_tracking') mergeFocusTr(fd)
  if (props.formType === 'crisis_register') mergeCrisis(fd)
  if (props.formType === 'crisis_register' && rec.studentId) {
    loadCrisisStudentMeta(rec.studentId)
  }
  if (props.formType === 'focus_tracking' && rec.studentId) {
    loadTrackingOrdinal(rec.studentId)
  }
}

function initCreate() {
  studentId.value = undefined
  studentSummary.value = ''
  trackingOrdinal.value = 0
  crisisStudentLines.value = []
  if (props.formType === 'interview') resetInterview()
  if (props.formType === 'focus_register') resetFocusReg()
  if (props.formType === 'focus_tracking') resetFocusTr()
  if (props.formType === 'crisis_register') resetCrisis()
}

watch(
  () => [props.visible, props.record, props.formType, props.mode],
  () => {
    if (!props.visible) return
    if (props.mode === 'create' && !props.record) initCreate()
    else if (props.record) initFromRecord()
  },
  { immediate: true }
)

async function onStudentPicked(row) {
  if (!row) {
    studentSummary.value = ''
    crisisStudentLines.value = []
    trackingOrdinal.value = 0
    return
  }
  studentSummary.value = `${row.name} · ${row.grade_name || ''}${row.class_name || ''}${row.student_no ? ` · ${row.student_no}` : ''}`
  if (props.formType === 'focus_tracking' && row.student_id) {
    await loadTrackingOrdinal(row.student_id)
  }
  if (props.formType === 'crisis_register' && row.student_id) {
    await loadCrisisStudentMeta(row.student_id)
  }
}

async function loadTrackingOrdinal(sid) {
  try {
    const res = await listFormRecords({
      formType: 'focus_tracking',
      studentId: sid,
      pageSize: 1,
      page: 1,
    })
    const total = res.data?.pagination?.total ?? 0
    trackingOrdinal.value = Number(total) + 1
  } catch {
    trackingOrdinal.value = 1
  }
}

async function loadCrisisStudentMeta(sid) {
  try {
    const res = await request.get(`/students/${sid}`)
    const d = res.data || {}
    crisisStudentLines.value = [
      { label: '班级', value: `${d.grade_name || ''}${d.class_name || ''}` || '—' },
      { label: '性别', value: d.gender_label || '—' },
      { label: '出生年月', value: d.birth_date || '—' },
      { label: '班主任', value: d.homeroom_teacher || '—' },
      { label: '家长电话', value: d.guardian_phone || '—' },
    ]
  } catch {
    crisisStudentLines.value = []
  }
}

watch(
  () => [props.visible, studentId.value, props.formType],
  async () => {
    if (!props.visible || !studentId.value) return
    if (props.formType === 'focus_tracking') {
      await loadTrackingOrdinal(studentId.value)
    }
    if (props.formType === 'crisis_register') {
      await loadCrisisStudentMeta(studentId.value)
    }
  }
)

function addHelpRow() {
  focusReg.helpRecords.push({
    time: nowDatetimeStr(),
    location: '',
    measure: '',
    helper: '',
  })
}

function removeHelpRow(i) {
  focusReg.helpRecords.splice(i, 1)
}

function close() {
  emit('update:visible', false)
}

function buildFormData() {
  if (props.formType === 'interview') {
    return { ...interview }
  }
  if (props.formType === 'focus_register') {
    return {
      ...focusReg,
      helpRecords: focusReg.helpRecords.map((r) => ({ ...r })),
    }
  }
  if (props.formType === 'focus_tracking') {
    return { ...focusTr }
  }
  if (props.formType === 'crisis_register') {
    return {
      homeAddress: crisis.homeAddress,
      academicLevel: crisis.academicLevel,
      healthStatus: crisis.healthStatus,
      healthDiseaseName: crisis.healthStatus === '疾病' ? crisis.healthDiseaseName : '',
      severeCrisis: [...crisis.severeCrisis],
      severeCrisisOther: crisis.severeCrisis.includes('其他') ? crisis.severeCrisisOther : '',
      majorCrisis: [...crisis.majorCrisis],
      majorCrisisOther: crisis.majorCrisis.includes('其他') ? crisis.majorCrisisOther : '',
      hasObserved: crisis.hasObserved,
      hasSuggestedMedical: crisis.hasSuggestedMedical,
      classMeasures: [...crisis.classMeasures],
      otherMeasures: crisis.otherMeasures,
      supplement: crisis.supplement,
      supplementImageUrls: [...(crisis.supplementImageUrls || [])],
    }
  }
  return {}
}

function validate() {
  if (studentId.value == null || studentId.value === '') {
    Message.warning('请选择学生')
    return false
  }
  if (props.formType === 'interview') {
    for (const f of interviewFields) {
      if (!f.required) continue
      const v = interview[f.key]
      if (v == null || v === '') {
        Message.warning(`请填写：${f.label}`)
        return false
      }
    }
    return true
  }
  if (props.formType === 'focus_register') {
    for (const f of focusRegisterFields) {
      if (!f.required) continue
      if (!focusReg[f.key]) {
        Message.warning(`请填写：${f.label}`)
        return false
      }
    }
    if (!focusReg.helpRecords.length) {
      Message.warning('请至少添加一条帮扶记录')
      return false
    }
    for (let i = 0; i < focusReg.helpRecords.length; i += 1) {
      const r = focusReg.helpRecords[i]
      if (!r.time || !r.measure?.trim() || !r.helper?.trim()) {
        Message.warning(`帮扶记录 ${i + 1}：时间、措施、帮扶人为必填`)
        return false
      }
    }
    return true
  }
  if (props.formType === 'focus_tracking') {
    for (const f of focusTrackingFields) {
      if (!f.required) continue
      if (!focusTr[f.key]?.toString?.().trim()) {
        Message.warning(`请填写：${f.label}`)
        return false
      }
    }
    return true
  }
  if (props.formType === 'crisis_register') {
    if (!crisis.academicLevel) {
      Message.warning('请选择学习情况')
      return false
    }
    if (!crisis.healthStatus) {
      Message.warning('请选择身体状况')
      return false
    }
    if (crisis.healthStatus === '疾病' && !crisis.healthDiseaseName?.trim()) {
      Message.warning('请填写疾病名称')
      return false
    }
    if (!crisis.severeCrisis.length) {
      Message.warning('严重心理危机症状至少选一项')
      return false
    }
    if (crisis.severeCrisis.includes('其他') && !crisis.severeCrisisOther?.trim()) {
      Message.warning('请填写「其他」严重症状说明')
      return false
    }
    if (!crisis.majorCrisis.length) {
      Message.warning('重大心理危机症状至少选一项')
      return false
    }
    if (crisis.majorCrisis.includes('其他') && !crisis.majorCrisisOther?.trim()) {
      Message.warning('请填写「其他」重大症状说明')
      return false
    }
    if (!crisis.hasObserved) {
      Message.warning('请选择是否已密切观察')
      return false
    }
    if (!crisis.hasSuggestedMedical) {
      Message.warning('请选择是否已建议家长就医')
      return false
    }
    if (!crisis.classMeasures.length) {
      Message.warning('班级措施至少选一项')
      return false
    }
    return true
  }
  return true
}

async function submit() {
  if (!validate()) return
  const formData = buildFormData()
  submitting.value = true
  try {
    if (props.mode === 'edit' && props.record?.id) {
      await updateFormRecord(props.record.id, { formData, status: 'submitted' })
      Message.success('已保存')
    } else {
      await createFormRecord({
        formType: props.formType,
        studentId: studentId.value,
        formData,
        status: 'submitted',
      })
      Message.success('提交成功')
    }
    emit('success')
    close()
  } catch {
    /* request 已提示 */
  } finally {
    submitting.value = false
  }
}

async function onCrisisUpload(opt) {
  const { fileItem, onSuccess, onError } = opt
  try {
    const file = fileItem?.file
    if (!file) throw new Error('no file')
    const res = await uploadFormFile(file)
    const url = res.data?.url
    if (!url) throw new Error('no url')
    crisis.supplementImageUrls = [...(crisis.supplementImageUrls || []), url]
    onSuccess({ url })
  } catch (e) {
    onError(e)
    Message.error('上传失败')
  }
}

function onCrisisRemove(fileItem) {
  const u = fileItem?.url
  if (!u) return
  crisis.supplementImageUrls = (crisis.supplementImageUrls || []).filter((x) => x !== u)
}
</script>

<style scoped>
.drawer-form { padding-bottom: 8px; }
.banner {
  background: var(--color-primary-light-1);
  color: var(--color-primary-6);
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-weight: 600;
}
.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.slider-val {
  min-width: 28px;
  font-weight: 600;
  color: var(--color-text-1);
}
.subform-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0 8px;
}
.subform-title { font-weight: 600; }
.help-card {
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--color-fill-1);
}
.help-card-hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
}
.crisis-meta { margin-bottom: 12px; }
.mt-8 { margin-top: 8px; }
.img-preview-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.img-thumb { border-radius: 4px; }

.drawer-actions {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-2);
  display: flex;
  justify-content: flex-end;
}
</style>
