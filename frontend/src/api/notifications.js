import request from '@/utils/request'

export function getUnreadNotificationCount() {
  return request.get('/notifications/unread-count')
}

export function getNotifications(params) {
  return request.get('/notifications', { params })
}

export function markNotificationsRead(data) {
  return request.post('/notifications/mark-read', data)
}
