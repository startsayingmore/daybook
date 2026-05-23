const CACHE = 'daybook-v1';
const SHELL = [
  '/daybook/',
  '/daybook/index.html',
  '/daybook/config.js',
  '/daybook/manifest.json',
  '/daybook/icon.svg',
  '/daybook/colors_and_type.css',
  '/daybook/styles.css',
  '/daybook/tweaks-panel.jsx',
  '/daybook/calendar.jsx',
  '/daybook/modules.jsx',
  '/daybook/views.jsx',
  '/daybook/app.jsx',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first: serve fresh when online, fall back to cache when offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Only cache same-origin requests (skip CDN libs, Google APIs, etc.)
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
