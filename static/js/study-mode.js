// 学习模式JavaScript

let studyManager = null;
let studyStats = {
    startTime: null,
    questionsStudied: 0,
    totalTime: 0,
    currentAttempts: 0,
    maxAttempts: 3
};

// 学习模式管理器
class StudyManager extends QuizManager {
    constructor() {
        super('study');
        this.currentAttempts = 0;
        this.maxAttempts = 3;
        this.studiedQuestions = [];
    }

    // 开始学习
    async startStudy() {
        try {
            const success = await this.startQuiz();
            if (success) {
                studyStats.startTime = new Date();
                this.startTimeCounter();
            }
            return success;
        } catch (error) {
            throw error;
        }
    }

    // 显示题目（重写父类方法）
    showQuestion(index) {
        super.showQuestion(index);
        
        this.currentAttempts = 0;
        this.updateAttemptInfo();
        this.hideExplanation();
        this.updateNavigationButtons();
    }

    // 选择选项（重写父类方法）
    async selectOption(optionId) {
        const question = QuizState.questions[QuizState.currentQuestionIndex];
        if (!question) return;
        
        this.currentAttempts++;
        
        // 标记选中的选项
        const selectedOption = document.querySelector(`[data-option-id="${optionId}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // 检查答案
        const correctOption = question.options.find(opt => opt.is_correct);
        const isCorrect = optionId === correctOption.id;
        
        if (isCorrect) {
            // 答对了
            this.showCorrectFeedback(correctOption.id);
            this.showExplanation(question.explanation);
            this.enableNextButton();
            
            // 记录到已学习题目
            if (!this.studiedQuestions.includes(question.id)) {
                this.studiedQuestions.push(question.id);
                studyStats.questionsStudied++;
                this.updateStudiedCounter();
            }
            
        } else if (this.currentAttempts >= this.maxAttempts) {
            // 已达到最大尝试次数，显示正确答案
            this.showAllAnswers(correctOption.id);
            this.showExplanation(question.explanation);
            this.enableNextButton();
            
            // 记录到已学习题目（即使答错）
            if (!this.studiedQuestions.includes(question.id)) {
                this.studiedQuestions.push(question.id);
                studyStats.questionsStudied++;
                this.updateStudiedCounter();
            }
            
        } else {
            // 还有尝试机会
            this.showWrongFeedback(optionId);
            
            setTimeout(() => {
                this.clearOptionStyles();
                this.updateAttemptInfo();
            }, 1500);
        }
        
        // 记录答案
        const answerData = {
            quiz_record_id: QuizState.currentQuiz.quiz_record_id,
            question_id: question.id,
            selected_option_id: optionId,
            time_taken: Date.now() - QuizState.startTime,
            attempt_count: this.currentAttempts
        };
        
        try {
            await Utils.post('/quiz/submit-answer', answerData);
        } catch (error) {
            console.error('提交答案失败:', error);
        }
    }

    // 显示正确反馈
    showCorrectFeedback(correctOptionId) {
        this.disableOptions();
        
        const correctOption = document.querySelector(`[data-option-id="${correctOptionId}"]`);
        if (correctOption) {
            correctOption.classList.add('correct');
            UI.animate(correctOption, 'animate-correctFlash');
        }
        
        UI.showNotification('回答正确！', 'success', 2000);
    }

    // 显示错误反馈
    showWrongFeedback(selectedOptionId) {
        const selectedOption = document.querySelector(`[data-option-id="${selectedOptionId}"]`);
        if (selectedOption) {
            selectedOption.classList.add('wrong');
            UI.animate(selectedOption, 'animate-wrongFlash');
        }
        
        const remaining = this.maxAttempts - this.currentAttempts;
        if (remaining > 0) {
            UI.showNotification(`回答错误，还有 ${remaining} 次机会`, 'warning', 2000);
        }
    }

    // 显示所有答案
    showAllAnswers(correctOptionId) {
        const options = document.querySelectorAll('.option');
        
        options.forEach(option => {
            const optionId = parseInt(option.dataset.optionId);
            
            if (optionId === correctOptionId) {
                option.classList.add('correct');
            } else if (option.classList.contains('selected')) {
                option.classList.add('wrong');
            } else {
                option.classList.add('disabled');
            }
        });
        
        UI.showNotification('已达到最大尝试次数，显示正确答案', 'info', 3000);
    }

    // 清除选项样式
    clearOptionStyles() {
        const options = document.querySelectorAll('.option');
        options.forEach(option => {
            option.classList.remove('selected', 'correct', 'wrong', 'disabled');
            option.onclick = () => this.selectOption(parseInt(option.dataset.optionId));
        });
    }

    // 显示解析
    showExplanation(explanation) {
        const explanationContainer = document.getElementById('explanation-container');
        const explanationContent = document.getElementById('explanation-content');
        
        if (explanationContainer && explanationContent) {
            explanationContent.innerHTML = explanation;
            explanationContainer.classList.remove('hidden');
            UI.animate(explanationContainer, 'animate-fadeIn');
        }
    }

    // 隐藏解析
    hideExplanation() {
        const explanationContainer = document.getElementById('explanation-container');
        if (explanationContainer) {
            explanationContainer.classList.add('hidden');
        }
    }

    // 更新尝试次数显示
    updateAttemptInfo() {
        const attemptInfo = document.getElementById('attempt-info');
        const attemptCount = document.getElementById('attempt-count');
        
        if (attemptInfo && attemptCount) {
            attemptCount.textContent = this.currentAttempts;
            
            if (this.currentAttempts >= this.maxAttempts) {
                attemptInfo.style.color = 'var(--error-color)';
            } else if (this.currentAttempts >= 2) {
                attemptInfo.style.color = 'var(--warning-color)';
            } else {
                attemptInfo.style.color = 'var(--text-secondary)';
            }
        }
    }

    // 更新已学习题目计数器
    updateStudiedCounter() {
        const counter = document.getElementById('studied-counter');
        if (counter) {
            counter.textContent = studyStats.questionsStudied;
        }
    }

    // 启用下一题按钮
    enableNextButton() {
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.classList.remove('btn-outline');
            nextBtn.classList.add('btn-primary');
        }
    }

    // 更新导航按钮
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        if (prevBtn) {
            prevBtn.disabled = QuizState.currentQuestionIndex === 0;
        }
        
        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.classList.remove('btn-primary');
            nextBtn.classList.add('btn-outline');
        }
    }

    // 开始时间计数器
    startTimeCounter() {
        setInterval(() => {
            if (studyStats.startTime) {
                const now = new Date();
                const elapsed = Math.floor((now - studyStats.startTime) / 1000);
                studyStats.totalTime = elapsed;
                
                const timeCounter = document.getElementById('time-counter');
                if (timeCounter) {
                    timeCounter.textContent = App.Utils.formatTime(elapsed);
                }
            }
        }, 1000);
    }

    // 完成学习
    async finishStudy() {
        try {
            const result = await App.Utils.post('/quiz/finish', {
                quiz_record_id: QuizState.currentQuiz.quiz_record_id
            });
            
            this.showSummary(result);
            
        } catch (error) {
            console.error('完成学习失败:', error);
            UI.showNotification('保存学习记录失败', 'error');
        }
    }

    // 显示学习总结
    showSummary(result) {
        const studyStage = document.getElementById('study-stage');
        const summaryStage = document.getElementById('summary-stage');
        
        if (studyStage) studyStage.classList.add('hidden');
        if (summaryStage) {
            summaryStage.classList.remove('hidden');
            UI.animate(summaryStage, 'animate-fadeIn');
        }
        
        // 更新统计数据
        const totalStudied = document.getElementById('total-studied');
        const totalTime = document.getElementById('total-time');
        const masteryRate = document.getElementById('mastery-rate');
        
        if (totalStudied) totalStudied.textContent = studyStats.questionsStudied;
        if (totalTime) totalTime.textContent = App.Utils.formatTime(studyStats.totalTime);
        if (masteryRate) {
            const rate = result.total_questions > 0 ? 
                Math.round((result.correct_answers / result.total_questions) * 100) : 0;
            masteryRate.textContent = rate + '%';
        }
        
        // 显示学习洞察
        this.showLearningInsights(result);
    }

    // 显示学习洞察
    showLearningInsights(result) {
        const insightsGrid = document.getElementById('insights-grid');
        if (!insightsGrid) return;
        
        const insights = [];
        
        if (studyStats.questionsStudied >= 10) {
            insights.push('🏆 学习专注度很高！完成了' + studyStats.questionsStudied + '道题目');
        }
        
        if (studyStats.totalTime > 600) { // 10分钟
            insights.push('⏰ 学习时间充足，深度学习效果更佳');
        }
        
        if (result.accuracy >= 80) {
            insights.push('🎯 正确率很高，古诗词掌握得不错');
        } else if (result.accuracy >= 60) {
            insights.push('📈 还有提升空间，多练习会更好');
        } else {
            insights.push('💪 建议多看看解析，加深理解');
        }
        
        insights.push('📚 坚持学习，每天进步一点点');
        
        insightsGrid.innerHTML = '';
        insights.forEach(insight => {
            const item = document.createElement('div');
            item.className = 'insight-item';
            item.textContent = insight;
            insightsGrid.appendChild(item);
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('学习模式页面加载，等待认证初始化...');
    
    // 等待认证初始化完成
    let attempts = 0;
    while (attempts < 50 && !AppState.authInitialized) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    console.log('认证初始化完成，检查登录状态...', {
        authInitialized: AppState.authInitialized,
        isLoggedIn: AppState.isLoggedIn,
        token: !!AppState.token
    });
    
    // 检查用户是否已登录
    if (!AppState.isLoggedIn) {
        console.log('用户未登录，跳转到首页');
        UI.showNotification('请先登录后开始学习', 'warning');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // 初始化学习管理器
    studyManager = new StudyManager();
    
    console.log('学习模式页面已加载，用户:', AppState.user?.username);
});

// 开始学习模式
window.startStudyMode = async function() {
    const prepareStage = document.getElementById('prepare-stage');
    const studyStage = document.getElementById('study-stage');
    
    if (!studyManager) {
        UI.showNotification('系统初始化失败，请刷新页面', 'error');
        return;
    }
    
    try {
        const startBtn = document.querySelector('#prepare-stage .btn-primary');
        UI.showLoading(startBtn);
        
        const success = await studyManager.startStudy();
        
        if (success) {
            prepareStage.classList.add('hidden');
            studyStage.classList.remove('hidden');
            UI.animate(studyStage, 'animate-fadeIn');
            UI.showNotification('开始学习古诗词！', 'success', 2000);
        }
        
    } catch (error) {
        console.error('开始学习失败:', error);
        UI.showNotification('开始学习失败，请重试', 'error');
    } finally {
        const startBtn = document.querySelector('#prepare-stage .btn-primary');
        UI.hideLoading(startBtn);
    }
};

// 上一题
window.previousQuestion = function() {
    if (!studyManager || QuizState.currentQuestionIndex <= 0) return;
    
    const prevIndex = QuizState.currentQuestionIndex - 1;
    studyManager.showQuestion(prevIndex);
};

// 下一题
window.nextQuestion = function() {
    if (!studyManager) return;
    
    const nextIndex = QuizState.currentQuestionIndex + 1;
    
    if (nextIndex >= QuizState.questions.length) {
        // 没有更多题目，询问是否结束学习
        if (confirm('已经学习完所有题目，是否结束本次学习？')) {
            studyManager.finishStudy();
        }
    } else {
        studyManager.showQuestion(nextIndex);
    }
};

// 退出学习
window.exitStudy = function() {
    // 更新退出确认框中的统计信息
    const exitStudied = document.getElementById('exit-studied');
    const exitTime = document.getElementById('exit-time');
    
    if (exitStudied) exitStudied.textContent = studyStats.questionsStudied + ' 题';
    if (exitTime) exitTime.textContent = App.Utils.formatTime(studyStats.totalTime);
    
    UI.showModal('exit-modal');
};

// 确认退出学习
window.confirmExitStudy = async function() {
    if (studyManager && QuizState.currentQuiz) {
        try {
            await studyManager.finishStudy();
        } catch (error) {
            console.error('保存学习记录失败:', error);
        }
    }
    
    window.location.href = 'index.html';
};

// 继续学习
window.continueStudy = async function() {
    try {
        // 重新加载题目
        await studyManager.loadQuestions();
        
        if (QuizState.questions.length > 0) {
            // 开始新的学习会话
            studyManager.reset();
            studyManager = new StudyManager();
            const success = await studyManager.startStudy();
            
            if (success) {
                const summaryStage = document.getElementById('summary-stage');
                const studyStage = document.getElementById('study-stage');
                
                if (summaryStage) summaryStage.classList.add('hidden');
                if (studyStage) {
                    studyStage.classList.remove('hidden');
                    UI.animate(studyStage, 'animate-fadeIn');
                }
                
                UI.showNotification('继续学习新题目！', 'success');
            }
        } else {
            UI.showNotification('暂时没有更多题目了', 'info');
        }
        
    } catch (error) {
        console.error('继续学习失败:', error);
        UI.showNotification('继续学习失败，请重试', 'error');
    }
};

// 查看学习记录
window.viewStudyHistory = async function() {
    try {
        const history = await App.Utils.get('/quiz/history?mode=study&limit=10');
        showStudyHistory(history);
    } catch (error) {
        console.error('获取学习记录失败:', error);
        UI.showNotification('获取学习记录失败', 'error');
    }
};

// 显示学习记录
function showStudyHistory(history) {
    const historyContent = document.getElementById('history-content');
    if (!historyContent) return;
    
    historyContent.innerHTML = '';
    
    if (!history.records || history.records.length === 0) {
        historyContent.innerHTML = '<p class="text-center">暂无学习记录</p>';
        UI.showModal('history-modal');
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'history-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>日期</th>
                <th>学习题目</th>
                <th>学习时长</th>
                <th>状态</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    
    const tbody = table.querySelector('tbody');
    
    history.records.forEach(record => {
        const row = document.createElement('tr');
        const timeSpent = record.time_spent ? App.Utils.formatTime(record.time_spent) : '-';
        const status = record.completed ? '已完成' : '未完成';
        
        row.innerHTML = `
            <td>${App.Utils.formatDate(record.created_at)}</td>
            <td>${record.total_questions || 0}</td>
            <td>${timeSpent}</td>
            <td>${status}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    historyContent.appendChild(table);
    UI.showModal('history-modal');
}