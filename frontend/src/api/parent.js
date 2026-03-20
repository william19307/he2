import parentRequest from '@/utils/parentRequest'

export function postParentBind(data) {
  return parentRequest.post('/parent/bind', data)
}

export function getParentHealthSummary() {
  return parentRequest.get('/parent/child/health-summary')
}

export function getParentNotifications() {
  return parentRequest.get('/parent/notifications')
}
