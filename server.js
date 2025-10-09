const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('mongoose');
const webPush = require('web-push');

// ==================== تنظیمات Web Push ====================
// کلیدهای VAPID باید در محیط واقعی از طریق متغیرهای محیطی مدیریت شوند
const publicVapidKey = process.env.PUBLIC_VAPID_KEY || 'BBtob9tbvIL8ROQEg_5iwoj7HwMczCn1274nfFNBU-RQ2c7Wahp9YoCrijh5vFlO704Sz_ocBgjEX54GLh7XhZE';
const privateVapidKey = process.env.PRIVATE_VAPID_KEY || 'GaWpjdeMh_VCel7lrV2jDVYLQRVCkmA3rNjeEKfee5s'; // این کلید را باید مخفی نگه دارید

webPush.setVapidDetails(
  'mailto:your-email@example.com', // یک ایمیل برای تماس
  publicVapidKey,
  privateVapidKey
);

// ==================== تابع کمکی برای ارسال نوتیفیکیشن ====================
const sendPushNotification = async (userId, payload) => {
    try {
        const user = await User.findOne({ id: userId });

        if (user && user.subscription) {
            const notificationPayload = JSON.stringify(payload);
            console.log(`🚀 ارسال نوتیفیکیشن به ${user.fullname}`);
            await webPush.sendNotification(user.subscription, notificationPayload);
            console.log(`✅ نوتیفیکیشن با موفقیت به ${user.fullname} ارسال شد.`);
        } else {
            console.log(`⚠️ کاربر با شناسه ${userId} یافت نشد یا اشتراک نوتیفیکیشن ندارد.`);
        }
    } catch (error) {
        console.error(`❌ خطا در ارسال نوتیفیکیشن به کاربر ${userId}:`, error.body || error.message);
        // اگر اشتراک منقضی شده باشد، آن را از دیتابیس حذف می‌کنیم
        if (error.statusCode === 410 || error.statusCode === 404) {
            console.log('🗑️ حذف اشتراک نامعتبر برای کاربر:', userId);
            await User.findOneAndUpdate({ id: userId }, { $set: { subscription: null } });
        }
    }
};

// تابع کمکی برای ارسال نوتیفیکیشن به همه کاربران مشترک
const broadcastToAll = async (payload) => {
    try {
        const usersWithSubscriptions = await User.find({ subscription: { $ne: null } });
        console.log(`📢 در حال ارسال پیام به ${usersWithSubscriptions.length} کاربر.`);
        
        const notificationPayload = JSON.stringify(payload);
        
        const promises = usersWithSubscriptions.map(user => 
            webPush.sendNotification(user.subscription, notificationPayload)
                .catch(error => {
                    console.error(`❌ ارسال پیام به کاربر ${user.id} ناموفق بود:`, error.body || error.message);
                    // حذف اشتراک‌های منقضی شده
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        console.log('🗑️ حذف اشتراک منقضی شده برای کاربر:', user.id);
                        return User.updateOne({ id: user.id }, { $set: { subscription: null } });
                    }
                })
        );
        
        await Promise.all(promises);
        console.log('✅ ارسال پیام همگانی تکمیل شد.');
    } catch (error) {
        console.error('💥 خطای بحرانی در ارسال پیام همگانی:', error);
    }
};


const app = express();

// اتصال به MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://root:7wVUQin6tGAAJ0nQiF9eA25x@sabalan.liara.cloud:32460/my-app?authSource=admin', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ متصل به MongoDB شد'))
.catch(err => console.error('❌ خطای اتصال به MongoDB:', err));

// ==================== مدل شمارنده برای ID عددی ====================
const CounterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', CounterSchema);

const getNextSequence = async (name) => {
    const counter = await Counter.findByIdAndUpdate(
        name,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
};

// ==================== مدل‌های دیتابیس با ID عددی ====================
const UserSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    role: { type: String, required: true, enum: ['greenhouse', 'sorting', 'driver', 'farmer', 'buyer'] },
    fullname: { type: String, required: true },
    province: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    address: { type: String, default: '' },
    licensePlate: { type: String, default: '' },
    location: {
        lat: { type: Number, default: 35.6892 },
        lng: { type: Number, default: 51.3890 }
    },
    emptyBaskets: { type: Number, default: 0 },
    loadCapacity: { type: Number, default: 0 },
    dailyStatusSubmitted: { type: Boolean, default: false },
    lastStatusUpdate: { type: Date },
    createdAt: { type: Date, default: Date.now },
    subscription: { type: Object, default: null }
});

const ConnectionSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    sourceId: { type: Number, required: true },
    sourceName: { type: String, required: true },
    sourceRole: { type: String, required: true },
    sourcePhone: { type: String, required: true },
    sourceLicensePlate: { type: String, default: '' },
    sourceAddress: { type: String, default: '' },
    targetId: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    suspended: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const RequestSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    greenhouseId: { type: Number, required: true },
    greenhouseName: { type: String, required: true },
    greenhousePhone: { type: String, required: true },
    greenhouseAddress: { type: String, required: true },
    sortingCenterId: { type: Number, required: true },
    sortingCenterName: { type: String, required: true },
    driverId: { type: Number },
    driverName: { type: String },
    driverPhone: { type: String },
    driverLicensePlate: { type: String },
    type: { type: String, enum: ['empty', 'full', 'delivered_basket'], required: true },
    quantity: { type: Number, required: true },
    description: { type: String, default: '' },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    status: { 
        type: String, 
        enum: ['pending', 'assigned', 'in_progress', 'in_progress_to_sorting', 'completed', 'rejected'], 
        default: 'pending' 
    },
    isPickupConfirmed: { type: Boolean, default: false },
    isConsolidated: { type: Boolean, default: false },
    rejectionReason: { type: String },
    assignedAt: { type: Date },
    acceptedAt: { type: Date },
    completedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    adId: { type: Number, required: true },
    senderId: { type: Number, required: true },
    senderName: { type: String, required: true },
    recipientId: { type: Number, required: true },
    recipientName: { type: String, required: true },
    content: { type: String, default: '' },
    image: { type: String },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const AdSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    product: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    emoji: { type: String, required: true },
    image: { type: String },
    adType: { type: String, enum: ['supply', 'demand'], required: true },
    seller: { type: String },
    sellerId: { type: Number },
    buyer: { type: String },
    buyerId: { type: Number },
    date: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// ایجاد مدل‌ها
