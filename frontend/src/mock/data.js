export const currentUser = {
  id: 'u001',
  name: '张晓慧',
  role: 'counselor',
  roleName: '心理教师',
  avatar: '',
  school: '市第一中学',
}

export const kpiData = {
  weeklyAssessments: { value: 342, change: 12, trend: 'up', desc: '覆盖率 87.2%' },
  redAlerts: { value: 3, desc: '本月累计触发 8 次', extra: '需24h内处置' },
  yellowAlerts: { value: 12, desc: '本月已关闭 8 个', extra: '其中5个超7天未更新' },
  activeCases: { value: 28, change: 2, desc: '本月结案 3', extra: '本周新增 2' },
}

export const alertList = [
  {
    id: 'AL-2025031701',
    studentName: '李梦瑶',
    studentId: 's001',
    grade: '初二',
    className: '3班',
    level: 'red',
    scaleName: 'PHQ-9',
    score: 22,
    totalScore: 27,
    reason: 'PHQ-9总分22分（重度抑郁），且第9题（自伤/死亡念头）作答2分以上',
    triggerTime: '2025-03-17 09:23',
    timeAgo: '2小时前',
    status: 'pending',
    handler: null,
    sla: '剩余 21h 36m',
  },
  {
    id: 'AL-2025031702',
    studentName: '王浩然',
    studentId: 's002',
    grade: '初三',
    className: '1班',
    level: 'red',
    scaleName: 'SDS',
    score: 76,
    totalScore: 100,
    reason: 'SDS标准分76分（重度抑郁区间），连续两次测评均在重度范围',
    triggerTime: '2025-03-17 08:15',
    timeAgo: '3小时前',
    status: 'pending',
    handler: null,
    sla: '剩余 20h 28m',
  },
  {
    id: 'AL-2025031703',
    studentName: '陈小雨',
    studentId: 's003',
    grade: '初一',
    className: '5班',
    level: 'yellow',
    scaleName: 'GAD-7',
    score: 14,
    totalScore: 21,
    reason: 'GAD-7总分14分（中度焦虑），近3个月得分持续上升',
    triggerTime: '2025-03-16 14:30',
    timeAgo: '1天前',
    status: 'processing',
    handler: '张晓慧',
    sla: '第 2 天',
  },
  {
    id: 'AL-2025031704',
    studentName: '刘思涵',
    studentId: 's004',
    grade: '初二',
    className: '2班',
    level: 'yellow',
    scaleName: 'SCL-90',
    score: 3.2,
    totalScore: 5,
    reason: 'SCL-90均分3.2（明显异常），抑郁和人际敏感因子突出',
    triggerTime: '2025-03-15 16:20',
    timeAgo: '2天前',
    status: 'processing',
    handler: '张晓慧',
    sla: '第 3 天',
  },
  {
    id: 'AL-2025031705',
    studentName: '赵子轩',
    studentId: 's005',
    grade: '初三',
    className: '4班',
    level: 'red',
    scaleName: 'PHQ-9',
    score: 19,
    totalScore: 27,
    reason: 'PHQ-9总分19分（中重度抑郁），第9题得分3分',
    triggerTime: '2025-03-17 10:45',
    timeAgo: '1小时前',
    status: 'pending',
    handler: null,
    sla: '剩余 23h 15m',
  },
]

