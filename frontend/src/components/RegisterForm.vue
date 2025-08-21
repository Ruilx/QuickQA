<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { message } from 'ant-design-vue'

const emit = defineEmits<{ (e:'success'): void }>()
const loading = ref(false)
const form = reactive({ username: '', email: '', password: '', confirmPassword: '' })
const auth = useAuthStore()

async function onSubmit() {
  if (!form.username || !form.password) {
    message.error('请输入必要信息')
    return
  }
  if (form.password.length < 6) {
    message.error('密码至少6位')
    return
  }
  if (form.password !== form.confirmPassword) {
    message.error('两次输入的密码不一致')
    return
  }
  loading.value = true
  try {
    await auth.register({ username: form.username, email: form.email, password: form.password })
    message.success('注册成功，请登录')
    emit('success')
  } catch (e:any) {
    message.error(e?.response?.data?.error || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <a-form layout="vertical" @submit.prevent="onSubmit">
    <a-form-item label="用户名">
      <a-input v-model:value="form.username" placeholder="输入用户名" />
    </a-form-item>
    <a-form-item label="邮箱">
      <a-input v-model:value="form.email" placeholder="可选，输入邮箱" />
    </a-form-item>
    <a-form-item label="密码">
      <a-input-password v-model:value="form.password" placeholder="设置密码" />
    </a-form-item>
    <a-form-item label="确认密码">
      <a-input-password v-model:value="form.confirmPassword" placeholder="再次输入密码" />
    </a-form-item>
    <a-form-item>
      <a-button type="primary" html-type="submit" :loading="loading" block>注册</a-button>
    </a-form-item>
  </a-form>
</template>