const User = mongoose.model('User', UserSchema);
const Connection = mongoose.model('Connection', ConnectionSchema);
const Request = mongoose.model('Request', RequestSchema);
const Message = mongoose.model('Message', MessageSchema);
const Ad = mongoose.model('Ad', AdSchema);

// ==================== Middleware ====================
app.use((req, res, next) => {
    console.log(`📡 Request: ${req.method} ${req.url} from ${req.headers.origin || 'unknown'} - IP: ${req.ip}`);
    next();
});

app.use(cors({
    origin: [
        'https://www.soodcity.ir',
        'https://soodcity.ir', 
        'http://localhost:3000',
        'http://localhost:5000',
        'capacitor://localhost',
        'https://soodcityb.liara.run',
        'http://192.168.1.1', // برای شبکه‌های محلی موبایل
        'http://10.0.2.2'     // برای شبیه‌ساز اندروید
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-auth-token']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'کلید-رمز-جی-دبلیو-تی-شما-در-محیط-تولید-تغییر-کند';

// میدلور احراز هویت
const auth = async (req, res, next) => {
    const token = req.header('x-auth-token');
    
    if (!token) {
        console.error('No token provided for', req.url);
        return res.status(401).json({ 
            success: false, 
            message: 'توکن وجود ندارد، دسترسی غیرمجاز' 
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Invalid token for', req.url, err.message);
        res.status(401).json({ 
            success: false, 
            message: 'توکن معتبر نیست' 
        });
    }
};

// ==================== مسیرهای اصلی API ====================

// === بررسی سلامت ===
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API سودسیتی در حال اجراست!',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'متصل' : 'قطع'
    });
});

// === کاربران ===
app.get('/api/users', auth, async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 });
        res.json({
            success: true,
            users: users.map(u => ({
                id: u.id,
                role: u.role,
                fullname: u.fullname,
                province: u.province,
                phone: u.phone,
                address: u.address,
                licensePlate: u.licensePlate,
                location: u.location,
                emptyBaskets: u.emptyBaskets || 0,
                loadCapacity: u.loadCapacity || 0
            }))
        });
    } catch (error) {
        console.error('خطای دریافت کاربران:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در دریافت کاربران'
        });
    }
});

app.post('/api/users/register', async (req, res) => {
    try {
        const { role, fullname, province, phone, password, address, licensePlate } = req.body;

        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'کاربری با این شماره تلفن قبلاً ثبت نام کرده است'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            id: await getNextSequence('user'),
            role,
            fullname,
            province,
            phone,
            password: hashedPassword,
            address: address || '',
            licensePlate: licensePlate || ''
        });

        await newUser.save();

        const token = jwt.sign(
            { id: newUser.id, phone: newUser.phone, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: newUser.id,
                role: newUser.role,
                fullname: newUser.fullname,
                province: newUser.province,
                phone: newUser.phone,
                address: newUser.address,
                licensePlate: newUser.licensePlate,
                location: newUser.location,
                emptyBaskets: newUser.emptyBaskets,
                loadCapacity: newUser.loadCapacity
            }
        });

    } catch (error) {
        console.error('خطای ثبت نام:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در ثبت نام'
        });
    }
});

app.post('/api/users/login', async (req, res) => {
    try {
        const { phone, password } = req.body;

        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'اطلاعات ورود نامعتبر است'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'اطلاعات ورود نامعتبر است'
            });
        }

        const token = jwt.sign(
            { id: user.id, phone: user.phone, role: user.role },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                role: user.role,
                fullname: user.fullname,
                province: user.province,
                phone: user.phone,
                address: user.address,
                licensePlate: user.licensePlate,
                location: user.location,
                emptyBaskets: user.emptyBaskets || 0,
                loadCapacity: user.loadCapacity || 0
            }
        });

    } catch (error) {
        console.error('خطای ورود:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در ورود'
        });
    }
});

app.get('/api/users/auth', auth, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'کاربر یافت نشد'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                role: user.role,
                fullname: user.fullname,
                province: user.province,
                phone: user.phone,
                address: user.address,
                licensePlate: user.licensePlate,
                location: user.location,
                emptyBaskets: user.emptyBaskets || 0,
                loadCapacity: user.loadCapacity || 0
            }
        });
    } catch (error) {
        console.error('خطای احراز هویت:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در احراز هویت'
        });
    }
});

app.put('/api/users', auth, async (req, res) => {
    try {
        const { location, emptyBaskets, loadCapacity, address } = req.body;
        
        const updatedUser = await User.findOneAndUpdate(
            { id: req.user.id },
            {
                ...(location && { location }),
                ...(emptyBaskets !== undefined && { emptyBaskets }),
                ...(loadCapacity !== undefined && { loadCapacity }),
                ...(address && { address })
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'کاربر یافت نشد'
            });
        }

        res.json({
            success: true,
            user: {
                id: updatedUser.id,
                role: updatedUser.role,
                fullname: updatedUser.fullname,
                province: updatedUser.province,
                phone: updatedUser.phone,
                address: updatedUser.address,
                licensePlate: updatedUser.licensePlate,
                location: updatedUser.location,
                emptyBaskets: updatedUser.emptyBaskets,
                loadCapacity: updatedUser.loadCapacity
            }
        });

    } catch (error) {
        console.error('خطای بروزرسانی کاربر:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در بروزرسانی کاربر'
        });
    }
});