/** 工作台待办回退数据（与 GET /dashboard/todos 字段对齐，16 条便于分页自测） */
export const todoItemsFallback = [
  { id: 'fb-1', text: '李梦瑶红色预警未处置', due_time: '今天 17:00', link_type: 'alert', link_id: 1, overdue: false },
  { id: 'fb-2', text: '赵子轩红色预警未处置', due_time: '今天 18:00', link_type: 'alert', link_id: 2, overdue: false },
  { id: 'fb-3', text: '陈小雨黄色预警跟进超3天', due_time: '已超期', link_type: 'alert', link_id: 3, overdue: true },
  { id: 'fb-4', text: '个案：李明浩', due_time: '—', link_type: 'case', link_id: 1, overdue: false },
  { id: 'fb-5', text: '测评计划：2025春季心理普测', due_time: '2025-03-20', link_type: 'plan', link_id: 1, overdue: false },
  { id: 'fb-6', text: '王芳红色预警未处置', due_time: '今天 16:00', link_type: 'alert', link_id: 6, overdue: false },
  { id: 'fb-7', text: '个案：张晓彤', due_time: '—', link_type: 'case', link_id: 2, overdue: false },
  { id: 'fb-8', text: '测评计划：初三考前筛查', due_time: '2025-03-28', link_type: 'plan', link_id: 2, overdue: false },
  { id: 'fb-9', text: '刘洋黄色预警待跟进', due_time: '明天 10:00', link_type: 'alert', link_id: 9, overdue: false },
  { id: 'fb-10', text: '周杰红色预警未处置', due_time: '今天 15:30', link_type: 'alert', link_id: 10, overdue: false },
  { id: 'fb-11', text: '个案：吴敏', due_time: '—', link_type: 'case', link_id: 3, overdue: false },
  { id: 'fb-12', text: '孙丽黄色预警跟进中', due_time: '3天内', link_type: 'alert', link_id: 12, overdue: false },
  { id: 'fb-13', text: '测评计划：高一心理健康月', due_time: '2025-04-01', link_type: 'plan', link_id: 3, overdue: false },
  { id: 'fb-14', text: '郑浩红色预警未处置', due_time: '今天 14:00', link_type: 'alert', link_id: 14, overdue: false },
  { id: 'fb-15', text: '钱雪黄色预警超期', due_time: '已超期', link_type: 'alert', link_id: 15, overdue: true },
  { id: 'fb-16', text: '个案：冯凯', due_time: '—', link_type: 'case', link_id: 4, overdue: false },
]

export const weeklyStats = {
  newAlerts: 5,
  resolved: 2,
  newCases: 1,
  sessions: 8,
  parentComms: 3,
  notifications: 12,
}

export const assessmentPlans = [
  { id: 'p001', name: '2025年春季开学心理普测', progress: 87.2, completed: 342, total: 392, deadline: '2025-03-20', urgent: true },
  { id: 'p002', name: '初三年级考前心理筛查', progress: 45.0, completed: 90, total: 200, deadline: '2025-03-28', urgent: false },
]

export const trendData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2025, 2, 17)
  date.setDate(date.getDate() - (29 - i))
  return {
    date: `${date.getMonth() + 1}/${date.getDate()}`,
    red: Math.floor(Math.random() * 3),
    yellow: Math.floor(Math.random() * 5 + 1),
  }
})

// 学生列表 mock 数据（10-15 条）
export const studentList = [
  { id: 's001', name: '李梦瑶', studentNo: '20230301015', grade: '初二', className: '3班', gender: '女', mentalState: 'high', caseStatus: '在案跟进中', lastAssessmentDate: '2025-03-17', alertCount: 3 },
  { id: 's002', name: '王浩然', studentNo: '20230301022', grade: '初三', className: '1班', gender: '男', mentalState: 'high', caseStatus: null, lastAssessmentDate: '2025-03-17', alertCount: 2 },
  { id: 's003', name: '陈小雨', studentNo: '20240301008', grade: '初一', className: '5班', gender: '女', mentalState: 'attention', caseStatus: '在案跟进中', lastAssessmentDate: '2025-03-16', alertCount: 1 },
  { id: 's004', name: '刘思涵', studentNo: '20230301033', grade: '初二', className: '2班', gender: '女', mentalState: 'attention', caseStatus: '在案跟进中', lastAssessmentDate: '2025-03-15', alertCount: 1 },
  { id: 's005', name: '赵子轩', studentNo: '20230301041', grade: '初三', className: '4班', gender: '男', mentalState: 'high', caseStatus: null, lastAssessmentDate: '2025-03-17', alertCount: 2 },
  { id: 's006', name: '张明远', studentNo: '20240301012', grade: '初一', className: '1班', gender: '男', mentalState: 'normal', caseStatus: null, lastAssessmentDate: '2025-03-10', alertCount: 0 },
  { id: 's007', name: '周雨欣', studentNo: '20230301019', grade: '初二', className: '4班', gender: '女', mentalState: 'normal', caseStatus: null, lastAssessmentDate: '2025-03-12', alertCount: 0 },
  { id: 's008', name: '吴俊杰', studentNo: '20230301027', grade: '初三', className: '2班', gender: '男', mentalState: 'attention', caseStatus: '已结案', lastAssessmentDate: '2025-03-08', alertCount: 0 },
  { id: 's009', name: '郑雅琪', studentNo: '20240301005', grade: '初一', className: '3班', gender: '女', mentalState: 'normal', caseStatus: null, lastAssessmentDate: '2025-03-14', alertCount: 0 },
  { id: 's010', name: '孙浩宇', studentNo: '20230301038', grade: '初二', className: '1班', gender: '男', mentalState: 'normal', caseStatus: null, lastAssessmentDate: '2025-03-11', alertCount: 0 },
  { id: 's011', name: '林诗涵', studentNo: '20240301021', grade: '初一', className: '4班', gender: '女', mentalState: 'attention', caseStatus: '在案跟进中', lastAssessmentDate: '2025-03-09', alertCount: 1 },
  { id: 's012', name: '黄志强', studentNo: '20230301044', grade: '初三', className: '5班', gender: '男', mentalState: 'normal', caseStatus: null, lastAssessmentDate: '2025-03-06', alertCount: 0 },
]

