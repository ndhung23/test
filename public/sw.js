// Service Worker for ToolKit PWA
const CACHE_NAME = 'toolkit-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon1.png',
  '/icon-192.png',
  '/icon-512.png',
];

// Install: Cache critical static shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[PWA SW] Pre-caching failed:', err);
      });
    })
  );
});

// Activate: Clean old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for API requests, Cache-fallback for static assets
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Không cache các request socket, api, gemini, firebase hoặc chrome-extension
  if (
    event.request.method !== 'GET' ||
    requestUrl.protocol.startsWith('chrome-extension') ||
    requestUrl.pathname.includes('/api/') ||
    requestUrl.hostname.includes('firebase') ||
    requestUrl.hostname.includes('googleapis') ||
    requestUrl.hostname.includes('generativelanguage') ||
    requestUrl.pathname.includes('/hot-update') ||
    requestUrl.pathname.includes('/metro')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Chỉ lưu cache khi response hợp lệ (200)
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Khi mất mạng: Thử tìm trong cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fallback về trang chủ nếu là navigation request
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});
