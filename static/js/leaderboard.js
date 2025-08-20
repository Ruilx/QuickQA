// 排行榜JavaScript

let currentMode = 'speed';
let currentPage = 1;
const pageSize = 50;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('排行榜页面加载，等待认证初始化...');
    
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
        UI.showNotification('请先登录后查看排行榜', 'warning');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // 加载个人成绩概览
    loadPersonalOverview();
    
    // 加载排行榜
    loadLeaderboard('speed');
    
    // 加载全站统计
    loadGlobalStats();
    
    console.log('排行榜页面已加载');
});

// 切换排行榜
window.switchLeaderboard = function(mode) {
    currentMode = mode;
    currentPage = 1;
    
    // 更新标签页状态
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.mode === mode) {
            tab.classList.add('active');
        }
    });
    
    // 更新排行榜显示
    const leaderboards = document.querySelectorAll('.leaderboard-table');
    leaderboards.forEach(board => {
        board.classList.remove('active');
        if (board.id === `${mode}-leaderboard`) {
            board.classList.add('active');
        }
    });
    
    // 加载数据
    loadLeaderboard(mode);
};

// 加载个人成绩概览
async function loadPersonalOverview() {
    try {
        const personalBest = await App.Utils.get('/leaderboard/personal');
        displayPersonalOverview(personalBest);
    } catch (error) {
        console.error('加载个人成绩失败:', error);
    }
}

// 显示个人成绩概览
function displayPersonalOverview(data) {
    const speedBest = document.getElementById('speed-best');
    const studyBest = document.getElementById('study-best');
    const overallStats = document.getElementById('overall-stats');
    
    // 速答最佳成绩
    if (speedBest) {
        if (data.speed_best) {
            speedBest.innerHTML = `
                <div class="best-score">
                    <span class="rank">#${data.speed_best.rank}</span>
                    <div class="score-details">
                        <div>答对 ${data.speed_best.correct_answers}/${data.speed_best.total_questions} 题</div>
                        <div>正确率 ${data.speed_best.accuracy}%</div>
                        <div>用时 ${data.speed_best.time_spent}秒</div>
                    </div>
                </div>
            `;
        } else {
            speedBest.innerHTML = '<p class="no-data">暂无速答记录</p>';
        }
    }
    
    // 学习最佳成绩
    if (studyBest) {
        if (data.study_best) {
            studyBest.innerHTML = `
                <div class="best-score">
                    <span class="rank">#${data.study_best.rank}</span>
                    <div class="score-details">
                        <div>学习 ${data.study_best.total_questions} 题</div>
                        <div>用时 ${App.Utils.formatTime(data.study_best.time_spent)}</div>
                    </div>
                </div>
            `;
        } else {
            studyBest.innerHTML = '<p class="no-data">暂无学习记录</p>';
        }
    }
    
    // 总体统计
    if (overallStats && data.overall_stats) {
        overallStats.innerHTML = `
            <div class="stats-grid-small">
                <div class="stat">
                    <span class="number">${data.overall_stats.total_sessions}</span>
                    <span class="label">总答题次数</span>
                </div>
                <div class="stat">
                    <span class="number">${data.overall_stats.overall_accuracy || 0}%</span>
                    <span class="label">总正确率</span>
                </div>
            </div>
        `;
    }
}

// 加载排行榜
async function loadLeaderboard(mode) {
    try {
        const response = await App.Utils.get(`/leaderboard/${mode}?limit=${pageSize}`);
        displayLeaderboard(response.leaderboard, mode);
    } catch (error) {
        console.error('加载排行榜失败:', error);
        UI.showNotification('加载排行榜失败', 'error');
    }
}

// 显示排行榜
function displayLeaderboard(leaderboard, mode) {
    const tableBody = document.getElementById(`${mode}-table-body`);
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!leaderboard || leaderboard.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">暂无排行榜数据</td></tr>';
        return;
    }
    
    leaderboard.forEach(record => {
        const row = document.createElement('tr');
        
        // 添加排名样式
        if (record.rank <= 3) {
            row.classList.add(`rank-${record.rank}`);
        }
        
        if (mode === 'speed') {
            row.innerHTML = `
                <td class="rank">
                    ${record.rank <= 3 ? getMedalIcon(record.rank) : record.rank}
                </td>
                <td class="username" onclick="showUserDetails(${record.user_id})">${record.username}</td>
                <td>${record.correct_answers}</td>
                <td>${record.total_questions}</td>
                <td>${record.accuracy}%</td>
                <td>${record.time_spent}秒</td>
                <td>${App.Utils.formatDate(record.created_at)}</td>
            `;
        } else {
            row.innerHTML = `
                <td class="rank">
                    ${record.rank <= 3 ? getMedalIcon(record.rank) : record.rank}
                </td>
                <td class="username" onclick="showUserDetails(${record.user_id})">${record.username}</td>
                <td>${record.total_questions}</td>
                <td>${App.Utils.formatTime(record.time_spent)}</td>
                <td>${App.Utils.formatDate(record.created_at)}</td>
            `;
        }
        
        tableBody.appendChild(row);
    });
}

