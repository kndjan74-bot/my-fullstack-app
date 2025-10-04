const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

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
app.use(express.static(path.join(__dirname, 'public')));


// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';

// Mock Database
let users = [];
let requests = [];
let connections = [];
let messages = [];
let ads = [];
let notifications = [];

// Auth Middleware
const auth = (req, res, next) => {
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
        timestamp: new Date().toISOString()
    });
});

// === AUTHENTICATION ROUTES ===
app.post('/api/users/register', async (req, res) => {
    try {
        const { role, fullname, province, phone, password, address, licensePlate } = req.body;

        // Check if user already exists
        const existingUser = users.find(user => user.phone === phone);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this phone number'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = {
            id: users.length + 1,
            role,
            fullname,
            province,
            phone,
            password: hashedPassword,
            address: address || '',
            licensePlate: licensePlate || '',
            location: { lat: 35.6892, lng: 51.3890 },
            emptyBaskets: 0,
            loadCapacity: 0,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);

        // Create JWT token
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

        // Find user
        const user = users.find(u => u.phone === phone);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Create JWT token
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
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in login'
        });
    }
});

app.get('/api/users/auth', auth, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
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
});

// === USER ROUTES ===
app.get('/api/users', auth, (req, res) => {
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
});

app.put('/api/users', auth, async (req, res) => {
    try {
        const { location, emptyBaskets, loadCapacity, address } = req.body;
        const userIndex = users.findIndex(u => u.id === req.user.id);

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update user fields
        if (location) users[userIndex].location = location;
        if (emptyBaskets !== undefined) users[userIndex].emptyBaskets = emptyBaskets;
        if (loadCapacity !== undefined) users[userIndex].loadCapacity = loadCapacity;
        if (address) users[userIndex].address = address;

        res.json({
            success: true,
            user: {
                id: users[userIndex].id,
                role: users[userIndex].role,
                fullname: users[userIndex].fullname,
                province: users[userIndex].province,
                phone: users[userIndex].phone,
                address: users[userIndex].address,
                licensePlate: users[userIndex].licensePlate,
                location: users[userIndex].location,
                emptyBaskets: users[userIndex].emptyBaskets,
                loadCapacity: users[userIndex].loadCapacity
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
        const user = users.find(u => u.id === req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

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

app.delete('/api/users', auth, (req, res) => {
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // Remove user
    users.splice(userIndex, 1);
    
    // Remove user's data
    requests = requests.filter(r => r.greenhouseId !== req.user.id && r.driverId !== req.user.id && r.sortingCenterId !== req.user.id);
    connections = connections.filter(c => c.sourceId !== req.user.id && c.targetId !== req.user.id);
    messages = messages.filter(m => m.senderId !== req.user.id && m.recipientId !== req.user.id);
    ads = ads.filter(ad => ad.sellerId !== req.user.id && ad.buyerId !== req.user.id);

    res.json({
        success: true,
        message: 'Account deleted successfully'
    });
});

// === ADS ROUTES ===
app.get('/api/ads', auth, (req, res) => {
    res.json({
        success: true,
        ads: ads
    });
});

app.post('/api/ads', auth, (req, res) => {
    try {
        const { product, category, quantity, price, emoji, image, adType, seller, sellerId, buyer, buyerId } = req.body;

        const newAd = {
            id: ads.length + 1,
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
            date: new Date().toLocaleDateString('fa-IR'),
            createdAt: new Date().toISOString()
        };

        ads.push(newAd);

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

app.delete('/api/ads/:id', auth, (req, res) => {
    const adId = parseInt(req.params.id);
    const adIndex = ads.findIndex(ad => ad.id === adId);

    if (adIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Ad not found'
        });
    }

    const ad = ads[adIndex];
    
    // Check ownership
    if ((ad.adType === 'supply' && ad.sellerId !== req.user.id) || 
        (ad.adType === 'demand' && ad.buyerId !== req.user.id)) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to delete this ad'
        });
    }

    // Remove ad
    ads.splice(adIndex, 1);
    
    // Remove related messages
    messages = messages.filter(msg => msg.adId !== adId);

    res.json({
        success: true,
        message: 'Ad and related messages deleted successfully'
    });
});

// === MESSAGES ROUTES ===
app.get('/api/messages', auth, (req, res) => {
    const userMessages = messages.filter(msg => 
        msg.senderId === req.user.id || msg.recipientId === req.user.id
    );
    
    res.json({
        success: true,
        messages: userMessages
    });
});

app.post('/api/messages', auth, (req, res) => {
    try {
        const { adId, senderId, senderName, recipientId, recipientName, content, image } = req.body;

        const newMessage = {
            id: messages.length + 1,
            adId: parseInt(adId),
            senderId: parseInt(senderId),
            senderName,
            recipientId: parseInt(recipientId),
            recipientName,
            content,
            image: image || null,
            read: false,
            createdAt: new Date().toISOString()
        };

        messages.push(newMessage);

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

app.put('/api/messages/conversation/:conversationId/read', auth, (req, res) => {
    const conversationId = req.params.conversationId;
    const [user1Id, user2Id] = conversationId.split('-').map(Number);
    
    if (!user1Id || !user2Id) {
        return res.status(400).json({
            success: false,
            message: 'Invalid conversation ID'
        });
    }

    // Mark messages as read
    messages.forEach(msg => {
        if (msg.recipientId === req.user.id && 
            (msg.senderId === user1Id || msg.senderId === user2Id)) {
            msg.read = true;
        }
    });

    res.json({
        success: true,
        message: 'Conversation marked as read'
    });
});

app.delete('/api/messages/conversation/:conversationId', auth, (req, res) => {
    const conversationId = req.params.conversationId;
    const [user1Id, user2Id] = conversationId.split('-').map(Number);

    if (!user1Id || !user2Id) {
        return res.status(400).json({
            success: false,
            message: 'Invalid conversation ID'
        });
    }

    // Remove messages from conversation
    const initialLength = messages.length;
    messages = messages.filter(msg => 
        !((msg.senderId === user1Id && msg.recipientId === user2Id) ||
          (msg.senderId === user2Id && msg.recipientId === user1Id))
    );

    res.json({
        success: true,
        message: `Deleted ${initialLength - messages.length} messages`
    });
});

// === CONNECTIONS ROUTES ===
app.get('/api/connections', auth, (req, res) => {
    res.json({
        success: true,
        connections: connections
    });
});

app.post('/api/connections', auth, (req, res) => {
    try {
        const { targetId } = req.body;
        const sourceUser = users.find(u => u.id === req.user.id);

        if (!sourceUser) {
            return res.status(404).json({
                success: false,
                message: 'Source user not found'
            });
        }

        const newConnection = {
            id: connections.length + 1,
            sourceId: req.user.id,
            sourceName: sourceUser.fullname,
            sourceRole: sourceUser.role,
            sourcePhone: sourceUser.phone,
            targetId: parseInt(targetId),
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        // Add additional fields based on role
        if (sourceUser.role === 'driver') {
            newConnection.sourceLicensePlate = sourceUser.licensePlate;
        } else if (sourceUser.role === 'greenhouse') {
            newConnection.sourceAddress = sourceUser.address;
        }

        connections.push(newConnection);

        res.status(201).json({
            success: true,
            connection: newConnection
        });

    } catch (error) {
        console.error('Create connection error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in creating connection'
        });
    }
});

app.put('/api/connections/:id', auth, (req, res) => {
    const connectionId = parseInt(req.params.id);
    const { status, suspended } = req.body;
    const connection = connections.find(c => c.id === connectionId);

    if (!connection) {
        return res.status(404).json({
            success: false,
            message: 'Connection not found'
        });
    }

    // Check authorization
    if (connection.targetId !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to update this connection'
        });
    }

    if (status) connection.status = status;
    if (suspended !== undefined) connection.suspended = suspended;

    res.json({
        success: true,
        connection
    });
});

app.delete('/api/connections/:id', auth, (req, res) => {
    const connectionId = parseInt(req.params.id);
    const connectionIndex = connections.findIndex(c => c.id === connectionId);

    if (connectionIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Connection not found'
        });
    }

    const connection = connections[connectionIndex];
    
    // Check authorization
    if (connection.sourceId !== req.user.id && connection.targetId !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to delete this connection'
        });
    }

    connections.splice(connectionIndex, 1);

    res.json({
        success: true,
        message: 'Connection deleted successfully'
    });
});

// === REQUESTS ROUTES ===
app.get('/api/requests', auth, (req, res) => {
    res.json({
        success: true,
        requests: requests
    });
});

app.post('/api/requests', auth, (req, res) => {
    try {
        const { greenhouseId, greenhouseName, greenhousePhone, greenhouseAddress, sortingCenterId, sortingCenterName, type, quantity, description, location } = req.body;

        const newRequest = {
            id: requests.length + 1,
            greenhouseId: parseInt(greenhouseId),
            greenhouseName,
            greenhousePhone,
            greenhouseAddress,
            sortingCenterId: parseInt(sortingCenterId),
            sortingCenterName,
            type,
            quantity: parseInt(quantity),
            description: description || '',
            location,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        requests.push(newRequest);

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

app.put('/api/requests/:id', auth, (req, res) => {
    const requestId = parseInt(req.params.id);
    const request = requests.find(r => r.id === requestId);

    if (!request) {
        return res.status(404).json({
            success: false,
            message: 'Request not found'
        });
    }

    // Update request fields
    Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined) {
            request[key] = req.body[key];
        }
    });

    res.json({
        success: true,
        request
    });
});

app.delete('/api/requests/:id', auth, (req, res) => {
    const requestId = parseInt(req.params.id);
    const requestIndex = requests.findIndex(r => r.id === requestId);

    if (requestIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Request not found'
        });
    }

    const request = requests[requestIndex];
    
    // Check authorization
    if (request.greenhouseId !== req.user.id && request.sortingCenterId !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to delete this request'
        });
    }

    requests.splice(requestIndex, 1);

    res.json({
        success: true,
        message: 'Request deleted successfully'
    });
});

