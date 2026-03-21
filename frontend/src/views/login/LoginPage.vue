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
      <!-- 移动端顶部品牌（≤768px 显示；桌面端隐藏） -->
      <div class="mobile-brand-header" aria-hidden="false">
        <div class="mobile-brand-icon">
          <IconHeart :size="44" />
        </div>
        <h1 class="mobile-brand-title">心晴</h1>
        <p class="mobile-brand-subtitle">中小学生心理健康管理平台</p>
      </div>
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

        <div class="quick-entry-wrap">
          <p class="quick-entry-hint">学生和家长请使用专属入口</p>
          <div class="quick-entry-btns">
            <a
              class="quick-btn quick-btn--student"
              href="https://psylink.chat/h5/verify"
              target="_blank"
              rel="noopener noreferrer"
            >学生答题入口</a>
            <a
              class="quick-btn quick-btn--parent"
              href="https://psylink.chat/parent/bind"
              target="_blank"
              rel="noopener noreferrer"
            >家长查看入口</a>
          </div>
        </div>

        <a-alert type="normal" class="demo-tip demo-tip--pc">
          <template #title>演示账号（联调第一轮）</template>
          PC：学校编码 demo_school，心理老师 counselor001 / 管理员 admin，密码 123456。<br>
          学生答题请打开 <a href="/h5/verify" target="_blank">/h5/verify</a>，学号 20240001，密码 123456。
        </a-alert>

        <p class="form-footer">首次使用？联系管理员获取账号</p>

        <p class="demo-tip-mobile">
          演示账号：学校编码 demo_school；心理老师 counselor001 / 管理员 admin；密码 123456。学生端 /h5/verify，学号 20240001，密码 123456。
        </p>
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

/* 学生 / 家长快速入口（表单与演示提示之间） */
.quick-entry-wrap {
  width: 100%;
  margin-top: 8px;
  margin-bottom: 4px;
}
.quick-entry-hint {
  margin: 0 0 10px;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-3);
  line-height: 1.4;
}
.quick-entry-btns {
  display: flex;
  gap: 10px;
  width: 100%;
}
.quick-btn {
  flex: 1;
  width: 50%;
  min-width: 0;
  height: 40px;
  line-height: 38px;
  padding: 0 8px;
  box-sizing: border-box;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  text-decoration: none;
  background: transparent;
  cursor: pointer;
  transition: opacity 0.15s, border-color 0.15s, color 0.15s;
}
.quick-btn--student {
  border: 1px solid #2d7a6a;
  color: #2d7a6a;
}
.quick-btn--student:hover {
  border-color: #1C3530;
  color: #1C3530;
}
.quick-btn--parent {
  border: 1px solid #d1d5db;
  color: #6b7280;
}
.quick-btn--parent:hover {
  border-color: #9ca3af;
  color: #4b5563;
}

.demo-tip { margin-top: 20px; font-size: 12px; }
/* 默认隐藏（桌面），移动端由 @media 控制 */
.demo-tip-mobile { display: none; }
.mobile-brand-header { display: none; }
.form-footer { font-size: 12px; color: var(--color-text-3); text-align: center; margin: 20px 0 0; }

/* ================================================================
   移动端登录页 — max-width: 768px（含 768 宽，避免仍显示双栏）
   ================================================================ */
