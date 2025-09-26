import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.Soodcity.myapp',
  appName: 'Soodcity',
  webDir: 'public',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,  // برای بارگذاری منابع خارجی
    captureInput: true
  }
};

export default config;