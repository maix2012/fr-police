const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = 3000;

// 中间件
app.use(express.json());
app.use(express.static('.'));

// 保存记录的路由
app.post('/save-records', async (req, res) => {
    try {
        const records = req.body;
        const filePath = path.join(__dirname, 'record.json');
        
        // 将数据写入文件
        await fs.writeFile(filePath, JSON.stringify(records, null, 2));
        
        res.status(200).json({ success: true, message: '记录已成功保存' });
    } catch (error) {
        console.error('保存文件错误:', error);
        res.status(500).json({ success: false, message: '保存失败: ' + error.message });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('管理员界面: http://localhost:${PORT}/admin.html');
});