export const studentProfile = {
  id: 's001',
  name: '李梦瑶',
  gender: '女',
  age: 14,
  birthDate: '2010-11-15',
  grade: '初二',
  className: '3班',
  studentNo: '20230301015',
  headTeacher: '王明',
  enrollDate: '2023-09-01',
  status: '在籍',
  riskLevel: 'high',
  caseStatus: '在案跟进中',
  guardian1: { relation: '母亲', name: '张梦华', phone: '138****1234' },
  guardian2: { relation: '父亲', name: '李建国', phone: '139****5678' },
  familyType: '离异家庭',
  residence: '走读',
  stats: { assessments: 6, alerts: 3, sessions: 5, months: 18 },
  specialNotes: [
    { text: '父母2024年9月离异，跟随母亲生活', time: '2024-09' },
    { text: '2024年12月曾到市心理卫生中心就诊', time: '2024-12' },
  ],
  assessmentHistory: [
    { id: 'r001', scaleName: 'PHQ-9', date: '2025-03-17', score: 22, total: 27, level: 'severe', riskTag: 'red', subScales: [{ name: '抑郁', percent: 85 }, { name: '焦虑', percent: 60 }], triggeredAlert: true },
    { id: 'r002', scaleName: 'PHQ-9', date: '2024-12-15', score: 15, total: 27, level: 'moderate', riskTag: 'yellow', subScales: [{ name: '抑郁', percent: 55 }, { name: '焦虑', percent: 40 }], triggeredAlert: false },
    { id: 'r003', scaleName: 'PHQ-9', date: '2024-09-10', score: 8, total: 27, level: 'mild', riskTag: 'normal', subScales: [{ name: '抑郁', percent: 30 }, { name: '焦虑', percent: 25 }], triggeredAlert: false },
    { id: 'r004', scaleName: 'GAD-7', date: '2025-03-17', score: 12, total: 21, level: 'moderate', riskTag: 'yellow', subScales: [{ name: '焦虑', percent: 57 }], triggeredAlert: false },
    { id: 'r005', scaleName: 'SCL-90', date: '2025-01-20', score: 2.8, total: 5, level: 'moderate', riskTag: 'yellow', subScales: [{ name: '抑郁', percent: 65 }, { name: '人际敏感', percent: 58 }], triggeredAlert: false },
  ],
  alertRecords: [
    { id: 'al1', scaleName: 'PHQ-9', score: 22, level: 'red', levelTitle: '重度抑郁', triggerTime: '2025-03-17 09:23', handler: '张晓慧', status: '处理中', reason: 'PHQ-9总分22分（重度抑郁），且第9题（自伤/死亡念头）作答2分以上' },
    { id: 'al2', scaleName: 'PHQ-9', score: 15, level: 'yellow', levelTitle: '中度抑郁', triggerTime: '2024-12-15 14:20', handler: '张晓慧', status: '已关闭', reason: 'PHQ-9总分15分（中度抑郁），连续两次测评得分上升' },
    { id: 'al3', scaleName: 'GAD-7', score: 14, level: 'yellow', levelTitle: '中度焦虑', triggerTime: '2024-11-08 10:15', handler: '王老师', status: '已关闭', reason: 'GAD-7总分14分（中度焦虑）' },
  ],
  caseInfo: { createDate: '2023-09-15', responsibleTeacher: '张晓慧', currentStatus: '在案跟进中', priority: '高' },
  sessionRecords: [
    { id: 1, date: '2025-03-15', duration: '45分钟', responsible: '张晓慧', content: '学生主动来访，谈及近期学业压力较大，与母亲沟通不畅。情绪较稳定，愿意尝试与母亲进行沟通练习。', emotion: 3, nextPlan: '安排家长沟通，了解家庭情况' },
    { id: 2, date: '2025-03-08', duration: '50分钟', responsible: '张晓慧', content: '继续跟进抑郁情绪，学生表示睡眠有所改善。讨论了应对压力的方法。', emotion: 2, nextPlan: '两周后复评' },
    { id: 3, date: '2025-03-01', duration: '40分钟', responsible: '张晓慧', content: '首次深度会谈，建立信任关系。学生表达了对父母离异的感受。', emotion: 2, nextPlan: '定期会谈' },
    { id: 4, date: '2024-12-20', duration: '45分钟', responsible: '张晓慧', content: 'PHQ-9测评后跟进，讨论抑郁症状及应对策略。', emotion: 2, nextPlan: '一月后复测' },
    { id: 5, date: '2024-12-05', duration: '30分钟', responsible: '王老师', content: '初步接触，了解基本情况。', emotion: 3, nextPlan: '转介心理教师' },
  ],
  parentCommunications: [
    { id: 1, method: 'phone', methodIcon: '📞', person: '张梦华（母亲）', time: '2025-03-16 15:30', summary: '电话沟通，反馈学生近期情绪波动，睡眠改善。', feedback: '家长表示会配合学校关注孩子状态' },
    { id: 2, method: 'meeting', methodIcon: '👥', person: '张梦华、李建国', time: '2025-03-10 14:00', summary: '家长会面，讨论离异后抚养安排及学生心理支持。', feedback: '双方同意共同关注，定期沟通' },
    { id: 3, method: 'phone', methodIcon: '📞', person: '张梦华（母亲）', time: '2024-12-18 10:00', summary: 'PHQ-9测评后预警沟通，告知测评结果及建议。', feedback: '家长已预约心理卫生中心就诊' },
    { id: 4, method: 'phone', methodIcon: '📞', person: '张梦华（母亲）', time: '2024-09-20 16:00', summary: '建档初期沟通，了解家庭变故情况。', feedback: '家长愿意配合学校心理工作' },
  ],
  interventionPlan: {
    title: '抑郁情绪干预方案',
    status: '进行中',
    referenceScheme: 'PHQ-9 中度及以上抑郁干预参考方案',
    startDate: '2024-12-20',
    plannedSessions: 8,
    progress: [
      { title: '建立关系', status: 'finish' },
      { title: '情绪评估', status: 'finish' },
      { title: '认知调整', status: 'process' },
      { title: '行为激活', status: 'wait' },
      { title: '巩固总结', status: 'wait' },
    ],
  },
}

