const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();
console.log('کلید عمومی:', vapidKeys.publicKey);
console.log('کلید خصوصی:', vapidKeys.privateKey);