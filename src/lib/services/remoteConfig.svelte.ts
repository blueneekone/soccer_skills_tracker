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

// ── Epic 5: Loss Avoidance kill switches + tuning params ─────────────────────

const FLAG_DECAY = 'feature_skill_decay_enabled';
const FLAG_STREAK_ENFORCEMENT = 'feature_streak_enforcement_enabled';
const PARAM_DECAY_GRACE_DAYS = 'decay_grace_days';
const PARAM_DECAY_PCT_PER_DAY = 'decay_pct_per_day';
const PARAM_DECAY_MAX_PCT = 'decay_max_pct';
const PARAM_STREAK_FREEZE_PER_WEEK = 'streak_freeze_per_week';

// ── VanguardFlagService ───────────────────────────────────────────────────────

class VanguardFlagService {
	/**
	 * Controls `WeatherWidget` rendering.
	 */
	weatherEnabled = $state(true);

	/**
	 * Controls XP gamification.
	 * When false, `ArmoryEngine.awardXP()` returns without writing.
	 */
	xpEnabled = $state(true);

	// ── Epic 5: Loss Avoidance ─────────────────────────────────────────────

	/**
	 * Master kill switch for the nightly Skill Decay Cloud Function.
	 * Defaults to false — must be explicitly enabled after soak period.
	 */
	decayEnabled = $state(false);

	/**
	 * Controls streak enforcement UX (at_risk / broken states in the HUD).
	 * Can be enabled independently of `decayEnabled` for a no-loss-avoidance
	 * streak-only rollout.
	 */
	streakEnforcementEnabled = $state(false);

	/** Days of inactivity before decay begins. Default: 2. */
	decayGraceDays = $state(2);

	/** Fraction of XP drained per idle day beyond grace window. Default: 0.01. */
	decayPctPerDay = $state(0.01);

	/** Maximum cumulative drain per sweep (0–1). Default: 0.25. */
	decayMaxPct = $state(0.25);

	/** Streak freezes replenished per ISO week. Default: 1. */
	streakFreezePerWeek = $state(1);

	/**
	 * Reads the current (already-fetched) flag values from Remote Config.
	 * Safe to call multiple times — subsequent calls just re-read the cache.
	 */
	refresh(): void {
		if (!browser || !remoteConfig) return;
		const rc = remoteConfig as RemoteConfig;
		this.weatherEnabled = getValue(rc, FLAG_WEATHER).asBoolean();
		this.xpEnabled = getValue(rc, FLAG_XP).asBoolean();
		this.decayEnabled = getValue(rc, FLAG_DECAY).asBoolean();
		this.streakEnforcementEnabled = getValue(rc, FLAG_STREAK_ENFORCEMENT).asBoolean();
		this.decayGraceDays = getValue(rc, PARAM_DECAY_GRACE_DAYS).asNumber() || 2;
		this.decayPctPerDay = getValue(rc, PARAM_DECAY_PCT_PER_DAY).asNumber() || 0.01;
		this.decayMaxPct = getValue(rc, PARAM_DECAY_MAX_PCT).asNumber() || 0.25;
		this.streakFreezePerWeek = getValue(rc, PARAM_STREAK_FREEZE_PER_WEEK).asNumber() || 1;
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
