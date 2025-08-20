<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
const wrongTimes = ref(0)
const triedWrong = ref<Set<number>>(new Set())
const revealed = ref(false)

const currentQuestion = computed(() => questions.value[index.value])
const correctOptionId = computed(() => currentQuestion.value?.options.find(o => o.is_correct)?.id || null)

function prev() {
  if (index.value > 0) {
    index.value--
    reset()
  }
}
function next() {
  if (index.value < questions.value.length - 1) {
    index.value++
    reset()
  }
}
function reset() {
  wrongTimes.value = 0
  triedWrong.value = new Set()
  revealed.value = false
}

function choose(opt: Option) {
  if (revealed.value) return
  if (opt.is_correct) {
    revealed.value = true
    message.success('正确')
  } else {
    if (!triedWrong.value.has(opt.id)) {
      triedWrong.value.add(opt.id)
      wrongTimes.value++
    }
    if (wrongTimes.value >= 3) {
      revealed.value = true
      message.warning('已达到 3 次错误，已为你高亮正确答案')
    } else {
      message.error('不正确，再试试')
    }
  }
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
})
</script>

<template>
  <a-card :loading="loading" title="学习模式">
    <template #extra>
      <a-space>
        <a-button @click="prev" :disabled="index===0">上一题</a-button>
        <a-button @click="next" :disabled="index>=questions.length-1">下一题</a-button>
      </a-space>
    </template>
    <div v-if="questions.length">
      <div class="q-title">题目 {{ index + 1 }}</div>
      <div class="q-content">{{ currentQuestion?.content || currentQuestion?.title }}</div>
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
          {{ opt.text }}
        </a-button>
      </a-space>
      <a-alert
        v-if="revealed && currentQuestion?.explanation"
        type="info"
        show-icon
        style="margin-top:12px"
        :message="currentQuestion?.explanation"
      />
    </div>
    <div v-else>暂无题目</div>
  </a-card>
  
</template>

<style scoped>
.q-title { font-weight: 700; margin-bottom: 8px; }
.q-content { margin-bottom: 16px; }
.opt-correct { box-shadow: 0 0 0 2px rgba(82,196,26,.35) inset; }
.opt-wrong { box-shadow: 0 0 0 2px rgba(255,77,79,.35) inset; }
</style>

 