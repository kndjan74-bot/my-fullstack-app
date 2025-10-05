// =================================================================
//                        SoodCity Backend
// =================================================================

// ----------------- Import Dependencies -----------------
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Load environment variables

// ----------------- Initializations -----------------
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_default_jwt_secret_key_12345';

// ----------------- Middleware -----------------
app.use(cors());
app.use(express.json({ limit: '5mb' })); // For parsing application/json and increasing payload limit for images
app.use(express.static('public')); // Serve static files from the 'public' directory

// ----------------- MongoDB Connection -----------------
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://liara:password@localhost:27017/soodcitydb';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));


// ----------------- Database Schemas & Models -----------------

// --- Counter for Auto-Incrementing IDs ---
const CounterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', CounterSchema);

// Helper function to get the next sequence value
const getNextSequence = async (name) => {
    const ret = await Counter.findByIdAndUpdate(name, { $inc: { seq: 1 } }, { new: true, upsert: true });
    return ret.seq;
};

// --- User Schema ---
const UserSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    fullname: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['greenhouse', 'sorting', 'driver', 'farmer', 'buyer'] },
    province: { type: String, required: true },
    address: { type: String },
    licensePlate: { type: String }, // Specific to drivers
    location: {
        lat: { type: Number },
        lng: { type: Number }
    },
    // Driver-specific capacity fields
    emptyBaskets: { type: Number, default: 0 },
    loadCapacity: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// Auto-increment middleware for User ID
UserSchema.pre('save', async function(next) {
    if (this.isNew) {
        this.id = await getNextSequence('userId');
    }
    next();
});
const User = mongoose.model('User', UserSchema);


// --- Ad (Marketplace) Schema ---
const AdSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    adType: { type: String, required: true, enum: ['supply', 'demand'] },
    product: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    emoji: { type: String },
    image: { type: String }, // Base64 encoded string
    sellerId: { type: Number, ref: 'User' },
    seller: { type: String },
    buyerId: { type: Number, ref: 'User' },
    buyer: { type: String },
    createdAt: { type: Date, default: Date.now }
});

// Auto-increment middleware for Ad ID
AdSchema.pre('save', async function(next) {
    if (this.isNew) {
        this.id = await getNextSequence('adId');
    }
    next();
});
const Ad = mongoose.model('Ad', AdSchema);


// --- Connection Schema ---
const ConnectionSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    sourceId: { type: Number, required: true, ref: 'User' },
    sourceName: { type: String, required: true },
    sourceRole: { type: String, required: true },
    sourcePhone: { type: String },
    sourceLicensePlate: { type: String }, // if driver
    sourceAddress: { type: String },    // if greenhouse
    targetId: { type: Number, required: true, ref: 'User' }, // Always a sorting center
    status: { type: String, default: 'pending', enum: ['pending', 'approved'] },
    suspended: { type: Boolean, default: false }, // Sorting center can suspend a driver
    createdAt: { type: Date, default: Date.now }
});

// Auto-increment middleware for Connection ID
ConnectionSchema.pre('save', async function(next) {
    if (this.isNew) {
        this.id = await getNextSequence('connectionId');
    }
    next();
});
const Connection = mongoose.model('Connection', ConnectionSchema);


