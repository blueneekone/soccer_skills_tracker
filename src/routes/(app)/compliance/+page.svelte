<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
	import { fetchClubCheckrConfig } from '$lib/compliance/checkrClubConfig.js';
	import type { ClearanceDoc } from '$lib/types/backgroundCheck.js';
	import CoachClearanceChecklist from '$lib/components/compliance/CoachClearanceChecklist.svelte';
	import CheckrEmbed from './CheckrEmbed.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	export const ssr = false;

	let clubName = $state('Your club');

	const clearance = $derived(
		(authStore.userProfile?.clearance as ClearanceDoc | undefined) ?? null,
	);
	const coachEmail = $derived(authStore.user?.email ?? authStore.userProfile?.email ?? '');

	$effect(() => {
		const clubId = authStore.userProfile?.clubId;
		if (!clubId) return;
		fetchClubCheckrConfig(clubId).then((cfg) => {
			if (cfg.clubName) clubName = cfg.clubName;
		});
	});

	$effect(() => {
		if (authStore.isLoading) return;
		if (authStore.isCleared && browser) {
			const dest = untrack(() =>
				applyLoginWaterfall(authStore.role, authStore.userProfile),
			);
			untrack(() => goto(dest, { replaceState: true }));
		}
	});
</script>

<svelte:head>
	<title>Background Screening — SSTracker</title>
</svelte:head>

<div class="cc-page">
	<header class="cc-page__header">
		<div class="cc-page__icon" aria-hidden="true">
			<Icon name="status.shield-check" size={28} />
		</div>
		<div>
			<p class="cc-page__eyebrow">Coach clearance</p>
			<h1 class="cc-page__title">Background screening</h1>
			<p class="cc-page__lead">
				Your club sponsors this screening. Complete the Checkr invitation when your director
				orders it — you will not pick packages or pay fees here.
			</p>
		</div>
	</header>

	<div class="cc-page__meta">
		<span>Signed in as {coachEmail || '—'}</span>
	</div>

	<CoachClearanceChecklist {clubName} {coachEmail} {clearance} />

	<div class="cc-page__tracking">
		<h2 class="cc-page__section-title">Screening status</h2>
		<CheckrEmbed mode="tracking" {clearance} />
	</div>

	<p class="cc-page__privacy">
		<Icon name="sys.lock-simple" size={14} />
		Identity details and disclosures are handled only inside Checkr's secure flow.
	</p>
</div>

<style>
	.cc-page {
		min-height: 100dvh;
		background: #ffffff;
		color: #111827;
		font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem 1rem 3rem;
		gap: 1.5rem;
	}

	.cc-page__header,
	.cc-page__meta,
	:global(.ccc),
	.cc-page__tracking,
	.cc-page__privacy {
		width: 100%;
		max-width: 42rem;
	}

	.cc-page__header {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.cc-page__icon {
		flex-shrink: 0;
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		background: #eff6ff;
		color: #1d4ed8;
	}

	.cc-page__eyebrow {
		margin: 0 0 0.25rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #6b7280;
	}

	.cc-page__title {
		margin: 0 0 0.5rem;
		font-size: clamp(1.35rem, 4vw, 1.75rem);
		font-weight: 700;
		color: #111827;
		letter-spacing: -0.01em;
	}

	.cc-page__lead {
		margin: 0;
		font-size: 0.9375rem;
		line-height: 1.6;
		color: #4b5563;
	}

	.cc-page__meta {
		font-size: 0.8125rem;
		color: #6b7280;
		padding-bottom: 0.25rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.cc-page__tracking {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.cc-page__section-title {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 600;
		color: #374151;
	}

	.cc-page__privacy {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		font-size: 0.75rem;
		color: #9ca3af;
		text-align: center;
	}
</style>
