<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
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

const router = useRouter()
const loading = ref(true)
const questions = ref<Question[]>([])
const index = ref(0)
const timeLeft = ref(60)
const preCount = ref(3)
const preTimer = ref<number | null>(null)
const timer = ref<number | null>(null)
const selectedId = ref<number | null>(null)
const correctCount = ref(0)
const finished = ref(false)
const resultModalOpen = ref(false)
const detailDrawerOpen = ref(false)
const quizRecordId = ref<number | null>(null)
type RecordItem = { qid: number; title: string; content: string; selectedId: number | null; correctId: number | null; isCorrect: boolean; selectedText?: string | null; correctText?: string | null; explanation?: string }
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

function startPreCountdown() {
  preCount.value = 3
  if (preTimer.value) window.clearInterval(preTimer.value)
  preTimer.value = window.setInterval(() => {
    preCount.value--
    if (preCount.value <= 0) {
      window.clearInterval(preTimer.value!)
      preTimer.value = null
      startTimer()
    }
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

function cleanText(t?: string | null): string {
  if (!t) return ''
  return t
    .replace(/\*\*/g, '')
    .replace(/^[A-D][\.|、\)]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function quoteText(t?: string | null): string {
  const s = cleanText(t)
  return s ? `“${s}”` : ''
}

function formatExplanation(expl?: string | null, sel?: string | null, corr?: string | null): string {
  // 仅做去重与前缀/引号规范化，不再主动为词加引号，避免出现““老大””等
  let s = cleanText(expl)
  const selC = cleanText(sel)
  const corC = cleanText(corr)
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // 移除任何“这道题选择 …”前缀（可能重复多次）
  s = s.replace(/(这道题选择[:：]?[“"]?[^。]*?[”"]?。?\s*)+/g, '')
  // 移除开头重复的 选项词 本身（含或不含引号/句号）
  if (corC) s = s.replace(new RegExp(`^([“"]?${esc(corC)}[”"]?。?\s*)+`, 'g'), '')
  if (selC) s = s.replace(new RegExp(`^([“"]?${esc(selC)}[”"]?。?\s*)+`, 'g'), '')
  // 规范：合并多层引号为一层
  s = s.replace(/“+([^”]+)”+/g, '“$1”')
  return s.trim()
}

function choose(opt: Option) {
  if (preTimer.value) return
  if (finished.value) return
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
    selectedText: opt.text,
    correctText: current.value!.options.find(o=>o.is_correct)?.text || null,
    explanation: current.value!.explanation,
  })
  // 上报后端记录（用于排行榜统计）
  if (quizRecordId.value && current.value) {
    http.post('/quiz/submit-answer', {
      quiz_record_id: quizRecordId.value,
      question_id: current.value.id,
      selected_option_id: opt.id,
      time_taken: 0,
      attempt_count: 1,
    }).catch(() => {})
  }
  setTimeout(next, 450)
}

async function finish() {
  if (finished.value) return
  finished.value = true
  if (timer.value) window.clearInterval(timer.value)
  resultModalOpen.value = true
  if (quizRecordId.value) {
    try { await http.post('/quiz/finish', { quiz_record_id: quizRecordId.value }) } catch {}
    quizRecordId.value = null
  }
}

function restart() {
  index.value = 0
  timeLeft.value = 60
  selectedId.value = null
  correctCount.value = 0
  finished.value = false
  records.value = []
  fetchQuestions()
  // 重新开始新的会话
  http.post('/quiz/start', { mode: 'speed' }).then(res => {
    quizRecordId.value = res.data?.quiz_record_id || null
  }).catch(()=>{ quizRecordId.value = null })
  startTimer()
}

async function onExit() {
  // 主动结束并写入排行榜
  if (quizRecordId.value) {
    try { await http.post('/quiz/finish', { quiz_record_id: quizRecordId.value }) } catch {}
    quizRecordId.value = null
  }
  router.push('/')
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
  try {
    const res = await http.post('/quiz/start', { mode: 'speed' })
    quizRecordId.value = res.data?.quiz_record_id || null
  } catch { quizRecordId.value = null }
  startPreCountdown()
})

onBeforeUnmount(() => { 
  if (timer.value) window.clearInterval(timer.value)
  if (preTimer.value) window.clearInterval(preTimer.value)
  if (!finished.value && quizRecordId.value) {
    http.post('/quiz/finish', { quiz_record_id: quizRecordId.value }).catch(()=>{})
    quizRecordId.value = null
  }
})
</script>

<template>
  <a-card :loading="loading" title="速答模式">
    <template #extra>
      <a-space>
        <span v-if="preTimer">即将开始：{{ preCount }}s</span>
        <span v-else>剩余：{{ timeLeft }}s</span>
        <a-popconfirm title="确认退出速答模式？" ok-text="确认" cancel-text="取消" @confirm="onExit">
          <a-button size="small" danger>退出</a-button>
        </a-popconfirm>
      </a-space>
    </template>
    <div v-if="questions.length">
      <div class="q-title">{{ index + 1 }}</div>
      <div class="q-content">{{ cleanText(current?.content || current?.title) }}</div>
      <a-space direction="vertical" style="width:100%">
        <a-button
          v-for="opt in current!.options"
          :key="opt.id"
          block
          size="large"
          :disabled="!!preTimer || selectedId!==null"
          :type="selectedId===opt.id ? (opt.is_correct ? 'primary' : 'default') : 'default'"
          :danger="selectedId===opt.id && !opt.is_correct"
          :class="{
            'pulse-correct': selectedId===opt.id && opt.is_correct,
            'pulse-wrong': selectedId===opt.id && !opt.is_correct,
          }"
          @click="choose(opt)"
        >
          {{ cleanText(opt.text) }}
        </a-button>
      </a-space>
    </div>
    <div v-else>暂无题目</div>
  </a-card>

  <!-- 结果总览 Modal -->
  <a-modal
    v-model:open="resultModalOpen"
    title="速答结束"
    :footer="null"
    :maskClosable="false"
    :closable="false"
    :keyboard="false"
  >
    <p>本次答题：正确 {{ correctCount }} 题 / 共 {{ questions.length }} 题</p>
    <a-space wrap>
      <a-button type="primary" @click="() => { resultModalOpen=false; $router.push('/leaderboard') }">查看排行榜</a-button>
      <a-button @click="() => { resultModalOpen=false; detailDrawerOpen=true }">答题详情</a-button>
      <a-button @click="() => { resultModalOpen=false; restart() }">再来一次</a-button>
      <a-button danger @click="() => { resultModalOpen=false; $router.push('/') }">退出</a-button>
    </a-space>
  </a-modal>

  <!-- 结果详情 Drawer -->
  <a-drawer v-model:open="detailDrawerOpen" title="结果详情" placement="right" width="640">
    <a-list :data-source="records">
      <template #renderItem="{ item, index: i }">
        <a-list-item :key="item.qid">
          <div class="detail-item">
            <div class="detail-line title-line">
              <span class="title-index">{{ i+1 }}.</span>
              <span class="title-text">{{ cleanText(item.content || item.title) }}</span>
            </div>
            <div class="detail-line choice-line">
              <span class="label">你的选择：</span>
              <span class="value" :class="{ correct: item.selectedId===item.correctId, wrong: item.selectedId!==item.correctId }">{{ cleanText(item.selectedText) }}</span>
            </div>
            <div class="detail-line answer-line">
              <span class="label">正确选项：</span>
              <span class="value correct">{{ cleanText(item.correctText) }}</span>
              <template v-if="item.explanation">
                <span class="sep">｜</span>
                <span class="label">详解：</span>
                <span class="value">{{ formatExplanation(item.explanation, item.selectedText, item.correctText) }}</span>
              </template>
            </div>
          </div>
        </a-list-item>
      </template>
    </a-list>
  </a-drawer>
