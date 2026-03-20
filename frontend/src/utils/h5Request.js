/**
 * H5 学生端专用请求：Token 存 sessionStorage（xq_h5_token），与 PC 端隔离
 */
import axios from 'axios'
import { Message } from '@arco-design/web-vue'

const h5Request = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

h5Request.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('xq_h5_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

h5Request.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body.code !== 0) {
      if (body.code === 1001 || body.code === 1002) {
        sessionStorage.removeItem('xq_h5_token')
        sessionStorage.removeItem('xq_h5_student')
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/h5/verify')) {
          window.location.href = `/h5/verify?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
        }
      }
      Message.error(body.message || '请求失败')
      return Promise.reject(body)
    }
    return body.data
  },
  (err) => {
    const msg = err.response?.data?.message || '网络异常'
    Message.error(msg)
    return Promise.reject(err)
  }
)

/** 公开接口（无 Token） */
export async function h5PostPublic(url, data) {
  const { data: body } = await axios.post(`/api/v1${url}`, data, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  })
  if (body.code !== 0) {
    Message.error(body.message || '请求失败')
    return Promise.reject(body)
  }
  return body.data
}

export default h5Request
