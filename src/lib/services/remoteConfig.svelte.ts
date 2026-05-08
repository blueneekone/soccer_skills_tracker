/**
 * remoteConfig.svelte.ts — Vanguard Kill Switch Service
 * ───────────────────────────────────────────────────────
 * Exposes Firebase Remote Config flags as Svelte 5 reactive `$state` booleans.
 *
 * KILL SWITCHES
 * ─────────────
 *  feature_weather_aegis_enabled    — wraps WeatherWidget rendering
 *  feature_xp_gamification_enabled  — gates awardXP() execution in ArmoryEngine
 *
 * ACTIVATION
 * ──────────
 * The remoteConfig instance in firebase.js fires `fetchAndActivate()` on app
 * load. This service reads the (already-resolved) values on demand.
 *
 * To update flags in production:
 *   1. Firebase Console → Remote Config
 *   2. Add / edit the boolean parameter
 *   3. Publish — clients pick it up within 5 minutes (no redeploy needed)
 *
 * USAGE
 * ─────
 *   import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';
 *
 *   // In a component:
 *   {#if vanguardFlags.weatherEnabled}
 *     <WeatherWidget ... />
 *   {/if}
 *
 *   // In ArmoryEngine.svelte.ts:
 *   if (!vanguardFlags.xpEnabled) return; // silent no-op
 */

import { browser } from '$app/environment';
import { remoteConfig } from '$lib/firebase.js';
import { getValue, type RemoteConfig } from 'firebase/remote-config';

// ── Flag keys (single source of truth) ───────────────────────────────────────

const FLAG_WEATHER = 'feature_weather_aegis_enabled';
const FLAG_XP = 'feature_xp_gamification_enabled';

// ── VanguardFlagService ───────────────────────────────────────────────────────

class VanguardFlagService {
	/**
	 * Controls `WeatherWidget` rendering.
	 * Platform Admin can set `feature_weather_aegis_enabled = false` in Remote
	 * Config to instantly hide the AEGIS weather module across all clients.
	 */
	weatherEnabled = $state(true);

	/**
	 * Controls XP gamification.
	 * When false, `ArmoryEngine.awardXP()` returns without writing,
	 * preventing runaway XP accumulation during incidents.
	 */
	xpEnabled = $state(true);

	/**
	 * Reads the current (already-fetched) flag values from Remote Config.
	 * Safe to call multiple times — subsequent calls just re-read the cache.
	 * Call once during app init or in a top-level `$effect`.
	 */
	refresh(): void {
		if (!browser || !remoteConfig) return;
		const rc = remoteConfig as RemoteConfig;
		this.weatherEnabled = getValue(rc, FLAG_WEATHER).asBoolean();
		this.xpEnabled = getValue(rc, FLAG_XP).asBoolean();
	}
}

/**
 * Singleton service — import and use anywhere in the app.
 *
 *   import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';
 */
export const vanguardFlags = new VanguardFlagService();

// Auto-refresh on module load (client only)
if (browser) {
	vanguardFlags.refresh();
}
