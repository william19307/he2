import request from '@/utils/request'

export function getScaleCategories() {
  return request.get('/scale-categories')
}

export function getScales(params) {
  return request.get('/scales', { params })
}

export function getScale(id) {
  return request.get(`/scales/${id}`)
}

export function getScaleQuestions(id) {
  return request.get(`/scales/${id}/questions`)
}
