// test-fcm-fixed.js
require('dotenv').config();
const fcmService = require('./fcm-service');

async function testFCM() {
  try {
    console.log('🧪 شروع تست FCM v1 API (نسخه اصلاح شده)...');
    
    // ابتدا زمان را بررسی کنید
    console.log('🕒 زمان سیستم شما:', new Date().toString());
    
    // تست با یک توکن نمونه
    const testToken = 'test-token-placeholder'; // با توکن واقعی جایگزین کنید
    
    const result = await fcmService.sendToDevice(testToken, {
      title: 'تست FCM v1 🚀',
      body: 'این یک پیام تست از HTTP v1 API است!',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('✅ تست موفقیت‌آمیز بود:', result);
    return result;
  } catch (error) {
    console.error('❌ تست ناموفق:', error.message);
    
    // اطلاعات بیشتر برای دیباگ
    if (error.message.includes('JWT') || error.message.includes('token')) {
      console.log('\n🔧 پیشنهادات عیب‌یابی:');
      console.log('1. زمان سیستم خود را بررسی و همگام‌سازی کنید');
      console.log('2. از دستور w32tm /resync استفاده کنید');
      console.log('3. فایل service account را بررسی کنید');
    }
    
    process.exit(1);
  }
}

// اگر فایل مستقیماً اجرا شود
if (require.main === module) {
  testFCM();
}

module.exports = testFCM;