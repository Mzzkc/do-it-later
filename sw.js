// Do It (Later) - Service Worker
// Network-first for code, cache-first for assets

const CACHE_NAME = 'do-it-later-v1.20.4';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/styles/mobile.css',
  '/scripts/app.js',
  '/scripts/config.js',
  '/scripts/deadline-picker.js',
  '/scripts/dev-mode.js',
  '/scripts/import-export-manager.js',
  '/scripts/interaction-manager.js',
  '/scripts/pomodoro.js',
  '/scripts/qr-handler.js',
  '/scripts/qr-scanner.js',
  '/scripts/qrcode.min.js',
  '/scripts/renderer.js',
  '/scripts/storage.js',
  '/scripts/sync.js',
  '/scripts/task-controller.js',
  '/scripts/task-manager.js',
  '/scripts/utils.js',
  '/manifest.json'
];

// Install event - cache resources and activate immediately
self.addEventListener('install', event => {
  self.skipWaiting(); // Force immediate activation
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache v1.20.4');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - network-first for code, cache fallback for offline
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first strategy for JS and CSS (always get latest code)
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update cache with new version
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-first for everything else (HTML, images, etc.)
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request);
        })
    );
  }
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});
