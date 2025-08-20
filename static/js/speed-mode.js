// 速答模式JavaScript

let speedQuizManager = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('速答模式页面加载，等待认证初始化...');
    
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
        UI.showNotification('请先登录后开始答题', 'warning');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // 初始化速答管理器
    speedQuizManager = new QuizManager('speed');
    
    console.log('速答模式页面已加载，用户:', AppState.user?.username);
});

// 开始速答挑战
window.startSpeedQuiz = async function() {
    const prepareStage = document.getElementById('prepare-stage');
    const quizStage = document.getElementById('quiz-stage');
    
    if (!speedQuizManager) {
        UI.showNotification('系统初始化失败，请刷新页面', 'error');
        return;
    }
    
    try {
        // 显示加载状态
        const startBtn = document.querySelector('#prepare-stage .btn-primary');
        UI.showLoading(startBtn);
        
        // 开始答题
        const success = await speedQuizManager.startQuiz();
        
        if (success) {
            // 切换到答题界面
            prepareStage.classList.add('hidden');
            quizStage.classList.remove('hidden');
            
            // 添加进入动画
            UI.animate(quizStage, 'animate-fadeIn');
            
            // 显示开始通知
            UI.showNotification('速答挑战开始！', 'success', 2000);
        }
        
    } catch (error) {
        console.error('开始速答失败:', error);
        UI.showNotification('开始答题失败，请重试', 'error');
    } finally {
        const startBtn = document.querySelector('#prepare-stage .btn-primary');
        UI.hideLoading(startBtn);
    }
};

// 退出答题
window.exitQuiz = function() {
    // 如果正在答题，显示确认对话框
    if (speedQuizManager && QuizState.currentQuiz) {
        UI.showModal('exit-modal');
    } else {
        window.location.href = 'index.html';
    }
};

// 确认退出
window.confirmExit = function() {
    // 清理计时器
    if (QuizState.timer) {
        clearInterval(QuizState.timer);
    }
    
    // 跳转到首页
    window.location.href = 'index.html';
};

// 重新开始答题
window.restartQuiz = function() {
    window.location.reload();
};

// 查看答题详情
window.viewQuizDetails = async function() {
    if (!QuizState.currentQuiz) {
        UI.showNotification('没有答题记录', 'warning');
        return;
    }
    
    try {
        const details = await App.Utils.get(`/quiz/${QuizState.currentQuiz.quiz_record_id}/details`);
        showQuizDetails(details);
    } catch (error) {
        console.error('获取答题详情失败:', error);
        UI.showNotification('获取答题详情失败', 'error');
    }
};

// 显示答题详情
function showQuizDetails(details) {
    const detailsContent = document.getElementById('details-content');
    if (!detailsContent) return;
    
    detailsContent.innerHTML = '';
    
    if (!details.details || details.details.length === 0) {
        detailsContent.innerHTML = '<p class="text-center">暂无答题详情</p>';
        UI.showModal('details-modal');
        return;
    }
    
    details.details.forEach((detail, index) => {
        const item = document.createElement('div');
        item.className = 'detail-item';
        
        const statusIcon = detail.is_correct ? '✓' : '✗';
        const statusClass = detail.is_correct ? 'correct' : 'wrong';
        
        // 计算用时
        const timeSpent = detail.time_taken ? Math.round(detail.time_taken / 1000) : 0;
        
        item.innerHTML = `
            <div class="detail-question">
                <strong>第 ${index + 1} 题：</strong>${detail.question_title}
            </div>
            <div class="detail-content">
                ${detail.question_content}
            </div>
            <div class="detail-answer">
                <div class="answer-status ${statusClass}">
                    ${statusIcon}
                </div>
                <div class="answer-info">
                    <div><strong>你的答案：</strong>${detail.selected_text || '未回答'}</div>
                    <div><strong>正确答案：</strong>${detail.correct_text}</div>
                    <div><strong>用时：</strong>${timeSpent} 秒</div>
                </div>
            </div>
            <div class="detail-explanation">
                <h5>📖 详细解析：</h5>
                <p>${detail.explanation}</p>
            </div>
        `;
        
        detailsContent.appendChild(item);
    });
    
    App.UI.showModal('details-modal');
}

// 键盘快捷键支持
document.addEventListener('keydown', function(event) {
    // 只在答题阶段响应数字键
    if (!document.getElementById('quiz-stage').classList.contains('hidden')) {
        const key = event.key;
        
        // 数字键1-4对应选项A-D
        if (key >= '1' && key <= '4') {
            const options = document.querySelectorAll('.option:not(.disabled)');
            const index = parseInt(key) - 1;
            
            if (options[index]) {
                options[index].click();
            }
        }
        
        // A-D键也对应选项
        if (key >= 'A' && key <= 'D') {
            const options = document.querySelectorAll('.option:not(.disabled)');
            const index = key.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
            
            if (options[index]) {
                options[index].click();
            }
        }
        
        // 小写字母也支持
        if (key >= 'a' && key <= 'd') {
            const options = document.querySelectorAll('.option:not(.disabled)');
            const index = key.charCodeAt(0) - 97; // a=0, b=1, c=2, d=3
            
            if (options[index]) {
                options[index].click();
            }
        }
    }
});

// 页面可见性变化处理（防作弊）
document.addEventListener('visibilitychange', function() {
    if (document.hidden && QuizState.currentQuiz && !QuizState.finished) {
        console.log('页面失去焦点，记录可能的作弊行为');
        // 这里可以记录用户切换标签页的行为
    }
});

// 防止右键菜单（可选的防作弊措施）
document.addEventListener('contextmenu', function(e) {
    if (QuizState.currentQuiz && !QuizState.finished) {
        e.preventDefault();
        return false;
    }
});

// 防止复制（可选的防作弊措施）
document.addEventListener('selectstart', function(e) {
    if (QuizState.currentQuiz && !QuizState.finished) {
        e.preventDefault();
        return false;
    }
});

// 页面卸载前确认
window.addEventListener('beforeunload', function(e) {
    if (QuizState.currentQuiz && !QuizState.finished) {
        const confirmationMessage = '答题还未完成，确定要离开吗？';
        e.returnValue = confirmationMessage;
        return confirmationMessage;
    }
});