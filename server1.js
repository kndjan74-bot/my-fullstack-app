const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: [
        'https://www.soodcity.ir',
        'https://soodcity.ir', 
        'http://localhost:3000',
        'http://localhost:5000',
        'capacitor://localhost',
        'https://soodcityb.liara.run'
    ],
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// اتصال به MongoDB
mongoose.connect(process.env.MONGODB_URI )
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// 🔧 🔧 🔧 **ROUTES - این بخش را اصلاح کنید** 🔧 🔧 🔧
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth')); // ✅ این خط را اضافه کنید

// ✅ Route های تست
app.get('/api/test', (req, res) => {
    res.json({ 
        message: '✅ Backend API is working!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK',
        database: 'Connected',
        server: 'Running',
        timestamp: new Date().toISOString()
    });
});

// Route اصلی
app.get('/', (req, res) => {
    res.json({
        message: 'SoodCity Backend Server',
        version: '1.0.0',
        endpoints: {
            test: '/api/test',
            health: '/api/health',
            register: 'POST /api/users/register',
            login: 'POST /api/users/login',
            auth: 'GET /api/auth'  // ✅ این را هم اضافه کنید
        }
    });
});

// هندل کردن خطاهای 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        requested_url: req.originalUrl,
        method: req.method,
        available_endpoints: [
            'GET /api/test',
            'GET /api/health', 
            'POST /api/users/register',
            'POST /api/users/login',
            'GET /api/auth'  // ✅ این را هم اضافه کنید
        ]
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Web Frontend: ${process.env.WEB_URL}`);
    console.log(`📱 Mobile Frontend: ${process.env.MOBILE_URL}`);
    console.log(`🔗 Test URL: http://localhost:${PORT}/api/test`);
    console.log(`🔐 Auth URL: http://localhost:${PORT}/api/auth`); // ✅ اضافه کنید
});