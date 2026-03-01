self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    // Take immediate control of the page
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    // 1. DO NOT INTERCEPT FIREBASE AUTHENTICATION
    // This allows Google Login to work perfectly
    if (e.request.url.includes('/__/')) {
        return false; 
    }

    // 2. PASS EVERYTHING ELSE TO THE NETWORK
    // This satisfies Chrome's requirement for a valid PWA
    e.respondWith(fetch(e.request));
});