</template>

<style scoped>
.q-title { font-weight: 700; margin-bottom: 8px; font-size: 20px; }
.q-content { margin-bottom: 16px; font-size: 18px; line-height: 1.7; }
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}
@keyframes pulseWrongBg {
  0% { background-color: #fff; }
  50% { background-color: #fff1f0; }
  100% { background-color: #fff; }
}
.pulse-correct { animation: pulse .35s ease-in-out; box-shadow: 0 0 0 2px rgba(82,196,26,.35) inset; }
.pulse-wrong { animation: pulse .35s ease-in-out, pulseWrongBg .35s ease-in-out; box-shadow: 0 0 0 2px rgba(255,77,79,.5) inset; }
.options-row { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.opt { padding: 2px 8px; border-radius: 4px; background: #f5f5f5; }
.opt.correct { background: #f6ffed; color: #52c41a; }
.opt.wrong { background: #fff2f0; color: #ff4d4f; }

.detail-item { display: flex; flex-direction: column; gap: 6px; writing-mode: horizontal-tb; }
.detail-line { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; }
.title-line .title-index { font-weight: 700; margin-right: 6px; }
.title-line .title-text { font-weight: 600; }
.label { color: #8c8c8c; }
.value.correct { color: #52c41a; font-weight: 600; }
.value.wrong { color: #ff4d4f; font-weight: 600; }
.sep { color: #d9d9d9; }
</style>

 