app.put('/api/users/password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findOne({ id: req.user.id });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'کاربر یافت نشد'
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'رمز عبور فعلی نادرست است'
            });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({
            success: true,
            message: 'رمز عبور با موفقیت بروزرسانی شد'
        });

    } catch (error) {
        console.error('خطای تغییر رمز عبور:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در تغییر رمز عبور'
        });
    }
});

app.delete('/api/users', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        await Promise.all([
            User.findOneAndDelete({ id: userId }),
            Connection.deleteMany({ $or: [{ sourceId: userId }, { targetId: userId }] }),
            Request.deleteMany({ 
                $or: [
                    { greenhouseId: userId }, 
                    { driverId: userId }, 
                    { sortingCenterId: userId }
                ] 
            }),
            Message.deleteMany({ 
                $or: [
                    { senderId: userId }, 
                    { recipientId: userId }
                ] 
            }),
            Ad.deleteMany({ 
                $or: [
                    { sellerId: userId }, 
                    { buyerId: userId }
                ] 
            })
        ]);

        res.json({
            success: true,
            message: 'حساب کاربری با موفقیت حذف شد'
        });

    } catch (error) {
        console.error('خطای حذف کاربر:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در حذف کاربر'
        });
    }
});

// === آگهی‌ها ===
app.get('/api/ads', auth, async (req, res) => {
    try {
        const ads = await Ad.find();
        
        res.json({
            success: true,
            ads: ads.map(ad => ({
                id: ad.id,
                product: ad.product,
                category: ad.category,
                quantity: ad.quantity,
                price: ad.price,
                emoji: ad.emoji,
                image: ad.image,
                adType: ad.adType,
                seller: ad.seller,
                sellerId: ad.sellerId,
                buyer: ad.buyer,
                buyerId: ad.buyerId,
                date: ad.date,
                createdAt: ad.createdAt
            }))
        });
    } catch (error) {
        console.error('خطای دریافت آگهی‌ها:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در دریافت آگهی‌ها'
        });
    }
});

app.post('/api/ads', auth, async (req, res) => {
    try {
        const { product, category, quantity, price, emoji, image, adType, seller, sellerId, buyer, buyerId } = req.body;

        const newAd = new Ad({
            id: await getNextSequence('ad'),
            product,
            category,
            quantity: parseInt(quantity),
            price: parseInt(price),
            emoji,
            image: image || null,
            adType,
            seller: adType === 'supply' ? seller : undefined,
            sellerId: adType === 'supply' ? sellerId : undefined,
            buyer: adType === 'demand' ? buyer : undefined,
            buyerId: adType === 'demand' ? buyerId : undefined,
            date: new Date().toLocaleDateString('fa-IR')
        });

        await newAd.save();

        res.status(201).json({
            success: true,
            ad: newAd
        });

    } catch (error) {
        console.error('خطای ایجاد آگهی:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در ایجاد آگهی'
        });
    }
});

app.delete('/api/ads/:id', auth, async (req, res) => {
    try {
        const adId = parseInt(req.params.id);
        const ad = await Ad.findOne({ id: adId });

        if (!ad) {
            return res.status(404).json({
                success: false,
                message: 'آگهی یافت نشد'
            });
        }

        if ((ad.adType === 'supply' && ad.sellerId !== req.user.id) || 
            (ad.adType === 'demand' && ad.buyerId !== req.user.id)) {
            return res.status(403).json({
                success: false,
                message: 'مجوز حذف این آگهی را ندارید'
            });
        }

        await Promise.all([
            Ad.findOneAndDelete({ id: adId }),
            Message.deleteMany({ adId: adId })
        ]);

        res.json({
            success: true,
            message: 'آگهی و پیام‌های مرتبط با موفقیت حذف شدند'
        });

    } catch (error) {
        console.error('خطای حذف آگهی:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در حذف آگهی'
        });
    }
});

// === پیام‌ها ===
app.get('/api/messages', auth, async (req, res) => {
    try {
        const userMessages = await Message.find({
            $or: [
                { senderId: req.user.id },
                { recipientId: req.user.id }
            ]
        });

        res.json({
            success: true,
            messages: userMessages.map(msg => ({
                id: msg.id,
                adId: msg.adId,
                senderId: msg.senderId,
                senderName: msg.senderName,
                recipientId: msg.recipientId,
                recipientName: msg.recipientName,
                content: msg.content,
                image: msg.image,
                read: msg.read,
                createdAt: msg.createdAt
            }))
        });
    } catch (error) {
        console.error('خطای دریافت پیام‌ها:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در دریافت پیام‌ها'
        });
    }
});

app.post('/api/messages', auth, async (req, res) => {
    try {
        const { adId, senderId, senderName, recipientId, recipientName, content, image } = req.body;

        const newMessage = new Message({
            id: await getNextSequence('message'),
            adId: parseInt(adId),
            senderId,
            senderName,
            recipientId,
            recipientName,
            content,
            image: image || null
        });

        await newMessage.save();

        // ارسال نوتیفیکیشن به گیرنده
        const notificationPayload = {
            title: `پیام جدید از ${senderName}`,
            body: content || 'شما یک تصویر جدید دریافت کردید.',
        };
        sendPushNotification(recipientId, notificationPayload).catch(err => console.error("ارسال نوتیفیکیشن پیام ناموفق بود:", err));


        res.status(201).json({
            success: true,
            message: newMessage
        });

    } catch (error) {
        console.error('خطای ایجاد پیام:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در ایجاد پیام'
        });
    }
});