@media (max-width: 768px) {

  /* ── 页面容器：白色背景，单列，padding 32px ── */
  .login-page {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
    background: #ffffff;
    padding: 32px;
    box-sizing: border-box;
  }

  /* 左侧品牌栏完全隐藏 */
  .login-brand {
    display: none !important;
  }

  /* 表单区：全宽，取消原有 flex:0 0 50% 与内边距 */
  .login-form-area {
    flex: 1 1 auto !important;
    flex-basis: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    justify-content: flex-start !important;
  }

  .form-wrapper {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  /* ── 第一块：品牌头部（居中），margin-bottom 40px ── */
  .mobile-brand-header {
    display: flex !important;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-bottom: 40px;
    flex-shrink: 0;
  }

  .mobile-brand-icon {
    color: #1C3530;
    line-height: 1;
    margin-bottom: 10px;
  }

  .mobile-brand-title {
    font-family: 'Noto Serif SC', serif;
    font-size: 20px;
    font-weight: 500;
    color: #1C3530;
    margin: 0 0 4px;
    line-height: 1.3;
  }

  .mobile-brand-subtitle {
    display: block !important;
    font-size: 13px;
    color: #888888;
    margin: 0;
    line-height: 1.5;
  }

  /* ── 第二块：表单 ── */
  .form-title {
    font-size: 28px !important;
    font-weight: 600 !important;
    color: #111111 !important;
    text-align: left !important;
    margin: 0 0 24px !important;
    line-height: 1.3;
  }

  .form-subtitle {
    display: none !important;
  }

  /* 输入框间距 16px */
  .login-form :deep(.arco-form-item) {
    margin-top: 0 !important;
    margin-bottom: 16px !important;
  }

  /* 登录按钮 form-item：上方间距 24px（与最后输入框之间） */
  .login-form :deep(.arco-form-item:last-child) {
    margin-top: 24px !important;
    margin-bottom: 0 !important;
  }

  /* ── 输入框：高度 52px，圆角 12px，背景 #F5F5F5，无边框 ── */
  .login-form :deep(.arco-input-wrapper) {
    width: 100% !important;
    min-width: 0 !important;
    height: 52px !important;
    border-radius: 12px !important;
    background-color: #F5F5F5 !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 16px !important;
    font-size: 16px !important;
    box-sizing: border-box;
    display: flex !important;
    align-items: center !important;
  }

  .login-form :deep(.arco-input-wrapper:hover),
  .login-form :deep(.arco-input-wrapper.arco-input-focus),
  .login-form :deep(.arco-input-wrapper:focus-within) {
    background-color: #ebebeb !important;
    border: none !important;
    box-shadow: none !important;
  }

  /* 密码输入框 */
  .login-form :deep(.arco-input-password) {
    width: 100% !important;
    display: block !important;
  }

  .login-form :deep(.arco-input-password .arco-input-wrapper) {
    width: 100% !important;
    height: 52px !important;
    border-radius: 12px !important;
    background-color: #F5F5F5 !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 16px !important;
    font-size: 16px !important;
    box-sizing: border-box;
    display: flex !important;
    align-items: center !important;
  }

  .login-form :deep(.arco-input-password .arco-input-wrapper:hover),
  .login-form :deep(.arco-input-password .arco-input-wrapper.arco-input-focus) {
    background-color: #ebebeb !important;
    border: none !important;
    box-shadow: none !important;
  }

  .login-form :deep(.arco-input) {
    font-size: 16px !important;
    background: transparent !important;
    color: #111111;
    height: 100%;
  }

  /* 隐藏前缀图标 */
  .login-form :deep(.arco-input-prefix) {
    display: none !important;
  }

  /* 记住我行 — 规范未要求，隐藏 */
  .form-row {
    display: none !important;
  }

  /* ── 登录按钮：全宽，52px，圆角 12px，深绿 #1C3530 ── */
  .login-btn {
    width: 100% !important;
    height: 52px !important;
    border-radius: 12px !important;
    background-color: #1C3530 !important;
    border-color: #1C3530 !important;
    color: #ffffff !important;
    font-size: 16px !important;
    font-weight: 600 !important;
  }

  .login-btn:not(.arco-btn-disabled):hover,
  .login-btn:not(.arco-btn-disabled):active {
    background-color: #163028 !important;
    border-color: #163028 !important;
  }

  /* 快速入口：与桌面一致，略收紧间距 */
  .quick-entry-wrap {
    margin-top: 20px !important;
    margin-bottom: 0 !important;
  }

  /* ── 第三块：底部演示信息，12px 灰色居中，margin-top 32px ── */
  .demo-tip--pc {
    display: none !important;
  }

  .form-footer {
    display: none !important;
  }

  .demo-tip-mobile {
    display: block !important;
    margin-top: 24px !important;
    font-size: 12px !important;
    color: #999999 !important;
    text-align: center !important;
    line-height: 1.7;
    flex-shrink: 0;
  }
}
</style>
