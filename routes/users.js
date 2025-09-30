const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

// Bring in the User model
const User = require('../models/User');

// @route   POST api/users/register
// @desc    Register a user
// @access  Public
router.post(
  '/register',
  [
    // express-validator checks
    check('fullname', 'لطفا نام کامل را وارد کنید').not().isEmpty(),
    check('phone', 'لطفا شماره تلفن معتبر وارد کنید').isMobilePhone('fa-IR'),
    check('password', 'رمز عبور باید حداقل 6 کاراکتر باشد').isLength({ min: 6 }),
    check('role', 'لطفا نقش خود را انتخاب کنید').not().isEmpty(),
    check('province', 'لطفا استان خود را انتخاب کنید').not().isEmpty(),
    check('address', 'لطفا آدرس را وارد کنید').not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, phone, password, role, province, address, licensePlate } = req.body;

    try {
      // See if user exists
      let user = await User.findOne({ phone });

      if (user) {
        return res.status(400).json({ msg: 'کاربری با این شماره تلفن از قبل موجود است' });
      }

      user = new User({
        fullname,
        phone,
        password,
        role,
        province,
        address,
        licensePlate
      });

      // The password will be hashed by the pre-save hook in the model
      await user.save();

      // Return jsonwebtoken
      const payload = {
        user: {
          id: user.id,
          role: user.role
        },
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '5h' }, // Token expires in 5 hours
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('خطای سرور');
    }
  }
);

// @route   POST api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('phone', 'لطفا شماره تلفن معتبر وارد کنید').isMobilePhone('fa-IR'),
    check('password', 'رمز عبور الزامی است').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, password } = req.body;

    try {
      // See if user exists
      let user = await User.findOne({ phone });

      if (!user) {
        return res.status(400).json({ msg: 'اطلاعات ورود نامعتبر است' });
      }

      // Check if password matches
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ msg: 'اطلاعات ورود نامعتبر است' });
      }

      // Return jsonwebtoken
      const payload = {
        user: {
          id: user.id,
          role: user.role
        },
      };

      jwt.sign(
  payload,
  process.env.JWT_SECRET,
  { expiresIn: '5h' },
  (err, token) => {
    if (err) throw err;
    res.json({ 
      token,  // ✅ توکن
      user: { // ✅ اطلاعات کاربر
        id: user._id,
        fullname: user.fullname,
        phone: user.phone, 
        role: user.role,
        province: user.province
      }
    });
  }
);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('خطای سرور');
    }
  }
);
// @route   GET api/users/auth
// @desc    Get authenticated user
// @access  Private
router.get('/auth', async (req, res) => {
  try {
    // دریافت توکن از header
    const token = req.header('x-auth-token');
    
    if (!token) {
      return res.status(401).json({ msg: 'توکن ارائه نشده است' });
    }

    // بررسی اعتبار توکن
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // پیدا کردن کاربر در دیتابیس
    const user = await User.findById(decoded.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'کاربر یافت نشد' });
    }

    // برگرداندن اطلاعات کاربر
    res.json({
      id: user._id,
      fullname: user.fullname,
      phone: user.phone, 
      role: user.role,
      province: user.province,
      address: user.address,
      licensePlate: user.licensePlate
    });
  } catch (err) {
    console.error(err.message);
    res.status(401).json({ msg: 'توکن معتبر نیست' });
  }
});
module.exports = router;