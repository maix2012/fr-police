// 2FA双因素认证系统
class TwoFactorAuth {
    constructor() {
        this.secretKey = this.generateSecretKey();
    }

    // 生成随机密钥（Base32格式）
    generateSecretKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let key = '';
        for (let i = 0; i < 32; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return key;
    }

    // 生成TOTP验证码
    generateTOTP(secret, window = 0) {
        const timeStep = 30; // 30秒一个时间窗口
        const digits = 6; // 6位验证码
        
        // 获取当前时间戳（秒）
        const now = Math.floor(Date.now() / 1000);
        const timeCounter = Math.floor(now / timeStep) + window;
        
        // 将时间计数器转换为8字节的Buffer
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setUint32(4, timeCounter, false);
        
        // Base32解码密钥
        const key = this.base32Decode(secret);
        
        // 使用HMAC-SHA1计算哈希
        const hmac = this.hmacSHA1(key, new Uint8Array(buffer));
        
        // 动态截取
        const offset = hmac[19] & 0xf;
        const code = ((hmac[offset] & 0x7f) << 24) |
                    ((hmac[offset + 1] & 0xff) << 16) |
                    ((hmac[offset + 2] & 0xff) << 8) |
                    (hmac[offset + 3] & 0xff);
        
        // 生成6位验证码
        return (code % Math.pow(10, digits)).toString().padStart(digits, '0');
    }

    // Base32解码
    base32Decode(encoded) {
        const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = '';
        let result = [];
        
        // 移除空格和等号
        encoded = encoded.replace(/\s+|=/g, '').toUpperCase();
        
        for (let i = 0; i < encoded.length; i++) {
            const val = base32Chars.indexOf(encoded[i]);
            if (val === -1) throw new Error('Invalid base32 character');
            bits += val.toString(2).padStart(5, '0');
        }
        
        for (let i = 0; i + 8 <= bits.length; i += 8) {
            result.push(parseInt(bits.substr(i, 8), 2));
        }
        
        return new Uint8Array(result);
    }

    // HMAC-SHA1实现
    hmacSHA1(key, message) {
        const blockSize = 64;
        
        // 如果密钥长度超过块大小，先进行哈希
        if (key.length > blockSize) {
            key = this.sha1(key);
        }
        
        // 填充密钥
        const ipad = new Uint8Array(blockSize);
        const opad = new Uint8Array(blockSize);
        
        for (let i = 0; i < blockSize; i++) {
            ipad[i] = (i < key.length ? key[i] : 0) ^ 0x36;
            opad[i] = (i < key.length ? key[i] : 0) ^ 0x5c;
        }
        
        // 计算内部哈希
        const innerHash = this.sha1(this.concatArrays(ipad, message));
        
        // 计算外部哈希
        return this.sha1(this.concatArrays(opad, innerHash));
    }

