// 用户认证系统
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.users = [];
        this.initialized = false;
    }

    // 初始化用户数据
    async initialize() {
        if (!this.initialized) {
            this.users = await this.loadUsers();
            this.initialized = true;
        }
    }

    // 加载用户数据
    async loadUsers() {
        try {
            // 从users.json文件加载用户数据
            const response = await fetch('users.json');
            if (!response.ok) {
                throw new Error('无法加载用户数据文件');
            }
            const usersData = await response.json();
            return usersData.users;
        } catch (error) {
            console.error('加载用户数据失败:', error);
            // 如果文件加载失败，返回默认用户数据
            return [
                {"user": "admin", "password": "114514"},
                {"user": "demo", "password": "demo123"}
            ];
        }
    }

    // 用户登录验证
    async login(username, password, authCode = null) {
        // 确保用户数据已初始化
        if (!this.initialized) {
            await this.initialize();
        }
        
        const user = this.users.find(u => u.user === username && u.password === password);
        
        if (user) {
            // 检查是否需要2FA验证
            const is2FAEnabled = localStorage.getItem('2faEnabled') === 'true';
            
            if (is2FAEnabled) {
                const secret = localStorage.getItem('2faSecret');
                if (!authCode || !this.verify2FACode(secret, authCode)) {
                    return { success: false, requires2FA: true };
                }
            }
            
            this.currentUser = user;
            this.isAuthenticated = true;
            
            // 保存登录状态到sessionStorage
            sessionStorage.setItem('adminAuthenticated', 'true');
            sessionStorage.setItem('adminUsername', username);
            
            return { success: true, requires2FA: false };
        }
        return { success: false, requires2FA: false };
    }

    // 验证2FA代码
    verify2FACode(secret, code) {
        // 使用2FA系统验证
        if (typeof twoFactorAuth !== 'undefined') {
            return twoFactorAuth.verifyTOTP(secret, code);
        }
        return false;
    }

    // 检查是否启用2FA
    is2FAEnabled() {
        return localStorage.getItem('2faEnabled') === 'true';
    }

    // 启用2FA
    enable2FA(secret, verificationCode) {
        if (this.verify2FACode(secret, verificationCode)) {
            localStorage.setItem('2faEnabled', 'true');
            localStorage.setItem('2faSecret', secret);
            return true;
        }
        return false;
    }

    // 禁用2FA
    disable2FA() {
        localStorage.removeItem('2faEnabled');
        localStorage.removeItem('2faSecret');
    }

    // 用户登出
    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // 清除sessionStorage
        sessionStorage.removeItem('adminAuthenticated');
        sessionStorage.removeItem('adminUsername');
        
        // 重定向到登录页面
        window.location.href = 'admin.html';
    }

    // 检查是否已登录
    checkAuth() {
        const isAuth = sessionStorage.getItem('adminAuthenticated') === 'true';
        if (isAuth) {
            this.isAuthenticated = true;
            this.currentUser = {
                user: sessionStorage.getItem('adminUsername')
            };
        }
        return isAuth;
    }

    // 获取当前用户信息
    getCurrentUser() {
        return this.currentUser;
    }
}

// 创建全局认证实例
const auth = new AuthSystem();

// 切换2FA状态
function toggle2FA() {
    const is2FAEnabled = auth.is2FAEnabled();
    
    if (is2FAEnabled) {
        if (confirm('确定要禁用双因素认证吗？这将降低账户安全性。')) {
            auth.disable2FA();
            update2FAButton();
            showMessage('2FA已禁用', 'info');
        }
    } else {
        show2FASetup();
    }
}

// 更新2FA按钮状态
function update2FAButton() {
    const button = document.getElementById('2faToggleBtn');
    if (button) {
        const is2FAEnabled = auth.is2FAEnabled();
        if (is2FAEnabled) {
            button.textContent = '禁用2FA';
            button.style.background = '#e74c3c';
        } else {
            button.textContent = '启用2FA';
            button.style.background = '#f39c12';
        }
    }
}

// 登录表单处理函数
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
        showMessage('请输入用户名和密码', 'error');
        return;
    }
    
    try {
        const loginResult = await auth.login(username, password);
        
        if (loginResult.requires2FA) {
            // 需要2FA验证，显示2FA输入界面
            document.getElementById('2faSection').style.display = 'block';
            document.getElementById('loginForm').style.display = 'none';
            showMessage('请输入2FA验证码', 'info');
        } else if (loginResult.success) {
            showMessage('登录成功！', 'success');
            setTimeout(() => {
                document.getElementById('loginSection').style.display = 'none';
                document.getElementById('adminSection').style.display = 'block';
                document.getElementById('welcomeMessage').textContent = `欢迎，${username}！`;
                update2FAButton();
            }, 1000);
        } else {
            showMessage('用户名或密码错误', 'error');
        }
    } catch (error) {
        console.error('登录过程中发生错误:', error);
        showMessage('登录失败，请稍后重试', 'error');
    }
}

// 处理2FA验证
async function handle2FAVerification(event) {
    event.preventDefault();
    
    const authCode = document.getElementById('authCode').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!authCode || authCode.length !== 6) {
        showMessage('请输入6位验证码', 'error');
        return;
    }
    
    try {
        const loginResult = await auth.login(username, password, authCode);
        
        if (loginResult.success) {
            showMessage('2FA验证成功！登录成功！', 'success');
            setTimeout(() => {
                document.getElementById('loginSection').style.display = 'none';
                document.getElementById('adminSection').style.display = 'block';
                document.getElementById('welcomeMessage').textContent = `欢迎，${username}！`;
            }, 1000);
        } else if (loginResult.requires2FA) {
            // 验证码错误，但需要2FA验证
            showMessage('验证码错误，请检查验证器应用中的验证码并重试', 'error');
            // 清空验证码输入框，让用户重新输入
            document.getElementById('authCode').value = '';
            document.getElementById('authCode').focus();
        } else {
            // 用户名或密码错误
            showMessage('用户名或密码错误，请返回登录页面重试', 'error');
            setTimeout(() => {
                backToLogin();
            }, 2000);
        }
    } catch (error) {
        console.error('2FA验证过程中发生错误:', error);
        showMessage('验证失败，请稍后重试', 'error');
    }
}

// 返回登录表单
function backToLogin() {
    document.getElementById('2faSection').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('authCode').value = '';
    showMessage('', 'info');
}

// 显示消息
function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

// 登出函数
function logout() {
    if (confirm('确定要退出登录吗？')) {
        auth.logout();
    }
}

// 页面加载时检查认证状态
document.addEventListener('DOMContentLoaded', function() {
    // 确保DOM完全加载后再执行认证检查
    setTimeout(function() {
        if (auth.checkAuth()) {
            // 已登录，显示管理界面
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('adminSection').style.display = 'block';
            
            // 更新欢迎信息
            const username = sessionStorage.getItem('adminUsername');
            if (username) {
                document.getElementById('welcomeUser').textContent = username;
            }
            update2FAButton();
        } else {
            // 未登录，显示登录界面
            document.getElementById('loginSection').style.display = 'flex';
            document.getElementById('adminSection').style.display = 'none';
        }
    }, 100);
    
    // 为2FA表单添加事件监听器
    const twofaForm = document.getElementById('2faSection');
    if (twofaForm) {
        twofaForm.addEventListener('submit', handle2FAVerification);
    }
});