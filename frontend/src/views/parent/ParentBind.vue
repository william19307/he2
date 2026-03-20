<template>
  <div class="parent-bind">
    <div class="bind-header">
      <h1>家长绑定</h1>
      <p>绑定孩子账号后，可查看心理健康概况与学校通知</p>
    </div>
    <div class="bind-form">
      <a-form :model="form" layout="vertical" size="large">
        <a-form-item label="学校编码" field="tenant_code">
          <a-input v-model="form.tenant_code" placeholder="如 demo_school" />
        </a-form-item>
        <a-form-item label="手机号" field="phone">
          <a-input v-model="form.phone" placeholder="请输入监护人手机号" />
        </a-form-item>
        <a-form-item label="验证码" field="sms_code">
          <div class="sms-row">
            <a-input v-model="form.sms_code" placeholder="6位验证码" max-length="6" />
            <a-button
              type="outline"
              :disabled="countdown > 0"
              @click="sendCode"
            >
              {{ countdown > 0 ? `${countdown}s后重发` : '发送验证码' }}
            </a-button>
          </div>
        </a-form-item>
        <a-form-item label="学号" field="student_no">
          <a-input v-model="form.student_no" placeholder="孩子学号" />
        </a-form-item>
        <a-form-item label="与孩子关系" field="relation">
          <a-select v-model="form.relation" placeholder="请选择">
            <a-option value="father">父亲</a-option>
            <a-option value="mother">母亲</a-option>
            <a-option value="grandparent">祖父母/外祖父母</a-option>
            <a-option value="other">其他监护人</a-option>
          </a-select>
        </a-form-item>
        <a-button
          type="primary"
          long
          size="large"
          :loading="submitting"
          @click="submit"
        >
          绑定并登录
        </a-button>
      </a-form>
      <p v-if="isDev" class="tip">
        开发测试账号：<br>
        手机号：<code>13800010001</code><br>
        学号：<code>20240001</code><br>
        验证码：任意6位数字（如 <code>000000</code>）<br>
        学校编码：<code>demo_school</code>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { postParentBind } from '@/api/parent'
import { setParentToken } from '@/utils/parentRequest'

const isDev = import.meta.env.DEV === true

const router = useRouter()
const form = reactive({
  tenant_code: 'demo_school',
  phone: '',
  sms_code: '',
  student_no: '',
  relation: 'mother',
})
const submitting = ref(false)
const countdown = ref(0)

function sendCode() {
  if (!form.phone?.trim()) {
    Message.warning('请先输入手机号')
    return
  }
  if (!/^1\d{10}$/.test(form.phone.trim())) {
    Message.warning('手机号格式不正确')
    return
  }
  countdown.value = 60
  const t = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearInterval(t)
  }, 1000)
  Message.success('验证码已发送（演示可用 000000）')
}

async function submit() {
  if (!form.phone?.trim() || !form.student_no?.trim() || !form.tenant_code?.trim()) {
    Message.warning('请填写手机号、学号、学校编码')
    return
  }
  if (!form.sms_code?.trim()) {
    Message.warning('请输入验证码')
    return
  }
  submitting.value = true
  try {
    const res = await postParentBind(form)
    if (res?.code === 0 && res?.data?.token) {
      setParentToken(res.data.token)
      Message.success(res.message || '绑定成功')
      router.replace('/parent/home')
    } else {
      Message.error(res?.message || '绑定失败')
    }
  } catch (e) {
    Message.error(e?.message || e?.data?.message || '绑定失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  document.title = '家长绑定 - 心晴平台'
})
</script>

<style scoped>
.parent-bind {
  min-height: 100vh;
  background: linear-gradient(180deg, #e8f5e9 0%, #fff 40%);
  padding: 32px 24px;
}
.bind-header {
  text-align: center;
  margin-bottom: 32px;
}
.bind-header h1 {
  font-size: 24px;
  color: #1a1a1a;
  margin: 0 0 8px;
}
.bind-header p {
  font-size: 14px;
  color: #666;
  margin: 0;
}
.bind-form {
  max-width: 400px;
  margin: 0 auto;
}
.sms-row {
  display: flex;
  gap: 12px;
}
.sms-row .a-input {
  flex: 1;
}
/* 与学生端 H5 登录页 VerifyPage.vue 的 .tip 一致 */
.tip {
  font-size: 12px;
  color: var(--h5-subtext);
  margin-top: 20px;
  line-height: 1.6;
}
.tip code {
  background: #f0eee9;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