export const scaleCategories = [
  { key: 'emotion', label: '情绪类', count: 18, children: [
    { key: 'depression', label: '抑郁评估', count: 8 },
    { key: 'anxiety', label: '焦虑评估', count: 7 },
    { key: 'regulation', label: '情绪调节', count: 3 },
  ]},
  { key: 'stress', label: '压力与应激类', count: 8 },
  { key: 'behavior', label: '行为与适应类', count: 10, children: [
    { key: 'internet', label: '网络使用', count: 3 },
    { key: 'bully', label: '校园欺凌', count: 2 },
    { key: 'social', label: '社交行为', count: 5 },
  ]},
  { key: 'sleep', label: '睡眠与躯体化类', count: 4 },
  { key: 'self', label: '自我认知类', count: 6 },
  { key: 'interpersonal', label: '人际关系类', count: 6 },
  { key: 'custom', label: '学校自建量表', count: 2 },
]

export const scaleList = [
  { id: 'sc001', name: '患者健康问卷-9', abbr: 'PHQ-9', category: 'depression', questions: 9, duration: '5分钟', grades: ['初中', '高中'], hasAlert: true, color: '#4A90D9', desc: '评估过去两周内抑郁症状的严重程度，广泛应用于临床筛查。' },
  { id: 'sc002', name: '广泛性焦虑量表-7', abbr: 'GAD-7', category: 'anxiety', questions: 7, duration: '3分钟', grades: ['初中', '高中'], hasAlert: true, color: '#6FA89A', desc: '评估焦虑症状严重程度的简短自评工具，临床与科研中广泛使用。' },
  { id: 'sc003', name: '症状自评量表-90', abbr: 'SCL-90', category: 'emotion', questions: 90, duration: '30分钟', grades: ['初中', '高中'], hasAlert: true, color: '#D4A017', desc: '全面评估心理健康状况的经典量表，涵盖躯体化、抑郁、焦虑等9个因子。' },
  { id: 'sc004', name: '抑郁自评量表', abbr: 'SDS', category: 'depression', questions: 20, duration: '10分钟', grades: ['初中', '高中'], hasAlert: true, color: '#C0392B', desc: '由Zung编制的抑郁自评工具，广泛用于抑郁症状的筛查与严重度评估。' },
  { id: 'sc005', name: '中学生心理健康量表', abbr: 'MSSMHS', category: 'emotion', questions: 60, duration: '20分钟', grades: ['初中', '高中'], hasAlert: true, color: '#4a7c6f', desc: '专为中学生群体设计的综合心理健康评估工具，具有良好的本土化适应性。' },
  { id: 'sc006', name: '儿童焦虑性情绪障碍筛查表', abbr: 'SCARED', category: 'anxiety', questions: 41, duration: '15分钟', grades: ['小学', '初中'], hasAlert: true, color: '#6FA89A', desc: '适用于8-18岁儿童和青少年的焦虑障碍筛查工具。' },
  { id: 'sc007', name: '青少年生活事件量表', abbr: 'ASLEC', category: 'stress', questions: 27, duration: '10分钟', grades: ['初中', '高中'], hasAlert: false, color: '#86909C', desc: '评估青少年近一年内经历的生活事件及其影响程度。' },
  { id: 'sc008', name: '匹兹堡睡眠质量指数', abbr: 'PSQI', category: 'sleep', questions: 19, duration: '8分钟', grades: ['初中', '高中'], hasAlert: true, color: '#4A90D9', desc: '评估过去一个月内的睡眠质量和睡眠障碍的自评量表。' },
]

