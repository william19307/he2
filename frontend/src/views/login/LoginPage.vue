<template>
  <div class="login-page">
    <div class="login-brand">
      <div class="brand-content">
        <div class="brand-heart">
          <IconHeart :size="76" />
        </div>
        <h1 class="brand-title">心晴</h1>
        <p class="brand-subtitle">中小学生心理健康管理平台</p>
        <div class="brand-separator" />
        <ul class="brand-features">
          <li><IconCheck :size="12" /> 50+ 标准化心理量表</li>
          <li><IconCheck :size="12" /> 三级预警·实时处置</li>
          <li><IconCheck :size="12" /> 符合教育部专项行动计划要求</li>
        </ul>
        <p class="brand-copyright">&copy; 2025 心晴平台</p>
      </div>
    </div>

    <div class="login-form-area">
      <div class="form-wrapper">
        <h2 class="form-title">欢迎登录</h2>
        <p class="form-subtitle">请输入您的账户信息</p>

        <a-form
          ref="formRef"
          :model="formData"
          :rules="rules"
          layout="vertical"
          class="login-form"
          @submit="handleLogin"
        >
          <a-form-item field="tenant_code" hide-label>
            <a-input
              v-model="formData.tenant_code"
              placeholder="学校编码"
              size="large"
              allow-clear
            >
              <template #prefix>
                <IconHome />
              </template>
            </a-input>
          </a-form-item>
          <a-form-item field="username" hide-label>
            <a-input
              v-model="formData.username"
              placeholder="账号"
              size="large"
              allow-clear
            >
              <template #prefix>
                <IconUser />
              </template>
            </a-input>
          </a-form-item>
          <a-form-item field="password" hide-label>
            <a-input-password
              v-model="formData.password"
              placeholder="密码"
              size="large"
              allow-clear
            />
          </a-form-item>
          <div class="form-row">
            <a-checkbox v-model="formData.remember">记住我</a-checkbox>
            <a-link size="small">忘记密码</a-link>
          </div>
          <a-form-item>
            <a-button
              type="primary"
              html-type="submit"
              size="large"
              long
              class="login-btn"
              :loading="loading"
            >
              登录
            </a-button>
          </a-form-item>
        </a-form>

        <a-alert type="normal" class="demo-tip">
          <template #title>演示账号（联调第一轮）</template>
          PC：学校编码 demo_school，心理老师 counselor001 / 管理员 admin，密码 123456。<br>
          学生答题请打开 <a href="/h5/verify" target="_blank">/h5/verify</a>，学号 20240001，密码 123456。
        </a-alert>

        <p class="form-footer">首次使用？联系管理员获取账号</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconHeart, IconCheck, IconUser, IconHome } from '@arco-design/web-vue/es/icon'
import { useAuthStore, copyPcTokenToH5Session } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const formRef = ref()
const loading = ref(false)

const formData = reactive({
  tenant_code: 'demo_school',
  username: '',
  password: '',
  remember: false,
})

const rules = {
  tenant_code: [{ required: true, message: '请输入学校编码' }],
  username: [
    { required: true, message: '请输入账号' },
    { minLength: 2, maxLength: 50, message: '账号长度为 2-50 个字符' },
  ],
  password: [
    { required: true, message: '请输入密码' },
    { minLength: 6, maxLength: 30, message: '密码长度为 6-30 个字符' },
  ],
}

const handleLogin = async ({ errors }) => {
  if (errors) return
  loading.value = true
  try {
    await authStore.login(formData.username, formData.password, formData.tenant_code)
    const me = await authStore.fetchUser()
    Message.success('登录成功')
    const role = me.role
    if (role === 'student') {
      copyPcTokenToH5Session()
      sessionStorage.setItem(
        'xq_h5_student',
        JSON.stringify({ name: me.realName || me.real_name, id: me.id })
      )
      router.push('/h5/tasks')
      return
    }
    const roles = me.roles?.length ? me.roles : role ? [role] : []
    if (roles.length > 1) {
      router.push('/select-role')
      return
    }
    const redirect = route.query.redirect && String(route.query.redirect).startsWith('/')
      ? route.query.redirect
      : '/dashboard'
    router.push(redirect)
  } catch {
    /* 拦截器已提示 */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
}

.login-brand {
  flex: 0 0 50%;
  background: linear-gradient(180deg, var(--color-primary-7) 0%, var(--color-primary-5) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.brand-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 360px;
}

.brand-heart { color: #fff; margin-bottom: 24px; }
.brand-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 32px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 12px;
}
.brand-subtitle { font-size: 16px; color: rgba(255,255,255,0.8); margin: 0 0 32px; }
.brand-separator { width: 40px; height: 1px; background: rgba(255,255,255,0.2); margin-bottom: 28px; }
.brand-features { list-style: none; padding: 0; margin: 0 0 auto; }
.brand-features li {
  display: flex; align-items: center; justify-content: center;
  gap: 8px; font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 12px;
}
.brand-copyright { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 48px; }

.login-form-area {
  flex: 0 0 50%;
  background: var(--color-bg-white, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.form-wrapper { width: 100%; max-width: 380px; }
.form-title { font-size: 24px; font-weight: 600; color: var(--color-text-1); margin: 0 0 8px; }
.form-subtitle { font-size: 14px; color: var(--color-text-3); margin: 0 0 28px; }

.login-form :deep(.arco-form-item) { margin-bottom: 20px; }
.form-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.login-btn { height: 40px !important; }

.demo-tip { margin-top: 20px; font-size: 12px; }
.form-footer { font-size: 12px; color: var(--color-text-3); text-align: center; margin: 20px 0 0; }
</style>
