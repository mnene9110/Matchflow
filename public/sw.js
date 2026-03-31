
const CACHE_NAME = 'matchflow-v1';
const urlsToCache = [
  '/',
  '/welcome',
  '/login',
  '/discover',
  '/chat',
  '/profile',
  '/globals.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
