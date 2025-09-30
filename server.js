const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: [process.env.WEB_URL,      // دامنه Netlify شما
             process.env.MOBILE_URL,
             'http://localhost:3000',
              'http://localhost:5000', 
              'capacitor://localhost'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// اتصال به MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shared_app_database', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// مدل داده
const Data = require('./models/User');

// Routes
app.use('/api/data', require('./routes/users'));
app.use('/api/users', require('./routes/users'));

// سرویس دهی فایل‌های استاتیک
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
     console.log(`🌐 Web Frontend: ${process.env.WEB_URL}`);
    console.log(`📱 Mobile Frontend: ${process.env.MOBILE_URL}`);
});


