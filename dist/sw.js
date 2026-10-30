// Service Worker for LoveCare PWA (Network-first with offline fallback)
const CACHE_NAME = 'lovecare-v6';

// In-memory cache for recent push tags to prevent duplicated OS notifications
const recentPushTags = new Map();

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

// Support manual cache busting / update reload & badge commands from app
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
  // Badging support via Service Worker
  if (event.data.type === 'SET_BADGE') {
    if (self.navigator && 'setAppBadge' in self.navigator) {
      self.navigator.setAppBadge(event.data.count || 1).catch(() => {});
    }
  }
  if (event.data.type === 'CLEAR_BADGE') {
    if (self.navigator && 'clearAppBadge' in self.navigator) {
      self.navigator.clearAppBadge().catch(() => {});
    }
  }
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

  const notifTag = `${payload.tag || 'lovecare'}-${Date.now()}`;

  // 1. Deduplication: Check if this exact notification tag was already processed within last 2 seconds
  const now = Date.now();
  if (payload.tag && recentPushTags.has(payload.tag)) {
    const prevTime = recentPushTags.get(payload.tag);
    if (now - prevTime < 2000) {
      console.log(`[SW] Suppressed duplicate push notification for tag: ${payload.tag}`);
      return;
    }
  }
  if (payload.tag) {
    recentPushTags.set(payload.tag, now);
  }

  // Clean old tags from map to prevent memory leak
  if (recentPushTags.size > 50) {
    for (const [tagKey, tagTime] of recentPushTags.entries()) {
      if (now - tagTime > 30000) recentPushTags.delete(tagKey);
    }
  }

  // 2. Set App Badge if supported on device
  if (self.navigator && 'setAppBadge' in self.navigator) {
    const badgeCount = payload.badgeCount || 1;
    self.navigator.setAppBadge(badgeCount).catch(() => {});
  }

  const options = {
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [600, 200, 600, 200, 600, 400],
    tag: notifTag,
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: {
      url: payload.url || `/?forceAlarm=1&t=${Date.now()}`,
      alarmId: payload.alarmId,
      title: payload.title,
      body: payload.body,
      badgeCount: payload.badgeCount || 1
    }
  };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. Broadcast to any open app windows to update in-app UI immediately
      clientList.forEach((c) => {
        c.postMessage({ type: 'TRIGGER_MANDATORY_ALARM', payload });
      });

      // 2. Always trigger OS system notification so iPhone displays floating banner / lock screen alert
      return self.registration.showNotification(payload.title, options);
    })
  );
});

// Handle notification tap / click -> open or focus the LoveCare PWA and trigger full screen alarm
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Clear app badge when user clicks / acts on notification
  if (self.navigator && 'clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  const notifData = event.notification.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({ type: 'TRIGGER_MANDATORY_ALARM', payload: notifData });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
