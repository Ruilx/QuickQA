<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
function cleanText(t?: string | null): string {
  if (!t) return ''
  return t
    .replace(/\*\*/g, '')
    .replace(/^[A-D][\.|、\)]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeExplanation(expl?: string | null, correct?: string | null): string {
  let s = cleanText(expl)
  const cor = cleanText(correct)
  // 去掉重复“这道题选择 …”前缀（可能多次）
  s = s.replace(/(这道题选择[:：]?[“"]?[^。]*?[”"]?。?\s*)+/g, '')
  // 去掉开头重复的正确词
  if (cor) {
    const esc = cor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    s = s.replace(new RegExp(`^([“"]?${esc}[”"]?。?\s*)+`, 'g'), '')
    // 规范多层引号
    s = s.replace(/“+([^”]+)”+/g, '“$1”')
  }
  return s.trim()
}

const router = useRouter()
const quizRecordId = ref<number | null>(null)
const loading = ref(true)
const questions = ref<Question[]>([])
const index = ref(0)
const wrongTimes = ref(0)
const triedWrong = ref<Set<number>>(new Set())
const revealed = ref(false)
// 为每道题保存状态：错误次数、错误集合、是否已揭示
const perQuestionState = ref<Record<number, { wrongTimes: number; triedWrong: Set<number>; revealed: boolean }>>({})

const currentQuestion = computed(() => questions.value[index.value])
const correctOptionId = computed(() => currentQuestion.value?.options.find(o => o.is_correct)?.id || null)

function prev() {
  if (index.value > 0) {
    index.value--
    loadState()
  }
}
function next() {
  if (index.value < questions.value.length - 1) {
    index.value++
    loadState()
  }
}

function saveState() {
  const q = currentQuestion.value
  if (!q) return
  perQuestionState.value[q.id] = {
    wrongTimes: wrongTimes.value,
    triedWrong: new Set(triedWrong.value),
    revealed: revealed.value
  }
}

function loadState() {
  const q = currentQuestion.value
  if (!q) return
  const s = perQuestionState.value[q.id]
  if (s) {
    wrongTimes.value = s.wrongTimes
    triedWrong.value = new Set(s.triedWrong)
    revealed.value = s.revealed
  } else {
    wrongTimes.value = 0
    triedWrong.value = new Set()
    revealed.value = false
  }
}

function choose(opt: Option) {
  if (revealed.value) return
  if (opt.is_correct) {
    revealed.value = true
    message.success('正确')
    saveState()
    // 上报正确选项（最终一次）
    if (quizRecordId.value && currentQuestion.value) {
      http.post('/quiz/submit-answer', {
        quiz_record_id: quizRecordId.value,
        question_id: currentQuestion.value.id,
        selected_option_id: opt.id,
        attempt_count: wrongTimes.value + 1,
        time_taken: 0
      }).catch(()=>{})
    }
  } else {
    if (!triedWrong.value.has(opt.id)) {
      triedWrong.value.add(opt.id)
      wrongTimes.value++
    }
    if (wrongTimes.value >= 3) {
      revealed.value = true
      message.warning('已达到 3 次错误，已为你高亮正确答案')
      saveState()
      // 三错后也记录一次（选项传正确项，attempt_count=wrongTimes+1）
      if (quizRecordId.value && currentQuestion.value) {
        const corr = currentQuestion.value.options.find(o=>o.is_correct)
        if (corr) {
          http.post('/quiz/submit-answer', {
            quiz_record_id: quizRecordId.value,
            question_id: currentQuestion.value.id,
            selected_option_id: corr.id,
            attempt_count: wrongTimes.value + 1,
            time_taken: 0
          }).catch(()=>{})
        }
      }
    } else {
      message.error('不正确，再试试')
      saveState()
    }
  }
}

async function onExit() {
  // 学习模式：点击退出也写入一次记录，按当页 revealed 状态决定是否已完成本题
  if (quizRecordId.value) {
    try {
      await http.post('/quiz/finish', { quiz_record_id: quizRecordId.value })
    } catch {}
    quizRecordId.value = null
  }
  router.push('/')
}

onMounted(async () => {
  try {
    const res = await http.get('/questions/random?subject=语文')
    questions.value = res.data.questions || []
  } catch (e:any) {
    message.error(e?.response?.data?.error || '加载题目失败')
  } finally {
    loading.value = false
  }
  // 建立学习会话
  try {
    const st = await http.post('/quiz/start', { mode: 'study' })
    quizRecordId.value = st.data?.quiz_record_id || null
  } catch { quizRecordId.value = null }
})
</script>

<template>
  <a-card :loading="loading" title="学习模式">
    <template #extra>
      <a-space>
        <a-button @click="prev" :disabled="index===0">上一题</a-button>
        <a-button @click="next" :disabled="index>=questions.length-1 || !revealed">下一题</a-button>
        <a-popconfirm title="确认退出学习模式？" ok-text="确认" cancel-text="取消" @confirm="onExit">
          <a-button danger>退出</a-button>
        </a-popconfirm>
      </a-space>
    </template>
    <div v-if="questions.length">
      <div class="q-title">题目 {{ index + 1 }}</div>
      <div class="q-content">{{ cleanText(currentQuestion?.content || currentQuestion?.title) }}</div>
      <a-space direction="vertical" style="width:100%">
        <a-button
          v-for="opt in currentQuestion!.options"
          :key="opt.id"
          block
          size="large"
          :type="revealed && opt.id===correctOptionId ? 'primary' : 'default'"
          :danger="revealed && triedWrong.has(opt.id)"
          :ghost="revealed && opt.id===correctOptionId"
          :disabled="revealed"
          :class="{
            'opt-correct': revealed && opt.id===correctOptionId,
            'opt-wrong': revealed && triedWrong.has(opt.id),
          }"
          @click="choose(opt)"
        >
          {{ cleanText(opt.text) }}
        </a-button>
      </a-space>
      <a-alert
        v-if="revealed && currentQuestion?.explanation"
        type="info"
        show-icon
        style="margin-top:12px; white-space: normal; word-break: break-word;"
      >
        <template #message>
          {{ normalizeExplanation(currentQuestion?.explanation, currentQuestion!.options.find(o=>o.is_correct)?.text || '') }}
        </template>
      </a-alert>
    </div>
    <div v-else>暂无题目</div>
  </a-card>
  
</template>

<style scoped>
.q-title { font-weight: 700; margin-bottom: 8px; font-size: 20px; }
.q-content { margin-bottom: 16px; font-size: 18px; line-height: 1.7; }
.opt-correct { box-shadow: 0 0 0 2px rgba(82,196,26,.35) inset; }
.opt-wrong { box-shadow: 0 0 0 2px rgba(255,77,79,.35) inset; }
</style>

 