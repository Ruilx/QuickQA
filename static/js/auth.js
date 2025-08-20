// 认证相关JavaScript

// 登录处理
window.login = async function(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    
    const loginData = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    // 基础验证
    if (!loginData.username || !loginData.password) {
        UI.showNotification('请填写完整的登录信息', 'error');
        return;
    }
    
    try {
        UI.showLoading(submitBtn);
        
        const response = await Utils.post('/login', loginData);
        
        // 保存token和用户信息
        AppState.token = response.access_token;
        AppState.user = {
            id: response.user_id,
            username: response.username
        };
        AppState.isLoggedIn = true;
        
        localStorage.setItem('access_token', response.access_token);
        
        // 更新UI
        Auth.updateUI();
        
        // 关闭模态框
        closeModal('login-modal');
        
        // 显示成功信息
        UI.showNotification(`欢迎回来，${response.username}！`, 'success');
        
        // 清空表单
        form.reset();
        
    } catch (error) {
        UI.showNotification(error.message || '登录失败，请检查用户名和密码', 'error');
    } finally {
        UI.hideLoading(submitBtn);
    }
};

// 注册处理
window.register = async function(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    
    const registerData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    const confirmPassword = formData.get('confirm-password');
    
    // 基础验证
    if (!registerData.username || !registerData.password) {
        UI.showNotification('请填写完整的注册信息', 'error');
        return;
    }
    
    if (registerData.username.length < 3) {
        UI.showNotification('用户名至少需要3个字符', 'error');
        return;
    }
    
    if (registerData.password.length < 6) {
        UI.showNotification('密码至少需要6个字符', 'error');
        return;
    }
    
    if (registerData.password !== confirmPassword) {
        UI.showNotification('两次输入的密码不一致', 'error');
        return;
    }
    
    try {
        UI.showLoading(submitBtn);
        
        const response = await Utils.post('/register', registerData);
        
        // 注册成功后自动登录
        AppState.user = {
            id: response.user_id,
            username: response.username
        };
        
        // 关闭模态框
        closeModal('register-modal');
        
        // 显示成功信息
        UI.showNotification('注册成功！请登录', 'success');
        
        // 清空表单
        form.reset();
        
        // 显示登录模态框
        setTimeout(() => {
            showLoginModal();
        }, 1000);
        
    } catch (error) {
        UI.showNotification(error.message || '注册失败，请重试', 'error');
    } finally {
        UI.hideLoading(submitBtn);
    }
};

// 表单验证增强
document.addEventListener('DOMContentLoaded', function() {
    // 实时密码强度检查
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');
    
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = checkPasswordStrength(password);
            updatePasswordStrengthUI(this, strength);
        });
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            const password = document.getElementById('register-password').value;
            const confirmPassword = this.value;
            
            if (confirmPassword && password !== confirmPassword) {
                this.setCustomValidity('密码不匹配');
                this.style.borderColor = 'var(--error-color)';
            } else {
                this.setCustomValidity('');
                this.style.borderColor = '';
            }
        });
    }
    
    // 用户名可用性检查
    const usernameInput = document.getElementById('register-username');
    if (usernameInput) {
        let checkTimeout;
        usernameInput.addEventListener('input', function() {
            const username = this.value;
            
            clearTimeout(checkTimeout);
            
            if (username.length >= 3) {
                checkTimeout = setTimeout(() => {
                    checkUsernameAvailability(username, this);
                }, 500);
            }
        });
    }
});

// 密码强度检查
function checkPasswordStrength(password) {
    let score = 0;
    let feedback = [];
    
    if (password.length >= 6) score += 1;
    else feedback.push('至少6个字符');
    
    if (password.length >= 8) score += 1;
    else if (password.length >= 6) feedback.push('建议8个字符以上');
    
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('包含小写字母');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('包含大写字母');
    
    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('包含数字');
    
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('包含特殊字符');
    
    return {
        score: score,
        level: score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong',
        feedback: feedback
    };
}

// 更新密码强度UI
function updatePasswordStrengthUI(input, strength) {
    // 移除现有的强度指示器
    let strengthIndicator = input.parentNode.querySelector('.password-strength');
    if (strengthIndicator) {
        strengthIndicator.remove();
    }
    
    if (input.value.length === 0) return;
    
    // 创建强度指示器
    strengthIndicator = document.createElement('div');
    strengthIndicator.className = 'password-strength';
    
    const strengthBar = document.createElement('div');
    strengthBar.className = `strength-bar ${strength.level}`;
    strengthBar.style.width = `${(strength.score / 6) * 100}%`;
    
    const strengthText = document.createElement('span');
    strengthText.className = 'strength-text';
    
    switch (strength.level) {
        case 'weak':
            strengthText.textContent = '弱';
            strengthText.style.color = 'var(--error-color)';
            break;
        case 'medium':
            strengthText.textContent = '中等';
            strengthText.style.color = 'var(--warning-color)';
            break;
        case 'strong':
            strengthText.textContent = '强';
            strengthText.style.color = 'var(--success-color)';
            break;
    }
    
    strengthIndicator.appendChild(strengthBar);
    strengthIndicator.appendChild(strengthText);
    
    // 添加CSS样式
    const style = document.createElement('style');
    style.textContent = `
        .password-strength {
            margin-top: 5px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .strength-bar {
            height: 4px;
            border-radius: 2px;
            transition: all 0.3s ease;
            min-width: 20px;
        }
        .strength-bar.weak {
            background-color: var(--error-color);
        }
        .strength-bar.medium {
            background-color: var(--warning-color);
        }
        .strength-bar.strong {
            background-color: var(--success-color);
        }
        .strength-text {
            font-size: 0.75rem;
            font-weight: 500;
        }
    `;
    
    if (!document.querySelector('style[data-password-strength]')) {
        style.setAttribute('data-password-strength', 'true');
        document.head.appendChild(style);
    }
    
    input.parentNode.appendChild(strengthIndicator);
}

// 检查用户名可用性（模拟功能）
async function checkUsernameAvailability(username, input) {
    try {
        // 这里可以添加实际的API调用来检查用户名可用性
        // 现在只是简单的长度检查
        
        let indicator = input.parentNode.querySelector('.username-indicator');
        if (indicator) {
            indicator.remove();
        }
        
        indicator = document.createElement('div');
        indicator.className = 'username-indicator';
        
        if (username.length >= 3) {
            indicator.innerHTML = '<span style="color: var(--success-color); font-size: 0.75rem;">✓ 用户名格式正确</span>';
        } else {
            indicator.innerHTML = '<span style="color: var(--error-color); font-size: 0.75rem;">✗ 用户名太短</span>';
        }
        
        input.parentNode.appendChild(indicator);
        
    } catch (error) {
        console.log('检查用户名可用性失败:', error);
    }
}

// 社交登录（预留功能）
window.socialLogin = function(provider) {
    UI.showNotification(`${provider} 登录功能即将推出`, 'info');
};

// 忘记密码（预留功能）
window.forgotPassword = function() {
    UI.showNotification('忘记密码功能即将推出', 'info');
};

// 键盘快捷键
document.addEventListener('keydown', function(event) {
    // ESC键关闭模态框
    if (event.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
        document.body.style.overflow = '';
    }
    
    // 回车键提交表单
    if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
        const form = event.target.closest('form');
        if (form) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn && !submitBtn.disabled) {
                submitBtn.click();
            }
        }
    }
});