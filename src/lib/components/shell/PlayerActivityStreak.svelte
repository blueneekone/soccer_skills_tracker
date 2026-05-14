<script lang="ts">
	import { browser } from '$app/environment';
	import {
		doc,
		onSnapshot,
		query,
		collection,
		where,
		orderBy,
		limit,
		updateDoc,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';
	import type { ReengagementAlertDoc } from '$lib/types/tenant.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	/** When true, transparent chrome for embedding in top HUD bars. */
	let { compact = false, armory = null } = $props<{
		compact?: boolean;
		armory?: import('$lib/states/ArmoryEngine.svelte.js').ArmoryEngine | null;
	}>();

	// ── Firestore state ────────────────────────────────────────────────────────
	let streakDays   = $state(0);
	let streakStatus = $state<'active' | 'frozen' | 'broken'>('active');
	let gracePeriodEndsUtc = $state('');
	let loading      = $state(true);

	// Latest un-acknowledged reengagement alert, if any.
	let activeAlert  = $state<ReengagementAlertDoc | null>(null);
	let alertDocId   = $state<string>('');

	// ── Derived display state ──────────────────────────────────────────────────

	type StreakMode = 'loading' | 'empty' | 'active' | 'at_risk' | 'frozen' | 'broken';

	let mode = $derived<StreakMode>(() => {
		if (loading) return 'loading';
		if (!vanguardFlags.streakEnforcementEnabled) {
			return streakDays <= 0 ? 'empty' : 'active';
		}
		if (streakStatus === 'broken') return 'broken';
		if (streakStatus === 'frozen') return 'frozen';
		if (activeAlert?.kind === 'streak_warning') return 'at_risk';
		return streakDays <= 0 ? 'empty' : 'active';
	});

	/** Countdown string for at_risk: "X days left" */
	let graceCountdown = $derived(() => {
		if (!gracePeriodEndsUtc) return '';
		const ms = Date.parse(gracePeriodEndsUtc) - Date.now();
		if (ms <= 0) return 'today';
		const days = Math.ceil(ms / 86_400_000);
		return `${days} day${days === 1 ? '' : 's'}`;
	});

	let freezesAvailable = $derived(() =>
		armory ? armory.freezesAvailable : 0,
	);

	let freezePending = $derived(() =>
		armory ? armory.freezeClaimPending : false,
	);

	// ── Subscriptions ──────────────────────────────────────────────────────────

	$effect(() => {
		if (!browser || !authStore.user?.uid) {
			streakDays = 0;
			loading = false;
			return;
		}

		const uid = authStore.user.uid;
		const psRef = doc(db, 'player_stats', uid);

		const unsubPS = onSnapshot(
			psRef,
			(snap) => {
				loading = false;
				if (!snap.exists()) {
					streakDays = 0;
					streakStatus = 'active';
					return;
				}
				const d = snap.data();
				streakDays         = Math.floor(Number(d.streak_days) || 0);
				streakStatus       = (d.streakStatus as 'active' | 'frozen' | 'broken') || 'active';
				gracePeriodEndsUtc = typeof d.gracePeriodEndsUtc === 'string' ? d.gracePeriodEndsUtc : '';
			},
			(e) => {
				console.error('[PlayerActivityStreak] player_stats', e);
				loading = false;
			},
		);

		// Subscribe to the latest un-acknowledged alert for this player.
		const alertQ = query(
			collection(db, 'reengagement_alerts'),
			where('uid', '==', uid),
			where('acknowledgedAt', '==', null),
			orderBy('createdAt', 'desc'),
			limit(1),
		);
		const unsubAlert = onSnapshot(
			alertQ,
			(snap) => {
				if (snap.empty) {
					activeAlert = null;
					alertDocId  = '';
					return;
				}
				const docSnap = snap.docs[0];
				activeAlert = docSnap.data() as ReengagementAlertDoc;
				alertDocId  = docSnap.id;
				// Acknowledge on first render (HUD view counts as "seen").
				acknowledgeAlert(docSnap.id);
			},
			() => { activeAlert = null; },
		);

		return () => {
			unsubPS();
			unsubAlert();
		};
	});

	// ── Actions ────────────────────────────────────────────────────────────────

	function acknowledgeAlert(id: string) {
		if (!id || !browser) return;
		const ref = doc(db, 'reengagement_alerts', id);
		updateDoc(ref, { acknowledgedAt: new Date().toISOString() }).catch(() => {});
	}

	async function handleFreeze() {
		if (!armory || armory.freezeClaimPending || armory.freezesAvailable <= 0) return;
		await armory.consumeStreakFreeze();
	}
</script>

<section
	class="pas"
	class:pas--compact={compact}
	class:pas--at-risk={mode === 'at_risk'}
	class:pas--frozen={mode === 'frozen'}
	class:pas--broken={mode === 'broken'}
	aria-label="Activity streak"
>
	<!-- Icon -->
	<div class="pas__icon-wrap" aria-hidden="true">
	{#if mode === 'frozen'}
		<Icon name="env.snow" size={22} class="pas__icon pas__icon--frozen" />
	{:else if mode === 'broken'}
		<Icon name="sys.close" size={22} class="pas__icon pas__icon--broken" />
	{:else if mode === 'at_risk'}
		<Icon name="status.warning" size={22} class="pas__icon pas__icon--risk" />
	{:else}
		<Icon name="game.flame" size={22} class="pas__icon pas__icon--fire" />
	{/if}
	</div>

	<!-- Body -->
	<div class="pas__body">
		<h3 class="pas__title">
			{#if mode === 'frozen'}
				STREAK FROZEN
			{:else if mode === 'broken'}
				STREAK LOST
			{:else if mode === 'at_risk'}
				STREAK AT RISK
			{:else}
				ACTIVITY STREAK
			{/if}
		</h3>

		<p class="pas__val">
			{#if mode === 'loading'}
				<span class="tw-text-[10px] tw-tracking-widest tw-font-mono tw-text-[#00f0ff]/50">…</span>
			{:else if mode === 'empty'}
				<span class="tw-text-[11px] tw-font-mono tw-tracking-wide tw-text-white/50">
					Log a workout to start a streak.
				</span>
			{:else if mode === 'active'}
				<span class="pas__num">{streakDays}</span>
				<span class="pas__unit">day{streakDays === 1 ? '' : 's'} in a row</span>
			{:else if mode === 'at_risk'}
				<span class="pas__num pas__num--risk">{streakDays}</span>
				<span class="pas__unit tw-text-amber-400">day{streakDays === 1 ? '' : 's'} — log today!</span>
			{:else if mode === 'frozen'}
				<span class="pas__num pas__num--frozen">{streakDays}</span>
				<span class="pas__unit tw-text-[#00f0ff]">day{streakDays === 1 ? '' : 's'} protected</span>
			{:else if mode === 'broken'}
				<span class="tw-text-[11px] tw-font-mono tw-tracking-wide tw-text-white/60">
					Your streak reset. Log a session to restart.
				</span>
			{/if}
		</p>

		{#if mode === 'at_risk' && graceCountdown}
			<p class="pas__hint tw-text-amber-400/80">
				Grace ends in {graceCountdown} — log now to save your streak.
			</p>
		{:else if mode === 'frozen'}
			<p class="pas__hint tw-text-[#00f0ff]/70">
				Streak Freeze active — you're covered for today.
			</p>
		{:else if mode === 'broken'}
			<p class="pas__hint tw-text-white/40">
				Consistency is built one session at a time. Start fresh today.
			</p>
		{:else}
			<p class="pas__hint">Keep logging sessions — consistency unlocks bonus XP.</p>
		{/if}

		<!-- Streak Freeze CTA (shown when at risk and freezes remain) -->
		{#if (mode === 'at_risk' || mode === 'broken') && freezesAvailable > 0 && armory}
			<button
				class="pas__freeze-btn"
				disabled={freezePending}
				onclick={handleFreeze}
				aria-label="Use streak freeze"
			>
			<Icon name="env.snow" size={14} />
			{freezePending ? 'Activating…' : `Use Freeze (${freezesAvailable} left)`}
			</button>
		{/if}
	</div>
</section>

<style>
	.pas {
		display: flex;
		gap: 14px;
		align-items: flex-start;
		padding: 14px;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(2, 2, 2, 0.6);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-sizing: border-box;
		transition: border-color 0.3s ease, box-shadow 0.3s ease;
	}

	.pas--at-risk {
		border-color: rgba(251, 191, 36, 0.4);
		box-shadow: 0 0 18px rgba(251, 191, 36, 0.12);
		animation: risk-pulse 2.5s ease-in-out infinite;
	}

	.pas--frozen {
		border-color: rgba(0, 240, 255, 0.4);
		box-shadow: 0 0 18px rgba(0, 240, 255, 0.12);
	}

	.pas--broken {
		border-color: rgba(156, 163, 175, 0.25);
		opacity: 0.85;
	}

	.pas--compact {
		padding: 0;
		border: none;
		background: transparent;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
		box-shadow: none;
		gap: 10px;
		align-items: center;
	}

	.pas--compact .pas__hint,
	.pas--compact .pas__freeze-btn {
		display: none;
	}

	/* Icon wrap */
	.pas__icon-wrap {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(145deg, rgba(245, 158, 11, 0.15), rgba(120, 53, 15, 0.25));
		border: 1px solid rgba(251, 191, 36, 0.3);
		transition: background 0.3s ease, border-color 0.3s ease;
	}

	.pas--frozen .pas__icon-wrap {
		background: linear-gradient(145deg, rgba(0, 240, 255, 0.1), rgba(14, 116, 144, 0.2));
		border-color: rgba(0, 240, 255, 0.35);
	}

	.pas--broken .pas__icon-wrap {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.pas__icon {
		font-size: 1.4rem;
	}

	.pas__icon--fire   { color: #ea580c; }
	.pas__icon--risk   { color: #f59e0b; }
	.pas__icon--frozen { color: #00f0ff; }
	.pas__icon--broken { color: #9ca3af; }

	/* Body */
	.pas__body {
		min-width: 0;
		flex: 1;
	}

	.pas__title {
		margin: 0 0 4px;
		font-size: 10px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-family: ui-monospace, 'Cascadia Code', monospace;
		color: rgba(255, 255, 255, 0.45);
	}

	.pas--at-risk  .pas__title { color: rgba(251, 191, 36, 0.8); }
	.pas--frozen   .pas__title { color: rgba(0, 240, 255, 0.8); }
	.pas--broken   .pas__title { color: rgba(156, 163, 175, 0.6); }

	.pas__val {
		margin: 0 0 6px;
		font-size: 0.95rem;
		font-weight: 700;
		color: #ffffff;
		line-height: 1.35;
	}

	.pas__num {
		font-size: 1.5rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: #fb923c;
		margin-right: 5px;
	}

	.pas__num--risk   { color: #f59e0b; }
	.pas__num--frozen { color: #00f0ff; }

	.pas__unit {
		font-size: 0.85rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.7);
	}

	.pas__hint {
		margin: 0 0 8px;
		font-size: 10px;
		line-height: 1.5;
		letter-spacing: 0.04em;
		font-family: ui-monospace, 'Cascadia Code', monospace;
		color: rgba(255, 255, 255, 0.35);
	}

	/* Streak Freeze button */
	.pas__freeze-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 2px;
		padding: 5px 12px;
		border-radius: 8px;
		border: 1px solid rgba(0, 240, 255, 0.4);
		background: rgba(0, 240, 255, 0.08);
		color: #00f0ff;
		font-size: 10px;
		font-weight: 800;
		font-family: ui-monospace, 'Cascadia Code', monospace;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background 0.2s ease, box-shadow 0.2s ease;
	}

	.pas__freeze-btn:hover:not(:disabled) {
		background: rgba(0, 240, 255, 0.16);
		box-shadow: 0 0 12px rgba(0, 240, 255, 0.2);
	}

	.pas__freeze-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@keyframes risk-pulse {
		0%, 100% { box-shadow: 0 0 12px rgba(251, 191, 36, 0.1); }
		50%       { box-shadow: 0 0 24px rgba(251, 191, 36, 0.25); }
	}
</style>
