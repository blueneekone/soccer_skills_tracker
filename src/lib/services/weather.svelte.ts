/**
 * weather.svelte.ts — AEGIS Weather & Lightning Safety Service
 * ─────────────────────────────────────────────────────────────
 * Svelte 5 reactive service for real-time weather monitoring and
 * lightning safety alerts.
 *
 * ROLE GATE
 * ─────────
 * The service only activates for coaches and directors.
 * Players are explicitly excluded to prevent distraction/panic and to
 * conserve API credits. Calling `init()` with a player role is a no-op.
 *
 * SESSION AWARENESS
 * ─────────────────
 * Polling is gated to "session hours" (06:00–22:00 local time by default)
 * to avoid burning API credits overnight. Configurable via `sessionStart/End`.
 *
 * POLLING
 * ───────
 * Polls every 5 minutes via `$effect`. Polls immediately on `init()`.
 * Automatically stops when `destroy()` is called or the component unmounts.
 *
 * 30-MINUTE ALL-CLEAR PROTOCOL
 * ─────────────────────────────
 * When AlertLevel transitions to DANGER:
 *   • `lastDangerAt` is set to `Date.now()`.
 *   • A 30-minute countdown begins (`allClearCountdownSecs`).
 *   • Even if the alert clears, the countdown continues. This mirrors the
 *     NSSL/USTA "30-30 Rule" (30 min after last thunder before resuming play).
 *   • If a new DANGER event arrives, the timer resets to 30 minutes.
 *
 * PUSH NOTIFICATIONS
 * ──────────────────
 * When transitioning to DANGER, fires a Web Notification (if permission
 * has been granted) and a SW postMessage for background support.
 */

import { browser } from '$app/environment';
import { httpsCallable } from 'firebase/functions';
import { functions } from '$lib/firebase.js';

// ── Public types ─────────────────────────────────────────────────────────────

export type AlertLevel = 'NORMAL' | 'CAUTION' | 'DANGER';
export type DeploymentStatus = 'GO' | 'HOLD' | 'NO-GO';

export interface WeatherCurrent {
	temperatureF: number;
	humidity: number;
	precipMm: number;
	precipProbability: number;
	windMph: number;
	windDirection: string;
	uvIndex: number;
	weatherCode: number;
	conditionsLabel: string;
}

export interface LightningStatus {
	alertLevel: AlertLevel;
	estimatedMiles: number | null;
	nwsEvent: string | null;
	nwsDescription: string | null;
	nwsExpires: string | null;
	detectedAt: string | null;
}

export interface WeatherSnapshot {
	current: WeatherCurrent | null;
	lightning: LightningStatus;
	deploymentStatus: DeploymentStatus;
	fetchedAt: string;
	lat: number;
	lng: number;
}

// ── Role gate constant ────────────────────────────────────────────────────────

const ALLOWED_ROLES = new Set(['coach', 'director', 'global_admin', 'super_admin']);
const POLL_INTERVAL_MS = 5 * 60 * 1000;  // 5 minutes
const ALL_CLEAR_SECS = 30 * 60;           // 30-minute all-clear window
const SESSION_START_HOUR = 6;             // 06:00 local
const SESSION_END_HOUR = 22;              // 22:00 local

// ═══════════════════════════════════════════════════════════════════════════
// WeatherAegis
// ═══════════════════════════════════════════════════════════════════════════

export class WeatherAegis {
	// ── Core state ─────────────────────────────────────────────────────────
	snapshot = $state<WeatherSnapshot | null>(null);
	loading = $state(false);
	error = $state('');
	active = $state(false);

	// ── Countdown state (30-minute all-clear clock) ────────────────────────
	lastDangerAt = $state<number | null>(null);
	allClearCountdownSecs = $state(0);
	private _countdownInterval: ReturnType<typeof setInterval> | null = null;

	// ── Polling state ──────────────────────────────────────────────────────
	private _pollInterval: ReturnType<typeof setInterval> | null = null;
	private _lat: number | null = null;
	private _lng: number | null = null;
	private _role: string = '';

	// ── Derived ────────────────────────────────────────────────────────────

	/** Current alert level from the latest snapshot. */
	readonly alertLevel = $derived<AlertLevel>(
		this.snapshot?.lightning?.alertLevel ?? 'NORMAL',
	);

	/** True when the 30-min all-clear clock is still running. */
	readonly allClearActive = $derived(this.allClearCountdownSecs > 0);

	/** Returns true when any safety concern exists. */
	readonly hasConcern = $derived(
		this.alertLevel !== 'NORMAL' || this.allClearActive,
	);

	/** Formatted all-clear countdown "MM:SS". */
	readonly allClearLabel = $derived.by(() => {
		const s = this.allClearCountdownSecs;
		if (s <= 0) return '';
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
	});

	/** Estimated lightning distance label. */
	readonly lightningLabel = $derived.by(() => {
		const miles = this.snapshot?.lightning?.estimatedMiles;
		if (miles === null || miles === undefined) return null;
		return miles <= 2 ? 'AT LOCATION' : `~${miles} MI`;
	});

	/** Deployment status from latest snapshot. */
	readonly deploymentStatus = $derived<DeploymentStatus>(
		this.snapshot?.deploymentStatus ?? 'GO',
	);

