<script setup lang="ts">
// @ts-ignore - 类型由 vite-env.d.ts 声明
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import AppLayout from './layouts/AppLayout.vue'
</script>

<template>
  <a-config-provider :locale="zhCN">
    <AppLayout />
  </a-config-provider>
  
</template>

<style scoped>
:host {
  display: contents;
}
</style>
