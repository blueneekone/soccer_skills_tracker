<script>
	import { browser } from '$app/environment';
	import { doc, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	/** When true, transparent chrome for embedding in top HUD bars. */
	let { compact = false } = $props();

	let streakDays = $state(0);
	let loading = $state(true);

	$effect(() => {
		if (!browser || !authStore.user?.uid) {
			streakDays = 0;
			loading = false;
			return;
		}
		const ref = doc(db, 'player_stats', authStore.user.uid);
		const unsub = onSnapshot(
			ref,
			(snap) => {
				loading = false;
				if (!snap.exists()) {
					streakDays = 0;
					return;
				}
				const d = snap.data();
				streakDays = Math.floor(Number(d.streak_days) || 0);
			},
			(e) => {
				console.error('[PlayerActivityStreak]', e);
				loading = false;
			},
		);
		return () => unsub();
	});
</script>

<section class="pas" class:pas--compact={compact} aria-label="Activity streak">
	<div class="pas__icon-wrap" aria-hidden="true">
		<i class="ph ph-fire pas__fire"></i>
	</div>
	<div class="pas__body">
		<h3 class="pas__title">Activity streak</h3>
		<p class="pas__val">
			{#if loading}
				…
			{:else if streakDays <= 0}
				Log a workout to start a streak.
			{:else}
				<span class="pas__num">{streakDays}</span>
				<span class="pas__unit">day{streakDays === 1 ? '' : 's'} in a row</span>
			{/if}
		</p>
		<p class="pas__hint">Keep logging sessions or trials — consistency unlocks bonus XP.</p>
	</div>
</section>

<style>
	.pas {
		display: flex;
		gap: 14px;
		align-items: flex-start;
		padding: 14px;
		border-radius: 14px;
		border: 1px solid #e5e5e5;
		background: #fafafa;
		box-sizing: border-box;
	}

	:global(html.dark) .pas {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.1);
	}

	.pas--compact {
		padding: 0;
		border: none;
		background: transparent;
		box-shadow: none;
		gap: 10px;
		align-items: center;
	}

	:global(html.dark) .pas--compact {
		background: transparent;
		border: none;
	}

	.pas--compact .pas__hint {
		display: none;
	}

	.pas__icon-wrap {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(145deg, #fff7ed, #ffedd5);
		border: 1px solid rgba(245, 158, 11, 0.45);
	}

	:global(html.dark) .pas__icon-wrap {
		background: linear-gradient(145deg, rgba(245, 158, 11, 0.2), rgba(120, 53, 15, 0.35));
		border-color: rgba(251, 191, 36, 0.35);
	}

	.pas__fire {
		font-size: 1.5rem;
		color: #ea580c;
	}

	.pas__body {
		min-width: 0;
	}

	.pas__title {
		margin: 0 0 4px;
		font-size: 11px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-secondary);
	}

	.pas__val {
		margin: 0 0 6px;
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.35;
	}

	.pas__num {
		font-size: 1.5rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: #c2410c;
		margin-right: 6px;
	}

	:global(html.dark) .pas__num {
		color: #fb923c;
	}

	.pas__unit {
		font-weight: 800;
		color: var(--text-primary);
	}

	.pas__hint {
		margin: 0;
		font-size: 0.78rem;
		line-height: 1.45;
		color: var(--text-secondary);
	}
</style>
