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

// مدل‌های دیتابیس
const UserSchema = new mongoose.Schema({
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
    sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sourceName: { type: String, required: true },
    sourceRole: { type: String, required: true },
    sourcePhone: { type: String, required: true },
    sourceLicensePlate: { type: String, default: '' },
    sourceAddress: { type: String, default: '' },
    targetId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    suspended: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const RequestSchema = new mongoose.Schema({
    id: { type: Number, unique: true }, // اضافه کردن id عددی برای تطابق با فرانت‌اند
    greenhouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    greenhouseName: { type: String, required: true },
    greenhousePhone: { type: String, required: true },
    greenhouseAddress: { type: String, required: true },
    sortingCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sortingCenterName: { type: String, required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
    id: { type: Number, unique: true }, // اضافه کردن id عددی
    adId: { type: Number, required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipientName: { type: String, required: true },
    content: { type: String, default: '' },
    image: { type: String },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const AdSchema = new mongoose.Schema({
    id: { type: Number, unique: true }, // اضافه کردن id عددی
    product: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    emoji: { type: String, required: true },
    image: { type: String },
    adType: { type: String, enum: ['supply', 'demand'], required: true },
    seller: { type: String },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    buyer: { type: String },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// ایجاد مدل‌ها
const User = mongoose.model('User', UserSchema);
const Connection = mongoose.model('Connection', ConnectionSchema);
const Request = mongoose.model('Request', RequestSchema);
const Message = mongoose.model('Message', MessageSchema);
const Ad = mongoose.model('Ad', AdSchema);

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

// تابع کمکی برای تولید ID عددی
const generateNumericId = async (Model) => {
    const lastDoc = await Model.findOne().sort({ id: -1 });
    return lastDoc ? lastDoc.id + 1 : 1;
};

// === بررسی سلامت ===
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API سودسیتی در حال اجراست!',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'متصل' : 'قطع'
    });
});

// === مسیرهای احراز هویت ===
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
            { id: newUser._id, phone: newUser.phone, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: newUser._id,
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
            { id: user._id, phone: user.phone, role: user.role },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
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
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'کاربر یافت نشد'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
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

// === مسیرهای کاربران ===
app.get('/api/users', auth, async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 });
        res.json({
            success: true,
            users: users.map(u => ({
                id: u._id,
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

app.put('/api/users', auth, async (req, res) => {
    try {
        const { location, emptyBaskets, loadCapacity, address } = req.body;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
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
                id: updatedUser._id,
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
        const user = await User.findById(req.user.id);

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
            User.findByIdAndDelete(userId),
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

// === مسیرهای آگهی‌ها ===
app.get('/api/ads', auth, async (req, res) => {
    try {
        const ads = await Ad.find().populate('sellerId buyerId', 'fullname phone');
        
        // تبدیل به ساختار مورد انتظار فرانت‌اند
        const formattedAds = ads.map(ad => ({
            id: ad.id,
            product: ad.product,
            category: ad.category,
            quantity: ad.quantity,
            price: ad.price,
            emoji: ad.emoji,
            image: ad.image,
            adType: ad.adType,
            seller: ad.seller,
            sellerId: ad.sellerId?._id || ad.sellerId,
            buyer: ad.buyer,
            buyerId: ad.buyerId?._id || ad.buyerId,
            date: ad.date,
            createdAt: ad.createdAt
        }));

        res.json({
            success: true,
            ads: formattedAds
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
            id: await generateNumericId(Ad),
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
        const adId = req.params.id;
        const ad = await Ad.findOne({ id: adId });

        if (!ad) {
            return res.status(404).json({
                success: false,
                message: 'آگهی یافت نشد'
            });
        }

        if ((ad.adType === 'supply' && ad.sellerId.toString() !== req.user.id) || 
            (ad.adType === 'demand' && ad.buyerId.toString() !== req.user.id)) {
            return res.status(403).json({
                success: false,
                message: 'مجوز حذف این آگهی را ندارید'
            });
        }

        await Promise.all([
            Ad.findOneAndDelete({ id: adId }),
            Message.deleteMany({ adId: parseInt(adId) })
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

// === مسیرهای پیام‌ها ===
app.get('/api/messages', auth, async (req, res) => {
    try {
        const userMessages = await Message.find({
            $or: [
                { senderId: req.user.id },
                { recipientId: req.user.id }
            ]
        }).populate('senderId recipientId', 'fullname');

        // تبدیل به ساختار مورد انتظار فرانت‌اند
        const formattedMessages = userMessages.map(msg => ({
            id: msg.id,
            adId: msg.adId,
            senderId: msg.senderId?._id || msg.senderId,
            senderName: msg.senderName,
            recipientId: msg.recipientId?._id || msg.recipientId,
            recipientName: msg.recipientName,
            content: msg.content,
            image: msg.image,
            read: msg.read,
            createdAt: msg.createdAt
        }));

        res.json({
            success: true,
            messages: formattedMessages
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
            id: await generateNumericId(Message),
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
        const [user1Id, user2Id] = conversationId.split('-');

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
        const [user1Id, user2Id] = conversationId.split('-');

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

// === مسیرهای اتصالات ===
app.get('/api/connections', auth, async (req, res) => {
    try {
        console.log('📡 درخواست GET /api/connections - کاربر:', req.user.id);
        
        const connections = await Connection.find()
            .populate('sourceId', 'fullname role phone licensePlate address')
            .populate('targetId', 'fullname role phone');
        
        console.log('✅ اتصالات یافت شده:', connections.length);
        
        res.json({
            success: true,
            connections
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
        console.log('📡 درخواست POST /api/connections - داده:', req.body);
        console.log('📡 درخواست POST /api/connections - کاربر:', req.user);

        const { targetId } = req.body;

        if (!targetId) {
            console.error('❌ targetId وجود ندارد');
            return res.status(400).json({
                success: false,
                message: 'شناسه مقصد الزامی است'
            });
        }

        // بررسی معتبر بودن فرمت targetId
        if (!mongoose.Types.ObjectId.isValid(targetId)) {
            console.error('❌ فرمت targetId نامعتبر است:', targetId);
            return res.status(400).json({
                success: false,
                message: 'فرمت شناسه مقصد نامعتبر است'
            });
        }

        const sourceUser = await User.findById(req.user.id);
        if (!sourceUser) {
            console.error('❌ کاربر مبدأ یافت نشد:', req.user.id);
            return res.status(404).json({
                success: false,
                message: 'کاربر مبدأ یافت نشد'
            });
        }

        console.log('✅ کاربر مبدأ یافت شد:', sourceUser.fullname);

        const targetUser = await User.findById(targetId);
        if (!targetUser) {
            console.error('❌ کاربر مقصد یافت نشد:', targetId);
            return res.status(404).json({
                success: false,
                message: 'کاربر مقصد یافت نشد'
            });
        }

        console.log('✅ کاربر مقصد یافت شد:', targetUser.fullname, '- نقش:', targetUser.role);

        if (targetUser.role !== 'sorting') {
            console.error('❌ کاربر مقصد مرکز سورتینگ نیست:', targetUser.role);
            return res.status(400).json({
                success: false,
                message: 'فقط می‌توان به مراکز سورتینگ متصل شد'
            });
        }

        const existingConnection = await Connection.findOne({
            sourceId: req.user.id,
            targetId: targetId
        });

        if (existingConnection) {
            console.log('⚠️ اتصال از قبل وجود دارد:', existingConnection._id);
            return res.status(400).json({
                success: false,
                message: 'درخواست اتصال قبلاً ارسال شده است'
            });
        }

        const connectionData = {
            sourceId: req.user.id,
            sourceName: sourceUser.fullname,
            sourceRole: sourceUser.role,
            sourcePhone: sourceUser.phone,
            targetId: targetId,
            status: 'pending'
        };

        if (sourceUser.role === 'driver' && sourceUser.licensePlate) {
            connectionData.sourceLicensePlate = sourceUser.licensePlate;
            console.log('🚗 پلاک خودرو برای راننده اضافه شد:', sourceUser.licensePlate);
        } else if (sourceUser.role === 'greenhouse' && sourceUser.address) {
            connectionData.sourceAddress = sourceUser.address;
            console.log('🏡 آدرس برای گلخانه اضافه شد:', sourceUser.address);
        }

        console.log('📝 ایجاد اتصال با داده:', connectionData);

        const newConnection = new Connection(connectionData);
        await newConnection.save();

        console.log('✅ اتصال با موفقیت ایجاد شد:', newConnection._id);

        const populatedConnection = await Connection.findById(newConnection._id)
            .populate('sourceId', 'fullname role phone licensePlate address')
            .populate('targetId', 'fullname role phone');

        res.status(201).json({
            success: true,
            connection: populatedConnection,
            message: 'درخواست اتصال با موفقیت ارسال شد'
        });

    } catch (error) {
        console.error('❌ POST /api/connections - خطای جزئیات:', error);
        console.error('❌ رد خطا:', error.stack);
        
        res.status(500).json({
            success: false,
            message: 'خطای سرور در ایجاد اتصال: ' + error.message
        });
    }
});

app.put('/api/connections/:id', auth, async (req, res) => {
    try {
        const connectionId = req.params.id;
        const { status, suspended } = req.body;

        const connection = await Connection.findById(connectionId);
        if (!connection) {
            return res.status(404).json({
                success: false,
                message: 'اتصال یافت نشد'
            });
        }

        if (connection.targetId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'مجوز بروزرسانی این اتصال را ندارید'
            });
        }

        const updatedConnection = await Connection.findByIdAndUpdate(
            connectionId,
            {
                ...(status && { status }),
                ...(suspended !== undefined && { suspended })
            },
            { new: true }
        ).populate('sourceId', 'fullname role phone licensePlate address')
         .populate('targetId', 'fullname role phone');

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
        const connectionId = req.params.id;
        const connection = await Connection.findById(connectionId);

        if (!connection) {
            return res.status(404).json({
                success: false,
                message: 'اتصال یافت نشد'
            });
        }

        if (connection.sourceId.toString() !== req.user.id && connection.targetId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'مجوز حذف این اتصال را ندارید'
            });
        }

        await Connection.findByIdAndDelete(connectionId);

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

// === مسیرهای درخواست‌ها ===
app.get('/api/requests', auth, async (req, res) => {
    try {
        const requests = await Request.find()
            .populate('greenhouseId', 'fullname phone address')
            .populate('sortingCenterId', 'fullname phone')
            .populate('driverId', 'fullname phone licensePlate');
        
        // تبدیل به ساختار مورد انتظار فرانت‌اند
        const formattedRequests = requests.map(req => ({
            id: req.id,
            greenhouseId: req.greenhouseId?._id || req.greenhouseId,
            greenhouseName: req.greenhouseName,
            greenhousePhone: req.greenhousePhone,
            greenhouseAddress: req.greenhouseAddress,
            sortingCenterId: req.sortingCenterId?._id || req.sortingCenterId,
            sortingCenterName: req.sortingCenterName,
            driverId: req.driverId?._id || req.driverId,
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
        }));

        res.json({
            success: true,
            requests: formattedRequests
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
            id: await generateNumericId(Request),
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
        const requestId = req.params.id;
        
        const updatedRequest = await Request.findOneAndUpdate(
            { id: requestId },
            req.body,
            { new: true }
        ).populate('greenhouseId', 'fullname phone address')
         .populate('sortingCenterId', 'fullname phone')
         .populate('driverId', 'fullname phone licensePlate');

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
        const requestId = req.params.id;
        const request = await Request.findOne({ id: requestId });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'درخواست یافت نشد'
            });
        }

        if (request.greenhouseId.toString() !== req.user.id && request.sortingCenterId.toString() !== req.user.id) {
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
        }).populate('sourceId', 'fullname role phone licensePlate address province');

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
        }).populate('sourceId', 'fullname role phone licensePlate address');

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
        }).populate('greenhouseId', 'fullname phone address');

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
                id: sc._id,
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
        }).populate('targetId', 'fullname role phone');

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
                id: sc._id,
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
        }).populate('targetId', 'fullname role phone');

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
        const driver = await User.findById(req.user.id);
        
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
        const sortingCenter = connection ? await User.findById(connection.targetId) : null;

        if (!sortingCenter) {
            return res.status(400).json({
                success: false,
                message: 'هیچ مرکز سورتینگ متصلی وجود ندارد'
            });
        }

        const newRequest = new Request({
            id: await generateNumericId(Request),
            type: 'delivered_basket',
            status: 'in_progress_to_sorting',
            driverId: req.user.id,
            driverName: driver.fullname,
            sortingCenterId: sortingCenter._id,
            sortingCenterName: sortingCenter.fullname,
            quantity: missionIds.length,
            description: 'تحویل مرکزی بارهای تکمیل شده',
            location: sortingCenter.location
        });

        await newRequest.save();

        await Request.updateMany(
            { _id: { $in: missionIds } },
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
        const requestId = req.params.id;
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

// === مسیرهای دیباگ ===
app.get('/api/debug/system', auth, async (req, res) => {
    try {
        console.log('🔧 درخواست دیباگ سیستم از کاربر:', req.user.id);

        const currentUser = await User.findById(req.user.id);
        const allUsers = await User.find({}, 'fullname role phone');
        const allConnections = await Connection.find()
            .populate('sourceId', 'fullname role')
            .populate('targetId', 'fullname role');

        const userConnections = await Connection.find({
            $or: [
                { sourceId: req.user.id },
                { targetId: req.user.id }
            ]
        })
        .populate('sourceId', 'fullname role phone')
        .populate('targetId', 'fullname role phone');

        res.json({
            success: true,
            debug: {
                currentUser: {
                    id: currentUser?._id,
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
        console.error('❌ خطای دیباگ سیستم:', error);
        res.status(500).json({
            success: false,
            message: 'خطای دیباگ: ' + error.message
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