// --- Request (Mission) Schema ---
const RequestSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    // --- Requester Info (Greenhouse/Farmer) ---
    greenhouseId: { type: Number, ref: 'User' },
    greenhouseName: { type: String },
    greenhousePhone: { type: String },
    greenhouseAddress: { type: String },
    farmerId: { type: Number, ref: 'User' }, // For future use
    // --- Destination Info ---
    sortingCenterId: { type: Number, required: true, ref: 'User' },
    sortingCenterName: { type: String },
    // --- Driver Info ---
    driverId: { type: Number, ref: 'User' },
    driverName: { type: String },
    driverPhone: { type: String },
    driverLicensePlate: { type: String },
    // --- Request Details ---
    type: { type: String, required: true, enum: ['empty', 'full', 'delivered_basket'] },
    quantity: { type: Number, required: true },
    description: { type: String },
    location: { // Location of the pickup (greenhouse)
        lat: { type: Number },
        lng: { type: Number }
    },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'assigned', 'in_progress', 'completed', 'rejected', 'in_progress_to_sorting']
    },
    // --- Timestamps & Flags ---
    createdAt: { type: Date, default: Date.now },
    assignedAt: { type: Date },
    acceptedAt: { type: Date },
    completedAt: { type: Date },
    isPickupConfirmed: { type: Boolean, default: false }, // For two-step confirmation
    isConsolidated: { type: Boolean, default: false }, // For consolidating 'full' requests
    rejectionReason: { type: String }, // If a 'delivered_basket' request is rejected
});

// Auto-increment middleware for Request ID
RequestSchema.pre('save', async function(next) {
    if (this.isNew) {
        this.id = await getNextSequence('requestId');
    }
    next();
});
const Request = mongoose.model('Request', RequestSchema);


// --- Message Schema ---
const MessageSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    adId: { type: Number, ref: 'Ad' },
    conversationId: { type: String, required: true, index: true }, // e.g., 'senderId-recipientId' sorted
    senderId: { type: Number, required: true, ref: 'User' },
    senderName: { type: String, required: true },
    recipientId: { type: Number, required: true, ref: 'User' },
    recipientName: { type: String, required: true },
    content: { type: String },
    image: { type: String }, // Base64 encoded string
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Auto-increment middleware for Message ID
MessageSchema.pre('save', async function(next) {
    if (this.isNew) {
        this.id = await getNextSequence('messageId');
    }
    next();
});
const Message = mongoose.model('Message', MessageSchema);


// ----------------- Auth Middleware -----------------
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};


// ----------------- API Routes (to be implemented) -----------------
app.get('/api', (req, res) => {
    res.send('SoodCity API is running...');
});

// ----------------- API Routes -----------------

const userRouter = express.Router();