// 获取奖牌图标
function getMedalIcon(rank) {
    const medals = ['🥇', '🥈', '🥉'];
    return medals[rank - 1] || rank;
}

// 加载全站统计
async function loadGlobalStats() {
    try {
        const stats = await App.Utils.get('/leaderboard/stats');
        displayGlobalStats(stats);
    } catch (error) {
        console.error('加载全站统计失败:', error);
    }
}

// 显示全站统计
function displayGlobalStats(stats) {
    const statsGrid = document.getElementById('global-stats-grid');
    if (!statsGrid) return;
    
    const statsData = [
        {
            title: '总用户数',
            value: stats.users.total_active_users,
            icon: '👥'
        },
        {
            title: '活跃用户（月）',
            value: stats.users.monthly_active_users,
            icon: '📈'
        },
        {
            title: '速答记录',
            value: stats.speed_mode.total_records,
            icon: '⚡'
        },
        {
            title: '学习记录',
            value: stats.study_mode.total_records,
            icon: '📚'
        },
        {
            title: '平均速答正确率',
            value: stats.speed_mode.avg_accuracy + '%',
            icon: '🎯'
        },
        {
            title: '平均学习题数',
            value: Math.round(stats.study_mode.avg_questions),
            icon: '📊'
        }
    ];
    
    statsGrid.innerHTML = '';
    
    statsData.forEach(stat => {
        const statCard = document.createElement('div');
        statCard.className = 'stat-card';
        statCard.innerHTML = `
            <div class="stat-icon">${stat.icon}</div>
            <div class="stat-info">
                <div class="stat-value">${stat.value}</div>
                <div class="stat-title">${stat.title}</div>
            </div>
        `;
        statsGrid.appendChild(statCard);
    });
}

// 刷新排行榜
window.refreshLeaderboard = function() {
    loadLeaderboard(currentMode);
    UI.showNotification('排行榜已刷新', 'success', 1500);
};

// 加载更多排行榜数据
window.loadMoreLeaderboard = async function() {
    // 这里可以实现分页加载
    UI.showNotification('功能开发中...', 'info');
};

// 显示用户详情
window.showUserDetails = function(userId) {
    // 这里可以显示用户的详细信息
    UI.showNotification('用户详情功能开发中...', 'info');
};

// 添加CSS样式
const style = document.createElement('style');
style.textContent = `
    .overview-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }
    
    .overview-card {
        background: white;
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease;
    }
    
    .overview-card:hover {
        transform: translateY(-2px);
    }
    
    .card-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }
    
    .card-header i {
        font-size: 1.5rem;
    }
    
    .card-header h3 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
    }
    
    .best-score {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .rank {
        font-size: 2rem;
        font-weight: 700;
        color: var(--primary-color);
    }
    
    .score-details div {
        margin-bottom: 0.25rem;
        color: var(--text-secondary);
        font-size: 0.875rem;
    }
    
    .no-data {
        color: var(--text-light);
        font-style: italic;
        text-align: center;
        margin: 1rem 0;
    }
    
    .stats-grid-small {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }
    
    .stat {
        text-align: center;
    }
    
    .stat .number {
        display: block;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--primary-color);
    }
    
    .stat .label {
        font-size: 0.75rem;
        color: var(--text-secondary);
    }
    
    .leaderboard-table table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        border-radius: 0.5rem;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .leaderboard-table th,
    .leaderboard-table td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid var(--bg-accent);
    }
    
    .leaderboard-table th {
        background: var(--bg-secondary);
        font-weight: 600;
        color: var(--text-primary);
    }
    
    .leaderboard-table .username {
        color: var(--primary-color);
        cursor: pointer;
        font-weight: 500;
    }
    
    .leaderboard-table .username:hover {
        text-decoration: underline;
    }
    
    .leaderboard-table .rank {
        font-weight: 700;
        text-align: center;
    }
    
    .rank-1 {
        background: rgba(255, 215, 0, 0.1);
    }
    
    .rank-2 {
        background: rgba(192, 192, 192, 0.1);
    }
    
    .rank-3 {
        background: rgba(205, 127, 50, 0.1);
    }
    
    .stat-card {
        background: white;
        border-radius: 0.5rem;
        padding: 1rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .stat-icon {
        font-size: 2rem;
    }
    
    .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--primary-color);
    }
    
    .stat-title {
        font-size: 0.875rem;
        color: var(--text-secondary);
    }
`;

document.head.appendChild(style);