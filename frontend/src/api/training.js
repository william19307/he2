import request from '@/utils/request'

export function getTrainingSessions(params) {
  return request.get('/training/sessions', { params })
}

export function createTrainingSession(data) {
  return request.post('/training/sessions', data)
}

export function getTrainingSessionDetail(id) {
  return request.get(`/training/sessions/${id}`)
}

export function updateTrainingSession(id, data) {
  return request.put(`/training/sessions/${id}`, data)
}

export function publishTrainingSession(id, data) {
  return request.put(`/training/sessions/${id}/publish`, data || {})
}

export function completeTrainingSession(id) {
  return request.post(`/training/sessions/${id}/complete`)
}

export function updateTrainingParticipants(id, data) {
  return request.put(`/training/sessions/${id}/participants`, data)
}

export function getMyTrainings() {
  return request.get('/training/my')
}
