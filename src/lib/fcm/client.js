import { browser } from '$app/environment';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { httpsCallable } from 'firebase/functions';
import { app, functions } from '$lib/firebase.js';

const registerDeviceToken = httpsCallable(functions, 'registerDeviceToken');

/**
 * @returns {Promise<'granted'|'denied'|'default'>}
 */
export async function requestNotificationPermission() {
	if (!browser || !('Notification' in window)) {
		return 'denied';
	}
	return Notification.requestPermission();
}

/**
 * Registers `/firebase-messaging-sw.js`, obtains an FCM token, and stores it via callable.
 * Requires `Notification.permission === 'granted'` and `import.meta.env.VITE_FCM_VAPID_KEY`.
 *
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function registerFcmTokenWithBackend() {
	if (!browser) {
		return { ok: false, reason: 'no-browser' };
	}
	const supported = await isSupported();
	if (!supported) {
		return { ok: false, reason: 'not-supported' };
	}

	const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY;
	if (!vapidKey || typeof vapidKey !== 'string' || !vapidKey.trim()) {
		console.warn('[FCM] Set VITE_FCM_VAPID_KEY (Web Push cert in Firebase Console).');
		return { ok: false, reason: 'no-vapid' };
	}

	if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
		return { ok: false, reason: 'not-granted' };
	}

	const messaging = getMessaging(app);
	let registration;
	try {
		registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
	} catch (e) {
		console.error('[FCM] service worker registration failed', e);
		return { ok: false, reason: 'sw-failed' };
	}

	let token;
	try {
		token = await getToken(messaging, {
			vapidKey: vapidKey.trim(),
			serviceWorkerRegistration: registration
		});
	} catch (e) {
		console.error('[FCM] getToken failed', e);
		return { ok: false, reason: 'token-failed' };
	}

	if (!token) {
		return { ok: false, reason: 'no-token' };
	}

	try {
		await registerDeviceToken({ fcmToken: token });
	} catch (e) {
		console.error('[FCM] registerDeviceToken callable failed', e);
		return { ok: false, reason: 'register-failed' };
	}

	return { ok: true };
}