app.put('/api/messages/conversation/:conversationId/read', auth, async (req, res) => {
    try {
        const conversationId = req.params.conversationId;
        const [user1Id, user2Id] = conversationId.split('-').map(Number);

        await Message.updateMany(
            {
                recipientId: req.user.id,
                senderId: { $in: [user1Id, user2Id] },
                read: false
            },
            { $set: { read: true } }
        );

        res.json({
            success: true,
            message: 'مکالمه به عنوان خوانده شده علامت گذاری شد'
        });

    } catch (error) {
        console.error('خطای علامت گذاری مکالمه:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در علامت گذاری مکالمه'
        });
    }
});

app.delete('/api/messages/conversation/:conversationId', auth, async (req, res) => {
    try {
        const conversationId = req.params.conversationId;
        const [user1Id, user2Id] = conversationId.split('-').map(Number);

        const result = await Message.deleteMany({
            $or: [
                { senderId: user1Id, recipientId: user2Id },
                { senderId: user2Id, recipientId: user1Id }
            ]
        });

        res.json({
            success: true,
            message: `${result.deletedCount} پیام حذف شد`
        });

    } catch (error) {
        console.error('خطای حذف مکالمه:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در حذف مکالمه'
        });
    }
});

// === اتصالات ===
app.get('/api/connections', auth, async (req, res) => {
    try {
        console.log('📡 درخواست GET /api/connections - کاربر:', req.user.id);
        
        const connections = await Connection.find();
        
        console.log('✅ اتصالات یافت شده:', connections.length);
        
        res.json({
            success: true,
            connections: connections.map(conn => ({
                id: conn.id,
                sourceId: conn.sourceId,
                sourceName: conn.sourceName,
                sourceRole: conn.sourceRole,
                sourcePhone: conn.sourcePhone,
                sourceLicensePlate: conn.sourceLicensePlate,
                sourceAddress: conn.sourceAddress,
                targetId: conn.targetId,
                status: conn.status,
                suspended: conn.suspended,
                createdAt: conn.createdAt
            }))
        });
    } catch (error) {
        console.error('❌ خطای GET /api/connections:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در دریافت اتصالات'
        });
    }
});

app.post('/api/connections', auth, async (req, res) => {
    try {
        console.log('📡 درخواست POST /api/connections - داده:', JSON.stringify(req.body, null, 2));

        let { targetId } = req.body;

        // استخراج targetId از object اگر لازم باشد
        if (targetId && typeof targetId === 'object' && targetId.targetId) {
            console.log('🔧 استخراج targetId از object...');
            targetId = targetId.targetId;
        }

        if (!targetId && targetId !== 0) {
            return res.status(400).json({
                success: false,
                message: 'شناسه مقصد الزامی است'
            });
        }

        console.log('🎯 targetId نهایی:', targetId, 'نوع:', typeof targetId);

        const sourceUser = await User.findOne({ id: req.user.id });
        if (!sourceUser) {
            return res.status(404).json({
                success: false,
                message: 'کاربر مبدأ یافت نشد'
            });
        }

        console.log('✅ کاربر مبدأ:', sourceUser.fullname, '- نقش:', sourceUser.role);

        // **منطق اصلاح شده: استفاده از targetId ارسال شده**
        const targetUser = await User.findOne({ id: parseInt(targetId) });

        if (!targetUser) {
            console.error(`❌ کاربری با id: ${targetId} یافت نشد.`);
            return res.status(404).json({
                success: false,
                message: 'کاربر انتخاب شده معتبر نیست یا یافت نشد.'
            });
        }
        
        console.log('✅ اتصال به کاربر:', targetUser.fullname, '- id:', targetUser.id, '- نقش:', targetUser.role);

        // بررسی اتصال تکراری
        const existingConnection = await Connection.findOne({
            sourceId: req.user.id,
            targetId: parseInt(targetId)
        });

        if (existingConnection) {
            console.log('⚠️ اتصال تکراری');
            return res.status(400).json({
                success: false,
                message: 'قبلاً به این کاربر متصل شده‌اید'
            });
        }

        // ایجاد اتصال جدید
        const connectionData = {
            id: await getNextSequence('connection'),
            sourceId: req.user.id,
            sourceName: sourceUser.fullname,
            sourceRole: sourceUser.role,
            sourcePhone: sourceUser.phone,
            targetId: targetUser.id,
            status: 'pending'
        };

        // اضافه کردن اطلاعات اضافی
        if (sourceUser.role === 'driver' && sourceUser.licensePlate) {
            connectionData.sourceLicensePlate = sourceUser.licensePlate;
        } else if (sourceUser.role === 'greenhouse' && sourceUser.address) {
            connectionData.sourceAddress = sourceUser.address;
        }

        console.log('📝 ایجاد اتصال...');

        const newConnection = new Connection(connectionData);
        await newConnection.save();

        console.log('✅ اتصال ایجاد شد با ID:', newConnection.id);

        // ارسال نوتیفیکیشن به مرکز سورتینگ
        const notificationPayload = {
            title: 'درخواست اتصال جدید',
            body: `${sourceUser.fullname} می‌خواهد با شما متصل شود.`,
        };
        sendPushNotification(targetUser.id, notificationPayload).catch(err => console.error("ارسال نوتیفیکیشن اتصال ناموفق بود:", err));


        res.status(201).json({
            success: true,
            connection: newConnection,
            message: 'درخواست اتصال با موفقیت ارسال شد'
        });

    } catch (error) {
        console.error('💥 خطا در ایجاد اتصال:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور: ' + error.message
        });
    }
});

