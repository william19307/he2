import request from '@/utils/request'

export function getConsultSchedules(params) {
  return request.get('/consult/schedules', { params })
}

export function postConsultSchedules(data) {
  return request.post('/consult/schedules', data)
}

export function putConsultSchedule(id, data) {
  return request.put(`/consult/schedules/${id}`, data)
}

export function getConsultAppointments(params) {
  return request.get('/consult/appointments', { params })
}

export function confirmConsultAppointment(id) {
  return request.post(`/consult/appointments/${id}/confirm`, {})
}

export function cancelConsultAppointment(id, data) {
  return request.post(`/consult/appointments/${id}/cancel`, data)
}

export function completeConsultAppointment(id, data) {
  return request.post(`/consult/appointments/${id}/complete`, data)
}
