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
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

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
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';

// Auth Middleware
const auth = async (req, res, next) => {
    const token = req.header('x-auth-token');
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'No token, authorization denied' 
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ 
            success: false, 
            message: 'Token is not valid' 
        });
    }
};

// === HEALTH CHECK ===
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'SoodCity API is running!',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// === AUTHENTICATION ROUTES ===
app.post('/api/users/register', async (req, res) => {
    try {
        const { role, fullname, province, phone, password, address, licensePlate } = req.body;

        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this phone number'
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
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in registration'
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
                message: 'Invalid credentials'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
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
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in login'
        });
    }
});

app.get('/api/users/auth', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
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
        console.error('Auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in authentication'
        });
    }
});

// === USER ROUTES ===
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
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in getting users'
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
                message: 'User not found'
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
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in updating user'
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
                message: 'User not found'
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in changing password'
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
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in deleting user'
        });
    }
});

// === ADS ROUTES ===
app.get('/api/ads', auth, async (req, res) => {
    try {
        const ads = await Ad.find().populate('sellerId buyerId', 'fullname phone');
        res.json({
            success: true,
            ads
        });
    } catch (error) {
        console.error('Get ads error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in getting ads'
        });
    }
});

app.post('/api/ads', auth, async (req, res) => {
    try {
        const { product, category, quantity, price, emoji, image, adType, seller, sellerId, buyer, buyerId } = req.body;

        const newAd = new Ad({
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
        console.error('Create ad error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in creating ad'
        });
    }
});

app.delete('/api/ads/:id', auth, async (req, res) => {
    try {
        const adId = req.params.id;
        const ad = await Ad.findById(adId);

        if (!ad) {
            return res.status(404).json({
                success: false,
                message: 'Ad not found'
            });
        }

        if ((ad.adType === 'supply' && ad.sellerId.toString() !== req.user.id) || 
            (ad.adType === 'demand' && ad.buyerId.toString() !== req.user.id)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this ad'
            });
        }

        await Promise.all([
            Ad.findByIdAndDelete(adId),
            Message.deleteMany({ adId: parseInt(adId) })
        ]);

        res.json({
            success: true,
            message: 'Ad and related messages deleted successfully'
        });

    } catch (error) {
        console.error('Delete ad error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in deleting ad'
        });
    }
});

// === MESSAGES ROUTES ===
app.get('/api/messages', auth, async (req, res) => {
    try {
        const userMessages = await Message.find({
            $or: [
                { senderId: req.user.id },
                { recipientId: req.user.id }
            ]
        }).populate('senderId recipientId', 'fullname');

        res.json({
            success: true,
            messages: userMessages
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in getting messages'
        });
    }
});

app.post('/api/messages', auth, async (req, res) => {
    try {
        const { adId, senderId, senderName, recipientId, recipientName, content, image } = req.body;

        const newMessage = new Message({
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
        console.error('Create message error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in creating message'
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
            message: 'Conversation marked as read'
        });

    } catch (error) {
        console.error('Mark conversation read error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in marking conversation as read'
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
            message: `Deleted ${result.deletedCount} messages`
        });

    } catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in deleting conversation'
        });
    }
});

// === CONNECTIONS ROUTES ===
app.get('/api/connections', auth, async (req, res) => {
    try {
        console.log('📡 GET /api/connections - User:', req.user.id);
        
        const connections = await Connection.find()
            .populate('sourceId', 'fullname role phone licensePlate address')
            .populate('targetId', 'fullname role phone');
        
        console.log('✅ Found connections:', connections.length);
        
        res.json({
            success: true,
            connections
        });
    } catch (error) {
        console.error('❌ GET /api/connections error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in getting connections'
        });
    }
});