// 🔧 **ENDPOINT جدید برای تأیید اتصال**
app.put('/api/connections/:id/approve', auth, async (req, res) => {
    try {
        const connectionId = parseInt(req.params.id);
        console.log('📡 درخواست تأیید اتصال:', connectionId, '- کاربر:', req.user.id);

        const connection = await Connection.findOne({ id: connectionId });
        if (!connection) {
            return res.status(404).json({
                success: false,
                message: 'اتصال یافت نشد'
            });
        }

        // بررسی اینکه کاربر فعلی مرکز سورتینگ است و اتصال برای اوست
        if (connection.targetId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'فقط مرکز سورتینگ می‌تواند اتصال را تأیید کند'
            });
        }

        const updatedConnection = await Connection.findOneAndUpdate(
            { id: connectionId },
            { status: 'approved' },
            { new: true }
        );

        console.log('✅ اتصال تأیید شد:', updatedConnection.id);

        // ارسال نوتیفیکیشن به کاربر درخواست‌دهنده
        const notificationPayload = {
            title: 'اتصال شما تایید شد',
            body: `مرکز سورتینگ ${req.user.fullname} درخواست اتصال شما را تایید کرد.`,
        };
        sendPushNotification(updatedConnection.sourceId, notificationPayload).catch(err => console.error("ارسال نوتیفیکیشن تایید اتصال ناموفق بود:", err));


        res.json({
            success: true,
            connection: updatedConnection,
            message: 'اتصال با موفقیت تأیید شد'
        });

    } catch (error) {
        console.error('❌ خطای تأیید اتصال:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در تأیید اتصال'
        });
    }
});

// 🔧 **ENDPOINT جدید برای رد اتصال**
app.put('/api/connections/:id/reject', auth, async (req, res) => {
    try {
        const connectionId = parseInt(req.params.id);
        console.log('📡 درخواست رد اتصال:', connectionId, '- کاربر:', req.user.id);

        const connection = await Connection.findOne({ id: connectionId });
        if (!connection) {
            return res.status(404).json({
                success: false,
                message: 'اتصال یافت نشد'
            });
        }

        if (connection.targetId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'فقط مرکز سورتینگ می‌تواند اتصال را رد کند'
            });
        }

        await Connection.findOneAndDelete({ id: connectionId });

        console.log('✅ اتصال رد شد:', connectionId);

        res.json({
            success: true,
            message: 'اتصال با موفقیت رد شد'
        });

    } catch (error) {
        console.error('❌ خطای رد اتصال:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در رد اتصال'
        });
    }
});

app.put('/api/connections/:id', auth, async (req, res) => {
    try {
        const connectionId = parseInt(req.params.id);
        const { status, suspended } = req.body;

        const connection = await Connection.findOne({ id: connectionId });
        if (!connection) {
            return res.status(404).json({
                success: false,
                message: 'اتصال یافت نشد'
            });
        }

        // بررسی مجوز - فقط مرکز سورتینگ می‌تواند اتصال‌های دریافتی را تأیید/رد کند
        if (connection.targetId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'مجوز بروزرسانی این اتصال را ندارید'
            });
        }

        const updatedConnection = await Connection.findOneAndUpdate(
            { id: connectionId },
            {
                ...(status && { status }),
                ...(suspended !== undefined && { suspended })
            },
            { new: true }
        );

        res.json({
            success: true,
            connection: updatedConnection
        });

    } catch (error) {
        console.error('خطای بروزرسانی اتصال:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در بروزرسانی اتصال'
        });
    }
});

app.delete('/api/connections/:id', auth, async (req, res) => {
    try {
        const connectionId = parseInt(req.params.id);
        const connection = await Connection.findOne({ id: connectionId });

        if (!connection) {
            return res.status(404).json({
                success: false,
                message: 'اتصال یافت نشد'
            });
        }

        if (connection.sourceId !== req.user.id && connection.targetId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'مجوز حذف این اتصال را ندارید'
            });
        }

        await Connection.findOneAndDelete({ id: connectionId });

        res.json({
            success: true,
            message: 'اتصال با موفقیت حذف شد'
        });

    } catch (error) {
        console.error('خطای حذف اتصال:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در حذف اتصال'
        });
    }
});

// === درخواست‌ها ===
app.get('/api/requests', auth, async (req, res) => {
    try {
        const requests = await Request.find();
        
        res.json({
            success: true,
            requests: requests.map(req => ({
                id: req.id,
                greenhouseId: req.greenhouseId,
                greenhouseName: req.greenhouseName,
                greenhousePhone: req.greenhousePhone,
                greenhouseAddress: req.greenhouseAddress,
                sortingCenterId: req.sortingCenterId,
                sortingCenterName: req.sortingCenterName,
                driverId: req.driverId,
                driverName: req.driverName,
                driverPhone: req.driverPhone,
                driverLicensePlate: req.driverLicensePlate,
                type: req.type,
                quantity: req.quantity,
                description: req.description,
                location: req.location,
                status: req.status,
                isPickupConfirmed: req.isPickupConfirmed,
                isConsolidated: req.isConsolidated,
                rejectionReason: req.rejectionReason,
                assignedAt: req.assignedAt,
                acceptedAt: req.acceptedAt,
                completedAt: req.completedAt,
                createdAt: req.createdAt
            }))
        });
    } catch (error) {
        console.error('خطای دریافت درخواست‌ها:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در دریافت درخواست‌ها'
        });
    }
});

