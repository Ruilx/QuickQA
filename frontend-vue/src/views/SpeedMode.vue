<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { http } from '../utils/http'
import { message } from 'ant-design-vue'

interface Option { id: number; text: string; is_correct: boolean }
interface Question {
  id: number
  title: string
  content: string
  explanation?: string
  options: Option[]
}

const loading = ref(true)
const questions = ref<Question[]>([])
const index = ref(0)
const timeLeft = ref(60)
const timer = ref<number | null>(null)
const selectedId = ref<number | null>(null)
const correctCount = ref(0)
const finished = ref(false)
const resultModalOpen = ref(false)
const detailDrawerOpen = ref(false)
type RecordItem = { qid: number; title: string; content: string; selectedId: number | null; correctId: number | null; isCorrect: boolean; explanation?: string }
const records = ref<RecordItem[]>([])

const current = computed(() => questions.value[index.value])
const correctId = computed(() => current.value?.options.find(o=>o.is_correct)?.id || null)

function startTimer() {
  timeLeft.value = 60
  if (timer.value) window.clearInterval(timer.value)
  timer.value = window.setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) finish()
  }, 1000)
}

function next() {
  selectedId.value = null
  if (index.value < questions.value.length - 1) {
    index.value++
  } else {
    finish()
  }
}

function choose(opt: Option) {
  if (selectedId.value !== null) return
  selectedId.value = opt.id
  if (opt.is_correct) {
    correctCount.value++
  }
  // 记录答题
  records.value.push({
    qid: current.value!.id,
    title: current.value!.title,
    content: current.value!.content,
    selectedId: opt.id,
    correctId: correctId.value,
    isCorrect: !!opt.is_correct,
    explanation: current.value!.explanation,
  })
  setTimeout(next, 450)
}

function finish() {
  if (finished.value) return
  finished.value = true
  if (timer.value) window.clearInterval(timer.value)
  resultModalOpen.value = true
}

function restart() {
  index.value = 0
  timeLeft.value = 60
  selectedId.value = null
  correctCount.value = 0
  finished.value = false
  records.value = []
  fetchQuestions()
  startTimer()
}

async function fetchQuestions() {
  loading.value = true
  try {
    const res = await http.get('/questions/random?subject=语文')
    questions.value = res.data.questions || []
  } catch (e:any) {
    message.error(e?.response?.data?.error || '加载题目失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchQuestions()
  startTimer()
})

onBeforeUnmount(() => { if (timer.value) window.clearInterval(timer.value) })
</script>

<template>
  <a-card :loading="loading" title="速答模式">
    <template #extra>剩余：{{ timeLeft }}s</template>
    <div v-if="questions.length">
      <div class="q-title">{{ index + 1 }}</div>
      <div class="q-content">{{ current?.content || current?.title }}</div>
      <a-space direction="vertical" style="width:100%">
        <a-button
          v-for="opt in current!.options"
          :key="opt.id"
          block
          size="large"
          :type="selectedId===opt.id ? (opt.is_correct ? 'primary' : 'default') : 'default'"
          :danger="selectedId===opt.id && !opt.is_correct"
          :class="{
            'pulse-correct': selectedId===opt.id && opt.is_correct,
            'pulse-wrong': selectedId===opt.id && !opt.is_correct,
          }"
          @click="choose(opt)"
        >
          {{ opt.text }}
        </a-button>
      </a-space>
    </div>
    <div v-else>暂无题目</div>
  </a-card>

  <!-- 结果总览 Modal -->
  <a-modal v-model:open="resultModalOpen" title="速答结束" @ok="() => { resultModalOpen=false; restart() }" okText="再来一次">
    <p>本次答题：正确 {{ correctCount }} 题 / 共 {{ questions.length }} 题</p>
    <a-space>
      <a-button type="primary" @click="() => { resultModalOpen=false; detailDrawerOpen=true }">查看详情</a-button>
      <a-button @click="restart">再来一次</a-button>
    </a-space>
  </a-modal>

  <!-- 结果详情 Drawer -->
  <a-drawer v-model:open="detailDrawerOpen" title="结果详情" placement="right" width="520">
    <a-list :data-source="records">
      <template #renderItem="{ item, index: i }">
        <a-list-item :key="item.qid">
          <a-list-item-meta :title="`${i+1}. ${item.content || item.title}`" />
          <div class="options">
            <div class="opt" :class="{correct: oid===item.correctId, wrong: oid===item.selectedId && item.selectedId!==item.correctId}" v-for="oid in [item.correctId, item.selectedId].filter(Boolean)" :key="oid">
              <span v-if="oid===item.correctId">正确选项</span>
              <span v-else>你的选择</span>
            </div>
          </div>
          <a-typography-paragraph v-if="item.explanation" type="secondary">{{ item.explanation }}</a-typography-paragraph>
        </a-list-item>
      </template>
    </a-list>
  </a-drawer>
</template>

<style scoped>
.q-title { font-weight: 700; margin-bottom: 8px; }
.q-content { margin-bottom: 16px; }
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}
.pulse-correct { animation: pulse .35s ease-in-out; box-shadow: 0 0 0 2px rgba(82,196,26,.35) inset; }
.pulse-wrong { animation: pulse .35s ease-in-out; box-shadow: 0 0 0 2px rgba(255,77,79,.35) inset; }
.options { display: flex; gap: 8px; margin-top: 8px; }
.opt { padding: 2px 8px; border-radius: 4px; background: #f5f5f5; }
.opt.correct { background: #f6ffed; color: #52c41a; }
.opt.wrong { background: #fff2f0; color: #ff4d4f; }
</style>

 