// --- 1. Register a new user ---
userRouter.post('/register', async (req, res) => {
    const { fullname, phone, password, role, province, address, licensePlate } = req.body;

    // Basic validation
    if (!fullname || !phone || !password || !role || !province) {
        return res.status(400).json({ msg: 'Please enter all required fields' });
    }

    try {
        let user = await User.findOne({ phone });
        if (user) {
            return res.status(400).json({ msg: 'User with this phone number already exists' });
        }

        user = new User({
            fullname,
            phone,
            password,
            role,
            province,
            address,
            licensePlate: role === 'driver' ? licensePlate : undefined
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Create JWT
        const payload = { user: { id: user.id } };
        jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }, (err, token) => {
            if (err) throw err;
            // Return token and the user object (without password)
            const userResponse = user.toObject();
            delete userResponse.password;
            res.json({ token, user: userResponse });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 2. Login a user ---
userRouter.post('/login', async (req, res) => {
    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ msg: 'Please provide phone and password' });
    }

    try {
        let user = await User.findOne({ phone });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const payload = { user: { id: user.id } };
        jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }, (err, token) => {
            if (err) throw err;
            const userResponse = user.toObject();
            delete userResponse.password;
            res.json({ token, user: userResponse });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 3. Get authenticated user data ---
userRouter.get('/auth', auth, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id }).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 4. Get all users ---
userRouter.get('/', auth, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({ success: true, users });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 5. Update user details (profile, location, capacity) ---
userRouter.put('/', auth, async (req, res) => {
    const { location, emptyBaskets, loadCapacity, address } = req.body;
    const updateFields = {};
    if (location) updateFields.location = location;
    if (address) updateFields.address = address;
    if (typeof emptyBaskets !== 'undefined') updateFields.emptyBaskets = emptyBaskets;
    if (typeof loadCapacity !== 'undefined') updateFields.loadCapacity = loadCapacity;

    try {
        const user = await User.findOneAndUpdate(
            { id: req.user.id },
            { $set: updateFields },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json({ success: true, msg: 'User updated successfully', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 6. Change password ---
userRouter.put('/password', auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        const user = await User.findOne({ id: req.user.id });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true, msg: 'Password changed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 7. Delete account ---
userRouter.delete('/', auth, async (req, res) => {
    try {
        const user = await User.findOneAndDelete({ id: req.user.id });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        // Optional: Add cleanup logic for related data (ads, messages, etc.) here
        res.json({ success: true, msg: 'Account deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 8. Reset password (for recovery) ---
userRouter.post('/reset-password', async (req, res) => {
    const { phone, newPassword } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({ msg: 'User with this phone number not found' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        
        res.json({ success: true, msg: 'Password has been reset successfully.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


app.use('/api/users', userRouter);

// ----------------- Connections API Routes -----------------
const connectionRouter = express.Router();

// --- 1. Get all connections relevant to the user ---
connectionRouter.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const connections = await Connection.find({
            $or: [{ sourceId: userId }, { targetId: userId }]
        }).sort({ createdAt: -1 });
        res.json({ success: true, connections });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 2. Create a new connection request ---
connectionRouter.post('/', async (req, res) => {
    const targetId = parseInt(req.body.targetId, 10);
    const sourceId = req.user.id;

    if (isNaN(targetId)) {
        return res.status(400).json({ msg: 'Invalid Target ID.' });
    }

    try {
        const sourceUser = await User.findOne({ id: sourceId });
        const targetUser = await User.findOne({ id: targetId });

        if (!sourceUser || !targetUser) {
            return res.status(404).json({ msg: 'User not found.' });
        }
        if (targetUser.role !== 'sorting') {
            return res.status(400).json({ msg: 'Connections can only be made to sorting centers.' });
        }

        const existingConnection = await Connection.findOne({ sourceId, targetId });
        if (existingConnection) {
            return res.status(400).json({ msg: 'Connection request already exists.' });
        }

        const newConnection = new Connection({
            sourceId,
            targetId,
            sourceName: sourceUser.fullname,
            sourceRole: sourceUser.role,
            sourcePhone: sourceUser.phone,
            sourceLicensePlate: sourceUser.licensePlate,
            sourceAddress: sourceUser.address,
        });

        await newConnection.save();
        res.json({ success: true, msg: 'Connection request sent.', connection: newConnection });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 3. Update a connection (approve/suspend) ---
connectionRouter.put('/:id', async (req, res) => {
    const { status, suspended } = req.body;
    const connectionId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(connectionId)) {
        return res.status(400).json({ msg: 'Invalid Connection ID.' });
    }

    try {
        const connection = await Connection.findOne({ id: connectionId });
        if (!connection) {
            return res.status(404).json({ msg: 'Connection not found.' });
        }

        if (connection.targetId !== userId) {
            return res.status(403).json({ msg: 'User not authorized to update this connection.' });
        }

        const updateFields = {};
        if (status) updateFields.status = status;
        if (typeof suspended !== 'undefined') updateFields.suspended = suspended;

        const updatedConnection = await Connection.findOneAndUpdate(
            { id: connectionId },
            { $set: updateFields },
            { new: true }
        );

        res.json({ success: true, msg: 'Connection updated.', connection: updatedConnection });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 4. Delete a connection ---
connectionRouter.delete('/:id', async (req, res) => {
    const connectionId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(connectionId)) {
        return res.status(400).json({ msg: 'Invalid Connection ID.' });
    }

    try {
        const connection = await Connection.findOne({ id: connectionId });
        if (!connection) {
            return res.status(404).json({ msg: 'Connection not found.' });
        }

        if (connection.sourceId !== userId && connection.targetId !== userId) {
            return res.status(403).json({ msg: 'User not authorized to delete this connection.' });
        }

        await Connection.findOneAndDelete({ id: connectionId });
        res.json({ success: true, msg: 'Connection deleted.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.use('/api/connections', auth, connectionRouter);

// ----------------- Requests API Routes -----------------
const requestRouter = express.Router();

// --- 1. Get all requests relevant to the user ---
requestRouter.get('/', async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        let query = {};
        switch (user.role) {
            case 'greenhouse':
                query = { greenhouseId: user.id };
                break;
            case 'sorting':
                query = { sortingCenterId: user.id };
                break;
            case 'driver':
                query = { driverId: user.id };
                break;
            default:
                return res.json({ success: true, requests: [] });
        }
        const requests = await Request.find(query).sort({ createdAt: -1 });
        res.json({ success: true, requests });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 2. Create a new request (by greenhouse) ---
requestRouter.post('/', async (req, res) => {
    const { type, quantity, description } = req.body;
    const sortingCenterId = parseInt(req.body.sortingCenterId, 10);
    const greenhouseId = req.user.id;

    if (isNaN(sortingCenterId)) {
        return res.status(400).json({ msg: 'Invalid Sorting Center ID.' });
    }

    try {
        const greenhouse = await User.findOne({ id: greenhouseId });
        if (greenhouse.role !== 'greenhouse') {
            return res.status(403).json({ msg: 'Only greenhouses can create requests.' });
        }
        const sortingCenter = await User.findOne({ id: sortingCenterId });
        if (!sortingCenter) {
            return res.status(404).json({ msg: 'Sorting center not found.' });
        }

        const newRequest = new Request({
            greenhouseId,
            greenhouseName: greenhouse.fullname,
            greenhousePhone: greenhouse.phone,
            greenhouseAddress: greenhouse.address,
            location: greenhouse.location,
            sortingCenterId,
            sortingCenterName: sortingCenter.fullname,
            type,
            quantity,
            description
        });

        await newRequest.save();
        res.json({ success: true, msg: 'Request created successfully.', request: newRequest });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 3. Update a request (multi-purpose) ---
requestRouter.put('/:id', async (req, res) => {
    const requestId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const updates = req.body;

    if (isNaN(requestId)) {
        return res.status(400).json({ msg: 'Invalid Request ID.' });
    }
    
    try {
        const request = await Request.findOne({ id: requestId });
        if (!request) {
            return res.status(404).json({ msg: 'Request not found' });
        }

        const user = await User.findOne({ id: userId });
        const isGreenhouse = request.greenhouseId === userId;
        const isSorting = request.sortingCenterId === userId;
        const isDriver = request.driverId === userId;
        let canUpdate = false;

        if (user.role === 'sorting' && isSorting) canUpdate = true;
        if (user.role === 'driver' && isDriver) canUpdate = true;
        if (user.role === 'greenhouse' && isGreenhouse) canUpdate = true;

        if (!canUpdate) {
            return res.status(403).json({ msg: 'User not authorized for this request.' });
        }

        if (updates.status === 'in_progress' && user.role === 'driver') {
            const driver = await User.findOne({ id: userId });
            if (request.type === 'empty') {
                driver.emptyBaskets -= request.quantity;
            } else if (request.type === 'full') {
                driver.loadCapacity -= request.quantity;
            }
            await driver.save();
            updates.acceptedAt = Date.now();
        }

        if (updates.status === 'completed') {
            updates.completedAt = Date.now();
            if (request.type === 'full' && request.driverId) {
                const driver = await User.findOne({ id: request.driverId });
                if (driver) {
                    driver.loadCapacity += request.quantity;
                    await driver.save();
                }
            }
        }

        const updatedRequest = await Request.findOneAndUpdate(
            { id: requestId },
            { $set: updates },
            { new: true }
        );

        res.json({ success: true, msg: 'Request updated', request: updatedRequest });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- 4. Delete a request (by greenhouse or sorting center) ---
requestRouter.delete('/:id', async (req, res) => {
    const requestId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(requestId)) {
        return res.status(400).json({ msg: 'Invalid Request ID.' });
    }

    try {
        const request = await Request.findOne({ id: requestId });
        if (!request) {
            return res.status(404).json({ msg: 'Request not found.' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ msg: 'Cannot delete a request that is in progress.' });
        }
        if (request.greenhouseId !== userId && request.sortingCenterId !== userId) {
            return res.status(403).json({ msg: 'User not authorized to delete this request.' });
        }

        await Request.findOneAndDelete({ id: requestId });
        res.json({ success: true, msg: 'Request deleted.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 5. Consolidate missions for delivery (by driver) ---
requestRouter.post('/consolidate', async (req, res) => {
    const missionIds = req.body.missionIds.map(id => parseInt(id, 10));
    const driverId = req.user.id;

    if (missionIds.some(isNaN)) {
        return res.status(400).json({ msg: 'Invalid Mission IDs provided.' });
    }
    
    try {
        const driver = await User.findOne({ id: driverId });
        if (driver.role !== 'driver') {
            return res.status(403).json({ msg: 'Only drivers can consolidate missions.' });
        }

        await Request.updateMany(
            { id: { $in: missionIds }, driverId: driverId, status: 'completed', type: 'full' },
            { $set: { isConsolidated: true } }
        );

        const missions = await Request.find({ id: { $in: missionIds } });
        const totalQuantity = missions.reduce((sum, m) => sum + m.quantity, 0);
        const sortingCenterId = missions[0].sortingCenterId;
        const sortingCenter = await User.findOne({ id: sortingCenterId });

        const deliveryRequest = new Request({
            type: 'delivered_basket',
            status: 'in_progress_to_sorting',
            driverId,
            driverName: driver.fullname,
            sortingCenterId,
            sortingCenterName: sortingCenter.fullname,
            quantity: totalQuantity,
            description: `Consolidated delivery of ${missions.length} missions.`,
            location: sortingCenter.location,
            createdAt: Date.now()
        });
        
        await deliveryRequest.save();

        res.json({ success: true, msg: 'Delivery mission created.', request: deliveryRequest });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 6. Reject a consolidated delivery (by sorting center) ---
requestRouter.post('/:id/reject', async (req, res) => {
    const deliveryRequestId = parseInt(req.params.id, 10);
    const { reason } = req.body;
    const sortingId = req.user.id;

    if (isNaN(deliveryRequestId)) {
        return res.status(400).json({ msg: 'Invalid Delivery Request ID.' });
    }

    try {
        const deliveryRequest = await Request.findOne({ id: deliveryRequestId });
        if (!deliveryRequest || deliveryRequest.type !== 'delivered_basket' || deliveryRequest.sortingCenterId !== sortingId) {
            return res.status(403).json({ msg: 'Not authorized or invalid request.' });
        }

        deliveryRequest.status = 'rejected';
        deliveryRequest.rejectionReason = reason;
        await deliveryRequest.save();

        await Request.updateMany(
            { driverId: deliveryRequest.driverId, isConsolidated: true, sortingCenterId: sortingId },
            { $set: { isConsolidated: false } }
        );

        res.json({ success: true, msg: 'Delivery rejected and missions reverted.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


app.use('/api/requests', auth, requestRouter);

// ----------------- Ads (Marketplace) API Routes -----------------
const adRouter = express.Router();

// --- 1. Get all ads (publicly accessible) ---
adRouter.get('/', async (req, res) => {
    try {
        const ads = await Ad.find().sort({ createdAt: -1 });
        res.json({ success: true, ads });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 2. Create a new ad ---
adRouter.post('/', auth, async (req, res) => {
    const { adType, product, category, quantity, price, emoji, image } = req.body;
    const userId = req.user.id;

    try {
        const user = await User.findOne({ id: userId });
        const adData = {
            adType, product, category, quantity, price, emoji, image,
        };

        if (adType === 'supply') {
            adData.sellerId = userId;
            adData.seller = user.fullname;
        } else { // demand
            adData.buyerId = userId;
            adData.buyer = user.fullname;
        }

        const newAd = new Ad(adData);
        await newAd.save();
        res.json({ success: true, msg: 'Ad created successfully', ad: newAd });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 3. Delete an ad ---
adRouter.delete('/:id', auth, async (req, res) => {
    const adId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(adId)) {
        return res.status(400).json({ msg: 'Invalid Ad ID.' });
    }

    try {
        const ad = await Ad.findOne({ id: adId });
        if (!ad) {
            return res.status(404).json({ msg: 'Ad not found.' });
        }

        if (ad.sellerId !== userId && ad.buyerId !== userId) {
            return res.status(403).json({ msg: 'User not authorized to delete this ad.' });
        }
        
        const conversationIdsToDelete = await Message.distinct('conversationId', { adId: ad.id });
        if (conversationIdsToDelete.length > 0) {
            await Message.deleteMany({ conversationId: { $in: conversationIdsToDelete } });
        }
        
        await Ad.findOneAndDelete({ id: adId });

        res.json({ success: true, msg: 'Ad and associated messages deleted.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.use('/api/ads', adRouter);


// ----------------- Messages (Chat) API Routes -----------------
const messageRouter = express.Router();

// --- 1. Get all messages for the logged-in user ---
messageRouter.get('/', async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [{ senderId: req.user.id }, { recipientId: req.user.id }]
        }).sort({ createdAt: -1 });
        res.json({ success: true, messages });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 2. Create a new message ---
messageRouter.post('/', async (req, res) => {
    const { content, image } = req.body;
    const adId = req.body.adId ? parseInt(req.body.adId, 10) : null;
    const recipientId = parseInt(req.body.recipientId, 10);
    const senderId = req.user.id;

    if (isNaN(recipientId) || (req.body.adId && isNaN(adId))) {
        return res.status(400).json({ msg: 'Invalid ID provided.' });
    }

    try {
        const sender = await User.findOne({ id: senderId });
        const recipient = await User.findOne({ id: recipientId });
        if (!recipient) {
            return res.status(404).json({ msg: 'Recipient not found.' });
        }

        const conversationId = [senderId, recipientId].sort().join('-');

        const newMessage = new Message({
            adId,
            conversationId,
            senderId,
            senderName: sender.fullname,
            recipientId,
            recipientName: recipient.fullname,
            content,
            image
        });

        await newMessage.save();
        res.json({ success: true, msg: 'Message sent.', message: newMessage });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 3. Mark a conversation as read ---
messageRouter.put('/conversation/:id/read', async (req, res) => {
    const conversationId = req.params.id;
    const userId = req.user.id;

    try {
        await Message.updateMany(
            { conversationId: conversationId, recipientId: userId, read: false },
            { $set: { read: true } }
        );
        res.json({ success: true, msg: 'Conversation marked as read.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- 4. Delete a conversation ---
messageRouter.delete('/conversation/:id', async (req, res) => {
    const conversationId = req.params.id;
    const userId = req.user.id;

    try {
        const message = await Message.findOne({ conversationId: conversationId });
        if (message && (message.senderId === userId || message.recipientId === userId)) {
            await Message.deleteMany({ conversationId: conversationId });
            res.json({ success: true, msg: 'Conversation deleted.' });
        } else {
            res.status(403).json({ msg: 'Not authorized or conversation not found.' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


app.use('/api/messages', auth, messageRouter);


// ----------------- Start Server -----------------
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});

// Export models for use in other files
module.exports = {
    User,
    Ad,
    Connection,
    Request,
    Message,
    Counter,
    auth
};