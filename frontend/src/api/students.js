import request from '@/utils/request'

export function getClasses(params) {
  return request.get('/classes', { params })
}

export function getClassStudents(classId) {
  return request.get(`/classes/${classId}/students`)
}

export function getStudents(params) {
  return request.get('/students', { params })
}

export function getGrades() {
  return request.get('/grades')
}

export function getGradeClasses(gradeId) {
  return request.get(`/grades/${gradeId}/classes`)
}

export function getDashboardSchool() {
  return request.get('/dashboard/school')
}

export function getDashboardClass(classId) {
  return request.get(`/dashboard/class/${classId}`)
}

export function getDashboardStudent(studentId) {
  return request.get(`/dashboard/student/${studentId}`)
}

/** userId 与列表「查看档案」一致 */
export function getStudentProfile(userId) {
  return request.get(`/students/${userId}`)
}

export function getStudentAssessments(userId, params) {
  return request.get(`/students/${userId}/assessments`, { params })
}

export function getStudentAlerts(userId) {
  return request.get(`/students/${userId}/alerts`)
}

export function getStudentCase(userId) {
  return request.get(`/students/${userId}/case`)
}

export function postStudentParentComm(userId, data) {
  return request.post(`/students/${userId}/parent-comms`, data)
}

export function getStudentPhysicals(userId) {
  return request.get(`/students/${userId}/physicals`)
}

export function postStudentPhysical(userId, data) {
  return request.post(`/students/${userId}/physicals`, data)
}

export function putStudentPhysical(userId, recordId, data) {
  return request.put(`/students/${userId}/physicals/${recordId}`, data)
}

export function deleteStudentPhysical(userId, recordId) {
  return request.delete(`/students/${userId}/physicals/${recordId}`)
}

export function postStudentTransfer(userId, data) {
  return request.post(`/students/${userId}/transfer`, data)
}

export function getStudentTransferHistory(userId) {
  return request.get(`/students/${userId}/transfer-history`)
}