	// ── CF callable ───────────────────────────────────────────────────────
	private _weatherFn: ReturnType<typeof httpsCallable> | null = null;

	// ── Public API ────────────────────────────────────────────────────────

	/**
	 * Initialize the weather service for a specific coordinate.
	 * No-op if the caller's role is not coach/director/admin.
	 *
	 * @param lat     Decimal latitude of the field
	 * @param lng     Decimal longitude of the field
	 * @param role    Caller's auth role
	 */
	init(lat: number, lng: number, role: string): void {
		if (!browser) return;
		if (!ALLOWED_ROLES.has(role)) return; // Players are gated out here

		this._lat = lat;
		this._lng = lng;
		this._role = role;
		this._weatherFn = httpsCallable(functions, 'getWeatherConditions');

		this.active = true;
		this._startPolling();
	}

	/** Stop all polling and timers. Call on component destroy. */
	destroy(): void {
		this._stopPolling();
		this._stopCountdown();
		this.active = false;
	}

	/** Force an immediate refresh regardless of poll interval. */
	async refresh(): Promise<void> {
		await this._fetch();
	}

	// ── Private: session gate ─────────────────────────────────────────────

	private _isSessionHour(): boolean {
		const h = new Date().getHours();
		return h >= SESSION_START_HOUR && h < SESSION_END_HOUR;
	}

	// ── Private: polling ──────────────────────────────────────────────────

	private _startPolling(): void {
		this._stopPolling();
		if (this._isSessionHour()) this._fetch();

		this._pollInterval = setInterval(() => {
			if (this._isSessionHour()) this._fetch();
		}, POLL_INTERVAL_MS);
	}

	private _stopPolling(): void {
		if (this._pollInterval !== null) {
			clearInterval(this._pollInterval);
			this._pollInterval = null;
		}
	}

	// ── Private: data fetch ───────────────────────────────────────────────

	private async _fetch(): Promise<void> {
		if (!this._weatherFn || this._lat === null || this._lng === null) return;
		this.loading = true;
		this.error = '';
		try {
			const res = await this._weatherFn({ lat: this._lat, lng: this._lng });
			const data = res.data as WeatherSnapshot;
			const prevLevel = this.snapshot?.lightning?.alertLevel ?? 'NORMAL';
			this.snapshot = data;
			this._handleAlertTransition(prevLevel, data.lightning.alertLevel);
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : 'Weather fetch failed.';
		} finally {
			this.loading = false;
		}
	}

	// ── Private: alert level transitions ─────────────────────────────────

	private _handleAlertTransition(prev: AlertLevel, next: AlertLevel): void {
		if (next === 'DANGER') {
			// Reset the 30-minute all-clear clock on every DANGER event.
			this.lastDangerAt = Date.now();
			this._startCountdown();
			if (prev !== 'DANGER') {
				// New DANGER state — fire push notification.
				this._firePushNotification();
			}
		}
		// Note: the countdown continues even if the alert clears (NSSL 30-30 rule).
	}

	// ── Private: 30-minute all-clear countdown ────────────────────────────

	private _startCountdown(): void {
		this._stopCountdown();
		this.allClearCountdownSecs = ALL_CLEAR_SECS;

		this._countdownInterval = setInterval(() => {
			if (this.allClearCountdownSecs > 0) {
				this.allClearCountdownSecs -= 1;
			} else {
				this._stopCountdown();
			}
		}, 1000);
	}

	private _stopCountdown(): void {
		if (this._countdownInterval !== null) {
			clearInterval(this._countdownInterval);
			this._countdownInterval = null;
		}
		this.allClearCountdownSecs = 0;
	}

	// ── Private: push notification ────────────────────────────────────────

	private _firePushNotification(): void {
		if (!browser) return;

		const miles = this.snapshot?.lightning?.estimatedMiles;
		const distLabel = miles !== null && miles !== undefined ? `${miles} MI` : 'NEARBY';
		const body =
			`LIGHTNING DETECTED ${distLabel} — CLEAR THE PITCH IMMEDIATELY. ` +
			`30-minute all-clear clock started.`;

		// Foreground: Web Notifications API.
		if ('Notification' in window) {
			if (Notification.permission === 'granted') {
				new Notification('⚡ AEGIS LIGHTNING ALERT', {
					body,
					icon: '/icons/icon-192.png',
					badge: '/icons/icon-72.png',
					tag: 'aegis-lightning',
					requireInteraction: true,
					vibrate: [200, 100, 200, 100, 200],
				} as NotificationOptions & { vibrate?: number[] });
			} else if (Notification.permission === 'default') {
				// Request permission non-intrusively.
				Notification.requestPermission().then((perm) => {
					if (perm === 'granted') {
						new Notification('⚡ AEGIS LIGHTNING ALERT', { body, icon: '/icons/icon-192.png' });
					}
				});
			}
		}

		// Background: postMessage to service worker.
		if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({
				type: 'AEGIS_LIGHTNING_ALERT',
				title: '⚡ AEGIS LIGHTNING ALERT',
				body,
				tag: 'aegis-lightning',
			});
		}
	}
}

// ── Singleton export ──────────────────────────────────────────────────────────
export const weatherAegis = new WeatherAegis();
