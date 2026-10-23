// Bump on every service-worker change so old caches are cleaned up.
const CACHE_NAME = 'moneytrack-v3';

// App shell. Paths are relative to this file's scope (/expense-manager/ on GitHub Pages),
// so they never hit the host root, which 404s and used to break install.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './expenses.png',
  './icon-192.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.clients.matchAll())
      .then((clients) => {
        // Don't skip waiting automatically - the app shows an "Update available" prompt
        clients.forEach((client) => client.postMessage({ type: 'UPDATE_AVAILABLE', version: CACHE_NAME }));
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll())
      .then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'APP_UPDATED', version: CACHE_NAME }));
      })
  );
});

const putInCache = (request, response) => {
  if (response && response.status === 200 && response.type === 'basic') {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Firebase, exchange-rate API and other cross-origin calls go straight to the network.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Page loads: network first so a new deploy shows up, cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => putInCache('./index.html', response))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static assets (Vite hashes file names): cache first, then network.
  // ponytail: old hashed assets pile up until CACHE_NAME is bumped; prune by build manifest if storage ever matters.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => putInCache(request, response)))
  );
});
