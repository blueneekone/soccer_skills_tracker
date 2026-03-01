// sw.js
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Installed');
    // Forces the waiting service worker to become the active service worker
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    console.log('[Service Worker] Activated');
});

// The browser REQUIRES a fetch listener to officially install the PWA
self.addEventListener('fetch', (e) => {
    // For now, just let all network requests pass through normally
    return;
});