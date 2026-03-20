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

