// 主JavaScript文件 - 快问快答答题系统

// API基础URL
const API_BASE_URL = '/api';

// 全局状态
const AppState = {
    user: null,
    token: localStorage.getItem('access_token'),
    isLoggedIn: false,
    authInitialized: false  // 添加认证初始化标志
};

// 调试：检查初始token状态
console.log('=== AppState 初始化 ===');
console.log('localStorage.getItem("access_token"):', localStorage.getItem('access_token'));
console.log('AppState.token:', AppState.token);
console.log('typeof AppState.token:', typeof AppState.token);
console.log('AppState.token === "null":', AppState.token === "null");
console.log('AppState.token === null:', AppState.token === null);

// 修复：如果token是字符串"null"，转换为实际的null
if (AppState.token === "null" || AppState.token === "undefined") {
    AppState.token = null;
    localStorage.removeItem('access_token');
    console.log('修复了无效的token值');
}

// 工具函数
const Utils = {
    // API请求
    async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        // 添加认证头
        if (AppState.token) {
            defaultOptions.headers['Authorization'] = `Bearer ${AppState.token}`;
        }

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, finalOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    },

    // GET请求
    async get(endpoint) {
        return this.request(`${API_BASE_URL}${endpoint}`);
    },

    // POST请求
    async post(endpoint, data) {
        return this.request(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // PUT请求
    async put(endpoint, data) {
        return this.request(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // DELETE请求
    async delete(endpoint) {
        return this.request(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE'
        });
    },

    // 格式化时间
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    // 格式化日期
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // 生成随机ID
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 节流函数
    throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        }
    }
};

// UI工具函数
const UI = {
    // 显示通知
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notification-message');
        
        if (!notification || !messageElement) return;
        
        messageElement.textContent = message;
        notification.className = `notification show ${type}`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    },

    // 显示模态框
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    },

    // 隐藏模态框
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    },

    // 显示加载状态
    showLoading(element) {
        if (element) {
            element.classList.add('loading');
            element.disabled = true;
        }
    },

    // 隐藏加载状态
    hideLoading(element) {
        if (element) {
            element.classList.remove('loading');
            element.disabled = false;
        }
    },

    // 动画效果
    animate(element, animationClass, callback) {
        if (!element) return;
        
        element.classList.add(animationClass);
        
        const handleAnimationEnd = () => {
            element.classList.remove(animationClass);
            element.removeEventListener('animationend', handleAnimationEnd);
            if (callback) callback();
        };
        
        element.addEventListener('animationend', handleAnimationEnd);
    },

    // 创建粒子效果
    createParticle(x, y, color = 'rgba(102, 126, 234, 0.8)') {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.backgroundColor = color;
        particle.style.width = Math.random() * 8 + 4 + 'px';
        particle.style.height = particle.style.width;
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 4000);
    }
};

// 认证相关函数
const Auth = {
    // 初始化认证状态
    async init() {
        console.log('=== Auth.init() 开始 ===');
        console.log('初始状态 - token:', !!AppState.token, 'isLoggedIn:', AppState.isLoggedIn);
        
        try {
            if (AppState.token) {
                console.log('有token，开始验证...');
                await this.checkToken();
            } else {
                console.log('无token，更新UI并检查页面访问权限');
                this.updateUI();
                this.checkPageAccess();
            }
        } finally {
            // 无论成功还是失败，都标记认证初始化完成
            AppState.authInitialized = true;
            console.log('=== Auth.init() 完成 ===');
            console.log('最终状态 - token:', !!AppState.token, 'isLoggedIn:', AppState.isLoggedIn, 'user:', AppState.user?.username, 'authInitialized:', AppState.authInitialized);
        }
    },

    // 检查token有效性
    async checkToken() {
        try {
            console.log('开始token验证，调用 /profile API...');
            const userData = await Utils.get('/profile');
            console.log('API响应数据:', userData);
            
            AppState.user = userData;
            AppState.isLoggedIn = true;
            
            console.log('设置登录状态: isLoggedIn =', AppState.isLoggedIn);
            
            this.updateUI();
            console.log('Token验证成功，用户:', userData.username);
        } catch (error) {
            console.log('Token验证失败:', error);
            this.logoutDueToTokenFailure();
        }
    },

    // 检查页面访问权限
    checkPageAccess() {
        // 如果页面需要认证但用户未登录
        if (this.requiresAuth() && !AppState.isLoggedIn) {
            // 如果没有token，显示登录提示
            if (!AppState.token) {
                this.showLoginRequired();
            } else {
                // 如果有token但验证失败，跳转到首页
                UI.showNotification('登录已过期，请重新登录', 'warning');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }
            return false;
        }
        return true;
    },

    // 显示需要登录的提示
    showLoginRequired() {
        UI.showNotification('请先登录访问此功能', 'warning');
        
        // 延迟显示登录模态框
        setTimeout(() => {
            UI.showModal('login-modal');
        }, 1000);
        
        // 阻止页面跳转
        return false;
    },

    // 更新UI状态
    updateUI() {
        const navAuth = document.getElementById('nav-auth');
        const navUser = document.getElementById('nav-user');
        const usernameDisplay = document.getElementById('username-display');

        if (!navAuth || !navUser) return;

        if (AppState.isLoggedIn && AppState.user) {
            navAuth.classList.add('hidden');
            navUser.classList.remove('hidden');
            if (usernameDisplay) {
                usernameDisplay.textContent = AppState.user.username;
            }
        } else {
            navAuth.classList.remove('hidden');
            navUser.classList.add('hidden');
        }
    },

    // 登出
    logout() {
        AppState.user = null;
        AppState.token = null;
        AppState.isLoggedIn = false;
        localStorage.removeItem('access_token');
        this.updateUI();
        
        // 主动登出不跳转页面，只更新UI状态
    },

    // 因为token失效而登出（需要跳转到首页）
    logoutDueToTokenFailure() {
        this.logout();
        
        // 检查页面访问权限
        this.checkPageAccess();
    },

    // 检查当前页面是否需要认证
    requiresAuth() {
        const authRequiredPages = ['speed-mode.html', 'study-mode.html', 'leaderboard.html'];
        const currentPage = window.location.pathname.split('/').pop();
        return authRequiredPages.includes(currentPage);
    }
};

