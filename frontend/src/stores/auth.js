import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '@/api/auth'
import { setTokens, clearPcAuth, getToken } from '@/utils/request'

export function copyPcTokenToH5Session() {
  const t = getToken()
  if (t) sessionStorage.setItem('xq_h5_token', t)
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getToken() || '')
  const refreshTokenVal = ref(localStorage.getItem('xq_refresh_token') || localStorage.getItem('refresh_token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('user_info') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const userRole = computed(() => userInfo.value?.role || '')
  const realName = computed(() => userInfo.value?.realName || userInfo.value?.real_name || '')
  const tenantName = computed(() => userInfo.value?.tenantName || userInfo.value?.tenant_name || '')

  function setAuth(data, tenantCode) {
    token.value = data.accessToken
    refreshTokenVal.value = data.refreshToken
    userInfo.value = {
      ...data.user,
      roles: data.user?.roles?.length ? data.user.roles : data.user?.role ? [data.user.role] : [],
    }
    setTokens(data.accessToken, data.refreshToken)
    if (tenantCode) localStorage.setItem('xq_tenant_code', tenantCode)
    localStorage.setItem('user_info', JSON.stringify(userInfo.value))
  }

  function clearAuth() {
    token.value = ''
    refreshTokenVal.value = ''
    userInfo.value = null
    clearPcAuth()
  }

  async function login(username, password, tenantCode) {
    const res = await authApi.login({ username, password, tenant_code: tenantCode })
    setAuth(res.data, tenantCode)
    return res.data
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch { /* ignore */ }
    clearAuth()
  }

  async function fetchUser() {
    const res = await authApi.getCurrentUser()
    const u = res.data
    userInfo.value = {
      ...u,
      id: String(u.id),
      roles: u.roles?.length ? u.roles : u.role ? [u.role] : [],
    }
    localStorage.setItem('user_info', JSON.stringify(userInfo.value))
    return userInfo.value
  }

  return {
    token, refreshTokenVal, userInfo,
    isLoggedIn, userRole, realName, tenantName,
    setAuth, clearAuth, login, logout, fetchUser,
  }
})
