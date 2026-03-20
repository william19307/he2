import h5Request, { h5PostPublic } from '@/utils/h5Request'

/** 附录三 7.1：学号+密码（与联调文档一致） */
export function h5Verify(payload) {
  return h5PostPublic('/h5/verify', {
    tenant_code: payload.tenant_code,
    student_no: payload.student_no,
    password: payload.password,
  })
}

export function h5GetTasks() {
  return h5Request.get('/h5/tasks')
}

export function h5GetQuestions(taskId) {
  return h5Request.get(`/h5/tasks/${taskId}/questions`)
}

export function h5StartTask(taskId) {
  return h5Request.post(`/h5/tasks/${taskId}/start`)
}

/** answers: [{ question_id, question_no?, value }] */
export function h5SaveProgress(taskId, answers) {
  return h5Request.post(`/h5/tasks/${taskId}/save-progress`, { answers })
}

export function h5SubmitTask(taskId, body) {
  return h5Request.post(`/h5/tasks/${taskId}/submit`, body)
}

export function h5ConsultAvailableSlots(params) {
  return h5Request.get('/h5/consult/available-slots', { params })
}

export function h5ConsultBook(data) {
  return h5Request.post('/h5/consult/appointments', data)
}

export function h5ConsultMy() {
  return h5Request.get('/h5/consult/my-appointments')
}

export function h5ConsultCancel(id, cancel_reason) {
  return h5Request.post(`/h5/consult/appointments/${id}/cancel`, { cancel_reason })
}

export function h5WellnessArticles(params) {
  return h5Request.get('/h5/wellness/articles', { params })
}

export function h5WellnessArticleDetail(id) {
  return h5Request.get(`/h5/wellness/articles/${id}`)
}

export function h5AiChatSessions() {
  return h5Request.get('/h5/ai-chat/sessions')
}

export function h5AiChatCreateSession(resume_session_id) {
  if (resume_session_id) {
    return h5Request.post('/h5/ai-chat/sessions', { resume_session_id: String(resume_session_id) })
  }
  return h5Request.post('/h5/ai-chat/sessions')
}

export function h5AiChatSendMessage(sessionId, message) {
  return h5Request.post(`/h5/ai-chat/sessions/${sessionId}/messages`, { message })
}

/** 分页拉取会话消息：最近 limit 条；before_id 取更早 */
export function h5AiChatSessionMessages(sessionId, params = {}) {
  return h5Request.get(`/h5/ai-chat/sessions/${sessionId}/messages`, { params })
}