// Consolidated Delivery
app.post('/api/requests/consolidate', auth, (req, res) => {
    try {
        const { missionIds } = req.body;
        const driver = users.find(u => u.id === req.user.id);
        
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        const connection = connections.find(c => c.sourceId === req.user.id && c.status === 'approved');
        const sortingCenter = connection ? users.find(u => u.id === connection.targetId) : null;

        if (!sortingCenter) {
            return res.status(400).json({
                success: false,
                message: 'No sorting center connected'
            });
        }

        // Create consolidated delivery request
        const newRequest = {
            id: requests.length + 1,
            type: 'delivered_basket',
            status: 'in_progress_to_sorting',
            driverId: req.user.id,
            driverName: driver.fullname,
            sortingCenterId: sortingCenter.id,
            sortingCenterName: sortingCenter.fullname,
            quantity: missionIds.length,
            description: 'تحویل مرکزی بارهای تکمیل شده',
            createdAt: new Date().toISOString(),
            location: sortingCenter.location
        };

        requests.push(newRequest);

        // Mark original missions as consolidated
        missionIds.forEach(missionId => {
            const mission = requests.find(r => r.id === missionId);
            if (mission) {
                mission.isConsolidated = true;
            }
        });

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
app.post('/api/requests/:id/reject', auth, (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const { reason } = req.body;
        const request = requests.find(r => r.id === requestId);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        // Update request status
        request.status = 'rejected';
        request.rejectionReason = reason;
        request.completedAt = new Date().toISOString();

        res.json({
            success: true,
            request
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
        const user = users.find(u => u.phone === phone);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

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

// === CATCH-ALL ROUTE - FIXED VERSION ===
// این route باید حتما آخرین route باشه
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Web Frontend: ${process.env.WEB_URL}`);
    console.log(`📱 Mobile Frontend: ${process.env.MOBILE_URL}`);
    console.log(`🔗 Test URL: http://localhost:${PORT}/api/test`);
    console.log(`🔐 Auth URL: http://localhost:${PORT}/api/auth`); // ✅ اضافه کنید
});