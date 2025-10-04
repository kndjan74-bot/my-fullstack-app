const UserSchema = new mongoose.Schema({
    id: { type: Number, unique: true, sparse: true }, // اضافه کردن فیلد id عددی
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

// middleware برای تولید خودکار id عددی
UserSchema.pre('save', async function(next) {
    if (this.isNew && !this.id) {
        try {
            const lastUser = await this.constructor.findOne().sort({ id: -1 });
            this.id = lastUser ? lastUser.id + 1 : 1;
            console.log(`🔢 تولید id عددی: ${this.id} برای کاربر ${this.fullname}`);
        } catch (error) {
            console.error('خطا در تولید id عددی:', error);
        }
    }
    next();
});