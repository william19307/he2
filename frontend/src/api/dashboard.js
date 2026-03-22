import request from '@/utils/request'

/** 工作台首页 KPI（与 backend dashboardWorkbench.js 对齐） */
export function getDashboardOverview() {
  return request.get('/dashboard/overview')
}

export function getPendingAlerts(params) {
  return request.get('/dashboard/pending-alerts', { params })
}

export function getActivePlans(params) {
  return request.get('/dashboard/active-plans', { params })
}

export function getWeekStats() {
  return request.get('/dashboard/week-stats')
}

/** 待办提醒（含 link_type、link_id） */
export function getDashboardTodos() {
  return request.get('/dashboard/todos')
}

export function getAlertTrend(params) {
  return request.get('/dashboard/alert-trend', { params })
}

export function getClassCompare(classId, planIds) {
  return request.get(`/dashboard/class/${classId}/compare`, {
    params: { plan_ids: Array.isArray(planIds) ? planIds.join(',') : planIds },
  })
}
