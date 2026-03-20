import request from '@/utils/request'

export function getMyTasks() {
  return request.get('/student/tasks')
}

export function getTaskDetail(id) {
  return request.get(`/student/tasks/${id}`)
}

export function startTask(id) {
  return request.post(`/student/tasks/${id}/start`)
}

export function submitTask(id, data) {
  return request.post(`/student/tasks/${id}/submit`, data)
}

export function getMyHistory() {
  return request.get('/student/history')
}