export const h5Questions = [
  { id: 1, text: '做事时提不起劲或没有兴趣', options: [
    { value: 0, label: '完全不会' }, { value: 1, label: '好几天' },
    { value: 2, label: '一半以上的天数' }, { value: 3, label: '几乎每天' }
  ]},
  { id: 2, text: '感到心情低落、沮丧或绝望', options: [
    { value: 0, label: '完全不会' }, { value: 1, label: '好几天' },
    { value: 2, label: '一半以上的天数' }, { value: 3, label: '几乎每天' }
  ]},
  { id: 3, text: '入睡困难、睡不安稳或睡眠过多', options: [
    { value: 0, label: '完全不会' }, { value: 1, label: '好几天' },
    { value: 2, label: '一半以上的天数' }, { value: 3, label: '几乎每天' }
  ]},
  { id: 4, text: '感觉疲倦或没有活力', options: [
    { value: 0, label: '完全不会' }, { value: 1, label: '好几天' },
    { value: 2, label: '一半以上的天数' }, { value: 3, label: '几乎每天' }
  ]},
  { id: 5, text: '食欲不振或吃太多', options: [
    { value: 0, label: '完全不会' }, { value: 1, label: '好几天' },
    { value: 2, label: '一半以上的天数' }, { value: 3, label: '几乎每天' }
  ]},
  { id: 6, text: '觉得自己很糟——或觉得自己很失败，或让自己或家人失望', options: [
    { value: 0, label: '完全不会' }, { value: 1, label: '好几天' },
    { value: 2, label: '一半以上的天数' }, { value: 3, label: '几乎每天' }
  ]},
  { id: 7, text: '对事物专注有困难，例如阅读报纸或看电视时', options: [
    { value: 0, label: '完全不会' }, { value: 1, label: '好几天' },
    { value: 2, label: '一半以上的天数' }, { value: 3, label: '几乎每天' }
  ]},
  { id: 8, text: '动作或说话速度缓慢到别人已经察觉？或正好相反——Loss得坐立不安、走来走去', options: [
    { value: 0, label: '完全不会' }, { value: 1, label: '好几天' },
    { value: 2, label: '一半以上的天数' }, { value: 3, label: '几乎每天' }
  ]},
  { id: 9, text: '有不如死掉或用某种方式伤害自己的念头', critical: true, options: [
    { value: 0, label: '完全不会' }, { value: 1, label: '好几天' },
    { value: 2, label: '一半以上的天数' }, { value: 3, label: '几乎每天' }
  ]},
]

