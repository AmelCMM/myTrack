const CACHE_NAME = 'mytrack-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/app.js',
  '/js/state.js',
  '/js/storage.js',
  '/js/bridge.js',
  '/js/themes.js',
  '/js/helpers.js',
  '/js/constants.js',
  '/js/i18n.js',
  '/js/navigation.js',
  '/js/components.js',
  '/js/sheets.js',
  '/js/screens/home.js',
  '/js/screens/timeline.js',
  '/js/screens/insights.js',
  '/js/screens/journal.js',
  '/js/screens/settings.js',
  '/js/screens/health.js',
  '/js/screens/study.js',
  '/js/screens/projects.js',
  '/js/screens/mood.js',
  '/js/screens/finance.js',
  '/js/features/goals.js',
  '/js/features/challenges.js',
  '/js/features/achievements.js',
  '/js/features/analytics.js',
  '/js/features/reports.js',
  '/js/features/notifications.js',
  '/js/features/sync.js',
  '/js/features/search.js',
  '/js/features/timer.js',
  '/js/features/onboarding.js',
  '/js/features/export.js',
  '/js/features/health-ext.js',
  '/js/features/finance-ext.js',
  '/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('capacitor')) {
    event.respondWith(fetch(event.request));
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).catch(() => caches.match('/offline.html'));
      })
    );
    return;
  }
  if (event.request.destination === 'image' || event.request.destination === 'font') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).catch(() => new Response('', { status: 200 }));
      })
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
      return cached || fetchPromise;
    })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CACHE_NEW_ROUTE') {
    caches.open(CACHE_NAME).then(cache => {
      cache.add(event.data.url);
    });
  }
});
