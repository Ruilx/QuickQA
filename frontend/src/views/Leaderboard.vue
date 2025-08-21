<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { http } from '../utils/http'
import { message } from 'ant-design-vue'

// 使用 any 避免类型阻塞构建，可后续细化

const mode = ref<'speed'|'study'>('speed')
const loading = ref(false)
const rows = ref<any[]>([])

async function load() {
  loading.value = true
  try {
    const url = mode.value === 'speed' ? '/leaderboard/speed' : '/leaderboard/study'
    const res = await http.get(url)
    rows.value = res.data.leaderboard || []
  } catch (e:any) {
    message.error(e?.response?.data?.error || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <a-card title="排行榜">
    <template #extra>
      <a-radio-group v-model:value="mode" @change="load">
        <a-radio-button value="speed">速答模式</a-radio-button>
        <a-radio-button value="study">学习模式</a-radio-button>
      </a-radio-group>
    </template>
    <a-table :data-source="rows" :loading="loading" row-key="rank" :pagination="false">
      <a-table-column title="排名" data-index="rank" key="rank" />
      <a-table-column title="用户名" data-index="username" key="username" />
      <a-table-column v-if="mode==='speed'" title="正确/总题" key="answers" :customRender="(ctx:any) => `${ctx.record.correct_answers}/${ctx.record.total_questions}`" />
      <a-table-column v-if="mode==='speed'" title="正确率" data-index="accuracy" key="accuracy" />
      <a-table-column title="用时(s)" data-index="time_spent" key="time_spent" />
      <a-table-column title="时间" data-index="created_at" key="created_at" />
    </a-table>
  </a-card>
</template>


