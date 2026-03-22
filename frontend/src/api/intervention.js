import request from '@/utils/request'

/** @param {{ page?: number, page_size?: number, status?: string, keyword?: string }} params */
export function getReferrals(params) {
  return request.get('/intervention/referrals', { params })
}

export function getReferralDetail(id) {
  return request.get(`/intervention/referrals/${id}`)
}

/** @param {{ student_id: number|string, referral_date: string, institution: string, reason: string, parent_informed?: boolean }} data */
export function createReferral(data) {
  return request.post('/intervention/referrals', data)
}

/** @param {string|number} id @param {{ status?: string, follow_up_note?: string }} data */
export function updateReferralStatus(id, data) {
  return request.put(`/intervention/referrals/${id}`, data)
}
