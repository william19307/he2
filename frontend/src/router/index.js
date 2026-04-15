import { createRouter, createWebHistory } from 'vue-router'

/** 开发环境：无登录截取 KPI hover 样式用 */
const devRoutes = import.meta.env.DEV
  ? [
      {
        path: '/dev/kpi-screenshot',
        name: 'DevKpiScreenshot',
        component: () => import('../views/dashboard/DashboardKpiScreenshot.vue'),
        meta: { title: 'KPI截图', public: true },
      },
      {
        path: '/dev/dashboard-alerts-screenshot',
        name: 'DevDashboardAlertsScreenshot',
        component: () => import('../views/dev/DashboardAlertsScreenshot.vue'),
        meta: { title: '待处理预警截图', public: true },
      },
    ]
  : []

const routes = [
  ...devRoutes,
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/LoginPage.vue'),
    meta: { title: '登录', public: true }
  },
  {
    path: '/select-role',
    name: 'SelectRole',
    component: () => import('../views/login/SelectRole.vue'),
    meta: { title: '角色选择', public: true }
  },
  {
    path: '/students/:id/print',
    component: () => import('../layouts/BlankLayout.vue'),
    children: [
      {
        path: '',
        name: 'StudentPrint',
        component: () => import('../views/students/StudentPrint.vue'),
        meta: { title: '打印档案', desktopOnly: true },
      },
    ],
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/DashboardPage.vue'),
        meta: { title: '工作台', icon: 'icon-dashboard' }
      },
      {
        path: 'alerts',
        name: 'AlertList',
        component: () => import('../views/alerts/AlertList.vue'),
        meta: { title: '预警列表', icon: 'icon-exclamation-circle' }
      },
      {
        path: 'cases',
        name: 'CaseList',
        component: () => import('../views/cases/CaseList.vue'),
        meta: { title: '个案管理', icon: 'icon-user' }
      },
      {
        path: 'cases/:id',
        name: 'CaseDetail',
        component: () => import('../views/cases/CaseDetail.vue'),
        meta: { title: '个案详情' }
      },
      {
        path: 'alerts/:id',
        name: 'AlertDetail',
        component: () => import('../views/alerts/AlertDetail.vue'),
        meta: { title: '预警详情' }
      },
      {
        path: 'alerts/:id/chat-record',
        name: 'AlertChatRecord',
        component: () => import('../views/alerts/AlertChatRecord.vue'),
        meta: { title: '关联AI倾诉记录' }
      },
      {
        path: 'students',
        name: 'StudentList',
        component: () => import('../views/students/StudentList.vue'),
        meta: { title: '学生列表', icon: 'icon-user-group' }
      },
      {
        path: 'students/:id',
        name: 'StudentDetail',
        component: () => import('../views/students/StudentDetail.vue'),
        meta: { title: '学生档案' }
      },
      {
        path: 'training/create',
        name: 'TrainingCreate',
        component: () => import('../views/training/TrainingCreate.vue'),
        meta: { title: '发布培训', desktopOnly: true, requireAdmin: true },
      },
      {
        path: 'training/:id',
        name: 'TrainingDetail',
        component: () => import('../views/training/TrainingDetail.vue'),
        meta: { title: '培训详情', desktopOnly: true },
      },
      {
        path: 'training',
        name: 'TrainingList',
        component: () => import('../views/training/TrainingList.vue'),
        meta: { title: '培训活动', desktopOnly: true },
      },
      {
        path: 'transfers/pending',
        name: 'TransfersPending',
        component: () => import('../views/transfers/TransfersPending.vue'),
        meta: { title: '待认领学生', desktopOnly: true }
      },
      {
        path: 'scales',
        name: 'ScaleList',
        component: () => import('../views/scales/ScaleList.vue'),
        meta: { title: '量表列表', icon: 'icon-file', desktopOnly: true }
      },
      {
        path: 'scales/:id',
        name: 'ScaleDetail',
        component: () => import('../views/scales/ScaleDetail.vue'),
        meta: { title: '量表详情', desktopOnly: true }
      },
      {
        path: 'plans',
        name: 'PlanList',
        component: () => import('../views/assessments/PlanList.vue'),
        meta: { title: '测评计划', icon: 'icon-file', desktopOnly: true }
      },
      {
        path: 'plans/create',
        name: 'PlanCreate',
        component: () => import('../views/assessments/CreatePlanWizard.vue'),
        meta: { title: '新建计划', desktopOnly: true }
      },
      {
        path: 'plans/:id',
        name: 'PlanDetail',
        component: () => import('../views/assessments/PlanDetail.vue'),
        meta: { title: '计划详情', desktopOnly: true }
      },
      {
        path: 'dashboard/class',
        name: 'ClassBoard',
        component: () => import('../views/dashboard/ClassBoard.vue'),
        meta: { title: '班级看板', desktopOnly: true }
      },
      {
        path: 'dashboard/student/:id',
        name: 'StudentBoard',
        component: () => import('../views/dashboard/StudentBoard.vue'),
        meta: { title: '学生档案看板', desktopOnly: true }
      },
      {
        path: 'consult/schedule',
        name: 'ConsultSchedule',
        component: () => import('../views/consult/ConsultSchedule.vue'),
        meta: { title: '咨询排班', desktopOnly: true }
      },
      {
        path: 'consult/appointments',
        name: 'ConsultAppointments',
        component: () => import('../views/consult/ConsultAppointments.vue'),
        meta: { title: '预约管理', desktopOnly: true }
      },
      {
        path: 'intervention/referral',
        name: 'InterventionReferral',
        component: () => import('../views/intervention/MedicalReferral.vue'),
        meta: { title: '医疗转介', desktopOnly: true }
      },
      {
        path: 'intervention/sandplay',
        name: 'InterventionSandplay',
        component: () => import('../views/intervention/SandplayTherapy.vue'),
        meta: { title: '沙盘游戏疗法', desktopOnly: true }
      },
      {
        path: 'intervention/art-therapy',
        name: 'InterventionArtTherapy',
        component: () => import('../views/intervention/ArtTherapy.vue'),
        meta: { title: '绘画疗法', desktopOnly: true }
      },
      {
        path: 'intervention/hotlines',
        name: 'InterventionHotlines',
        component: () => import('../views/intervention/PsychHotlines.vue'),
        meta: { title: '心理援助热线', desktopOnly: true }
      },
      {
        path: 'admin/users',
        name: 'AdminUsers',
        component: () => import('../views/admin/AdminUsers.vue'),
        meta: { title: '用户管理', desktopOnly: true }
      },
      {
        path: 'admin/students/import',
        name: 'AdminImport',
        component: () => import('../views/admin/AdminImport.vue'),
        meta: { title: '批量导入学生', desktopOnly: true }
      },
      {
        path: 'resources',
        component: () => import('../layouts/ResourcesLayout.vue'),
        meta: { title: '资源下载', desktopOnly: true },
        redirect: '/resources/forms',
        children: [
          {
            path: 'forms',
            name: 'ResourceForms',
            component: () => import('../views/resources/FormList.vue'),
            meta: { title: '工作表格', desktopOnly: true },
          },
          {
            path: 'forms/:formType/records',
            name: 'ResourceFormRecords',
            component: () => import('../views/resources/FormRecordList.vue'),
            meta: { title: '表格记录', desktopOnly: true },
          },
        ],
      },
    ]
  },
  {
    path: '/h5',
    children: [
      {
        path: 'verify',
        name: 'H5Verify',
        component: () => import('../views/h5/VerifyPage.vue'),
        meta: { title: '身份验证', public: true }
      },
      {
        path: 'tasks',
        name: 'H5Tasks',
        component: () => import('../views/h5/TaskList.vue'),
        meta: { title: '首页', public: true }
      },
      {
        path: 'tasks/:id/intro',
        name: 'H5Intro',
        component: () => import('../views/h5/TaskIntro.vue'),
        meta: { title: '测评说明', public: true }
      },
      {
        path: 'tasks/:id/answer',
        name: 'H5Answer',
        component: () => import('../views/h5/AnswerPage.vue'),
        meta: { title: '作答', public: true }
      },
      {
        path: 'tasks/:id/confirm',
        name: 'H5Confirm',
        component: () => import('../views/h5/ConfirmPage.vue'),
        meta: { title: '确认提交', public: true }
      },
      {
        path: 'tasks/:id/done',
        name: 'H5Done',
        component: () => import('../views/h5/DonePage.vue'),
        meta: { title: '完成', public: true }
      },
      {
        path: 'wellness',
        name: 'H5Wellness',
        component: () => import('../views/h5/WellnessList.vue'),
        meta: { title: '自助调适', public: true }
      },
      {
        path: 'wellness/:id',
        name: 'H5WellnessDetail',
        component: () => import('../views/h5/WellnessDetail.vue'),
        meta: { title: '文章详情', public: true }
      },
      {
        path: 'ai-chat/history',
        name: 'H5AiChatHistory',
        component: () => import('../views/h5/AiChatHistory.vue'),
        meta: { title: '历史对话', public: true }
      },
      {
        path: 'ai-chat',
        name: 'H5AiChat',
        component: () => import('../views/h5/AiChatPage.vue'),
        meta: { title: '小晴心理陪伴', public: true }
      },
      {
        path: 'consult',
        name: 'H5Consult',
        component: () => import('../views/h5/ConsultBook.vue'),
        meta: { title: '预约咨询', public: true }
      },
      {
        path: 'consult/my',
        name: 'H5ConsultMy',
        component: () => import('../views/h5/ConsultMy.vue'),
        meta: { title: '我的预约', public: true }
      },
    ]
  },
  {
    path: '/parent',
    children: [
      {
        path: 'bind',
        name: 'ParentBind',
        component: () => import('../views/parent/ParentBind.vue'),
        meta: { title: '家长绑定', public: true }
      },
      {
        path: 'home',
        name: 'ParentHome',
        component: () => import('../views/parent/ParentHome.vue'),
        meta: { title: '家长首页' }
      },
      {
        path: 'notifications',
        name: 'ParentNotifications',
        component: () => import('../views/parent/ParentNotifications.vue'),
        meta: { title: '通知列表' }
      },
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '心晴平台'} - 心晴·中小学心理健康管理平台`

  if (to.path.startsWith('/parent')) {
    if (to.path === '/parent/bind') return next()
    if (!localStorage.getItem('xq_parent_token')) {
      return next({ path: '/parent/bind', query: { redirect: to.fullPath } })
    }
    return next()
  }

  if (to.path.startsWith('/h5')) {
    if (to.path === '/h5/verify') return next()
    if (!sessionStorage.getItem('xq_h5_token')) {
      return next({ path: '/h5/verify', query: { redirect: to.fullPath } })
    }
    return next()
  }

  if (to.meta.public) return next()
  const pcToken = localStorage.getItem('xq_token') || localStorage.getItem('access_token')
  if (!pcToken) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }
  if (to.meta.requireAdmin) {
    try {
      const u = JSON.parse(localStorage.getItem('user_info') || 'null')
      const role = u?.role || ''
      if (!['admin', 'super_admin'].includes(role)) {
        return next({ path: '/training' })
      }
    } catch {
      return next({ path: '/training' })
    }
  }
  next()
})

export default router
