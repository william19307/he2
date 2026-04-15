import request from '@/utils/request'

export function createFormRecord(data) {
  return request.post('/form-records', data)
}

export function updateFormRecord(id, data) {
  return request.put(`/form-records/${id}`, data)
}

export function getFormRecord(id) {
  return request.get(`/form-records/${id}`)
}

export function listFormRecords(params) {
  return request.get('/form-records', { params })
}

export function listStudentFormRecords(studentId) {
  return request.get(`/form-records/student/${studentId}`)
}

export function deleteFormRecord(id) {
  return request.delete(`/form-records/${id}`)
}

export function uploadFormFile(file) {
  const fd = new FormData()
  fd.append('file', file)
  return request.post('/upload', fd)
}
