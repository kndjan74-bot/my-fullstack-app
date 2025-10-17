let watchId = null;
let isTracking = false;

const CACHE_NAME = 'soodcity-cache-v1';
const URLS_TO_CACHE = [
    '/',
    'style.css',
    'script.js',
    'soodcity.jpg'
];

function startGeolocationWatch() {
    if (!isTracking) return;

    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }

    console.log('Service Worker: Starting/Restarting geolocation watch.');
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const timestamp = new Date(position.timestamp).toISOString();
        
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'location-update',
              location: location,
              timestamp: timestamp
            });
          });
        });
      },
      (error) => {
        console.error('Service Worker Geolocation Error:', error.message);
        if (isTracking) {
            console.log('Restarting watch due to error.');
            setTimeout(startGeolocationWatch, 5000);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
}

function stopGeolocationWatch() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    isTracking = false;
    console.log('Service Worker: Geolocation tracking stopped.');
}


self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('Service Worker installing.');
  
  event.waitUntil(
      caches.open(CACHE_NAME)
          .then((cache) => {
              console.log('Opened cache');
              return cache.addAll(URLS_TO_CACHE);
          })
  );
});

self.addEventListener('activate', (event) => {
  clients.claim();
  console.log('Service Worker activating.');

  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
      caches.keys().then((cacheNames) => {
          return Promise.all(
              cacheNames.map((cacheName) => {
                  if (cacheWhitelist.indexOf(cacheName) === -1) {
                      return caches.delete(cacheName);
                  }
              })
          );
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'start-tracking') {
    console.log('Service Worker: Received start-tracking message.');
    isTracking = true;
    startGeolocationWatch();
  } else if (event.data === 'stop-tracking') {
    console.log('Service Worker: Received stop-tracking message.');
    stopGeolocationWatch();
  }
});

self.addEventListener('push', event => {
    console.log('[Service Worker] Push Received.');
    
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            console.error('[Service Worker] Push event data is not valid JSON.', e);
            data = { title: 'New Notification', body: event.data.text() };
        }
    }

    const title = data.title || 'SoodCity Notification';
    const options = {
        body: data.body || 'You have a new message.',
        icon: 'soodcity.jpg',
        badge: 'soodcity.jpg'
    };

    const notificationPromise = self.registration.showNotification(title, options);
    event.waitUntil(notificationPromise);
});

self.addEventListener('fetch', (event) => {
    // For API requests, always go to the network.
    // This prevents caching of dynamic data and avoids potential fetch errors.
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch((error) => {
                console.error('Service Worker Fetch Error (API):', error);
                // Optionally, you could return a generic JSON error response
                return new Response(JSON.stringify({ success: false, message: 'Network error' }), {
                  headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // For all other requests (static assets), use a cache-first strategy.
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // Not in cache - go to network
                return fetch(event.request).catch((error) => {
                    console.error('Service Worker Fetch Error (Assets):', error);
                });
            })
    );
});