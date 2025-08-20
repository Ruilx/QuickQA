<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { message } from 'ant-design-vue'

const emit = defineEmits<{ (e:'success'): void }>()
const loading = ref(false)
const form = reactive({ username: '', password: '' })
const auth = useAuthStore()

async function onSubmit() {
  if (!form.username || !form.password) {
    message.error('请输入用户名与密码')
    return
  }
  loading.value = true
  try {
    await auth.login({ username: form.username, password: form.password })
    message.success('登录成功')
    emit('success')
  } catch (e:any) {
    message.error(e?.response?.data?.error || '登录失败')
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
    <a-form-item label="密码">
      <a-input-password v-model:value="form.password" placeholder="输入密码" />
    </a-form-item>
    <a-form-item>
      <a-button type="primary" html-type="submit" :loading="loading" block>登录</a-button>
    </a-form-item>
  </a-form>
</template>


