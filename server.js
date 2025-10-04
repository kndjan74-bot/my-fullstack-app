const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

// اتصال به MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://root:7wVUQin6tGAAJ0nQiF9eA25x@sabalan.liara.cloud:32460/my-app?authSource=admin', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ متصل به MongoDB شد'))
.catch(err => console.error('❌ خطای اتصال به MongoDB:', err));

// ==================== مدل‌های دیتابیس با ID عددی ====================

// شمارنده برای تولید ID عددی
const CounterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', CounterSchema);

// تابع برای تولید ID عددی
const getNextSequence = async (name) => {
    const counter = await Counter.findByIdAndUpdate(
        name,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
};

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
    createdAt: { type: Date, default: Date.now }
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'کلید-رمز-جی-دبلیو-تی-شما-در-محیط-تولید-تغییر-کند';

// میدلور احراز هویت
const auth = async (req, res, next) => {
    const token = req.header('x-auth-token');
    
    if (!token) {
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
        res.status(401).json({ 
            success: false, 
            message: 'توکن معتبر نیست' 
        });
    }
};

// ==================== مسیرهای اصلی ====================

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

// === اتصالات ===
app.get('/api/connections', auth, async (req, res) => {
    try {
        const connections = await Connection.find();
        res.json({
            success: true,
            connections
        });
    } catch (error) {
        console.error('خطای دریافت اتصالات:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در دریافت اتصالات'
        });
    }
});

app.post('/api/connections', auth, async (req, res) => {
    try {
        const { targetId } = req.body;

        if (!targetId) {
            return res.status(400).json({
                success: false,
                message: 'شناسه مقصد الزامی است'
            });
        }

        const sourceUser = await User.findOne({ id: req.user.id });
        if (!sourceUser) {
            return res.status(404).json({
                success: false,
                message: 'کاربر مبدأ یافت نشد'
            });
        }

        const targetUser = await User.findOne({ id: targetId });
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'کاربر مقصد یافت نشد'
            });
        }

        // بررسی اتصال تکراری
        const existingConnection = await Connection.findOne({
            sourceId: req.user.id,
            targetId: targetId
        });

        if (existingConnection) {
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
            targetId: targetId,
            status: 'pending'
        };

        // اضافه کردن اطلاعات اضافی
        if (sourceUser.role === 'driver' && sourceUser.licensePlate) {
            connectionData.sourceLicensePlate = sourceUser.licensePlate;
        } else if (sourceUser.role === 'greenhouse' && sourceUser.address) {
            connectionData.sourceAddress = sourceUser.address;
        }

        const newConnection = new Connection(connectionData);
        await newConnection.save();

        res.status(201).json({
            success: true,
            connection: newConnection,
            message: 'درخواست اتصال با موفقیت ارسال شد'
        });

    } catch (error) {
        console.error('خطای ایجاد اتصال:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور در ایجاد اتصال'
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
            requests
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
        
        const updatedRequest = await Request.findOneAndUpdate(
            { id: requestId },
            req.body,
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

// === آگهی‌ها ===
app.get('/api/ads', auth, async (req, res) => {
    try {
        const ads = await Ad.find();
        res.json({
            success: true,
            ads
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
        const messages = await Message.find({
            $or: [
                { senderId: req.user.id },
                { recipientId: req.user.id }
            ]
        });

        res.json({
            success: true,
            messages
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

// === مسیرهای خاص ===
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
        
        if (!connection) {
            return res.status(400).json({
                success: false,
                message: 'هیچ مرکز سورتینگ متصلی وجود ندارد'
            });
        }

        const sortingCenter = await User.findOne({ id: connection.targetId });
        if (!sortingCenter) {
            return res.status(404).json({
                success: false,
                message: 'مرکز سورتینگ یافت نشد'
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

// === مسیر پیش‌فرض ===
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ سرور روی پورت ${PORT} اجرا شد`);
    console.log(`✅ متصل به MongoDB`);
    console.log(`✅ سلامت سرور: http://localhost:${PORT}/api/health`);
});