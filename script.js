// 犯罪记录数据存储
let criminalRecords = [];

// 初始化函数
document.addEventListener('DOMContentLoaded', function() {
    loadRecords();
    updateStats();
    
    // 添加回车键搜索功能
    const phoneInput = document.getElementById('phoneInput');
    if (phoneInput) {
        phoneInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchRecord();
            }
        });
    }
});

// 加载记录数据
function loadRecords() {
    // 尝试从本地存储加载数据
    const savedRecords = localStorage.getItem('criminalRecords');
    if (savedRecords) {
        criminalRecords = JSON.parse(savedRecords);
    } else {
        // 如果没有本地数据，使用默认示例数据
        criminalRecords = [
            {
                phone: "13800138000",
                name: "张三",
                hasCriminalRecord: true,
                crimes: ["盗窃罪", "诈骗罪"],
                lastUpdate: "2024-01-15",
                status: "在逃"
            },
            {
                phone: "13900139000",
                name: "李四",
                hasCriminalRecord: false,
                crimes: [],
                lastUpdate: "2024-02-20",
                status: "清白"
            },
            {
                phone: "13600136000",
                name: "王五",
                hasCriminalRecord: true,
                crimes: ["故意伤害罪"],
                lastUpdate: "2023-12-10",
                status: "服刑中"
            },
            {
                phone: "13700137000",
                name: "赵六",
                hasCriminalRecord: true,
                crimes: ["贩毒罪", "非法持有枪支罪"],
                lastUpdate: "2024-03-05",
                status: "已判刑"
            },
            {
                phone: "13500135000",
                name: "钱七",
                hasCriminalRecord: false,
                crimes: [],
                lastUpdate: "2024-01-30",
                status: "清白"
            }
        ];
        saveRecords();
    }
}

// 保存记录到本地存储
function saveRecords() {
    localStorage.setItem('criminalRecords', JSON.stringify(criminalRecords));
}

// 搜索记录
function searchRecord() {
    const phoneInput = document.getElementById('phoneInput');
    const phoneNumber = phoneInput.value.trim();
    
    // 验证手机号格式
    if (!isValidPhoneNumber(phoneNumber)) {
        showError('请输入有效的11位手机号码');
        return;
    }
    
    // 显示加载状态
    showLoading();
    
    // 模拟网络延迟
    setTimeout(() => {
        const record = findRecordByPhone(phoneNumber);
        displayResult(record, phoneNumber);
    }, 800);
}

// 验证手机号格式
function isValidPhoneNumber(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
}

// 根据手机号查找记录
function findRecordByPhone(phone) {
    return criminalRecords.find(record => record.phone === phone);
}