app.post('/api/connections', auth, async (req, res) => {
    try {
        console.log('📡 POST /api/connections - Body:', req.body);
        console.log('📡 POST /api/connections - User:', req.user);

        const { targetId } = req.body;

        if (!targetId) {
            console.error('❌ Missing targetId');
            return res.status(400).json({
                success: false,
                message: 'Target ID is required'
            });
        }

        const sourceUser = await User.findById(req.user.id);
        if (!sourceUser) {
            console.error('❌ Source user not found:', req.user.id);
            return res.status(404).json({
                success: false,
                message: 'Source user not found'
            });
        }

        console.log('✅ Source user found:', sourceUser.fullname);

        const targetUser = await User.findById(targetId);
        if (!targetUser) {
            console.error('❌ Target user not found:', targetId);
            return res.status(404).json({
                success: false,
                message: 'Target user not found'
            });
        }

        console.log('✅ Target user found:', targetUser.fullname, '- Role:', targetUser.role);

        if (targetUser.role !== 'sorting') {
            console.error('❌ Target user is not a sorting center:', targetUser.role);
            return res.status(400).json({
                success: false,
                message: 'Can only connect to sorting centers'
            });
        }

        const existingConnection = await Connection.findOne({
            sourceId: req.user.id,
            targetId: targetId
        });

        if (existingConnection) {
            console.log('⚠️ Connection already exists:', existingConnection._id);
            return res.status(400).json({
                success: false,
                message: 'Connection request already sent'
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
            console.log('🚗 Added license plate for driver:', sourceUser.licensePlate);
        } else if (sourceUser.role === 'greenhouse' && sourceUser.address) {
            connectionData.sourceAddress = sourceUser.address;
            console.log('🏡 Added address for greenhouse:', sourceUser.address);
        }

        console.log('📝 Creating connection with data:', connectionData);

        const newConnection = new Connection(connectionData);
        await newConnection.save();

        console.log('✅ Connection created successfully:', newConnection._id);

        const populatedConnection = await Connection.findById(newConnection._id)
            .populate('sourceId', 'fullname role phone licensePlate address')
            .populate('targetId', 'fullname role phone');

        res.status(201).json({
            success: true,
            connection: populatedConnection,
            message: 'Connection request sent successfully'
        });

    } catch (error) {
        console.error('❌ POST /api/connections - Detailed error:', error);
        console.error('❌ Error stack:', error.stack);
        
        res.status(500).json({
            success: false,
            message: 'Server error in creating connection: ' + error.message
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
                message: 'Connection not found'
            });
        }

        if (connection.targetId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this connection'
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
        console.error('Update connection error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in updating connection'
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
                message: 'Connection not found'
            });
        }

        if (connection.sourceId.toString() !== req.user.id && connection.targetId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this connection'
            });
        }

        await Connection.findByIdAndDelete(connectionId);

        res.json({
            success: true,
            message: 'Connection deleted successfully'
        });

    } catch (error) {
        console.error('Delete connection error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in deleting connection'
        });
    }
});

// === REQUESTS ROUTES ===
app.get('/api/requests', auth, async (req, res) => {
    try {
        const requests = await Request.find()
            .populate('greenhouseId', 'fullname phone address')
            .populate('sortingCenterId', 'fullname phone')
            .populate('driverId', 'fullname phone licensePlate');
        
        res.json({
            success: true,
            requests
        });
    } catch (error) {
        console.error('Get requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in getting requests'
        });
    }
});

app.post('/api/requests', auth, async (req, res) => {
    try {
        const { greenhouseId, greenhouseName, greenhousePhone, greenhouseAddress, sortingCenterId, sortingCenterName, type, quantity, description, location } = req.body;

        const newRequest = new Request({
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
        console.error('Create request error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in creating request'
        });
    }
});

app.put('/api/requests/:id', auth, async (req, res) => {
    try {
        const requestId = req.params.id;
        
        const updatedRequest = await Request.findByIdAndUpdate(
            requestId,
            req.body,
            { new: true }
        ).populate('greenhouseId', 'fullname phone address')
         .populate('sortingCenterId', 'fullname phone')
         .populate('driverId', 'fullname phone licensePlate');

        if (!updatedRequest) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        res.json({
            success: true,
            request: updatedRequest
        });

    } catch (error) {
        console.error('Update request error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in updating request'
        });
    }
});

