import request from '@/utils/request'

/** @param {{ status?: string, keyword?: string, page?: number, page_size?: number }} params */
export function getCases(params) {
  return request.get('/cases', { params })
}

export function getCaseDetail(id) {
  return request.get(`/cases/${id}`)
}

export function postCaseRecord(id, data) {
  return request.post(`/cases/${id}/records`, data)
}

export function postCaseClose(id, data) {
  return request.post(`/cases/${id}/close`, data)
}
