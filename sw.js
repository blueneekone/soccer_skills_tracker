const CACHE_NAME = 'aggies-fc-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js'
];

self.addEventListener('install', (e) => {
    // Save the core files to the phone during install
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    // 1. Ignore Firebase Auth routes completely
    if (e.request.url.includes('/__/')) {
        return; 
    }

    // 2. Try the network first. If offline, load from the phone's cache!
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});