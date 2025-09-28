const express = require('express');
const router = express.Router();
const Data = require('../models/Data');

// ایجاد داده جدید
router.post('/', async (req, res) => {
    try {
        const { title, content, category, priority } = req.body;
        
        const newData = new Data({
            title,
            content,
            category,
            priority
        });
        
        await newData.save();
        res.status(201).json({
            success: true,
            message: 'داده با موفقیت ذخیره شد',
            data: newData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'خطا در ذخیره داده',
            error: error.message
        });
    }
});

// دریافت همه داده‌ها
router.get('/', async (req, res) => {
    try {
        const data = await Data.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: data.length,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'خطا در دریافت داده',
            error: error.message
        });
    }
});

// حذف داده
router.delete('/:id', async (req, res) => {
    try {
        const data = await Data.findByIdAndDelete(req.params.id);
        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'داده پیدا نشد'
            });
        }
        
        res.json({
            success: true,
            message: 'داده با موفقیت حذف شد'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'خطا در حذف داده',
            error: error.message
        });
    }
});

module.exports = router;