/**
 * MatchFlow Service Worker
 * Satisfies PWA requirements for installability.
 */

const CACHE_NAME = 'matchflow-v1';

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Allow the service worker to take control of pages immediately.
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Standard fetch handler to satisfy PWA criteria.
  // In a more advanced PWA, we would implement caching strategies here.
  event.respondWith(fetch(event.request).catch(() => {
    // Optional: Return a custom offline page if the network fails
    return caches.match(event.request);
  }));
});