// 显示结果
function displayResult(record, searchedPhone) {
    const resultSection = document.getElementById('resultSection');
    const resultContent = document.getElementById('resultContent');
    
    if (record) {
        resultContent.innerHTML = createRecordHTML(record);
    } else {
        resultContent.innerHTML = `
            <div class="no-record">
                <h4>查询结果</h4>
                <p>手机号：<strong>${searchedPhone}</strong></p>
                <p>未找到该手机号的犯罪记录信息</p>
                <p style="color: #27ae60; margin-top: 10px;">✓ 该号码暂无犯罪记录</p>
            </div>
        `;
    }
    
    resultSection.style.display = 'block';
    
    // 滚动到结果区域
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

// 创建记录显示HTML
function createRecordHTML(record) {
    const statusClass = record.hasCriminalRecord ? 'status-criminal' : 'status-clean';
    const statusText = record.hasCriminalRecord ? '有犯罪记录' : '无犯罪记录';
    
    let crimesHTML = '';
    if (record.hasCriminalRecord && record.crimes.length > 0) {
        crimesHTML = `
            <div class="crime-list">
                <strong>犯罪类型：</strong>
                <ul>
                    ${record.crimes.map(crime => `<li>${crime}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // 添加自首按钮（仅对有犯罪记录且状态不是"已自首"、"已判刑"、"服刑中"的记录显示）
    let surrenderBtnHTML = '';
    const cannotSurrenderStatuses = ['已自首', '已判刑', '服刑中'];
    if (record.hasCriminalRecord && !cannotSurrenderStatuses.includes(record.status)) {
        surrenderBtnHTML = `
            <div class="surrender-section">
                <button class="surrender-btn" onclick="showSurrenderForm('${record.phone}')">本人自首</button>
            </div>
        `;
    }
    
    return `
        <div class="record-item">
            <div class="record-header">
                <span class="phone-number">${record.phone}</span>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="record-details">
                <p><strong>姓名：</strong>${record.name}</p>
                <p><strong>状态：</strong>${record.status}</p>
                <p><strong>最后更新：</strong>${record.lastUpdate}</p>
                ${crimesHTML}
            </div>
            ${surrenderBtnHTML}
        </div>
    `;
}

// 显示加载状态
function showLoading() {
    const resultContent = document.getElementById('resultContent');
    resultContent.innerHTML = '<div class="loading">正在查询中...</div>';
    document.getElementById('resultSection').style.display = 'block';
}

// 显示错误信息
function showError(message) {
    const resultContent = document.getElementById('resultContent');
    resultContent.innerHTML = `
        <div style="color: #e74c3c; text-align: center; padding: 2rem;">
            <h4>错误</h4>
            <p>${message}</p>
        </div>
    `;
    document.getElementById('resultSection').style.display = 'block';
}

// 更新统计信息
function updateStats() {
    const totalRecords = criminalRecords.length;
    const criminalRecordsCount = criminalRecords.filter(record => record.hasCriminalRecord).length;
    const cleanRecordsCount = totalRecords - criminalRecordsCount;
    
    // 只在统计元素存在时更新
    const totalRecordsElement = document.getElementById('totalRecords');
    const criminalRecordsElement = document.getElementById('criminalRecords');
    const cleanRecordsElement = document.getElementById('cleanRecords');
    
    if (totalRecordsElement) {
        totalRecordsElement.textContent = totalRecords;
    }
    if (criminalRecordsElement) {
        criminalRecordsElement.textContent = criminalRecordsCount;
    }
    if (cleanRecordsElement) {
        cleanRecordsElement.textContent = cleanRecordsCount;
    }
}

// 显示自首表单
function showSurrenderForm(phone) {
    const record = findRecordByPhone(phone);
    if (!record) return;
    
    // 创建自首表单HTML
    const surrenderFormHTML = `
        <div id="surrenderModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>自首信息登记</h3>
                    <span class="close" onclick="closeSurrenderModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="surrender-info">
                        <p><strong>自首人信息：</strong></p>
                        <p>姓名：${record.name}</p>
                        <p>手机号：${record.phone}</p>
                        <p>当前状态：${record.status}</p>
                    </div>
                    
                    <form id="surrenderForm" onsubmit="handleSurrenderSubmit(event, '${record.phone}')">
                        <div class="form-group">
                            <label for="surrenderDate">自首日期：</label>
                            <input type="date" id="surrenderDate" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="surrenderLocation">自首地点：</label>
                            <input type="text" id="surrenderLocation" required placeholder="请输入自首的具体地点">
                        </div>
                        
                        <div class="form-group">
                            <label for="surrenderReason">自首原因说明：</label>
                            <textarea id="surrenderReason" required placeholder="请详细说明自首的原因和动机"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="additionalCrimes">补充犯罪事实（如有）：</label>
                            <textarea id="additionalCrimes" placeholder="如还有其他未记录的犯罪事实，请在此说明"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="surrenderAgreement" required>
                                本人确认以上信息属实，自愿自首并承担相应法律责任
                            </label>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="surrender-submit-btn">确认自首</button>
                            <button type="button" class="surrender-cancel-btn" onclick="closeSurrenderModal()">取消</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // 添加到页面
    document.body.insertAdjacentHTML('beforeend', surrenderFormHTML);
    
    // 设置默认日期为今天
    document.getElementById('surrenderDate').valueAsDate = new Date();
}

// 关闭自首模态框
function closeSurrenderModal() {
    const modal = document.getElementById('surrenderModal');
    if (modal) {
        modal.remove();
    }
}

// 处理自首表单提交
function handleSurrenderSubmit(event, phone) {
    event.preventDefault();
    
    const record = findRecordByPhone(phone);
    if (!record) return;
    
    const surrenderDate = document.getElementById('surrenderDate').value;
    const surrenderLocation = document.getElementById('surrenderLocation').value;
    const surrenderReason = document.getElementById('surrenderReason').value;
    const additionalCrimes = document.getElementById('additionalCrimes').value;
    
    // 更新记录状态
    record.status = '已自首';
    record.lastUpdate = new Date().toISOString().split('T')[0];
    
    // 添加自首信息
    record.surrenderInfo = {
        date: surrenderDate,
        location: surrenderLocation,
        reason: surrenderReason,
        additionalCrimes: additionalCrimes,
        surrenderTime: new Date().toISOString()
    };
    
    // 保存更新
    saveRecords();
    
    // 关闭模态框
    closeSurrenderModal();
    
    // 显示成功消息
    showSurrenderSuccess(record);
}

// 显示自首成功信息
function showSurrenderSuccess(record) {
    const successHTML = `
        <div class="surrender-success">
            <h4>自首登记成功！</h4>
            <div class="success-details">
                <p><strong>自首人：</strong>${record.name}</p>
                <p><strong>自首时间：</strong>${new Date().toLocaleString()}</p>
                <p><strong>处理结果：</strong>您的自首信息已成功登记，公安机关将尽快与您联系。</p>
                <p><strong>温馨提示：</strong>请保持手机畅通，配合公安机关的后续调查工作。</p>
            </div>
            <div class="success-actions">
                <button onclick="closeSuccessMessage()">确定</button>
            </div>
        </div>
    `;
    
    // 添加到页面
    document.body.insertAdjacentHTML('beforeend', successHTML);
}

// 关闭成功消息
function closeSuccessMessage() {
    const successMsg = document.querySelector('.surrender-success');
    if (successMsg) {
        successMsg.remove();
    }
    
    // 刷新查询结果
    const phoneInput = document.getElementById('phoneInput');
    if (phoneInput && phoneInput.value) {
        searchRecord();
    }
}

// 导出记录到JSON文件（管理员功能）
function exportRecords() {
    const dataStr = JSON.stringify(criminalRecords, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'criminal_records.json';
    link.click();
}

// 从JSON文件导入记录（管理员功能）
function importRecords(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedRecords = JSON.parse(e.target.result);
            if (Array.isArray(importedRecords)) {
                criminalRecords = importedRecords;
                saveRecords();
                updateStats();
                alert('记录导入成功！');
            } else {
                alert('文件格式错误！');
            }
        } catch (error) {
            alert('文件读取失败：' + error.message);
        }
    };
    reader.readAsText(file);
}

// 添加新记录（管理员功能）
function addNewRecord(phone, name, hasCriminalRecord, crimes = [], status = '') {
    const existingRecord = findRecordByPhone(phone);
    if (existingRecord) {
        return false; // 记录已存在
    }
    
    const newRecord = {
        phone: phone,
        name: name,
        hasCriminalRecord: hasCriminalRecord,
        crimes: crimes,
        lastUpdate: new Date().toISOString().split('T')[0],
        status: status || (hasCriminalRecord ? '待调查' : '清白')
    };
    
    criminalRecords.push(newRecord);
    saveRecords();
    updateStats();
    return true;
}

// 示例：添加一些测试记录
function addSampleRecords() {
    const sampleRecords = [
        {
            phone: "18800188000",
            name: "测试用户一",
            hasCriminalRecord: true,
            crimes: ["网络诈骗"],
            status: "调查中"
        },
        {
            phone: "18900189000",
            name: "测试用户二",
            hasCriminalRecord: false,
            crimes: [],
            status: "清白"
        }
    ];
    
    sampleRecords.forEach(record => {
        addNewRecord(record.phone, record.name, record.hasCriminalRecord, record.crimes, record.status);
    });
}

// 页面加载完成后初始化
window.onload = function() {
    // 确保统计信息正确显示
    updateStats();
};

// 管理员功能 - 渲染记录表格
function renderRecordsTable() {
    const tbody = document.getElementById('recordsTableBody');
    if (!tbody) return; // 如果不在管理员页面，直接返回
    
    tbody.innerHTML = '';
    
    criminalRecords.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.phone}</td>
            <td>${record.name}</td>
            <td>${record.hasCriminalRecord ? '有' : '无'}</td>
            <td>${record.status}</td>
            <td>${record.lastUpdate}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editRecord('${record.phone}')">编辑</button>
                <button class="action-btn delete-btn" onclick="deleteRecord('${record.phone}')">删除</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 管理员功能 - 编辑记录
function editRecord(phone) {
    const record = findRecordByPhone(phone);
    if (record) {
        // 设置全局编辑状态
        window.editingRecord = record;
        document.getElementById('editPhone').value = record.phone;
        document.getElementById('editName').value = record.name;
        document.getElementById('editHasRecord').value = record.hasCriminalRecord.toString();
        document.getElementById('editCrimes').value = record.crimes.join(', ');
        document.getElementById('editStatus').value = record.status;
        document.getElementById('addRecordForm').classList.remove('hidden');
    }
}

// 管理员功能 - 删除记录
function deleteRecord(phone) {
    if (confirm('确定要删除这条记录吗？')) {
        criminalRecords = criminalRecords.filter(record => record.phone !== phone);
        saveRecords();
        renderRecordsTable();
        updateStats();
        alert('记录删除成功！');
    }
}

// 管理员功能 - 处理表单提交
function handleFormSubmit(event) {
    event.preventDefault();
    
    const phone = document.getElementById('editPhone').value;
    const name = document.getElementById('editName').value;
    const hasCriminalRecord = document.getElementById('editHasRecord').value === 'true';
    const crimesText = document.getElementById('editCrimes').value;
    const status = document.getElementById('editStatus').value;
    
    const crimes = crimesText.split(',').map(crime => crime.trim()).filter(crime => crime);
    
    if (window.editingRecord) {
        // 编辑现有记录
        const index = criminalRecords.findIndex(record => record.phone === window.editingRecord.phone);
        if (index !== -1) {
            criminalRecords[index] = {
                phone: phone,
                name: name,
                hasCriminalRecord: hasCriminalRecord,
                crimes: crimes,
                lastUpdate: new Date().toISOString().split('T')[0],
                status: status
            };
        }
    } else {
        // 添加新记录
        const success = addNewRecord(phone, name, hasCriminalRecord, crimes, status);
        if (!success) {
            alert('该手机号的记录已存在！');
            return;
        }
    }
    
    saveRecords();
    renderRecordsTable();
    hideAddForm();
    alert('记录保存成功！');
}

// 管理员功能 - 显示添加记录表单
function showAddForm() {
    document.getElementById('addRecordForm').classList.remove('hidden');
    window.editingRecord = null;
    document.getElementById('recordForm').reset();
}

// 管理员功能 - 隐藏添加记录表单
function hideAddForm() {
    document.getElementById('addRecordForm').classList.add('hidden');
    window.editingRecord = null;
}

// 管理员功能 - 导入记录
function importRecords() {
    document.getElementById('importFile').click();
}

// 管理员功能 - 处理文件导入
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedRecords = JSON.parse(e.target.result);
            if (Array.isArray(importedRecords)) {
                criminalRecords = importedRecords;
                saveRecords();
                renderRecordsTable();
                updateStats();
                alert('记录导入成功！');
            } else {
                alert('文件格式错误！');
            }
        } catch (error) {
            alert('文件读取失败：' + error.message);
        }
    };
    reader.readAsText(file);
    
    // 重置文件输入
    event.target.value = '';
}

// 管理员功能 - 清空所有记录
function clearAllRecords() {
    if (confirm('确定要清空所有记录吗？此操作不可恢复！')) {
        criminalRecords = [];
        saveRecords();
        renderRecordsTable();
        updateStats();
        alert('所有记录已清空！');
    }
}