// 班级级联选择器数据（年级 -> 班级）
export const classCascaderOptions = [
  { value: '初一', label: '初一', children: [
    { value: '初一-1班', label: '1班' },
    { value: '初一-2班', label: '2班' },
    { value: '初一-3班', label: '3班' },
    { value: '初一-4班', label: '4班' },
    { value: '初一-5班', label: '5班' },
  ]},
  { value: '初二', label: '初二', children: [
    { value: '初二-1班', label: '1班' },
    { value: '初二-2班', label: '2班' },
    { value: '初二-3班', label: '3班' },
    { value: '初二-4班', label: '4班' },
    { value: '初二-5班', label: '5班' },
  ]},
  { value: '初三', label: '初三', children: [
    { value: '初三-1班', label: '1班' },
    { value: '初三-2班', label: '2班' },
    { value: '初三-3班', label: '3班' },
    { value: '初三-4班', label: '4班' },
    { value: '初三-5班', label: '5班' },
  ]},
]

// 负责人选项
export const handlerOptions = [
  { value: 'u001', label: '张晓慧' },
  { value: 'u002', label: '王老师' },
  { value: 'u003', label: '李老师' },
]

// 预警详情 - 得分明细（PHQ-9 示例）
export const alertScoreDetail = [
  { no: 1, text: '做事时提不起劲或没有兴趣', option: '几乎每天', score: 3 },
  { no: 2, text: '感到心情低落、沮丧或绝望', option: '几乎每天', score: 3 },
  { no: 3, text: '入睡困难、睡不安稳或睡眠过多', option: '一半以上的天数', score: 2 },
  { no: 4, text: '感觉疲倦或没有活力', option: '几乎每天', score: 3 },
  { no: 5, text: '食欲不振或吃太多', option: '好几天', score: 1 },
  { no: 6, text: '觉得自己很糟——或觉得自己很失败', option: '一半以上的天数', score: 2 },
  { no: 7, text: '对事物专注有困难', option: '好几天', score: 1 },
  { no: 8, text: '动作或说话速度缓慢到别人已经察觉', option: '一半以上的天数', score: 2 },
  { no: 9, text: '有不如死掉或用某种方式伤害自己的念头', option: '一半以上的天数', score: 2, critical: true },
]

// 历史趋势数据（9月 8分 → 12月 15分 → 3月 22分）
export const alertHistoryTrend = [
  { month: '9月', score: 8 },
  { month: '12月', score: 15 },
  { month: '3月', score: 22 },
]

// 处置日志
export const dispositionLog = [
  { id: 1, operator: '张晓慧', operatorId: 'u001', action: '系统触发', desc: 'PHQ-9测评完成，系统自动触发红色预警', time: '2025-03-17 09:23', color: 'red' },
  { id: 2, operator: '系统', operatorId: 'sys', action: '通知发送', desc: '已向班主任、心理教师发送预警通知', time: '2025-03-17 09:24', color: 'gray' },
  { id: 3, operator: '张晓慧', operatorId: 'u001', action: '查看详情', desc: '已查看预警详情', time: '2025-03-17 10:15', color: 'blue' },
]
