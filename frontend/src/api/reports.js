import request from '@/utils/request'

export function postStudentReport(studentId, params) {
  return request.post(`/reports/student/${studentId}`, params)
}

export function getReportTask(taskId) {
  return request.get(`/reports/tasks/${taskId}`)
}

export function getReportDownloadUrl(taskId) {
  return `/api/v1/reports/tasks/${taskId}/download`
}

export function postBatchReport(classId, params) {
  return request.post(`/reports/batch/class/${classId}`, params)
}
