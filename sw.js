importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDNmo6dACOLzOSkC93elMd5yMbFmsUXO1w",
  authDomain: "soccer.sstracker.app",
  projectId: "soccer-skills-tracker",
  storageBucket: "soccer-skills-tracker.firebasestorage.app",
  messagingSenderId: "884044129977",
  appId: "1:884044129977:web:47d54f59c891340e505d68"
});

const messaging = firebase.messaging();

// BUMPED TO V2 - This forces the browser to update the service worker
const CACHE_NAME = 'aggies-fc-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting(); // Force the new worker to activate immediately
});

// THE NUCLEAR OPTION: Delete any old, broken caches from v1
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('Destroying old cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    if (e.request.url.includes('/__/')) {
        return; 
    }
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});