app.post('/api/requests', auth, async (req, res) => {
    try {
        const { greenhouseId, greenhouseName, greenhousePhone, greenhouseAddress, sortingCenterId, sortingCenterName, type, quantity, description, location } = req.body;

        const newRequest = new Request({
            id: await getNextSequence('request'),
            greenhouseId,
            greenhouseName,
            greenhousePhone,
            greenhouseAddress,
            sortingCenterId,
            sortingCenterName,
            type,
            quantity: parseInt(quantity),
            description: description || '',
            location,
            status: 'pending'
        });

        await newRequest.save();

        res.status(201).json({
            success: true,
            request: newRequest
        });

    } catch (error) {
        console.error('خطای ایجاد درخواست:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در ایجاد درخواست'
        });
    }
});

app.put('/api/requests/:id', auth, async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const updates = req.body;

        // Get the request state *before* any updates are applied to correctly calculate capacity changes.
        const originalRequest = await Request.findOne({ id: requestId });
        if (!originalRequest) {
            return res.status(404).json({ success: false, message: 'درخواست یافت نشد' });
        }

        // Handle driver capacity changes only if a driver is assigned and the status is changing.
        if (originalRequest.driverId && updates.status && updates.status !== originalRequest.status) {
            const driver = await User.findOne({ id: originalRequest.driverId });
            if (driver) {
                let driverUpdate = {};

                // LOGIC FOR DECREMENTING CAPACITY (WHEN STARTING A MISSION)
                if (updates.status === 'in_progress') {
                    if (originalRequest.type === 'empty') {
                        // Driver picks up empty baskets from sorting, their available empty baskets decrease.
                        driverUpdate = { $inc: { emptyBaskets: -originalRequest.quantity } };
                    } else if (originalRequest.type === 'full') {
                        // Driver picks up full baskets from greenhouse, their available load capacity decreases.
                        driverUpdate = { $inc: { loadCapacity: -originalRequest.quantity } };
                    }
                }
                // LOGIC FOR INCREMENTING/RESTORING CAPACITY (WHEN COMPLETING A MISSION)
                else if (updates.status === 'completed') {
                    if (originalRequest.type === 'empty') {
                        // Driver delivered empty baskets to greenhouse. Their load capacity is now free again.
                        driverUpdate = { $inc: { loadCapacity: originalRequest.quantity } };
                    } else if (originalRequest.type === 'full') {
                        // Driver delivered full baskets to greenhouse. They now have that many empty baskets.
                        driverUpdate = { $inc: { emptyBaskets: originalRequest.quantity } };
                    } else if (originalRequest.type === 'delivered_basket') {
                        // Driver delivered empty baskets back to sorting center. Their load capacity is now free.
                        // The quantity here represents the number of missions, which equals the number of baskets.
                        driverUpdate = { $inc: { loadCapacity: originalRequest.quantity } };
                    }
                }

                // Apply the update to the driver if there are changes.
                if (Object.keys(driverUpdate).length > 0) {
                    await User.findOneAndUpdate({ id: driver.id }, driverUpdate);
                    console.log(`✅ ظرفیت راننده ${driver.fullname} آپدیت شد:`, driverUpdate);
                }
            }
        }

        // Now, update the request itself with the new data.
        const updatedRequest = await Request.findOneAndUpdate(
            { id: requestId },
            updates,
            { new: true }
        );

        if (!updatedRequest) {
            // This case should ideally not be hit due to the check at the beginning, but it's a good safeguard.
            return res.status(404).json({ success: false, message: 'درخواست پس از آپدیت یافت نشد' });
        }

        // ارسال نوتیفیکیشن هنگام اختصاص راننده
        if (updatedRequest.status === 'assigned' && originalRequest.status !== 'assigned') {
            const notificationPayload = {
                title: 'ماموریت جدید برای شما',
                body: `یک ماموریت جدید از ${updatedRequest.greenhouseName} به شما اختصاص داده شد.`,
            };
            sendPushNotification(updatedRequest.driverId, notificationPayload).catch(err => console.error("ارسال نوتیفیکیشن اختصاص راننده ناموفق بود:", err));
        }

        // ارسال نوتیفیکیشن "خاموش" برای به‌روزرسانی لحظه‌ای UI در تایید دو مرحله‌ای
        if (updates.isPickupConfirmed && !originalRequest.isPickupConfirmed) {
            const silentPayload = { type: 'data-refresh', body: 'data has been updated' };
            
            // Find the other user in the transaction to notify them.
            const recipientId = req.user.id === originalRequest.driverId 
                ? originalRequest.greenhouseId 
                : originalRequest.driverId;
            
            if (recipientId) {
                console.log(`سیگنال رفرش برای کاربر ${recipientId} ارسال می‌شود.`);
                sendPushNotification(recipientId, silentPayload).catch(err => console.error("ارسال نوتیفیکیشن خاموش ناموفق بود:", err));
            }
        }

        // اگر ماموریت تکمیل شده باشد، به همه کاربران سیگنال رفرش بفرست
        if (updates.status === 'completed' && originalRequest.status !== 'completed') {
            console.log(`✅ ماموریت ${originalRequest.id} تکمیل شد. ارسال سیگنال رفرش به همه.`);
            const silentPayload = { type: 'data-refresh', body: 'mission completed' };
            broadcastToAll(silentPayload).catch(err => console.error("ارسال سیگنال رفرش همگانی ناموفق بود:", err));
        }

        res.json({
            success: true,
            request: updatedRequest
        });

    } catch (error) {
        console.error('خطای بروزرسانی درخواست:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در بروزرسانی درخواست'
        });
    }
});

app.delete('/api/requests/:id', auth, async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const request = await Request.findOne({ id: requestId });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'درخواست یافت نشد'
            });
        }

        if (request.greenhouseId !== req.user.id && request.sortingCenterId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'مجوز حذف این درخواست را ندارید'
            });
        }

        await Request.findOneAndDelete({ id: requestId });

        res.json({
            success: true,
            message: 'درخواست با موفقیت حذف شد'
        });

    } catch (error) {
        console.error('خطای حذف درخواست:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در حذف درخواست'
        });
    }
});