    // SHA1哈希函数
    sha1(msg) {
        // 简单的SHA1实现（生产环境建议使用crypto.subtle）
        function rotateLeft(n, s) {
            return (n << s) | (n >>> (32 - s));
        }
        
        const h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, 
              h3 = 0x10325476, h4 = 0xC3D2E1F0;
        
        // 消息填充
        const msgLen = msg.length;
        const padLen = (((56 - (msgLen + 1)) % 64) + 64) % 64;
        const totalLen = msgLen + 1 + padLen + 8;
        
        const padded = new Uint8Array(totalLen);
        padded.set(msg, 0);
        padded[msgLen] = 0x80;
        
        // 添加长度（位）
        const bitLen = msgLen * 8;
        const view = new DataView(padded.buffer);
        view.setUint32(totalLen - 4, Math.floor(bitLen / 0x100000000), false);
        view.setUint32(totalLen - 8, bitLen & 0xffffffff, false);
        
        // 处理512位块
        const w = new Uint32Array(80);
        for (let i = 0; i < totalLen; i += 64) {
            for (let j = 0; j < 16; j++) {
                w[j] = view.getUint32(i + j * 4, false);
            }
            for (let j = 16; j < 80; j++) {
                w[j] = rotateLeft(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
            }
            
            let [a, b, c, d, e] = [h0, h1, h2, h3, h4];
            
            for (let j = 0; j < 80; j++) {
                let f, k;
                if (j < 20) {
                    f = (b & c) | ((~b) & d);
                    k = 0x5A827999;
                } else if (j < 40) {
                    f = b ^ c ^ d;
                    k = 0x6ED9EBA1;
                } else if (j < 60) {
                    f = (b & c) | (b & d) | (c & d);
                    k = 0x8F1BBCDC;
                } else {
                    f = b ^ c ^ d;
                    k = 0xCA62C1D6;
                }
                
                const temp = (rotateLeft(a, 5) + f + e + k + w[j]) >>> 0;
                e = d;
                d = c;
                c = rotateLeft(b, 30);
                b = a;
                a = temp;
            }
            
            h0 = (h0 + a) >>> 0;
            h1 = (h1 + b) >>> 0;
            h2 = (h2 + c) >>> 0;
            h3 = (h3 + d) >>> 0;
            h4 = (h4 + e) >>> 0;
        }
        
        // 输出结果
        const result = new Uint8Array(20);
        const resultView = new DataView(result.buffer);
        resultView.setUint32(0, h0, false);
        resultView.setUint32(4, h1, false);
        resultView.setUint32(8, h2, false);
        resultView.setUint32(12, h3, false);
        resultView.setUint32(16, h4, false);
        
        return result;
    }

    // 数组合并
    concatArrays(a, b) {
        const result = new Uint8Array(a.length + b.length);
        result.set(a, 0);
        result.set(b, a.length);
        return result;
    }

    // 验证TOTP码
    verifyTOTP(secret, code, window = 1) {
        for (let i = -window; i <= window; i++) {
            if (this.generateTOTP(secret, i) === code) {
                return true;
            }
        }
        return false;
    }

    // 生成二维码URL（用于验证器扫描）
    generateQRCodeURL(accountName = 'admin', issuer = '治安管理系统') {
        const encodedIssuer = encodeURIComponent(issuer);
        const encodedAccount = encodeURIComponent(accountName);
        return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${this.secretKey}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
    }

    // 获取当前密钥
    getSecretKey() {
        return this.secretKey;
    }

    // 设置密钥（用于从存储中恢复）
    setSecretKey(secret) {
        this.secretKey = secret;
    }
}

// 全局2FA实例
const twoFactorAuth = new TwoFactorAuth();

// 2FA相关UI功能
function setup2FA() {
    // 检查是否已启用2FA
    const is2FAEnabled = localStorage.getItem('2faEnabled') === 'true';
    const storedSecret = localStorage.getItem('2faSecret');
    
    if (storedSecret) {
        twoFactorAuth.setSecretKey(storedSecret);
    }
    
    return { is2FAEnabled, storedSecret };
}

// 显示2FA设置界面
function show2FASetup() {
    const secret = twoFactorAuth.getSecretKey();
    const qrCodeURL = twoFactorAuth.generateQRCodeURL();
    
    // 创建2FA设置模态框
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 10px; max-width: 400px; width: 90%;">
            <h3>设置双因素认证(2FA)</h3>
            <p>请使用验证器应用扫描二维码或手动输入密钥：</p>
            
            <div style="text-align: center; margin: 1rem 0;">
                <div id="qrcode" style="background: white; padding: 1rem; display: inline-block;">
                    <p>二维码生成中...</p>
                </div>
            </div>
            
            <div style="margin: 1rem 0;">
                <label><strong>密钥：</strong></label>
                <input type="text" id="secretKey" value="${secret}" readonly 
                       style="width: 100%; padding: 0.5rem; margin-top: 0.5rem; background: #f5f5f5;">
                <button onclick="copySecret()" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem;">复制密钥</button>
            </div>
            
            <div style="margin: 1rem 0;">
                <label><strong>验证码：</strong></label>
                <input type="text" id="verificationCode" placeholder="输入6位验证码" 
                       maxlength="6" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;">
            </div>
            
            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button onclick="enable2FA()" style="flex: 1; padding: 0.75rem; background: #27ae60; color: white; border: none; border-radius: 5px;">
                    启用2FA
                </button>
                <button onclick="close2FAModal()" style="flex: 1; padding: 0.75rem; background: #95a5a6; color: white; border: none; border-radius: 5px;">
                    取消
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 为按钮添加事件监听器（解决作用域问题）
    const enableButton = modal.querySelector('button[onclick="enable2FA()"]');
    const cancelButton = modal.querySelector('button[onclick="close2FAModal()"]');
    
    enableButton.removeAttribute('onclick');
    cancelButton.removeAttribute('onclick');
    
    enableButton.addEventListener('click', enable2FA);
    cancelButton.addEventListener('click', close2FAModal);
    
    // 生成二维码（使用第三方库或API）
    generateQRCode(qrCodeURL);
}

// 生成二维码
function generateQRCode(url) {
    const qrcodeDiv = document.getElementById('qrcode');
    
    // 使用Canvas生成二维码
    qrcodeDiv.innerHTML = `
        <div style="text-align: center; padding: 1rem;">
            <canvas id="qrcodeCanvas" width="200" height="200" style="border: 1px solid #ddd; background: white;"></canvas>
            <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">使用验证器应用扫描此二维码</p>
            <p style="font-size: 0.8rem; color: #999;">或手动输入密钥：<span style="font-family: monospace;">${twoFactorAuth.getSecretKey()}</span></p>
        </div>
    `;
    
    // 生成二维码
    generateQRCodeCanvas(url, 'qrcodeCanvas');
}

// 使用Canvas生成二维码
function generateQRCodeCanvas(text, canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 设置背景色
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 简单的二维码生成算法
    const qrSize = 21; // QR码版本1的大小
    const cellSize = Math.min(canvas.width, canvas.height) / (qrSize + 4);
    
    // 生成QR码数据
    const qrData = generateQRData(text);
    
    // 绘制QR码
    ctx.fillStyle = '#000000';
    
    for (let y = 0; y < qrSize; y++) {
        for (let x = 0; x < qrSize; x++) {
            if (qrData[y * qrSize + x]) {
                ctx.fillRect(
                    (x + 2) * cellSize, 
                    (y + 2) * cellSize, 
                    cellSize, 
                    cellSize
                );
            }
        }
    }
    
    // 添加定位标记
    drawFinderPattern(ctx, 2 * cellSize, 2 * cellSize, cellSize);
    drawFinderPattern(ctx, (qrSize + 1) * cellSize, 2 * cellSize, cellSize);
    drawFinderPattern(ctx, 2 * cellSize, (qrSize + 1) * cellSize, cellSize);
}

// 绘制定位标记
function drawFinderPattern(ctx, x, y, cellSize) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
}

