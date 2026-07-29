const CACHE = 'daybook-v5';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/colors_and_type.css',
  '/styles.css',
  '/tweaks-panel.jsx',
  '/calendar.jsx',
  '/modules.jsx',
  '/views.jsx',
  '/app.jsx',
];
// Never cache these — always fetch fresh so config changes take effect immediately
const NO_CACHE = new Set(['/config.js', '/supabase-sync.js']);

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
  if (url.origin !== self.location.origin) return;
  // Config files always bypass cache — fetch direct from network
  if (NO_CACHE.has(url.pathname)) {
    e.respondWith(fetch(e.request));
    return;
  }
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
