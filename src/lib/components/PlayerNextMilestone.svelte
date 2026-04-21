<script>
	import { browser } from '$app/environment';
	import { doc, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { getNextCardTierProgress } from '$lib/gamification/level.js';

	let totalXpLive = $state(0);

	const progress = $derived(getNextCardTierProgress(totalXpLive));

	$effect(() => {
		if (!browser || !authStore.user?.uid) return;
		const uid = authStore.user.uid;
		const ref = doc(db, 'player_stats', uid);
		const unsub = onSnapshot(
			ref,
			(snap) => {
				if (!snap.exists()) {
					totalXpLive = 0;
					return;
				}
				const d = snap.data();
				totalXpLive = Math.floor(Number(d.total_xp) || 0);
			},
			(err) => console.error('[PlayerNextMilestone]', err),
		);
		return () => unsub();
	});
</script>

<section class="pnm" aria-labelledby="pnm-h">
	<h3 id="pnm-h" class="pnm__title">Next milestone</h3>
	{#if progress.atMaxCardTier}
		<p class="pnm__body">You are on the Elite card tier. Keep logging sessions to climb levels.</p>
	{:else if progress.nextTierName}
		<p class="pnm__body">
			Only <strong>{progress.xpNeeded.toLocaleString()} XP</strong> until
			<strong>{progress.nextTierName}</strong> tier.
		</p>
	{:else}
		<p class="pnm__body">Earn XP to unlock your next card tier.</p>
	{/if}
	<a class="pnm__cta" href="/challenges">Earn XP now</a>
</section>

<style>
	.pnm {
		padding: 16px;
		border-radius: 14px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--surface-subtle, #fafafa);
		box-sizing: border-box;
	}

	:global(html.dark) .pnm {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.1);
	}

	.pnm__title {
		margin: 0 0 10px;
		font-size: 13px;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	.pnm__body {
		margin: 0 0 14px;
		font-size: 13px;
		font-weight: 600;
		line-height: 1.45;
		color: var(--text-secondary);
	}

	.pnm__body strong {
		color: var(--text-primary);
		font-weight: 900;
	}

	.pnm__cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 12px 16px;
		border-radius: 12px;
		font-size: 0.9rem;
		font-weight: 900;
		text-align: center;
		text-decoration: none;
		color: var(--text-on-gold, #0f172a);
		background: linear-gradient(135deg, var(--brand-primary, #f59e0b) 0%, #fbbf24 100%);
		border: 1px solid color-mix(in srgb, var(--brand-primary, #f59e0b) 55%, #78350f);
		box-shadow: 0 8px 22px -10px color-mix(in srgb, var(--brand-primary, #f59e0b) 65%, transparent);
		box-sizing: border-box;
	}

	.pnm__cta:hover {
		filter: brightness(1.05);
	}

	.pnm__cta:focus-visible {
		outline: 2px solid var(--focus-ring-color, #6366f1);
		outline-offset: 2px;
	}
</style>