app.delete('/api/requests/:id', auth, async (req, res) => {
    try {
        const requestId = req.params.id;
        const request = await Request.findById(requestId);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        if (request.greenhouseId.toString() !== req.user.id && request.sortingCenterId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this request'
            });
        }

        await Request.findByIdAndDelete(requestId);

        res.json({
            success: true,
            message: 'Request deleted successfully'
        });

    } catch (error) {
        console.error('Delete request error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in deleting request'
        });
    }
});

// === ROUTES FOR SORTING CENTER ===
app.get('/api/sorting/connection-requests', auth, async (req, res) => {
    try {
        if (req.user.role !== 'sorting') {
            return res.status(403).json({
                success: false,
                message: 'Only sorting centers can access this endpoint'
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
        console.error('Get sorting connection requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in getting connection requests'
        });
    }
});

app.get('/api/sorting/approved-connections', auth, async (req, res) => {
    try {
        if (req.user.role !== 'sorting') {
            return res.status(403).json({
                success: false,
                message: 'Only sorting centers can access this endpoint'
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
        console.error('Get approved connections error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in getting approved connections'
        });
    }
});

app.get('/api/sorting/transport-requests', auth, async (req, res) => {
    try {
        if (req.user.role !== 'sorting') {
            return res.status(403).json({
                success: false,
                message: 'Only sorting centers can access this endpoint'
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
        console.error('Get transport requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in getting transport requests'
        });
    }
});

// === ROUTES FOR GREENHOUSE ===
app.get('/api/greenhouse/sorting-centers', auth, async (req, res) => {
    try {
        if (req.user.role !== 'greenhouse') {
            return res.status(403).json({
                success: false,
                message: 'Only greenhouses can access this endpoint'
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
        console.error('Get sorting centers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in getting sorting centers'
        });
    }
});

app.get('/api/greenhouse/connections', auth, async (req, res) => {
    try {
        if (req.user.role !== 'greenhouse') {
            return res.status(403).json({
                success: false,
                message: 'Only greenhouses can access this endpoint'
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
        console.error('Get greenhouse connections error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in getting greenhouse connections'
        });
    }
});

// === ROUTES FOR DRIVER ===
app.get('/api/driver/sorting-centers', auth, async (req, res) => {
    try {
        if (req.user.role !== 'driver') {
            return res.status(403).json({
                success: false,
                message: 'Only drivers can access this endpoint'
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
        console.error('Get driver sorting centers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in getting sorting centers'
        });
    }
});

app.get('/api/driver/connections', auth, async (req, res) => {
    try {
        if (req.user.role !== 'driver') {
            return res.status(403).json({
                success: false,
                message: 'Only drivers can access this endpoint'
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
        console.error('Get driver connections error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in getting driver connections'
        });
    }
});

// Consolidated Delivery
app.post('/api/requests/consolidate', auth, async (req, res) => {
    try {
        const { missionIds } = req.body;
        const driver = await User.findById(req.user.id);
        
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
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
                message: 'No sorting center connected'
            });
        }

        const newRequest = new Request({
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
        console.error('Consolidate delivery error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in consolidating delivery'
        });
    }
});

// Reject Consolidated Delivery
app.post('/api/requests/:id/reject', auth, async (req, res) => {
    try {
        const requestId = req.params.id;
        const { reason } = req.body;

        const updatedRequest = await Request.findByIdAndUpdate(
            requestId,
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
                message: 'Request not found'
            });
        }

        res.json({
            success: true,
            request: updatedRequest
        });

    } catch (error) {
        console.error('Reject delivery error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in rejecting delivery'
        });
    }
});

// Password Reset
app.post('/api/users/reset-password', async (req, res) => {
    try {
        const { phone, newPassword } = req.body;
        const user = await User.findOne({ phone });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in resetting password'
        });
    }
});

// === DEBUG ROUTES ===
app.get('/api/debug/system', auth, async (req, res) => {
    try {
        console.log('🔧 Debug system request from user:', req.user.id);

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
                    status: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
                    name: mongoose.connection.name
                }
            }
        });
    } catch (error) {
        console.error('❌ Debug system error:', error);
        res.status(500).json({
            success: false,
            message: 'Debug error: ' + error.message
        });
    }
});

// === CATCH-ALL ROUTE ===
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