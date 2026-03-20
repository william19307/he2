import request from '@/utils/request'

export function login(data) {
  return request.post('/auth/login', data)
}

export function refreshToken(refresh_token) {
  return request.post('/auth/refresh', { refresh_token })
}

export function logout() {
  return request.post('/auth/logout')
}

export function getCurrentUser() {
  return request.get('/auth/me')
}

export function changePassword(data) {
  return request.put('/auth/password', data)
}
