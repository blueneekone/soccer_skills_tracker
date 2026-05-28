<script lang="ts">
	import { browser } from '$app/environment';
	import { httpsCallable } from 'firebase/functions';
	import { functions } from '$lib/firebase.js';
	import ProPlayerCard from '$lib/components/stats/ProPlayerCard.svelte';

	let { data } = $props();

	const playerKeyNorm = $derived((data.playerKey || '').trim().toLowerCase());

	let status = $state(/** @type {'loading' | 'ok' | 'unavailable'} */ ('loading'));
	let displayName = $state('');
	let clubName = $state('');
	let operativeLevel = $state<number | undefined>(undefined);
	/** @type {Array<Record<string, unknown> & { id: string }>} */
	let seasons = $state([]);
	/** @type {import('$lib/avatars/portraitV2Schema.js').OperativePortrait | { v: number; seed: string } | undefined} */
	let operativeAvatarDesign = $state(undefined);

	$effect(() => {
		if (!browser) return;
		const key = playerKeyNorm;
		if (!key) {
			status = 'unavailable';
			return;
		}
		let cancelled = false;
		status = 'loading';
		displayName = '';
		clubName = '';
		operativeLevel = undefined;
		seasons = [];
		operativeAvatarDesign = undefined;
		(async () => {
			try {
				const fn = httpsCallable(functions, 'getPublicRecruitProfile');
				const res = await fn({ playerKey: key });
				const payload = /** @type {{ ok?: boolean, displayName?: string | null, clubName?: string | null, seasons?: unknown, playerKey?: string, operativeAvatar?: { v?: unknown, seed?: unknown, parts?: unknown } } | undefined} */ (
					res.data
				);
				if (cancelled) return;
				if (payload?.ok === true && typeof payload.playerKey === 'string') {
					displayName = typeof payload.displayName === 'string' ? payload.displayName : '';
					clubName =
						typeof payload.clubName === 'string' ? payload.clubName.trim() : '';
					const oa = payload.operativeAvatar;
					if (oa && typeof oa === 'object' && oa.v === 2 && oa.parts && typeof oa.parts === 'object' && !Array.isArray(oa.parts)) {
						/** @type {Record<string, string | null>} */
						const parts = {};
						for (const key of ['face', 'hair', 'kit']) {
							const val = /** @type {Record<string, unknown>} */ (oa.parts)[key];
							if (typeof val === 'string' && val.trim()) {
								parts[key] = String(val).trim().slice(0, 64);
							} else if (val === null) {
								parts[key] = null;
							}
						}
						operativeAvatarDesign = { v: 2, parts };
					} else {
						operativeAvatarDesign = undefined;
					}
					const rawSeasons = payload.seasons;
					seasons = Array.isArray(rawSeasons)
						? /** @type {typeof seasons} */ (rawSeasons.slice())
						: [];
					status = 'ok';
				} else {
					status = 'unavailable';
				}
			} catch (e) {
				console.error(e);
				if (!cancelled) status = 'unavailable';
			}
		})();
		return () => {
			cancelled = true;
		};
	});
</script>

<svelte:head>
	<title>
		{status === 'ok' && displayName
			? `${displayName} · Recruiting profile`
			: 'Recruiting profile · SSTRACKER'}
	</title>
	<meta
		name="description"
		content="Coach-verified player metrics for college recruiting."
	/>
</svelte:head>

{#if status === 'loading'}
	<section class="recruit-panel recruit-panel--hero glass-panel">
		<p class="recruit-loading">Loading verified profile…</p>
	</section>
{:else if status === 'ok'}
	<header class="recruit-panel recruit-panel--hero glass-panel">
		<p class="recruit-kicker">SSTRACKER recruiting</p>
		<h1 class="recruit-h1">{displayName || 'Player profile'}</h1>
		<p class="recruit-lead">
			Metrics below are coach-verified. This page is shared only when the athlete
			has opted in and meets program age requirements.
		</p>
	</header>
	<ProPlayerCard
		playerEmailKey={playerKeyNorm}
		playerDisplayName={displayName || ''}
		prefetchedSeasons={seasons}
		operativeAvatar={operativeAvatarDesign}
		clubName={clubName || undefined}
		{operativeLevel}
		publicRecruit={true}
	/>
{:else}
	<section class="recruit-panel recruit-panel--unavailable glass-panel">
		<h1 class="recruit-h1">Profile not available</h1>
		<p class="recruit-lead">
			This recruiting profile is not public, may be restricted by age policy, or
			the link may be invalid or expired.
		</p>
		<p class="recruit-foot">
			Scouts and coaches: request an updated link directly from the athlete or
			their club.
		</p>
	</section>
{/if}

<style>
	.glass-panel {
		border-radius: var(--radius-premium);
		padding: clamp(20px, 4vw, 28px);
		margin-bottom: clamp(20px, 3vw, 28px);
		background: rgba(15, 23, 42, 0.55);
		border: 1px solid rgba(255, 255, 255, 0.12);
		-webkit-backdrop-filter: blur(16px);
		backdrop-filter: blur(16px);
		box-shadow: 0 24px 48px -20px rgba(0, 0, 0, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	.recruit-kicker {
		margin: 0 0 8px;
		font-size: 0.72rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: rgba(226, 232, 240, 0.75);
	}

	.recruit-h1 {
		margin: 0 0 12px;
		font-size: clamp(1.5rem, 4.5vw, 2rem);
		font-weight: 900;
		letter-spacing: -0.03em;
		color: #f8fafc;
	}

	.recruit-lead {
		margin: 0;
		max-width: 52ch;
		font-size: clamp(0.92rem, 2.5vw, 1rem);
		font-weight: 600;
		line-height: 1.6;
		color: rgba(226, 232, 240, 0.88);
	}

	.recruit-foot {
		margin: 16px 0 0;
		font-size: 0.88rem;
		font-weight: 600;
		color: rgba(148, 163, 184, 0.95);
		max-width: 48ch;
		line-height: 1.55;
	}

	.recruit-loading {
		margin: 0;
		font-weight: 700;
		color: rgba(226, 232, 240, 0.9);
	}

	:global(.recruit-landing-root .pro-card-title),
	:global(.recruit-landing-root .pro-card-name) {
		color: #f8fafc;
	}

	:global(.recruit-landing-root .pro-card-sub),
	:global(.recruit-landing-root .pro-card-hint) {
		color: rgba(226, 232, 240, 0.82);
	}

	:global(.recruit-landing-root .pro-season-chip) {
		background: rgba(15, 23, 42, 0.45);
		border-color: rgba(255, 255, 255, 0.14);
		color: rgba(226, 232, 240, 0.9);
	}

	:global(.recruit-landing-root .pro-metric-list li) {
		background: rgba(15, 23, 42, 0.35);
		border-color: rgba(255, 255, 255, 0.1);
		color: rgba(226, 232, 240, 0.85);
	}

	:global(.recruit-landing-root .pro-metric-list strong) {
		color: #f8fafc;
	}
</style>
