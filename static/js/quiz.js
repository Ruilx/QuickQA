// 答题核心JavaScript

// 答题状态管理
const QuizState = {
    currentQuiz: null,
    questions: [],
    currentQuestionIndex: 0,
    answers: [],
    startTime: null,
    timer: null,
    timeLimit: 60, // 秒
    mode: 'speed' // 'speed' 或 'study'
};

// 答题核心类
class QuizManager {
    constructor(mode = 'speed') {
        this.mode = mode;
        this.reset();
    }

    // 重置状态
    reset() {
        QuizState.currentQuiz = null;
        QuizState.questions = [];
        QuizState.currentQuestionIndex = 0;
        QuizState.answers = [];
        QuizState.startTime = null;
        QuizState.mode = this.mode;
        
        if (QuizState.timer) {
            clearInterval(QuizState.timer);
            QuizState.timer = null;
        }
    }

    // 开始答题
    async startQuiz() {
        try {
            // 创建答题记录
            const quizData = await Utils.post('/quiz/start', {
                mode: this.mode
            });
            
            QuizState.currentQuiz = quizData;
            QuizState.startTime = new Date();
            
            // 获取题目
            await this.loadQuestions();
            
            if (QuizState.questions.length === 0) {
                throw new Error('没有可用的题目');
            }
            
            // 开始第一题
            this.showQuestion(0);
            
            // 如果是速答模式，启动计时器
            if (this.mode === 'speed') {
                this.startTimer();
            }
            
            return true;
            
        } catch (error) {
            console.error('开始答题失败:', error);
            UI.showNotification(error.message || '开始答题失败', 'error');
            return false;
        }
    }

    // 加载题目
    async loadQuestions() {
        try {
            // 获取所有可用题目，不设置上限
            const response = await Utils.get(`/questions/random?subject=语文`);
            QuizState.questions = response.questions || [];
            
            // 打乱题目顺序
            QuizState.questions = this.shuffleArray(QuizState.questions);
            
        } catch (error) {
            console.error('加载题目失败:', error);
            throw new Error('加载题目失败');
        }
    }

    // 显示题目
    showQuestion(index) {
        if (index >= QuizState.questions.length) {
            this.finishQuiz();
            return;
        }

        QuizState.currentQuestionIndex = index;
        const question = QuizState.questions[index];
        
        // 更新题目计数器
        this.updateQuestionCounter();
        
        // 显示题目标题
        const titleElement = document.getElementById('question-title');
        if (titleElement) {
            titleElement.textContent = question.title;
        }
        
        // 显示题目内容
        const contentElement = document.getElementById('question-content');
        if (contentElement) {
            contentElement.textContent = question.content;
        }
        
        // 显示选项
        this.showOptions(question);
    }

