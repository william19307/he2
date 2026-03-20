<template>
  <div class="h5-page verify-page">
    <div class="verify-header">
      <div class="logo-icon">💚</div>
      <h1>心晴测评</h1>
      <p>请使用学号与密码验证身份（联调第一轮）</p>
    </div>
    <div class="verify-form">
      <a-form :model="form" layout="vertical" @submit="handleSubmit">
        <a-form-item field="tenant_code" label="学校编码" :rules="[{ required: true, message: '请输入学校编码' }]">
          <a-input v-model="form.tenant_code" placeholder="如 demo_school" size="large" />
        </a-form-item>
        <a-form-item field="student_no" label="学号" :rules="[{ required: true, message: '请输入学号' }]">
          <a-input v-model="form.student_no" placeholder="如 20240001" size="large" />
        </a-form-item>
        <a-form-item field="password" label="密码" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password v-model="form.password" placeholder="初始密码见种子数据说明" size="large" />
        </a-form-item>
        <a-button type="primary" html-type="submit" long size="large" :loading="loading" class="submit-btn">
          验证并进入
        </a-button>
      </a-form>
      <p class="tip">演示：学校编码 <code>demo_school</code>，学号 <code>20240001</code>，用户名也可填 <code>student001</code>，密码 <code>123456</code></p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { h5Verify } from '@/api/h5'

const router = useRouter()
const route = useRoute()
const loading = ref(false)

const form = reactive({
  tenant_code: 'demo_school',
  student_no: '',
  password: '',
})

async function handleSubmit({ errors }) {
  if (errors) return
  loading.value = true
  try {
    const data = await h5Verify({
      tenant_code: form.tenant_code.trim(),
      student_no: form.student_no.trim(),
      password: form.password,
    })
    const tok = data.token || data.accessToken
    if (!tok) {
      Message.error('登录响应缺少 token')
      return
    }
    sessionStorage.setItem('xq_h5_token', tok)
    if (data.refresh_token) sessionStorage.setItem('xq_h5_refresh', data.refresh_token)
    sessionStorage.setItem('xq_h5_student', JSON.stringify(data.student || {}))
    Message.success('验证成功')
    const redir = route.query.redirect
    router.push(typeof redir === 'string' && redir.startsWith('/h5') ? redir : '/h5/tasks')
  } catch {
    /* h5PostPublic 已 Message */
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (route.query.tenant) form.tenant_code = String(route.query.tenant)
})
</script>

<style scoped>
.h5-page { max-width: 420px; margin: 0 auto; padding: 28px 20px; min-height: 100vh; background: var(--h5-bg); }
.verify-header { text-align: center; padding: 32px 0 24px; }
.verify-header .logo-icon { font-size: 48px; margin-bottom: 12px; }
.verify-header h1 { font-size: 24px; font-weight: 700; color: var(--h5-text); margin: 0 0 8px; }
.verify-header p { font-size: 13px; color: var(--h5-subtext); margin: 0; }
.verify-form {
  background: var(--h5-surface);
  border: 1px solid var(--h5-border);
  border-radius: var(--h5-radius-card);
  box-shadow: var(--h5-shadow);
  padding: 18px;
}
.submit-btn { margin-top: 8px; border-radius: var(--h5-radius-pill) !important; }
.tip { font-size: 12px; color: var(--h5-subtext); margin-top: 20px; line-height: 1.6; }
.tip code { background: #f0eee9; padding: 2px 6px; border-radius: 4px; }
</style>