// === مسیرهای مرکز سورتینگ ===
app.get('/api/sorting/connection-requests', auth, async (req, res) => {
    try {
        if (req.user.role !== 'sorting') {
            return res.status(403).json({
                success: false,
                message: 'فقط مراکز سورتینگ می‌توانند به این مسیر دسترسی داشته باشند'
            });
        }

        const pendingConnections = await Connection.find({
            targetId: req.user.id,
            status: 'pending'
        });

        res.json({
            success: true,
            connectionRequests: pendingConnections
        });
    } catch (error) {
        console.error('خطای دریافت درخواست‌های اتصال سورتینگ:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در دریافت درخواست‌های اتصال'
        });
    }
});

app.get('/api/sorting/approved-connections', auth, async (req, res) => {
    try {
        if (req.user.role !== 'sorting') {
            return res.status(403).json({
                success: false,
                message: 'فقط مراکز سورتینگ می‌توانند به این مسیر دسترسی داشته باشند'
            });
        }

        const approvedConnections = await Connection.find({
            targetId: req.user.id,
            status: 'approved'
        });

        res.json({
            success: true,
            approvedConnections
        });
    } catch (error) {
        console.error('خطای دریافت اتصالات تأیید شده:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در دریافت اتصالات تأیید شده'
        });
    }
});

app.get('/api/sorting/transport-requests', auth, async (req, res) => {
    try {
        if (req.user.role !== 'sorting') {
            return res.status(403).json({
                success: false,
                message: 'فقط مراکز سورتینگ می‌توانند به این مسیر دسترسی داشته باشند'
            });
        }

        const transportRequests = await Request.find({
            sortingCenterId: req.user.id,
            status: 'pending'
        });

        res.json({
            success: true,
            transportRequests
        });
    } catch (error) {
        console.error('خطای دریافت درخواست‌های حمل و نقل:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در دریافت درخواست‌های حمل و نقل'
        });
    }
});

// === مسیرهای گلخانه ===
app.get('/api/greenhouse/sorting-centers', auth, async (req, res) => {
    try {
        if (req.user.role !== 'greenhouse') {
            return res.status(403).json({
                success: false,
                message: 'فقط گلخانه‌ها می‌توانند به این مسیر دسترسی داشته باشند'
            });
        }

        const sortingCenters = await User.find({ role: 'sorting' });
        
        res.json({
            success: true,
            sortingCenters: sortingCenters.map(sc => ({
                id: sc.id,
                fullname: sc.fullname,
                province: sc.province,
                phone: sc.phone,
                address: sc.address,
                location: sc.location
            }))
        });
    } catch (error) {
        console.error('خطای دریافت مراکز سورتینگ:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در دریافت مراکز سورتینگ'
        });
    }
});

app.get('/api/greenhouse/connections', auth, async (req, res) => {
    try {
        if (req.user.role !== 'greenhouse') {
            return res.status(403).json({
                success: false,
                message: 'فقط گلخانه‌ها می‌توانند به این مسیر دسترسی داشته باشند'
            });
        }

        const greenhouseConnections = await Connection.find({
            sourceId: req.user.id,
            sourceRole: 'greenhouse'
        });

        res.json({
            success: true,
            connections: greenhouseConnections
        });
    } catch (error) {
        console.error('خطای دریافت اتصالات گلخانه:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در دریافت اتصالات گلخانه'
        });
    }
});

// === مسیرهای راننده ===
app.get('/api/driver/sorting-centers', auth, async (req, res) => {
    try {
        if (req.user.role !== 'driver') {
            return res.status(403).json({
                success: false,
                message: 'فقط رانندگان می‌توانند به این مسیر دسترسی داشته باشند'
            });
        }

        const sortingCenters = await User.find({ role: 'sorting' });
        
        res.json({
            success: true,
            sortingCenters: sortingCenters.map(sc => ({
                id: sc.id,
                fullname: sc.fullname,
                province: sc.province,
                phone: sc.phone,
                address: sc.address,
                location: sc.location
            }))
        });
    } catch (error) {
        console.error('خطای دریافت مراکز سورتینگ راننده:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در دریافت مراکز سورتینگ'
        });
    }
});

app.get('/api/driver/connections', auth, async (req, res) => {
    try {
        if (req.user.role !== 'driver') {
            return res.status(403).json({
                success: false,
                message: 'فقط رانندگان می‌توانند به این مسیر دسترسی داشته باشند'
            });
        }

        const driverConnections = await Connection.find({
            sourceId: req.user.id,
            sourceRole: 'driver'
        });

        res.json({
            success: true,
            connections: driverConnections
        });
    } catch (error) {
        console.error('خطای دریافت اتصالات راننده:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در دریافت اتصالات راننده'
        });
    }
});

// تحویل تجمیعی
app.post('/api/requests/consolidate', auth, async (req, res) => {
    try {
        const { missionIds } = req.body;
        const driver = await User.findOne({ id: req.user.id });
        
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'راننده یافت نشد'
            });
        }

        const connection = await Connection.findOne({ 
            sourceId: req.user.id, 
            status: 'approved' 
        });
        const sortingCenter = connection ? await User.findOne({ id: connection.targetId }) : null;

        if (!sortingCenter) {
            return res.status(400).json({
                success: false,
                message: 'هیچ مرکز سورتینگ متصلی وجود ندارد'
            });
        }

        const newRequest = new Request({
            id: await getNextSequence('request'),
            type: 'delivered_basket',
            status: 'in_progress_to_sorting',
            driverId: req.user.id,
            driverName: driver.fullname,
            sortingCenterId: sortingCenter.id,
            sortingCenterName: sortingCenter.fullname,
            quantity: missionIds.length,
            description: 'تحویل مرکزی بارهای تکمیل شده',
            location: sortingCenter.location
        });

        await newRequest.save();

        await Request.updateMany(
            { id: { $in: missionIds } },
            { $set: { isConsolidated: true } }
        );

        res.status(201).json({
            success: true,
            request: newRequest
        });

    } catch (error) {
        console.error('خطای تحویل تجمیعی:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در تحویل تجمیعی'
        });
    }
});

