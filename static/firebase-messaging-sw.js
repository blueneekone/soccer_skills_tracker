/* global importScripts, firebase */
/**
 * firebase-messaging-sw.js — Vanguard FCM Background Service Worker
 * ──────────────────────────────────────────────────────────────────
 * Handles push messages when the app is closed / backgrounded.
 * Must live at the root path (/firebase-messaging-sw.js) to have
 * sufficient scope to intercept all FCM payloads.
 *
 * Epic 12: Enhanced with:
 *   • Richer notification options (vibrate, badge, actions, tag)
 *   • Category-based routing (click opens deep link from payload.data.link)
 *   • Notification click handler — focuses existing app tab or opens new one
 */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

var firebaseConfigDev = {
	apiKey: 'AIzaSyCiBoemXJHTkTnujTwM1vOJc4FrVZF8Lw8',
	authDomain: 'sports-skill-tracker-dev.firebaseapp.com',
	projectId: 'sports-skill-tracker-dev',
	storageBucket: 'sports-skill-tracker-dev.firebasestorage.app',
	messagingSenderId: '4624204181',
	appId: '1:4624204181:web:d6c576088f0eb7d3d0f69c',
	measurementId: 'G-1YX13X6DQ6'
};

var firebaseConfigProd = {
	apiKey: 'AIzaSyDNmo6dACOLzOSkC93elMd5yMbFmsUXO1w',
	authDomain: 'soccer.sstracker.app',
	projectId: 'soccer-skills-tracker',
	storageBucket: 'soccer-skills-tracker.firebasestorage.app',
	messagingSenderId: '884044129977',
	appId: '1:884044129977:web:47d54f59c891340e505d68'
};

var host = self.location.hostname;
var isProd =
	host === 'soccer.sstracker.app' ||
	host === 'soccer-skills-tracker.web.app' ||
	host === 'soccer-skills-tracker.firebaseapp.com';

var firebaseConfig = isProd ? firebaseConfigProd : firebaseConfigDev;

firebase.initializeApp(firebaseConfig);
var messaging = firebase.messaging();

// ── Category → vibration pattern map ────────────────────────────────────────
var VIBRATE_PATTERNS = {
	push_weatherAlerts: [200, 100, 200, 100, 400], // urgent: triple burst
	push_gameReminders: [150, 100, 150],            // moderate: double burst
	push_messages:      [100],                       // light: single pulse
	default:            [200]
};

messaging.onBackgroundMessage(function (payload) {
	var data = payload.data || {};
	var category = data.category || 'default';
	var kind = data.kind || '';

	var title = (payload.notification && payload.notification.title) || 'VANGUARD NEXUS';
	var body  = (payload.notification && payload.notification.body)  || '';

	// Phase 4, Epic 8 — Car Ride Home: resolve the deep link.
	// Prefer `clickAction` (set by deliverCarRideHomePush) over legacy `link`.
	var resolvedLink = data.clickAction || data.link || '/';

	var options = {
		body:    body,
		icon:    '/Images/Phoenixes_Logo_2026.png',
		badge:   '/Images/Phoenixes_Logo_2026.png',
		vibrate: VIBRATE_PATTERNS[category] || VIBRATE_PATTERNS['default'],
		// Car Ride Home gets its own tag so it never collapses with other categories.
		tag:     kind === 'car_ride_home' ? 'car_ride_home' : category,
		renotify: true,
		data: {
			link:      resolvedLink,
			category:  category,
			kind:      kind,
			fixtureId: data.fixtureId || '',
			tenantId:  data.tenantId  || ''
		}
	};

	// Weather alerts get an amber accent via a custom image if provided
	if (data.imageUrl) options.image = data.imageUrl;

	return self.registration.showNotification(title, options);
});

// ── Notification click handler ───────────────────────────────────────────────
// When the user taps the notification, focus the app tab if already open,
// or open a new tab navigating to the deep link from payload.data.link.
self.addEventListener('notificationclick', function (event) {
	event.notification.close();

	var targetUrl = (event.notification.data && event.notification.data.link) || '/';
	var origin    = self.location.origin;
	var fullUrl   = targetUrl.startsWith('http') ? targetUrl : origin + targetUrl;

	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
			// Focus existing tab if URL matches
			for (var i = 0; i < windowClients.length; i++) {
				var client = windowClients[i];
				if (client.url.startsWith(origin) && 'focus' in client) {
					client.focus();
					if ('navigate' in client) client.navigate(fullUrl);
					return;
				}
			}
			// No matching tab — open a new one
			if (clients.openWindow) return clients.openWindow(fullUrl);
		})
	);
});