// 全局事件处理函数
window.showLoginModal = function() {
    UI.showModal('login-modal');
};

window.showRegisterModal = function() {
    UI.showModal('register-modal');
};

window.closeModal = function(modalId) {
    UI.hideModal(modalId);
};

window.closeNotification = function() {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.classList.remove('show');
    }
};

window.logout = function() {
    Auth.logout();
    UI.showNotification('已成功登出', 'success');
};

// 保护页面跳转的全局函数
window.navigateToPage = function(page) {
    if (!Auth.checkPageAccess()) {
        return false;
    }
    window.location.href = page;
};

// 检查是否已登录的便捷函数
window.requireLogin = function(callback) {
    if (!AppState.isLoggedIn) {
        Auth.showLoginRequired();
        return false;
    }
    if (callback) callback();
    return true;
};

// 显示古诗详情
window.showPoetryDetail = function(title, content, author) {
    document.getElementById('poetry-title').textContent = title;
    
    // 格式化诗句内容，每句一行
    const formattedContent = content.split('，').join('，\n').split('。').join('。\n');
    document.getElementById('poetry-text').textContent = formattedContent;
    
    document.getElementById('poetry-author').textContent = `作者：${author}`;
    
    UI.showModal('poetry-modal');
};

// 从诗词弹窗启动答题
window.startQuizFromPoetry = async function() {
    // 先关闭诗词弹窗
    closeModal('poetry-modal');
    
    // 等待弹窗关闭动画完成
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 然后启动答题
    await window.startQuiz();
};

window.startQuiz = async function() {
    console.log('=== startQuiz 调用 ===');
    console.log('AppState.isLoggedIn:', AppState.isLoggedIn);
    console.log('AppState.authInitialized:', AppState.authInitialized);
    console.log('AppState.user:', AppState.user);
    console.log('AppState.token:', !!AppState.token);
    
    // 等待认证初始化完成
    if (!AppState.authInitialized) {
        console.log('认证尚未初始化完成，等待...');
        let attempts = 0;
        while (attempts < 50 && !AppState.authInitialized) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        console.log('等待完成，authInitialized:', AppState.authInitialized, 'isLoggedIn:', AppState.isLoggedIn);
    }
    
    if (!AppState.isLoggedIn) {
        console.log('未登录，显示登录提示');
        UI.showNotification('请先登录后再开始答题', 'warning');
        showLoginModal();
        return;
    }
    
    console.log('已登录，显示模式选择');
    UI.showModal('mode-modal');
};

window.selectMode = function(mode) {
    if (!AppState.isLoggedIn) {
        UI.showNotification('请先登录后再开始答题', 'warning');
        showLoginModal();
        return;
    }
    startModeQuiz(mode);
};

window.startModeQuiz = function(mode) {
    if (mode === 'speed') {
        window.location.href = 'speed-mode.html';
    } else if (mode === 'study') {
        window.location.href = 'study-mode.html';
    }
    closeModal('mode-modal');
};

window.showLeaderboard = function() {
    window.location.href = 'leaderboard.html';
};

// 滚动动画
function handleScrollAnimations() {
    const elements = document.querySelectorAll('.scroll-reveal');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, {
        threshold: 0.1
    });
    
    elements.forEach(element => {
        observer.observe(element);
    });
}

// 导航栏滚动效果
function handleNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', Utils.throttle(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // 向下滚动，隐藏导航栏
            navbar.style.transform = 'translateY(-100%)';
        } else {
            // 向上滚动，显示导航栏
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    }, 100));
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('快问快答系统已加载');
    console.log('当前页面:', window.location.pathname);
    
    // 初始化认证状态（异步）
    console.log('开始初始化认证状态...');
    await Auth.init();
    console.log('认证状态初始化完成');
    
    // 初始化滚动动画
    handleScrollAnimations();
    
    // 初始化导航栏滚动效果
    handleNavbarScroll();
});

// 导出全局对象供其他脚本使用
window.App = {
    State: AppState,
    Utils: Utils,
    UI: UI,
    Auth: Auth
};