import request from '@/utils/request'

export function getAlerts(params) {
  return request.get('/alerts', { params })
}

export function getAlert(id) {
  return request.get(`/alerts/${id}`)
}

export function getAlertFilterCounselors() {
  return request.get('/alerts/counselors-list')
}

/** 人工上报预警 */
export function manualReport(data) {
  return request.post('/alerts/manual-report', data)
}

/** 获取可选处置人（含角色）*/
export function getManualReportCounselors() {
  return request.get('/alerts/manual-report/counselors')
}

export function assignAlert(id, data) {
  return request.post(`/alerts/${id}/assign`, data)
}

export function acceptAlert(id, data) {
  return request.post(`/alerts/${id}/accept`, data)
}

export function addAlertLog(id, data) {
  return request.post(`/alerts/${id}/logs`, data)
}

export function closeAlert(id, data) {
  return request.post(`/alerts/${id}/close`, data)
}
