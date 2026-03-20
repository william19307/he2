import request from '@/utils/request'

export function getAdminUsers(params) {
  return request.get('/admin/users', { params })
}

export function importStudents(file) {
  const fd = new FormData()
  fd.append('file', file)
  // 不要手动设 Content-Type，否则缺少 boundary，multer 收不到 file
  return request.post('/admin/students/import', fd)
}
