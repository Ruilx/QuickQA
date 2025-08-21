<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const modeVisible = ref(false)
const poemModalVisible = ref(false)
const poemDetail = ref<{ title: string; author: string; content: string } | null>(null)

function goLeaderboard() { router.push('/leaderboard') }
function openMode() {
  if (!auth.isLoggedIn) {
    router.push({ path: '/', query: { login: '1' } })
    return
  }
  modeVisible.value = true
}
function start(mode: 'speed'|'study') {
  modeVisible.value = false
  router.push(`/${mode}`)
}

const poems = [
  { title: '静夜思', author: '李白', content: '床前明月光，疑是地上霜。举头望明月，低头思故乡。' },
  { title: '春晓', author: '孟浩然', content: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。' },
  { title: '登鹳雀楼', author: '王之涣', content: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。' },
  { title: '赠汪伦', author: '李白', content: '李白乘舟将欲行，忽闻岸上踏歌声。桃花潭水深千尺，不及汪伦送我情。' },
  { title: '宿建德江', author: '孟浩然', content: '移舟泊烟渚，日暮客愁新。野旷天低树，江清月近人。' },
  { title: '江南', author: '汉乐府', content: '江南可采莲，莲叶何田田。鱼戏莲叶间。鱼戏莲叶东，鱼戏莲叶西，鱼戏莲叶南，鱼戏莲叶北。' },
]
function showPoem(p:any) {
  poemDetail.value = p
  poemModalVisible.value = true
}
function practiceFromPoem() {
  poemModalVisible.value = false
  openMode()
}
</script>

<template>
  <div class="hero">
    <h1 class="title">快问快答 · 小学语文古诗</h1>
    <p class="subtitle">随机题库 · 速答训练 / 学习模式 · 排行榜</p>

    <a-space>
      <a-button type="primary" size="large" @click="openMode">开始答题</a-button>
      <a-button type="dashed" size="large" @click="goLeaderboard">查看排行榜</a-button>
    </a-space>
  </div>

  <a-row :gutter="16" class="floating-poems">
    <a-col v-for="p in poems" :key="p.title" :xs="24" :sm="12" :md="8">
      <a-card class="poem-card" hoverable @click="showPoem(p)">
        <template #title>{{ p.title }} · {{ p.author }}</template>
        <div class="poem-lines">{{ p.content }}</div>
      </a-card>
    </a-col>
  </a-row>

  <!-- 模式选择弹窗 -->
  <a-modal v-model:open="modeVisible" title="选择模式" :footer="null">
    <a-row :gutter="12">
      <a-col :span="12">
        <a-card hoverable class="mode-card" @click="start('speed')">
          <div class="mode-title">速答模式</div>
          <div class="mode-desc">60 秒倒计时 · 即时反馈</div>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card hoverable class="mode-card" @click="start('study')">
          <div class="mode-title">学习模式</div>
          <div class="mode-desc">不限时 · 错三次自动高亮正确</div>
        </a-card>
      </a-col>
    </a-row>
  </a-modal>

  <!-- 诗词详情弹窗 -->
  <a-modal v-model:open="poemModalVisible" :title="poemDetail?.title" @ok="practiceFromPoem" okText="练习此类诗词">
    <div v-if="poemDetail">
      <div class="poem-author">作者：{{ poemDetail.author }}</div>
      <div class="poem-text">{{ poemDetail.content }}</div>
    </div>
  </a-modal>
</template>

<style scoped>
.hero { text-align: center; padding: 48px 0 24px; }
.title { font-size: 32px; font-weight: 800; }
.subtitle { color: #666; margin-bottom: 24px; }
.floating-poems { margin-top: 8px; }
.poem-card { margin-bottom: 16px; transition: transform .2s ease, box-shadow .2s ease; }
.poem-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.08); }
.poem-lines { color: #555; }
.mode-card { text-align: center; cursor: pointer; }
.mode-title { font-size: 18px; font-weight: 700; }
.mode-desc { color: #888; margin-top: 6px; }
</style>

 