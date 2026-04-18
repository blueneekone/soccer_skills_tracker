importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

//firebase.initializeApp({
  //apiKey: "AIzaSyDNmo6dACOLzOSkC93elMd5yMbFmsUXO1w",
  //authDomain: "soccer.sstracker.app",
  //projectId: "soccer-skills-tracker",
  //storageBucket: "soccer-skills-tracker.firebasestorage.app",
  //messagingSenderId: "884044129977",
  //appId: "1:884044129977:web:47d54f59c891340e505d68"
//});

firebase.initializeApp({
     apiKey: "AIzaSyCiBoemXJHTkTnujTwM1vOJc4FrVZF8Lw8",
    authDomain: "sports-skill-tracker-dev.firebaseapp.com",
    projectId: "sports-skill-tracker-dev",
    storageBucket: "sports-skill-tracker-dev.firebasestorage.app",
    messagingSenderId: "4624204181",
    appId: "1:4624204181:web:d6c576088f0eb7d3d0f69c",
    measurementId: "G-1YX13X6DQ6"
});

const messaging = firebase.messaging();

const CACHE_NAME = 'sstracker-v3.5';
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

messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/Images/Phoenixes_Logo_2026.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});