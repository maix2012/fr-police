// 管理员数据管理模块
class AdminDataManager {
    constructor() {
        this.records = [];
        this.initialized = false;
    }

    // 初始化数据
    async initialize() {
        if (!this.initialized) {
            await this.loadRecordsFromFile();
            this.initialized = true;
        }
    }

    // 从record.json文件加载数据
    async loadRecordsFromFile() {
        try {
            const response = await fetch('record.json');
            if (!response.ok) {
                throw new Error('无法加载犯罪记录数据文件');
            }
            this.records = await response.json();
            console.log('管理员数据加载成功:', this.records.length, '条记录');
        } catch (error) {
            console.error('加载犯罪记录数据失败:', error);
            this.records = [];
        }
    }

    // 保存记录到后端服务器
    async saveRecordsToFile() {
        try {
            const dataStr = JSON.stringify(this.records, null, 2);
            
            // 注意：这里是向一个假设的后端API端点发送请求
            // 你需要一个后端服务来接收这个请求并写入文件或数据库
            const response = await fetch('/api/records', {
                method: 'POST', // 通常使用POST或PUT来更新/替换整个数据集
                headers: {
                    'Content-Type': 'application/json',
                },
                body: dataStr
            });
            
            if (response.ok) {
                return { success: true, message: '记录已成功保存到服务器' };
            } else {
                const errorText = await response.text();
                return { success: false, message: `保存失败: ${response.status} ${response.statusText} - ${errorText}` };
            }
        } catch (error) {
            return { success: false, message: '保存请求失败: ' + error.message };
        }
    }

    // 获取所有记录
    getAllRecords() {
        return this.records;
    }

    // 根据手机号查找记录
    findRecordByPhone(phone) {
        return this.records.find(record => record.phone === phone);
    }

    // 添加新记录
    async addRecord(recordData) {
        if (this.findRecordByPhone(recordData.phone)) {
            return { success: false, message: '该手机号的记录已存在' };
        }

        const newRecord = {
            ...recordData,
            crimes: recordData.crimes || [],
            lastUpdate: new Date().toISOString().split('T')[0]
        };

        this.records.push(newRecord);
        
        const saveResult = await this.saveRecordsToFile();
        if (saveResult.success) {
            return { success: true, message: '记录添加成功！数据已自动保存。' };
        } else {
            // 如果保存失败，可以选择回滚添加操作
            this.records.pop(); 
            return { success: false, message: `记录添加失败: ${saveResult.message}` };
        }
    }

    // 更新记录
    async updateRecord(phone, recordData) {
        const index = this.records.findIndex(record => record.phone === phone);
        if (index === -1) {
            return { success: false, message: '记录不存在' };
        }
        
        // 如果手机号被修改，需检查新手机号是否已存在（不包括当前记录自身）
        if (recordData.phone && recordData.phone !== phone) {
            const existing = this.findRecordByPhone(recordData.phone);
            if (existing) {
                return { success: false, message: '更新失败，新的手机号已被其他记录占用' };
            }
        }

        const originalRecord = this.records[index];
        this.records[index] = {
            ...originalRecord,
            ...recordData,
            lastUpdate: new Date().toISOString().split('T')[0]
        };

        const saveResult = await this.saveRecordsToFile();
        if (saveResult.success) {
            return { success: true, message: '记录更新成功！数据已自动保存。' };
        } else {
            // 如果保存失败，回滚更新操作
            this.records[index] = originalRecord;
            return { success: false, message: `记录更新失败: ${saveResult.message}` };
        }
    }

    // 删除记录
    async deleteRecord(phone) {
        const recordIndex = this.records.findIndex(record => record.phone === phone);
        if (recordIndex === -1) {
            return { success: false, message: '记录不存在' };
        }
        
        const deletedRecord = this.records[recordIndex];
        this.records.splice(recordIndex, 1);

        const saveResult = await this.saveRecordsToFile();
        if (saveResult.success) {
            return { success: true, message: '记录删除成功！数据已自动保存。' };
        } else {
            // 如果保存失败，回滚删除操作
            this.records.splice(recordIndex, 0, deletedRecord);
            return { success: false, message: `记录删除失败: ${saveResult.message}` };
        }
    }

    // 导出数据到JSON
    exportRecords() {
        try {
            const dataStr = JSON.stringify(this.records, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = 'criminal_records_export.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            
            return { success: true, message: '数据导出成功' };
        } catch (error) {
            return { success: false, message: '导出失败: ' + error.message };
        }
    }

    // 导入数据
    importRecords(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const importedRecords = JSON.parse(e.target.result);
                    if (!Array.isArray(importedRecords)) {
                        resolve({ success: false, message: '文件格式错误，需要一个JSON数组' });
                        return;
                    }
                    
                    const originalRecords = this.records;
                    this.records = importedRecords;
                    
                    const saveResult = await this.saveRecordsToFile();
                    if(saveResult.success) {
                        resolve({ success: true, message: '数据导入并保存成功' });
                    } else {
                        // 如果保存失败，回滚导入操作
                        this.records = originalRecords;
                        resolve({ success: false, message: `数据导入成功但保存失败: ${saveResult.message}` });
                    }
                } catch (error) {
                    resolve({ success: false, message: '文件解析失败: ' + error.message });
                }
            };
            reader.onerror = () => {
                resolve({ success: false, message: '文件读取失败' });
            };
            reader.readAsText(file);
        });
    }

    // 清空所有记录
    async clearAllRecords() {
        if (this.records.length === 0) {
           return { success: true, message: '记录已经是空的' };
        }
        
        const originalRecords = [...this.records];
        this.records = [];

        const saveResult = await this.saveRecordsToFile();
        if(saveResult.success) {
            return { success: true, message: '所有记录已清空并已保存' };
        } else {
             // 如果保存失败，回滚清空操作
            this.records = originalRecords;
            return { success: false, message: `清空操作失败: ${saveResult.message}` };
        }
    }

    // 获取统计信息
    getStats() {
        const totalRecords = this.records.length;
        const criminalRecordsCount = this.records.filter(record => record.hasCriminalRecord).length;
        const cleanRecordsCount = totalRecords - criminalRecordsCount;
        
        return {
            totalRecords,
            criminalRecordsCount,
            cleanRecordsCount
        };
    }
}

// 创建全局数据管理器实例
const adminDataManager = new AdminDataManager();
