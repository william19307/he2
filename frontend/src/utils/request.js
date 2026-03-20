import axios from 'axios'
import { Message } from '@arco-design/web-vue'

const TOKEN_KEY = 'xq_token'
const REFRESH_KEY = 'xq_refresh_token'
const LEGACY_ACCESS = 'access_token'
const LEGACY_REFRESH = 'refresh_token'

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_ACCESS)
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) || localStorage.getItem(LEGACY_REFRESH)
}

function setTokens(access, refresh) {
  if (access) {
    localStorage.setItem(TOKEN_KEY, access)
    localStorage.setItem(LEGACY_ACCESS, access)
  }
  if (refresh) {
    localStorage.setItem(REFRESH_KEY, refresh)
    localStorage.setItem(LEGACY_REFRESH, refresh)
  }
}

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  const tenant = localStorage.getItem('xq_tenant_code')
  if (tenant) config.headers['X-Tenant-Code'] = tenant
  return config
})

async function tryRefresh() {
  const rt = getRefreshToken()
  if (!rt) return null
  const { data: body } = await axios.post('/api/v1/auth/refresh', { refresh_token: rt })
  if (body.code === 0 && body.data?.accessToken) {
    setTokens(body.data.accessToken, null)
    return body.data.accessToken
  }
  return null
}

function isAuthPath(url) {
  return url?.includes('/auth/login') || url?.includes('/auth/refresh')
}

request.interceptors.response.use(
  async (response) => {
    const body = response.data
    const url = response.config?.url || ''

    if (body.code === 0) return body

    if (body.code === 1002 && !response.config._retry && !isAuthPath(url)) {
      response.config._retry = true
      const newTok = await tryRefresh().catch(() => null)
      if (newTok) {
        response.config.headers.Authorization = `Bearer ${newTok}`
        return request(response.config)
      }
      clearPcAuth()
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      return Promise.reject(body)
    }

    if (body.code === 1001 && !isAuthPath(url)) {
      clearPcAuth()
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      return Promise.reject(body)
    }

    if (body.code === 1003) {
      Message.error('无操作权限')
      return Promise.reject(body)
    }
    if (body.code === 5001 || body.code === 5000) {
      Message.error('系统异常，请稍后重试')
      return Promise.reject(body)
    }

    Message.error(body.message || '请求失败')
    return Promise.reject(body)
  },
  (err) => {
    const status = err.response?.status
    const body = err.response?.data
    const url = err.config?.url || ''
    if (status === 401 && isAuthPath(url)) {
      Message.error(body?.message || '账号或密码错误')
      return Promise.reject(err)
    }
    if (status === 401 && body?.code === 1002) {
      return Promise.reject(body)
    }
    if (status === 401) {
      clearPcAuth()
      window.location.href = `/login`
      return Promise.reject(err)
    }
    Message.error(body?.message || '网络异常，请稍后重试')
    return Promise.reject(err)
  }
)

export function clearPcAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(LEGACY_ACCESS)
  localStorage.removeItem(LEGACY_REFRESH)
  localStorage.removeItem('user_info')
  localStorage.removeItem('xq_tenant_code')
}

export { setTokens, getToken, TOKEN_KEY, REFRESH_KEY }
export default request
