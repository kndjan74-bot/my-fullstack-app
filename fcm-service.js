// fcm-service-fixed.js
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');

class FCMService {
  constructor() {
    this.auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    
    this.projectId = process.env.FIREBASE_PROJECT_ID;
  }

  /**
   * دریافت Access Token با مدیریت زمان بهتر
   */
  async getAccessToken() {
    try {
      console.log('🕒 دریافت Access Token...');
      
      // روش 1: استفاده از کتابخانه گوگل
      try {
        const client = await this.auth.getClient();
        const accessToken = await client.getAccessToken();
        console.log('✅ Access Token دریافت شد (روش گوگل)');
        return accessToken.token;
      } catch (googleError) {
        console.log('⚠️ روش گوگل شکست خورد، استفاده از روش دستی...');
        return await this.getManualAccessToken();
      }
      
    } catch (error) {
      console.error('❌ خطا در دریافت Access Token:', error.message);
      throw error;
    }
  }

  /**
   * روش دستی با مدیریت دقیق زمان
   */
  async getManualAccessToken() {
    const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    
    // زمان فعلی با حاشیه امنیت
    const now = Math.floor(Date.now() / 1000);
    const iat = now - 60; // 60 ثانیه قبل (برای حاشیه امنیت)
    const exp = iat + 3600; // 1 ساعت بعد

    console.log('🕒 زمان JWT:', {
      iat: new Date(iat * 1000).toISOString(),
      exp: new Date(exp * 1000).toISOString(),
      now: new Date(now * 1000).toISOString()
    });

    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: exp,
      iat: iat
    };

    // اطمینان از فرمت صحیح private key
    const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');

    const token = jwt.sign(payload, privateKey, {
      algorithm: 'RS256'
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${token}`
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Google OAuth Error: ${data.error} - ${data.error_description}`);
    }

    console.log('✅ Access Token دستی دریافت شد');
    return data.access_token;
  }

  async sendToDevice(deviceToken, payload) {
    try {
      const accessToken = await this.getAccessToken();
      
      const message = {
        message: {
          token: deviceToken,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data || {},
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              click_action: 'FCM_PLUGIN_ACTIVITY'
            }
          }
        }
      };

      const url = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;
      
      console.log('🚀 ارسال نوتیفیکیشن...');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ خطای FCM:', result.error);
        throw new Error(result.error?.message || `FCM error: ${response.status}`);
      }

      console.log('✅ نوتیفیکیشن با موفقیت ارسال شد');
      return result;
    } catch (error) {
      console.error('❌ خطا در ارسال نوتیفیکیشن:', error.message);
      throw error;
    }
  }
}

module.exports = new FCMService();