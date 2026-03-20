<template>
  <div class="select-role-page">
    <div class="role-card-wrapper">
      <a-card class="role-card" :bordered="false">
        <h2 class="role-title">请选择本次登录身份</h2>
        <p class="role-subtitle">您的账号绑定了多个角色</p>

        <a-row :gutter="12" class="role-grid">
          <a-col
            v-for="(item, index) in roles"
            :key="item.id"
            :span="12"
          >
            <a-card
              class="role-item-card"
              :class="{ selected: selectedRole === item.id }"
              hoverable
              @click="selectedRole = item.id"
            >
              <div v-if="selectedRole === item.id" class="check-badge">
                <IconCheck :size="14" />
              </div>
              <div class="role-item-icon" :style="{ background: item.iconBg }">
                <component :is="item.icon" :size="20" />
              </div>
              <div class="role-item-name">{{ item.name }}</div>
              <div class="role-item-school">{{ item.school }}</div>
              <div class="role-item-time">{{ item.lastLogin }}</div>
            </a-card>
          </a-col>
        </a-row>

        <a-button
          type="primary"
          long
          size="large"
          class="confirm-btn"
          :disabled="!selectedRole"
          @click="handleConfirm"
        >
          确认
        </a-button>
      </a-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconUser,
  IconUserGroup,
  IconSettings,
  IconCheck
} from '@arco-design/web-vue/es/icon'

const router = useRouter()
const selectedRole = ref(null)

const roles = [
  {
    id: '1',
    name: '心理教师',
    school: '市第一中学',
    lastLogin: '上次登录：2小时前',
    icon: IconUser,
    iconBg: 'linear-gradient(135deg, var(--color-primary-5, #2d7a6a) 0%, var(--color-primary-4, #5bb99e) 100%)'
  },
  {
    id: '2',
    name: '初二3班班主任',
    school: '市第一中学',
    lastLogin: '上次登录：昨天',
    icon: IconUserGroup,
    iconBg: 'linear-gradient(135deg, var(--color-info-6, #3B82F6) 0%, #6ba3e8 100%)'
  },
  {
    id: '3',
    name: '心理教师',
    school: '市第二中学',
    lastLogin: '上次登录：3天前',
    icon: IconUser,
    iconBg: 'linear-gradient(135deg, var(--color-primary-5, #2d7a6a) 0%, var(--color-primary-4, #5bb99e) 100%)'
  },
  {
    id: '4',
    name: '学校管理员',
    school: '市第一中学',
    lastLogin: '上次登录：1小时前',
    icon: IconSettings,
    iconBg: 'linear-gradient(135deg, var(--gray-400, #9CA3AF) 0%, var(--gray-300, #D1D5DB) 100%)'
  }
]

const handleConfirm = () => {
  if (!selectedRole.value) return
  Message.success('身份切换成功')
  router.push('/dashboard')
}
</script>

<style scoped>
.select-role-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--color-bg-1);
}

.role-card-wrapper { width: 100%; max-width: 560px; }

.role-card {
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.role-card :deep(.arco-card-body) { padding: 32px; }

.role-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-1);
  margin: 0 0 8px;
  text-align: center;
}

.role-subtitle {
  font-size: 14px;
  color: var(--color-text-3);
  margin: 0 0 24px;
  text-align: center;
}

.role-grid { margin-bottom: 24px; }

.role-item-card {
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  border-radius: var(--radius-md);
}

.role-item-card:hover {
  border-color: var(--color-primary-3);
}

.role-item-card.selected {
  border-color: var(--color-primary-5);
  box-shadow: 0 0 0 1px var(--color-primary-5);
}

.check-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-primary-5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.role-item-card :deep(.arco-card-body) { padding: 16px; }

.role-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: 12px;
}

.role-item-name { font-size: 14px; font-weight: 600; color: var(--color-text-1); margin-bottom: 4px; }
.role-item-school { font-size: 12px; color: var(--color-text-3); margin-bottom: 4px; }
.role-item-time { font-size: 11px; color: var(--color-text-4); }
.confirm-btn { height: 40px; }
</style>
