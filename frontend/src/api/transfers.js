import request from '@/utils/request'

export function getPendingTransfers() {
  return request.get('/transfers/pending')
}

export function claimTransfer(id, data) {
  return request.post(`/transfers/${id}/claim`, data)
}

export function archiveTransfer(id) {
  return request.post(`/transfers/${id}/archive`)
}