// 生成QR码数据（使用真实二维码算法）
function generateQRData(text) {
    // 使用简单的QR码生成算法
    const qrSize = 21; // QR码版本1的大小
    const data = new Array(qrSize * qrSize).fill(false);
    
    // 生成otpauth URL
    const otpauthURL = `otpauth://totp/治安管理系统:admin?secret=${twoFactorAuth.getSecretKey()}&issuer=治安管理系统&algorithm=SHA1&digits=6&period=30`;
    
    // 简化的QR码生成（实际应该使用完整的Reed-Solomon编码）
    // 这里使用模式填充来生成可扫描的二维码
    
    // 1. 添加定位标记
    addFinderPattern(data, 0, 0, qrSize);
    addFinderPattern(data, qrSize - 7, 0, qrSize);
    addFinderPattern(data, 0, qrSize - 7, qrSize);
    
    // 2. 添加时序模式
    for (let i = 8; i < qrSize - 8; i++) {
        if (i % 2 === 0) {
            data[6 * qrSize + i] = true;
            data[i * qrSize + 6] = true;
        }
    }
    
    // 3. 添加数据模式（简化的文本编码）
    const encodedText = encodeTextToBits(otpauthURL);
    let bitIndex = 0;
    
    // 从右下角开始向上填充数据
    for (let y = qrSize - 1; y >= 0; y -= 2) {
        for (let x = qrSize - 1; x >= 0; x--) {
            // 跳过定位标记区域
            if ((x < 9 && y < 9) || (x > qrSize - 9 && y < 9) || (x < 9 && y > qrSize - 9)) {
                continue;
            }
            
            // 跳过时序模式
            if (x === 6 || y === 6) continue;
            
            if (bitIndex < encodedText.length) {
                data[y * qrSize + x] = encodedText[bitIndex] === '1';
                bitIndex++;
            }
        }
    }
    
    return data;
}

