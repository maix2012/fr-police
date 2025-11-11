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

    // 保存记录到文件（自动保存到record.json）
    async saveRecordsToFile() {
        try {
            const dataStr = JSON.stringify(this.records, null, 2);
            
            // 直接保存到record.json文件
            const response = await fetch('./record.json', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: dataStr
            });
            
            if (response.ok) {
                return { success: true, message: '记录已自动保存到record.json文件' };
            } else {
                return { success: false, message: '保存失败: ' + response.statusText };
            }
        } catch (error) {
            return { success: false, message: '保存文件失败: ' + error.message };
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
        try {
            // 检查手机号是否已存在
            if (this.findRecordByPhone(recordData.phone)) {
                return { success: false, message: '该手机号的记录已存在' };
            }

            const newRecord = {
                phone: recordData.phone,
                name: recordData.name,
                hasCriminalRecord: recordData.hasCriminalRecord,
                crimes: recordData.crimes || [],
                status: recordData.status,
                lastUpdate: new Date().toISOString().split('T')[0]
            };

            this.records.push(newRecord);
            
            // 自动保存到文件
            const saveResult = await this.saveRecordsToFile();
            if (saveResult.success) {
                return { success: true, message: '记录添加成功！数据已自动保存到record.json文件' };
            } else {
                return { success: false, message: '记录添加成功但保存失败: ' + saveResult.message };
            }
        } catch (error) {
            return { success: false, message: '添加记录失败: ' + error.message };
        }
    }

    // 更新记录
    async updateRecord(phone, recordData) {
        try {
            const index = this.records.findIndex(record => record.phone === phone);
            if (index === -1) {
                return { success: false, message: '记录不存在' };
            }

            this.records[index] = {
                phone: recordData.phone,
                name: recordData.name,
                hasCriminalRecord: recordData.hasCriminalRecord,
                crimes: recordData.crimes || [],
                status: recordData.status,
                lastUpdate: new Date().toISOString().split('T')[0]
            };

            // 自动保存到文件
            const saveResult = await this.saveRecordsToFile();
            if (saveResult.success) {
                return { success: true, message: '记录更新成功！数据已自动保存到record.json文件' };
            } else {
                return { success: false, message: '记录更新成功但保存失败: ' + saveResult.message };
            }
        } catch (error) {
            return { success: false, message: '更新记录失败: ' + error.message };
        }
    }

    // 删除记录
    async deleteRecord(phone) {
        try {
            const initialLength = this.records.length;
            this.records = this.records.filter(record => record.phone !== phone);
            
            if (this.records.length < initialLength) {
                // 自动保存到文件
                const saveResult = await this.saveRecordsToFile();
                if (saveResult.success) {
                    return { success: true, message: '记录删除成功！数据已自动保存到record.json文件' };
                } else {
                    return { success: false, message: '记录删除成功但保存失败: ' + saveResult.message };
                }
            } else {
                return { success: false, message: '记录不存在' };
            }
        } catch (error) {
            return { success: false, message: '删除记录失败: ' + error.message };
        }
    }

    // 导出数据到JSON
    exportRecords() {
        const dataStr = JSON.stringify(this.records, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'criminal_records_export.json';
        link.click();
        
        return { success: true, message: '数据导出成功' };
    }

    // 导入数据
    importRecords(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedRecords = JSON.parse(e.target.result);
                    if (Array.isArray(importedRecords)) {
                        this.records = importedRecords;
                        resolve({ success: true, message: '数据导入成功' });
                    } else {
                        resolve({ success: false, message: '文件格式错误' });
                    }
                } catch (error) {
                    resolve({ success: false, message: '文件读取失败: ' + error.message });
                }
            };
            reader.readAsText(file);
        });
    }

    // 清空所有记录
    clearAllRecords() {
        this.records = [];
        return { success: true, message: '所有记录已清空' };
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