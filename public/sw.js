// Service Worker for MatchFlow PWA
// satisfies PWA installation requirements

self.addEventListener('install', (event) => {
  console.log('MatchFlow SW: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('MatchFlow SW: Activated.');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Fetch event listener is required for PWA installation
  // We don't cache assets here to ensure users always have the latest Vercel build
});