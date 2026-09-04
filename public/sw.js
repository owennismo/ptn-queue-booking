const CACHE_NAME = 'ptn-queue-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/track',
  '/admin',
];

// 1. Install event: pre-cache critical shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Activate event: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch event: Stale-While-Revalidate for pages & assets, Network-First for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // For API calls: Network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            error: 'คุณกำลังอยู่ในโหมดออฟไลน์ (ไม่มีการเชื่อมต่ออินเทอร์เน็ต)',
            is_offline: true,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 503,
          }
        );
      })
    );
    return;
  }

  // For static assets & pages: Cache first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(request).catch(() => {
        // If offline and requesting an HTML page, return cached home
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/');
        }
      });
    })
  );
});

// 4. Push event: Handle incoming Web Push Notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'PTN Pharma Center แจ้งเตือนคิวส่งของ',
    body: 'มีการอัปเดตสถานะคิวการเข้าส่งสินค้า',
    icon: '/icon-192.png',
    badge: '/favicon.png',
    data: { url: '/' },
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/favicon.png',
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 5. Notification Click event: Focus or open window to the specific booking URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, navigate and focus it
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

