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

// ── Epic 5.4: Parent Co-Op flags ─────────────────────────────────────────────

/**
 * Master kill switch for the CV Biomechanics bounty criterion.
 * Off by default — the server schema slot and handler exist but the UI
 * hides the `cv_verified_drill` criterion type until the MediaPipe
 * inference sub-epic is deployed and verified in staging.
 */
const FLAG_CV_BOUNTY = 'feature_cv_bounty_enabled';

// ── Epic 7: Asymmetric Fog of War + Grit XP + Dopamine Engine ────────────────

/** Master kill switch for Asymmetric UI Fog of War on the skill tree. */
const FLAG_FOG_OF_WAR = 'feature_fog_of_war_enabled';

/**
 * When true, Grit XP is restricted to rank-3 nodes only.
 * When false, falls back to pre-Epic-7 any-drill behavior for safe rollback.
 */
const FLAG_GRIT_GATE = 'feature_grit_complexity_gate_enabled';

/** Maximum Grit awards a player may earn per UTC calendar day. */
const PARAM_GRIT_DAILY_CAP = 'grit_daily_cap';

/**
 * Controls canvas-confetti particle explosions on verified commits.
 * Toggle off for users who prefer reduced motion (also checked against
 * prefers-reduced-motion media query at call time).
 */
const FLAG_DOPAMINE = 'feature_dopamine_explosions_enabled';

// ── Epic 6: Trajectory Tracking flags ────────────────────────────────────────

/** Master kill switch for Time-Lapse Memory Capsule overlay. Default: false. */
const FLAG_CAPSULES = 'feature_trajectory_capsules_enabled';

/** Master kill switch for the Growth Velocity Index HUD cell. Default: false. */
const FLAG_GVI = 'feature_growth_velocity_enabled';

/** XP floor for GVI denominator so beginners get saturated scores. Default: 200. */
const PARAM_GVI_FLOOR_XP = 'gvi_floor_xp';

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

	// ── Epic 5.4: Parent Co-Op ────────────────────────────────────────────

	/**
	 * Shows the `cv_verified_drill` criterion type in the BountyTerminal UI.
	 * Defaults to `false` — the schema slot and server handler exist but the
	 * MediaPipe inference pipeline (future sub-epic) is not yet deployed.
	 * Enable in Firebase Console → Remote Config when CV verification is live.
	 */
	cvBountyEnabled = $state(false);

	// ── Epic 7: Asymmetric Fog of War + Grit XP + Dopamine Engine ────────────

	/**
	 * Master kill switch for Asymmetric UI Fog of War.
	 * When false, all 30 skill-tree nodes are visible regardless of tier or
	 * parent state — matching pre-Epic-7 behavior.
	 */
	fogEnabled = $state(true);

	/**
	 * When true, Grit XP is gated to rank-3 nodes only.
	 * When false, any drill can mint Grit XP (legacy behavior).
	 */
	gritGateEnabled = $state(true);

	/** Max Grit awards a player may earn in a single UTC calendar day. */
	gritDailyCap = $state(3);

	/**
	 * Controls canvas-confetti particle explosions on verified Firestore
	 * commits. Complements the prefers-reduced-motion media query check
	 * inside dopamine.svelte.ts.
	 */
	dopamineEnabled = $state(true);

	// ── Epic 6: Trajectory Tracking ───────────────────────────────────────

	/**
	 * Shows the Time-Lapse Memory Capsule overlay in the Armory.
	 * Defaults to `false` — enable after the plateau detector CF has run a
	 * full backfill pass and capsules are verified in staging.
	 */
	capsulesEnabled = $state(false);

	/**
	 * Shows the Growth Velocity Index HUD cell in the Armory bento grid.
	 * Defaults to `false` — enable after the monthly aggregator CF has
	 * written at least two months of trajectory_months data.
	 */
	gviEnabled = $state(false);

	/** XP floor for GVI denominator. Sourced from Remote Config. Default: 200. */
	gviFloorXp = $state(200);

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
		// Epic 5.4
		this.cvBountyEnabled = getValue(rc, FLAG_CV_BOUNTY).asBoolean();

		// Epic 6: Trajectory Tracking
		this.capsulesEnabled = getValue(rc, FLAG_CAPSULES).asBoolean();
		this.gviEnabled = getValue(rc, FLAG_GVI).asBoolean();
		this.gviFloorXp = getValue(rc, PARAM_GVI_FLOOR_XP).asNumber() || 200;
		// Epic 7: Asymmetric Fog of War + Grit XP + Dopamine Engine
		this.fogEnabled = getValue(rc, FLAG_FOG_OF_WAR).asBoolean();
		this.gritGateEnabled = getValue(rc, FLAG_GRIT_GATE).asBoolean();
		this.gritDailyCap = getValue(rc, PARAM_GRIT_DAILY_CAP).asNumber() || 3;
		this.dopamineEnabled = getValue(rc, FLAG_DOPAMINE).asBoolean();
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
