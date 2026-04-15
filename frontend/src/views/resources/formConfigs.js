/** 工作表格列表卡片 */
export const FORM_CARDS = [
  {
    formType: 'interview',
    title: '学生二次心理访谈记录表',
    icon: 'IconEdit',
    description: '对适当关注/持续关注学生进行二次访谈后填写',
  },
  {
    formType: 'focus_register',
    title: '持续关注学生登记表',
    icon: 'IconUserAdd',
    description: '将学生纳入重点关注名单时填写基础登记信息',
  },
  {
    formType: 'focus_tracking',
    title: '持续关注学生追踪记录表',
    icon: 'IconRefresh',
    description: '每月对重点关注学生进行定期追踪记录',
  },
  {
    formType: 'crisis_register',
    title: '学生心理危机预警登记表',
    icon: 'IconExclamationCircle',
    description: '发现学生存在心理危机风险时登记',
  },
]

export const FORM_TYPE_TITLES = {
  interview: '学生二次心理访谈记录表',
  focus_register: '持续关注学生登记表',
  focus_tracking: '持续关注学生追踪记录表',
  crisis_register: '学生心理危机预警登记表',
}

/** A1 访谈 — 动态表单字段（除 studentId 外均写入 formData） */
export const interviewFields = [
  { key: 'interviewTime', label: '访谈时间', type: 'datetime', required: true, defaultNow: true },
  { key: 'studyScore', label: '学习总体情况', type: 'slider', min: 1, max: 10, required: true, tip: '1=一点也不好，10=特别好（学生自评）' },
  { key: 'studyNote', label: '学习总体情况-概述', type: 'textarea', required: false },
  { key: 'emotionScore', label: '情绪总体情况', type: 'slider', min: 1, max: 10, required: true, tip: '1=一点也不好，10=特别好（学生自评）' },
  { key: 'emotionNote', label: '情绪总体情况-概述', type: 'textarea', required: false },
  { key: 'physicalScore', label: '生理状况', type: 'slider', min: 1, max: 10, required: true, tip: '睡眠、食欲、身体舒适度' },
  { key: 'physicalNote', label: '生理状况-概述', type: 'textarea', required: false },
  { key: 'peerScore', label: '和同学的关系', type: 'slider', min: 1, max: 10, required: true },
  { key: 'peerNote', label: '和同学的关系-概述', type: 'textarea', required: false },
  { key: 'teacherScore', label: '和老师的关系', type: 'slider', min: 1, max: 10, required: true },
  { key: 'teacherNote', label: '和老师的关系-概述', type: 'textarea', required: false },
  { key: 'familyScore', label: '和父母及家庭', type: 'slider', min: 1, max: 10, required: true },
  { key: 'familyNote', label: '和父母及家庭-概述', type: 'textarea', required: false },
  { key: 'copingScore', label: '应对方式与心态', type: 'slider', min: 1, max: 10, required: true, tip: '1=冲动，10=冷静' },
  { key: 'copingNote', label: '应对方式与心态-概述', type: 'textarea', required: false },
  { key: 'futureScore', label: '对生活和未来期待', type: 'slider', min: 1, max: 10, required: true },
  { key: 'futureNote', label: '对生活和未来期待-概述', type: 'textarea', required: false },
  {
    key: 'riskAssessment',
    label: '高危行为评估',
    type: 'textarea',
    required: true,
    placeholder: '有过伤害自己或结束生命的想法吗？是否有计划？',
  },
  {
    key: 'conclusion',
    label: '总结评估',
    type: 'select',
    required: true,
    options: [
      { label: '状态良好', value: '状态良好' },
      { label: '状态一般', value: '状态一般' },
      { label: '状态不佳，班主任保持关注', value: '状态不佳，班主任保持关注' },
      { label: '状态不佳，需要心理老师介入', value: '状态不佳，需要心理老师介入' },
    ],
  },
  { key: 'remark', label: '备注', type: 'textarea', required: false },
]

/** A3 主表字段（不含 helpRecords） */
export const focusRegisterFields = [
  { key: 'medicalHistory', label: '既往病史', type: 'textarea', required: false },
  { key: 'focusReason', label: '纳入重点关注原因', type: 'textarea', required: true },
  {
    key: 'familySituation',
    label: '家庭基本情况',
    type: 'textarea',
    required: true,
    placeholder: '家庭成员构成、氛围、参与度、特殊支持需求',
  },
  {
    key: 'homePerformance',
    label: '在家表现',
    type: 'textarea',
    required: false,
    placeholder: '生活习惯、亲子互动、自主管理',
  },
  {
    key: 'schoolPerformance',
    label: '在校表现',
    type: 'textarea',
    required: false,
    placeholder: '课堂、课间、集体活动、同学互动',
  },
  {
    key: 'academicSituation',
    label: '学业情况',
    type: 'textarea',
    required: false,
    placeholder: '课堂掌握、作业质量、考试表现、学习压力',
  },
  { key: 'registerDate', label: '登记日期', type: 'date', required: true, defaultToday: true },
]

/** A4 */
export const focusTrackingFields = [
  { key: 'trackingDate', label: '追踪时间', type: 'date', required: true, defaultToday: true },
  { key: 'location', label: '辅导地点/方式', type: 'text', required: false },
  {
    key: 'emotionTracking',
    label: '情绪状态追踪',
    type: 'textarea',
    required: true,
    placeholder: '情绪稳定性、相关事件、自我调节',
  },
  {
    key: 'behaviorTracking',
    label: '行为表现追踪',
    type: 'textarea',
    required: true,
    placeholder: '课堂/课间行为，异常或改善',
  },
  {
    key: 'socialTracking',
    label: '人际互动追踪',
    type: 'textarea',
    required: true,
    placeholder: '与家长、同学、老师互动',
  },
  {
    key: 'academicTracking',
    label: '学业关联表现',
    type: 'textarea',
    required: false,
    placeholder: '心理状态对学业的影响',
  },
  {
    key: 'interventionNote',
    label: '干预措施与反馈',
    type: 'textarea',
    required: true,
    placeholder: '做了什么、效果如何',
  },
  { key: 'remark', label: '备注', type: 'textarea', required: false },
]

export const crisisSevereOptions = [
  '经常无故请假',
  '原生家庭解体',
  '情绪暴躁易怒',
  '情绪长期低落压抑',
  '曾有严重打架斗殴',
  '性格极度内向孤僻',
  '亲子关系恶劣',
  '严重睡眠问题',
  '幼年严重创伤',
  '近期重大应激事件',
  '其他',
]

export const crisisMajorOptions = [
  '情绪突然明显异常',
  '曾有自残自杀行为',
  '突然对死亡话题感兴趣',
  '突然避开他人拒绝沟通',
  '行为明显改变',
  '正在接受心理治疗或确诊精神疾病',
  '其他',
]

export const crisisClassMeasuresOptions = [
  '已制定干预方案',
  '已联系约谈家长',
  '经常与该生交流',
  '班干部同伴支持',
  '已告知任课老师',
]

export const academicLevelOptions = [
  { label: '特优', value: '特优' },
  { label: '优秀', value: '优秀' },
  { label: '良好', value: '良好' },
  { label: '合格', value: '合格' },
  { label: '待合格', value: '待合格' },
]