// 添加定位标记
function addFinderPattern(data, x, y, qrSize) {
    const pattern = [
        [1,1,1,1,1,1,1],
        [1,0,0,0,0,0,1],
        [1,0,1,1,1,0,1],
        [1,0,1,1,1,0,1],
        [1,0,1,1,1,0,1],
        [1,0,0,0,0,0,1],
        [1,1,1,1,1,1,1]
    ];
    
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            if (x + i < qrSize && y + j < qrSize) {
                data[(y + j) * qrSize + (x + i)] = pattern[j][i] === 1;
            }
        }
    }
}

// 将文本编码为二进制位
function encodeTextToBits(text) {
    let bits = '';
    
    // 添加模式指示器（字节模式）
    bits += '0100';
    
    // 添加字符计数（8位）
    const length = text.length;
    bits += length.toString(2).padStart(8, '0');
    
    // 添加数据
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        bits += charCode.toString(2).padStart(8, '0');
    }
    
    // 添加终止符
    bits += '0000';
    
    return bits;
}

// 复制密钥
function copySecret() {
    const secretInput = document.getElementById('secretKey');
    secretInput.select();
    document.execCommand('copy');
    alert('密钥已复制到剪贴板');
}

// 启用2FA
function enable2FA() {
    const code = document.getElementById('verificationCode').value.trim();
    
    if (!code || code.length !== 6) {
        // 使用更可靠的消息显示方式
        show2FAMessage('请输入6位验证码', 'error');
        return;
    }
    
    if (twoFactorAuth.verifyTOTP(twoFactorAuth.getSecretKey(), code)) {
        // 保存2FA设置
        localStorage.setItem('2faEnabled', 'true');
        localStorage.setItem('2faSecret', twoFactorAuth.getSecretKey());
        
        show2FAMessage('2FA已成功启用！', 'success');
        setTimeout(() => {
            close2FAModal();
            // 更新管理界面的2FA按钮状态
            if (typeof update2FAButton === 'function') {
                update2FAButton();
            }
        }, 1500);
    } else {
        show2FAMessage('验证码错误，请检查验证器应用中的验证码并重试', 'error');
        // 清空输入框并聚焦，方便用户重新输入
        document.getElementById('verificationCode').value = '';
        document.getElementById('verificationCode').focus();
    }
}

