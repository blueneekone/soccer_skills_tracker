<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { collection, query, where, getDocs } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const uid = $derived(authStore.user?.uid || '');
	const role = $derived(authStore.role);

	let loading = $state(true);
	let drillCount = $state(0);
	let pendingVideoCount = $state(0);

	$effect(() => {
		if (!browser || !uid || role !== 'player') {
			loading = false;
			drillCount = 0;
			pendingVideoCount = 0;
			return;
		}
		let cancelled = false;
		loading = true;
		(async () => {
			try {
				const [aSnap, vSnap] = await Promise.all([
					getDocs(
						query(
							collection(db, 'assignments'),
							where('playerId', '==', uid),
							where('status', '==', 'pending'),
						),
					),
					getDocs(
						query(
							collection(db, 'trial_scores'),
							where('playerId', '==', uid),
							where('status', '==', 'pending_verification'),
						),
					),
				]);
				if (cancelled) return;
				drillCount = aSnap.size;
				pendingVideoCount = vSnap.size;
			} catch (e) {
				console.error('[PlayerActionInbox]', e);
				if (!cancelled) {
					drillCount = 0;
					pendingVideoCount = 0;
				}
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	function startDrills() {
		goto('/tracker');
	}

	function uploadChallenge() {
		goto('/challenges');
	}
</script>

<div class="pai" aria-label="Your training actions">
	<div class="pai__head">
		<i class="ph ph-lightning" aria-hidden="true"></i>
		<span>Action inbox</span>
	</div>

	{#if loading}
		<p class="pai__muted">Loading your assignments…</p>
	{:else}
		<div class="pai__grid">
			<div class="pai__card">
				<div class="pai__card-top">
					<span class="pai__kicker">Homework & drills</span>
					<h3 class="pai__title">
						{#if drillCount === 0}
							You’re clear — no drills due right now.
						{:else if drillCount === 1}
							You have 1 drill assigned for this week. Let’s get it done.
						{:else}
							You have {drillCount} drills assigned for this week. Stay sharp.
						{/if}
					</h3>
				</div>
				<button type="button" class="pai__btn pai__btn--primary" onclick={startDrills}>
					Start
				</button>
			</div>

			<div class="pai__card">
				<div class="pai__card-top">
					<span class="pai__kicker">Coach challenges</span>
					<h3 class="pai__title">
						{#if pendingVideoCount > 0}
							{pendingVideoCount} challenge video{pendingVideoCount === 1 ? '' : 's'} awaiting coach review — keep
							raising the bar.
						{:else}
							Active challenges (like the 100 juggles challenge) need your best clip — upload when you’re ready.
						{/if}
					</h3>
				</div>
				<button type="button" class="pai__btn pai__btn--accent" onclick={uploadChallenge}>
					Upload video
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.pai {
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		background: #ffffff;
		padding: 14px 14px 16px;
		box-sizing: border-box;
	}

	:global(html.dark) .pai {
		border-color: rgba(255, 255, 255, 0.1);
		background: #09090b;
	}

	.pai__head {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-secondary);
		margin-bottom: 12px;
	}

	.pai__head .ph-lightning {
		font-size: 1.1rem;
		color: var(--brand-primary, #6366f1);
	}

	.pai__muted {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.pai__grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 10px;
	}

	@media (min-width: 640px) {
		.pai__grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.pai__card {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 12px;
		min-height: 7rem;
		padding: 12px 12px 12px;
		border-radius: 12px;
		border: 1px solid #e5e5e5;
		background: #fafafa;
		box-sizing: border-box;
	}

	:global(html.dark) .pai__card {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.1);
	}

	.pai__kicker {
		display: block;
		font-size: 10px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--brand-primary, #6366f1);
		margin-bottom: 6px;
	}

	.pai__title {
		margin: 0;
		font-size: 0.92rem;
		font-weight: 700;
		line-height: 1.45;
		color: var(--text-primary);
	}

	.pai__btn {
		align-self: flex-start;
		font: inherit;
		font-size: 12px;
		font-weight: 800;
		padding: 8px 14px;
		border-radius: 10px;
		border: 1px solid transparent;
		cursor: pointer;
	}

	.pai__btn--primary {
		background: var(--brand-primary, #6366f1);
		color: #0f172a;
		border-color: color-mix(in srgb, var(--brand-primary, #6366f1) 55%, #0f172a);
	}

	.pai__btn--accent {
		background: linear-gradient(135deg, #fde68a, #f59e0b);
		color: #0f172a;
		border-color: rgba(180, 83, 9, 0.35);
	}

	.pai__btn:hover {
		filter: brightness(1.03);
	}
</style>
