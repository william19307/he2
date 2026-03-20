import request from '@/utils/request'

export function getPlans(params) {
  return request.get('/assessment-plans', { params })
}

export function createPlan(data) {
  return request.post('/assessment-plans', data)
}

export function getPlan(id) {
  return request.get(`/assessment-plans/${id}`)
}

export function updatePlan(id, data) {
  return request.put(`/assessment-plans/${id}`, data)
}

export function publishPlan(id) {
  return request.post(`/assessment-plans/${id}/publish`)
}

export function cancelPlan(id) {
  return request.post(`/assessment-plans/${id}/cancel`)
}

export function getPlanProgress(id) {
  return request.get(`/assessment-plans/${id}/progress`)
}

export function estimatePlan(data) {
  return request.post('/assessment-plans/estimate', data)
}
