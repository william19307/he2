/**
 * 生成前端 public 下的学生导入 Excel 模板
 * 运行: node scripts/gen-student-import-template.mjs
 */
import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const out = path.resolve(__dirname, '../../frontend/public/templates/student_import_template.xlsx')

const headers = [
  '学号',
  '姓名',
  '性别(1男2女)',
  '出生日期(YYYY-MM-DD)',
  '年级名称',
  '班级名称',
  '监护人姓名',
  '监护人电话',
]
const example = [
  '2024001',
  '张三',
  1,
  '2010-05-01',
  '初一',
  '1班',
  '张大明',
  '13800138000',
]

fs.mkdirSync(path.dirname(out), { recursive: true })
const ws = XLSX.utils.aoa_to_sheet([headers, example])
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, '学生导入')
XLSX.writeFile(wb, out)
console.log('written:', out)
