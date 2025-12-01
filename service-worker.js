// Name of the cache storage
const CACHE_NAME = 'moneytrack-v1';

// Files to cache (The main build artifacts)
const urlsToCache = [
  '/',
  '/index.html',
  // Vite build artifacts will be dynamic, but caching the root and main entry is critical
  // For a real Vite build, you'd list the bundled assets here (e.g., /assets/index-XXXX.js, /assets/index-XXXX.css)
  // For this environment, we just cache the main entry points.
  // The browser cache will handle the rest of the imported modules.
];

// Install event: cache assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache, adding app shell assets');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
  );
  // Take control of uncontrolled clients immediately
  self.clients.claim();
});

// Fetch event: Serve from cache first, then fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // No cache hit - fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // IMPORTANT: Since Firebase sync logic is entirely handled in App.tsx using the
            // `navigator.onLine` API and LocalStorage, we do NOT attempt to cache dynamic
            // requests (like Firebase API calls) here. We rely on the app's sync mechanism.
            
            // Clone the response because it's a stream and can only be consumed once
            const responseToCache = networkResponse.clone();
            
            // Only cache GET requests for static assets
            if (event.request.method === 'GET') {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          });
      })
      .catch(() => {
        // If both cache and network fail (e.g., completely offline), you can serve a fallback page
        // Since the App Shell is cached, this usually won't fire for the main HTML/JS
        console.warn('Network and cache failed for:', event.request.url);
        return new Response('You are offline and no cache was found for this page.');
      })
  );
});