// رد تحویل تجمیعی
app.post('/api/requests/:id/reject', auth, async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const { reason } = req.body;

        const updatedRequest = await Request.findOneAndUpdate(
            { id: requestId },
            {
                status: 'rejected',
                rejectionReason: reason,
                completedAt: new Date()
            },
            { new: true }
        );

        if (!updatedRequest) {
            return res.status(404).json({
                success: false,
                message: 'درخواست یافت نشد'
            });
        }

        res.json({
            success: true,
            request: updatedRequest
        });

    } catch (error) {
        console.error('خطای رد تحویل:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در رد تحویل'
        });
    }
});

// بررسی وجود کاربر با شماره تلفن (بدون نیاز به احراز هویت)
app.post('/api/users/check-phone', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, message: 'شماره تلفن الزامی است' });
        }
        const user = await User.findOne({ phone });
        if (user) {
            res.json({ success: true, exists: true });
        } else {
            res.json({ success: true, exists: false });
        }
    } catch (error) {
        console.error('خطای بررسی شماره تلفن:', error);
        res.status(500).json({ success: false, message: 'خطای سرور در بررسی شماره تلفن' });
    }
});

// بازنشانی رمز عبور
app.post('/api/users/reset-password', async (req, res) => {
    try {
        const { phone, newPassword } = req.body;
        const user = await User.findOne({ phone });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'کاربر یافت نشد'
            });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({
            success: true,
            message: 'رمز عبور با موفقیت بازنشانی شد'
        });

    } catch (error) {
        console.error('خطای بازنشانی رمز عبور:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در بازنشانی رمز عبور'
        });
    }
});

// === اشتراک نوتیفیکیشن ===
app.post('/api/subscribe', auth, async (req, res) => {
    try {
        const subscription = req.body;
        
        // Find the user and update their subscription
        const updatedUser = await User.findOneAndUpdate(
            { id: req.user.id },
            { $set: { subscription: subscription } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'کاربر یافت نشد' });
        }

        console.log(`✅ اشتراک برای کاربر ${updatedUser.fullname} ذخیره شد.`);

        // Send a confirmation push notification
        const payload = JSON.stringify({
            title: 'اشتراک موفق',
            body: 'شما با موفقیت برای دریافت اعلان‌ها مشترک شدید!',
        });

        await webPush.sendNotification(subscription, payload);

        res.status(201).json({ success: true, message: 'اشتراک با موفقیت ذخیره شد' });
    } catch (error) {
        console.error('❌ خطا در ذخیره اشتراک:', error);
        // If the error is from webPush (e.g., subscription expired), it might have a specific status code
        if (error.statusCode) {
             res.status(error.statusCode).json({ success: false, message: error.body });
        } else {
             res.status(500).json({ success: false, message: 'خطای سرور در ذخیره اشتراک' });
        }
    }
});


// === مسیرهای دیباگ ===
app.get('/api/debug/system', auth, async (req, res) => {
    try {
        const currentUser = await User.findOne({ id: req.user.id });
        const allUsers = await User.find({}, 'fullname role phone');
        const allConnections = await Connection.find();

        const userConnections = await Connection.find({
            $or: [
                { sourceId: req.user.id },
                { targetId: req.user.id }
            ]
        });

        res.json({
            success: true,
            debug: {
                currentUser: {
                    id: currentUser?.id,
                    fullname: currentUser?.fullname,
                    role: currentUser?.role,
                    phone: currentUser?.phone
                },
                users: {
                    total: allUsers.length,
                    list: allUsers
                },
                connections: {
                    total: allConnections.length,
                    userConnections: userConnections.length,
                    all: allConnections,
                    user: userConnections
                },
                database: {
                    status: mongoose.connection.readyState === 1 ? 'متصل' : 'قطع',
                    name: mongoose.connection.name
                }
            }
        });
    } catch (error) {
        console.error('خطای دیباگ سیستم:', error);
        res.status(500).json({
            success: false,
            message: 'خطای دیباگ: ' + error.message
        });
    }
});

// === آپدیت ID کاربران موجود ===
app.post('/api/debug/update-user-ids', async (req, res) => {
    try {
        const users = await User.find({ id: { $exists: false } });
        let counter = 1;

        // پیدا کردن بیشترین id موجود
        const lastUser = await User.findOne().sort({ id: -1 });
        if (lastUser && lastUser.id) {
            counter = lastUser.id + 1;
        }

        console.log(`شروع بروزرسانی ${users.length} کاربر...`);

        for (const user of users) {
            user.id = counter;
            await user.save();
            console.log(`بروزرسانی کاربر ${user.fullname} با id: ${counter}`);
            counter++;
        }

        res.json({
            success: true,
            message: `${users.length} کاربر بروزرسانی شدند`,
            updatedCount: users.length
        });
    } catch (error) {
        console.error('خطا در بروزرسانی:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// === مسیر پیش‌فرض ===
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ سرور روی پورت ${PORT} اجرا شد`);
    console.log(`✅ متصل به MongoDB`);
    console.log(`✅ سلامت سرور: http://localhost:${PORT}/api/health`);
    console.log(`🔧 دیباگ سیستم: http://localhost:${PORT}/api/debug/system`);
});