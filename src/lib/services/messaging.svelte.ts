/**
 * messaging.svelte.ts — Vanguard FCM Device Registration Service
 * ────────────────────────────────────────────────────────────────
 * Manages the full lifecycle of a Web Push device token:
 *   1. Request browser notification permission (with pre-prompt context)
 *   2. Obtain the FCM registration token via getToken()
 *   3. Atomically write the token to users/{email}.fcmTokens[] (arrayUnion)
 *   4. On sign-out, atomically remove the token (arrayRemove)
 *
 * SECURITY (Zero-Trust)
 * ─────────────────────
 * • Tokens are written via arrayUnion — clients can only ADD their own
 *   device token, never read or enumerate another user's tokens.
 * • Removal is scoped to the exact token string — a rogue client cannot
 *   clear another device's token.
 * • Firestore rules must enforce: token writes are allowed only when
 *   the write is a single-token arrayUnion on the caller's own document.
 *
 * USAGE
 * ─────
 *   import { fcmService } from '$lib/services/messaging.svelte.js';
 *
 *   // Show permission context modal, then request permission + register
 *   await fcmService.requestAndRegister();
 *
 *   // On auth sign-out — called by signOutFlow.js
 *   await fcmService.deregisterDevice();
 */

import { browser } from '$app/environment';
import { messaging, db, auth } from '$lib/firebase.js';
import type { Messaging } from 'firebase/messaging';
import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import {
	doc,
	updateDoc,
	arrayUnion,
	arrayRemove,
	type Firestore,
} from 'firebase/firestore';

// ── Constants ─────────────────────────────────────────────────────────────────

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY as string | undefined;

// LocalStorage key — persists the active token so we can remove it on logout
// even if the firebase getToken() call is unavailable at sign-out time.
const DEVICE_TOKEN_KEY = 'vanguard_fcm_token';

// ── FcmService ────────────────────────────────────────────────────────────────

export class FcmService {
	// ── State ─────────────────────────────────────────────────────────────────

	/** Current browser notification permission state. */
	permission = $state<NotificationPermission | 'unsupported' | 'loading'>('loading');

	/** Active FCM token for this device. null = not yet registered. */
	token = $state<string | null>(null);

	/** Last foreground message received (for in-app toast). */
	lastMessage = $state<{ title: string; body: string; category?: string } | null>(null);

	/** Whether a registration attempt is in progress. */
	isRegistering = $state(false);

	/** Registration error, if any. */
	error = $state<string | null>(null);

	// ── Derived ───────────────────────────────────────────────────────────────

	readonly isGranted = $derived(this.permission === 'granted');
	readonly isDenied  = $derived(this.permission === 'denied');
	readonly isPending = $derived(this.permission === 'default');
	readonly isSupported = $derived(
		this.permission !== 'unsupported' && Boolean(VAPID_KEY),
	);

	// ── Lifecycle ─────────────────────────────────────────────────────────────

	/**
	 * Call once after auth resolves (e.g. in +layout.svelte or authStore effect).
	 * Reads existing permission state and restores a cached token.
	 */
	init(): void {
		if (!browser) return;

		if (!('Notification' in window) || !messaging) {
			this.permission = 'unsupported';
			return;
		}

		this.permission = Notification.permission;
		const cachedToken = localStorage.getItem(DEVICE_TOKEN_KEY);
		if (cachedToken) this.token = cachedToken;

		// Listen for foreground messages (app is open)
		if (messaging) {
			onMessage(messaging as Messaging, (payload) => {
				this.lastMessage = {
					title: payload.notification?.title ?? 'VANGUARD',
					body: payload.notification?.body ?? '',
					category: (payload.data?.category as string | undefined),
				};
			});
		}
	}

	// ── Public API ────────────────────────────────────────────────────────────

	/**
	 * Requests browser notification permission (if not already granted),
	 * then fetches the FCM token and writes it to Firestore.
	 *
	 * Call this after showing the pre-prompt context UI — never call the
	 * browser prompt directly without context.
	 */
	async requestAndRegister(): Promise<void> {
		if (!browser || !messaging) return;
		this.isRegistering = true;
		this.error = null;

		try {
			// Step 1: Request browser permission
			if (Notification.permission !== 'granted') {
				const result = await Notification.requestPermission();
				this.permission = result;
				if (result !== 'granted') {
					this.error = 'Notification permission denied. Enable it in browser settings.';
					return;
				}
			}

			// Step 2: Fetch FCM token
			if (!VAPID_KEY) throw new Error('FCM VAPID key not configured (VITE_FCM_VAPID_KEY).');
			const currentToken = await getToken(messaging as Messaging, {
				vapidKey: VAPID_KEY,
				serviceWorkerRegistration: await navigator.serviceWorker.getRegistration(
					'/firebase-messaging-sw.js',
				) ?? undefined,
			});

			if (!currentToken) throw new Error('FCM returned an empty token.');

			this.token = currentToken;
			localStorage.setItem(DEVICE_TOKEN_KEY, currentToken);

			// Step 3: Write to Firestore — arrayUnion (idempotent, no duplicates)
			await this._writeToken(currentToken);

		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : 'FCM registration failed.';
		} finally {
			this.isRegistering = false;
		}
	}

	/**
	 * Removes the current device's FCM token from Firestore.
	 * Call this from signOutFlow.js BEFORE calling Firebase signOut().
	 */
	async deregisterDevice(): Promise<void> {
		const tokenToRemove = this.token ?? localStorage.getItem(DEVICE_TOKEN_KEY);
		if (!tokenToRemove) return;

		try {
			// Delete the token from the FCM service
			if (messaging) await deleteToken(messaging as Messaging);

			// Remove from Firestore user document
			await this._removeToken(tokenToRemove);

			this.token = null;
			localStorage.removeItem(DEVICE_TOKEN_KEY);
		} catch {
			// Best-effort: don't block sign-out on token removal failure
		}
	}

	// ── Private ───────────────────────────────────────────────────────────────

	private async _writeToken(token: string): Promise<void> {
		const email = auth.currentUser?.email?.toLowerCase();
		if (!email) throw new Error('Not signed in — cannot persist FCM token.');
		const userRef = doc(db as Firestore, 'users', email);
		await updateDoc(userRef, {
			fcmTokens: arrayUnion(token),
			fcmUpdatedAt: new Date(),
		});
	}

	private async _removeToken(token: string): Promise<void> {
		const email = auth.currentUser?.email?.toLowerCase();
		if (!email) return;
		const userRef = doc(db as Firestore, 'users', email);
		await updateDoc(userRef, {
			fcmTokens: arrayRemove(token),
		});
	}
}

/** Singleton service. */
export const fcmService = new FcmService();
