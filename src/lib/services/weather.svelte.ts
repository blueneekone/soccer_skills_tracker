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

	private async _fetchDirect(lat: number, lng: number): Promise<WeatherSnapshot> {
		const latRound = Math.round(lat * 10000) / 10000;
		const lngRound = Math.round(lng * 10000) / 10000;
		const url = `https://api.open-meteo.com/v1/forecast?latitude=${latRound}&longitude=${lngRound}&current=temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,uv_index&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=auto`;
		
		const res = await fetch(url);
		if (!res.ok) throw new Error(`Weather service HTTP ${res.status}`);
		const json = await res.json();
		const c = json.current || {};
		const wmoCode = Number(c.weather_code ?? 0);
		const windMph = Math.round(Number(c.wind_speed_10m ?? 0));
		const precipProb = Math.round(Number(c.precipitation_probability ?? 0));
		const tempF = Math.round(Number(c.temperature_2m ?? 72));

		const WMO_LABELS: Record<number, string> = {
			0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
			45: 'Foggy', 48: 'Rime Fog',
			51: 'Light Drizzle', 53: 'Drizzle', 55: 'Dense Drizzle',
			61: 'Slight Rain', 63: 'Rain', 65: 'Heavy Rain',
			71: 'Slight Snow', 73: 'Snow', 75: 'Heavy Snow',
			77: 'Snow Grains',
			80: 'Slight Showers', 81: 'Showers', 82: 'Violent Showers',
			85: 'Snow Showers', 86: 'Heavy Snow Showers',
			95: 'Thunderstorm', 96: 'Thunderstorm + Hail', 99: 'Heavy Thunderstorm + Hail',
		};

		const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
		const windDirDeg = Number(c.wind_direction_10m ?? 0);
		const windDirection = isFinite(windDirDeg) ? dirs[Math.round(windDirDeg / 22.5) % 16] : '—';

		let alertLevel: AlertLevel = 'NORMAL';
		if ([95, 96, 99].includes(wmoCode) || tempF >= 100) {
			alertLevel = 'DANGER';
		} else if ([17, 29, 91, 92, 93, 94].includes(wmoCode) || tempF >= 90) {
			alertLevel = 'CAUTION';
		}

		let deploymentStatus: DeploymentStatus = 'GO';
		if (alertLevel === 'DANGER' || windMph > 25 || precipProb >= 65 || tempF <= 20) {
			deploymentStatus = 'NO-GO';
		} else if (alertLevel === 'CAUTION') {
			deploymentStatus = 'HOLD';
		}

		return {
			current: {
				temperatureF: tempF,
				humidity: Math.round(Number(c.relative_humidity_2m ?? 45)),
				precipMm: Number(c.precipitation ?? 0),
				precipProbability: precipProb,
				windMph,
				windDirection,
				uvIndex: Math.round(Number(c.uv_index ?? 3)),
				weatherCode: wmoCode,
				conditionsLabel: WMO_LABELS[wmoCode] ?? 'Clear Sky',
			},
			lightning: {
				alertLevel,
				estimatedMiles: alertLevel === 'DANGER' ? 2 : alertLevel === 'CAUTION' ? 14 : null,
				nwsEvent: null,
				nwsDescription: null,
				nwsExpires: null,
				detectedAt: alertLevel !== 'NORMAL' ? new Date().toISOString() : null,
			},
			deploymentStatus,
			fetchedAt: new Date().toISOString(),
			lat: latRound,
			lng: lngRound,
		};
	}

	// ── Private: data fetch ───────────────────────────────────────────────

	private async _fetch(): Promise<void> {
		if (this._lat === null || this._lng === null) return;
		this.loading = true;
		this.error = '';
		try {
			let data: WeatherSnapshot | null = null;
			if (this._weatherFn) {
				try {
					const res = await this._weatherFn({ lat: this._lat, lng: this._lng });
					data = res.data as WeatherSnapshot;
				} catch (fnErr) {
					console.warn('[WeatherAegis] Cloud function failed, attempting direct fetch fallback', fnErr);
				}
			}
			if (!data) {
				data = await this._fetchDirect(this._lat, this._lng);
			}
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
