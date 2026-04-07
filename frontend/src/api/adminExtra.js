import request from '@/utils/request'

/** 跨校升学：搜索租户/学校 */
export function searchTenants(params) {
  return request.get('/admin/tenants', { params })
}

export function getCounselorsForTenant(tenantId) {
  return request.get('/admin/counselors-for-tenant', { params: { tenant_id: tenantId } })
}

export function getClassesForTenant(tenantId) {
  return request.get('/admin/classes-for-tenant', { params: { tenant_id: tenantId } })
}