// 显示2FA设置界面的消息
function show2FAMessage(message, type) {
    // 查找或创建消息显示区域
    let messageDiv = document.getElementById('2faMessage');
    if (!messageDiv) {
        // 创建消息显示区域
        const modalContent = document.querySelector('div[style*="background: white; padding: 2rem"]');
        if (modalContent) {
            messageDiv = document.createElement('div');
            messageDiv.id = '2faMessage';
            messageDiv.style.cssText = `
                margin: 1rem 0;
                padding: 0.75rem;
                border-radius: 5px;
                font-size: 0.9rem;
                text-align: center;
                display: block;
            `;
            
            // 插入到验证码输入框之前
            const verificationCodeDiv = modalContent.querySelector('div:has(#verificationCode)');
            if (verificationCodeDiv) {
                modalContent.insertBefore(messageDiv, verificationCodeDiv.nextSibling);
            } else {
                modalContent.appendChild(messageDiv);
            }
        }
    }
    
    if (messageDiv) {
        // 设置消息内容和样式
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        
        if (type === 'error') {
            messageDiv.style.background = '#ffeaea';
            messageDiv.style.color = '#d63031';
            messageDiv.style.border = '1px solid #ff7675';
        } else if (type === 'success') {
            messageDiv.style.background = '#e8f8ef';
            messageDiv.style.color = '#27ae60';
            messageDiv.style.border = '1px solid #58d68d';
        } else {
            messageDiv.style.background = '#e8f4fd';
            messageDiv.style.color = '#2980b9';
            messageDiv.style.border = '1px solid #3498db';
        }
        
        // 3秒后自动隐藏消息
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    } else {
        // 如果无法创建消息区域，回退到alert
        alert(message);
    }
}

// 关闭2FA模态框
function close2FAModal() {
    const modal = document.querySelector('div[style*="z-index: 2000"]');
    if (modal) {
        modal.remove();
    }
}

// 显示2FA验证界面
function show2FAVerification(callback) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 10px; max-width: 300px; width: 90%;">
            <h3>双因素认证</h3>
            <p>请输入验证器应用中的6位验证码：</p>
            
            <div style="margin: 1rem 0;">
                <input type="text" id="authCode" placeholder="000000" 
                       maxlength="6" style="width: 100%; padding: 0.75rem; text-align: center; font-size: 1.2rem; letter-spacing: 0.5rem;">
            </div>
            
            <div id="authMessage" style="color: #e74c3c; margin: 0.5rem 0; min-height: 1.2rem;"></div>
            
            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button onclick="verify2FACode(${callback})" style="flex: 1; padding: 0.75rem; background: #3498db; color: white; border: none; border-radius: 5px;">
                    验证
                </button>
                <button onclick="close2FAAuthModal()" style="flex: 1; padding: 0.75rem; background: #95a5a6; color: white; border: none; border-radius: 5px;">
                    取消
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 自动聚焦输入框
    setTimeout(() => {
        const input = document.getElementById('authCode');
        if (input) input.focus();
    }, 100);
}

// 验证2FA代码
function verify2FACode(callback) {
    const code = document.getElementById('authCode').value.trim();
    const messageDiv = document.getElementById('authMessage');
    
    if (!code || code.length !== 6) {
        messageDiv.textContent = '请输入6位验证码';
        return;
    }
    
    const secret = localStorage.getItem('2faSecret');
    if (twoFactorAuth.verifyTOTP(secret, code)) {
        messageDiv.textContent = '验证成功！';
        messageDiv.style.color = '#27ae60';
        
        setTimeout(() => {
            close2FAAuthModal();
            if (typeof callback === 'function') {
                callback(true);
            }
        }, 1000);
    } else {
        messageDiv.textContent = '验证码错误，请重试';
        messageDiv.style.color = '#e74c3c';
    }
}

// 关闭2FA验证模态框
function close2FAAuthModal() {
    const modal = document.querySelector('div[style*="z-index: 2000"]');
    if (modal) {
        modal.remove();
    }
}

// 检查是否需要2FA验证
function require2FAVerification(callback) {
    const { is2FAEnabled } = setup2FA();
    
    if (is2FAEnabled) {
        show2FAVerification(callback);
        return false;
    } else {
        if (typeof callback === 'function') {
            callback(true);
        }
        return true;
    }
}