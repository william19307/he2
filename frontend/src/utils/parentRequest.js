import axios from 'axios'

const PARENT_TOKEN_KEY = 'xq_parent_token'

export function getParentToken() {
  return localStorage.getItem(PARENT_TOKEN_KEY)
}

export function setParentToken(token) {
  if (token) localStorage.setItem(PARENT_TOKEN_KEY, token)
}

export function clearParentToken() {
  localStorage.removeItem(PARENT_TOKEN_KEY)
}

const parentRequest = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

parentRequest.interceptors.request.use((config) => {
  const token = getParentToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

parentRequest.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body?.code === 0) return body
    return Promise.reject(body || res)
  },
  (err) => {
    const status = err.response?.status
    const body = err.response?.data
    if (status === 401) {
      clearParentToken()
      if (!window.location.pathname.startsWith('/parent/bind')) {
        window.location.href = '/parent/bind'
      }
    }
    return Promise.reject(body || err)
  }
)

export default parentRequest
