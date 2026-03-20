<template>
  <div class="page-wrap">
    <a-page-header title="批量导入学生" @back="$router.back()" />
    <a-card :bordered="false">
      <p class="hint">
        可先下载 Excel 模板按列填写；上传支持 <strong>CSV（UTF-8）</strong> 或 <strong>Excel</strong>。表头需包含：<strong>学号、姓名、班级名称</strong>（与系统内班级一致），可选 <strong>性别</strong>；模板中其余列将随系统扩展逐步支持。
      </p>
      <div class="toolbar">
        <a-button @click="downloadTemplate">
          <template #icon>
            <IconDownload />
          </template>
          下载导入模板
        </a-button>
      </div>
      <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="file-inp" @change="onPick" />
      <a-button type="primary" style="margin-top: 16px" :loading="loading" :disabled="!file" @click="submit">
        开始导入
      </a-button>
      <a-alert v-if="result" type="success" style="margin-top: 20px">
        成功导入 {{ result.imported_count }} 人
        <span v-if="result.failed_count">，失败 {{ result.failed_count }} 条</span>
      </a-alert>
      <a-table
        v-if="result?.failed?.length"
        :data="result.failed"
        :pagination="false"
        size="small"
        style="margin-top: 16px"
        title="失败明细"
      >
        <template #columns>
          <a-table-column title="行" data-index="row" :width="60" />
          <a-table-column title="学号" data-index="student_no" />
          <a-table-column title="原因" data-index="reason" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconDownload } from '@arco-design/web-vue/es/icon'
import { importStudents } from '@/api/admin'

const TEMPLATE_PATH = 'templates/student_import_template.xlsx'

function downloadTemplate() {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
  const url = new URL(TEMPLATE_PATH, window.location.origin + base).href
  const a = document.createElement('a')
  a.href = url
  a.download = 'student_import_template.xlsx'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const file = ref(null)
const loading = ref(false)
const result = ref(null)

function onPick(e) {
  file.value = e.target?.files?.[0] || null
}

async function submit() {
  if (!file.value) return
  loading.value = true
  result.value = null
  try {
    const res = await importStudents(file.value)
    result.value = res.data || {}
    Message.success('导入完成')
  } catch {
    /* */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page-wrap {
  max-width: 720px;
}
.toolbar {
  margin-bottom: 12px;
}
.file-inp {
  display: block;
  margin: 8px 0;
}
.hint {
  color: var(--color-text-2);
  margin-bottom: 16px;
  line-height: 1.6;
}
</style>
