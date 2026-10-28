// Service Worker for LoveCare PWA (Network-first with offline fallback)
const CACHE_NAME = 'lovecare-v2';

self.addEventListener('install', (event) => {
  // Activate worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clear all old caches
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Don't intercept API, uploads or websocket
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('/uploads/') ||
    event.request.url.includes('/socket.io/')
  ) {
    return;
  }

  // Network first for all requests
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if offline
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Handle incoming Web Push notifications (iOS 16.4+ / Android)
self.addEventListener('push', (event) => {
  let payload = { title: 'LoveCare Báo Thức', body: 'Đến giờ uống nước hoặc ăn uống rồi! Vào app chụp ảnh để tắt rung.' };
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [600, 200, 600, 200, 600, 400],
    tag: payload.tag || 'lovecare-alarm',
    renotify: true,
    requireInteraction: true,
    data: {
      url: '/'
    }
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// Handle notification tap / click -> open or focus the LoveCare PWA
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
