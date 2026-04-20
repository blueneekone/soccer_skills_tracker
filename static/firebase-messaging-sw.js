/* global importScripts, firebase */
/* Epic 13: background FCM — version aligned with app firebase@10.14.x */
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

messaging.onBackgroundMessage(function (payload) {
	var title =
		(payload.notification && payload.notification.title) || 'SSTRACKER';
	var body = (payload.notification && payload.notification.body) || '';
	var options = {
		body: body,
		icon: '/Images/Phoenixes_Logo_2026.png',
		badge: '/Images/Phoenixes_Logo_2026.png',
		data: payload.data || {}
	};
	return self.registration.showNotification(title, options);
});
