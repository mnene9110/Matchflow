const CACHE_NAME = 'matchflow-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/manifest.json']);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // A fetch handler is required for PWA installation
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});