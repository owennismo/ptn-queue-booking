const CACHE_NAME = 'ptn-queue-cache-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/admin-manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/admin-icon-192.png',
  '/admin-icon-512.png',
  '/admin-apple-touch-icon.png',
  '/favicon.png',
  '/admin-favicon.png',
  '/track',
  '/admin',
  '/admin/login'
];

// 1. Install event: pre-cache critical shell and force immediate activation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Activate event: cleanup old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch event: Network-First for Navigation (HTML) & API, Cache-First for static media/fonts
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // For API calls: Network-first with offline JSON fallback
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

  // For HTML page navigations: Network-First so updates/auth always load fresh
  const isHtmlNavigation = request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');
  if (isHtmlNavigation) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline, serve from cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // Fallback to cached home or admin
            if (url.pathname.startsWith('/admin')) {
              return caches.match('/admin/login') || caches.match('/admin');
            }
            return caches.match('/');
          });
        })
    );
    return;
  }

  // For other static assets (images, fonts, scripts): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Push event: Handle incoming Web Push Notifications from server (VAPID)
self.addEventListener('push', (event) => {
  let data = {
    title: 'PTN Pharma Center แจ้งเตือนคิวส่งของ',
    body: 'มีการอัปเดตสถานะคิวการเข้าส่งสินค้า',
    icon: '/icon-192.png',
    badge: '/favicon.png',
    tag: 'ptn-queue-alert',
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
      if (parsed.data && typeof parsed.data === 'object') {
        data.data = parsed.data;
      }
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const targetUrl = (data.data && data.data.url) || data.url || '/';

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/favicon.png',
    vibrate: [250, 100, 250, 100, 250],
    tag: data.tag || 'ptn-queue-alert',
    renotify: true,
    data: {
      url: targetUrl,
      booking_id: (data.data && data.data.booking_id) || data.booking_id,
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 5. Notification Click event: Focus or open window to the specific booking URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetPath = (event.notification.data && event.notification.data.url) || '/';
  const fullTargetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open with the ticket, navigate and focus it
      for (let client of windowClients) {
        if (client.url.includes(targetPath) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(fullTargetUrl);
      }
    })
  );
});