    // 显示选项
    showOptions(question) {
        const container = document.getElementById('options-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        // 打乱选项顺序
        const shuffledOptions = this.shuffleArray([...question.options]);
        
        shuffledOptions.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.dataset.optionId = option.id;
            optionElement.onclick = () => this.selectOption(option.id);
            
            const letter = String.fromCharCode(65 + index); // A, B, C, D
            
            optionElement.innerHTML = `
                <div class="option-letter">${letter}</div>
                <div class="option-text">${option.text}</div>
            `;
            
            container.appendChild(optionElement);
        });
    }

    // 选择选项
    async selectOption(optionId) {
        const question = QuizState.questions[QuizState.currentQuestionIndex];
        if (!question) return;
        
        // 禁用所有选项
        this.disableOptions();
        
        // 标记选中的选项
        const selectedOption = document.querySelector(`[data-option-id="${optionId}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // 检查答案
        const correctOption = question.options.find(opt => opt.is_correct);
        const isCorrect = optionId === correctOption.id;
        
        // 记录答案
        const answerData = {
            quiz_record_id: QuizState.currentQuiz.quiz_record_id,
            question_id: question.id,
            selected_option_id: optionId,
            time_taken: Date.now() - QuizState.startTime,
            attempt_count: 1
        };
        
        QuizState.answers.push(answerData);
        
        try {
            // 提交答案到服务器
            await Utils.post('/quiz/submit-answer', answerData);
        } catch (error) {
            console.error('提交答案失败:', error);
        }
        
        // 显示答案反馈
        this.showAnswerFeedback(isCorrect, correctOption.id);
        
        // 更新正确答案计数
        if (isCorrect) {
            this.updateCorrectCounter();
        }
        
        // 延迟后跳转到下一题
        setTimeout(() => {
            this.nextQuestion();
        }, this.mode === 'speed' ? 1000 : 2000);
    }

    // 显示答案反馈
    showAnswerFeedback(isCorrect, correctOptionId) {
        const options = document.querySelectorAll('.option');
        
        options.forEach(option => {
            const optionId = parseInt(option.dataset.optionId);
            
            if (optionId === correctOptionId) {
                option.classList.add('correct');
                UI.animate(option, 'animate-correctFlash');
            } else if (option.classList.contains('selected') && !isCorrect) {
                option.classList.add('wrong');
                UI.animate(option, 'animate-wrongFlash');
            }
        });
    }

    // 禁用选项
    disableOptions() {
        const options = document.querySelectorAll('.option');
        options.forEach(option => {
            option.classList.add('disabled');
            option.onclick = null;
        });
    }

    // 下一题
    nextQuestion() {
        const nextIndex = QuizState.currentQuestionIndex + 1;
        
        if (nextIndex >= QuizState.questions.length || (this.mode === 'speed' && this.timeUp)) {
            this.finishQuiz();
        } else {
            this.showQuestion(nextIndex);
        }
    }

    // 开始计时器（速答模式）
    startTimer() {
        let timeLeft = QuizState.timeLimit;
        
        const updateTimer = () => {
            const timerElement = document.getElementById('countdown');
            if (timerElement) {
                timerElement.textContent = timeLeft;
                
                // 时间警告样式
                if (timeLeft <= 10) {
                    timerElement.classList.add('danger');
                } else if (timeLeft <= 20) {
                    timerElement.classList.add('warning');
                }
            }
            
            if (timeLeft <= 0) {
                this.timeUp = true;
                this.finishQuiz();
                return;
            }
            
            timeLeft--;
        };
        
        // 立即更新一次
        updateTimer();
        
        // 每秒更新
        QuizState.timer = setInterval(updateTimer, 1000);
    }

    // 完成答题
    async finishQuiz() {
        if (QuizState.timer) {
            clearInterval(QuizState.timer);
            QuizState.timer = null;
        }
        
        try {
            // 提交完成状态到服务器
            const result = await Utils.post('/quiz/finish', {
                quiz_record_id: QuizState.currentQuiz.quiz_record_id
            });
            
            // 显示结果
            this.showResults(result);
            
        } catch (error) {
            console.error('完成答题失败:', error);
            UI.showNotification('保存答题结果失败', 'error');
        }
    }

    // 显示结果
    showResults(result) {
        // 隐藏答题区域
        const quizStage = document.getElementById('quiz-stage');
        const resultStage = document.getElementById('result-stage');
        
        if (quizStage) quizStage.classList.add('hidden');
        if (resultStage) {
            resultStage.classList.remove('hidden');
            UI.animate(resultStage, 'animate-fadeIn');
        }
        
        // 更新结果数据
        const finalCorrect = document.getElementById('final-correct');
        const finalTotal = document.getElementById('final-total');
        const finalAccuracy = document.getElementById('final-accuracy');
        
        if (finalCorrect) finalCorrect.textContent = result.correct_answers;
        if (finalTotal) finalTotal.textContent = result.total_questions;
        if (finalAccuracy) finalAccuracy.textContent = result.accuracy + '%';
    }

    // 更新题目计数器
    updateQuestionCounter() {
        const counter = document.getElementById('question-counter');
        if (counter) {
            counter.textContent = `${QuizState.currentQuestionIndex + 1}`;
        }
    }

    // 更新正确答案计数器
    updateCorrectCounter() {
        const counter = document.getElementById('correct-counter');
        if (counter) {
            const current = parseInt(counter.textContent) || 0;
            counter.textContent = current + 1;
        }
    }



    // 数组打乱函数
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
}

// 全局函数
window.exitQuiz = function() {
    UI.showModal('exit-modal');
};

window.confirmExit = function() {
    window.location.href = 'index.html';
};

window.restartQuiz = function() {
    window.location.reload();
};

window.viewQuizDetails = async function() {
    if (!QuizState.currentQuiz) return;
    
    try {
        const details = await Utils.get(`/quiz/${QuizState.currentQuiz.quiz_record_id}/details`);
        showQuizDetails(details);
    } catch (error) {
        UI.showNotification('获取答题详情失败', 'error');
    }
};

function showQuizDetails(details) {
    const detailsContent = document.getElementById('details-content');
    if (!detailsContent) return;
    
    detailsContent.innerHTML = '';
    
    details.details.forEach((detail, index) => {
        const item = document.createElement('div');
        item.className = 'detail-item';
        
        const statusIcon = detail.is_correct ? '✓' : '✗';
        const statusClass = detail.is_correct ? 'correct' : 'wrong';
        
        item.innerHTML = `
            <div class="detail-question">
                ${index + 1}. ${detail.question_content}
            </div>
            <div class="detail-answer">
                <div class="answer-status ${statusClass}">
                    ${statusIcon}
                </div>
                <div>
                    <div>你的答案: ${detail.selected_text || '未回答'}</div>
                    <div>正确答案: ${detail.correct_text}</div>
                </div>
            </div>
            <div class="detail-explanation">
                ${detail.explanation}
            </div>
        `;
        
        detailsContent.appendChild(item);
    });
    
    UI.showModal('details-modal');
}

// 导出供其他模块使用
window.QuizManager = QuizManager;
window.QuizState = QuizState;