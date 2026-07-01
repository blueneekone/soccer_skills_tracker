<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { collection, getDocs } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import IntelModal from '$lib/components/ui/IntelModal.svelte';
	import StickerVariantShell from '$lib/components/gamification/StickerVariantShell.svelte';
	import OperativeIdCardFrame from '$lib/components/stats/OperativeIdCardFrame.svelte';
	import ProPlayerCardBack from '$lib/components/stats/ProPlayerCardBack.svelte';
	import { composeOperativePortrait } from '$lib/gamification/renderOperativeLoadout.js';
	import {
		resolveOperativeCardMetadata,
		stickerVariantFromCardRarity,
	} from '$lib/gamification/cardCollectibleMetadata.js';

	const PRO_CARD_INTEL = {
		title: 'PRO PLAYER CARD',
		instructions: [
			'Until coach-verified season metrics publish here, this area stays minimal beside your operative portrait. Use the briefing chip next to the heading anytime.',
			'When seasons arrive, chips appear above the radar chart with verified metric blocks for your selection.',
			'When endorsement metadata exists for that row, a Coach verified badge shows beside this heading.',
		],
	};

	let {
		playerEmailKey = '',
		playerDisplayName = '',
		/** Pre-loaded seasons (e.g. public callable). When set, skips Firestore. */
		prefetchedSeasons = undefined,
		/** Optional DiceBear seed bundle from `users.operativeAvatar` (JSON only). */
		operativeAvatar = undefined,
		/** Sprint 3.1 — equipped loadout for border frame on portrait ring. */
		operativeLoadout = undefined,
		ownedCosmetics = undefined,
		ownedSeasonOneCards = undefined,
		rankName = 'Recruit',
		operativeLevel = undefined,
		/** Z2 org label — clubs/{clubId}.name via resolveClubDisplayName (3.5g-b); not team roster. */
		clubName = undefined,
		/** Back-face header. */
		telemetryTitle = 'OPERATIVE TELEMETRY',
		/** Optional back-face rows; when blank, a short fallback line is shown. */
		telemetryTotalXp = '',
		telemetryWorkouts = '',
		telemetryJoinDate = '',
		/**
		 * Collectible-style print finish for Field Card chrome (`base` default).
		 * @type {'base' | 'holo' | 'radiant' | 'alt-art'}
		 */
		variant = 'base',
		/** Armory Studio dossier row — flip ID card only, no stats / radar workspace. */
		dossierPreview = false,
		/** Public recruit — generic flavor only (no rank-tier copy). */
		publicRecruit = false,
	} = $props();

	const cardMetadata = $derived(
		resolveOperativeCardMetadata({
			operativeLoadout,
			ownedSeasonOneCards: Array.isArray(ownedSeasonOneCards) ? ownedSeasonOneCards : [],
			rankName,
			emailKey: playerEmailKey,
			publicRecruit,
		}),
	);

	const printVariant = $derived(
		cardMetadata ? stickerVariantFromCardRarity(cardMetadata.rarity) : variant,
	);

	const portraitLayers = $derived(
		composeOperativePortrait({
			operativeAvatar,
			loadout: operativeLoadout,
			size: 96,
			ownedIds: ownedCosmetics,
		}),
	);

	/** 3D Operative ID card */
	let isFlipped = $state(false);

	function onOperativeIdKeydown(/** @type {KeyboardEvent} */ e) {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault();
		isFlipped = !isFlipped;
	}

	/** @type {null | typeof import('chart.js').Chart} */
	let ChartCtor = null;
	let chartJsReady = $state(false);

	let seasons = $state(/** @type {Array<Record<string, unknown> & { id: string }>} */ ([]));
	let loading = $state(true);
	let selectedId = $state('');
	let radarEl = $state(/** @type {HTMLCanvasElement | undefined} */ (undefined));
	/** @type {import('chart.js').Chart | null} */
	let radarInstance = null;

	onMount(() => {
		if (!browser) return;
		(async () => {
			const mod = await import('chart.js');
			ChartCtor = mod.Chart;
			mod.Chart.register(...mod.registerables);
			chartJsReady = true;
		})();
	});

	$effect(() => {
		if (dossierPreview) {
			seasons = [];
			selectedId = '';
			loading = false;
			return;
		}

		if (Array.isArray(prefetchedSeasons)) {
			const list = prefetchedSeasons.map((s) => ({ ...s }));
			list.sort((a, b) =>
				String(a.seasonLabel || '').localeCompare(String(b.seasonLabel || '')),
			);
			seasons = list;
			selectedId = list.length ? list[list.length - 1].id : '';
			loading = false;
			return;
		}

		const key = playerEmailKey;
		if (!key) {
			seasons = [];
			selectedId = '';
			loading = false;
			return;
		}
		let cancelled = false;
		loading = true;
		(async () => {
			try {
				const snap = await getDocs(
					collection(db, 'player_metrics', key, 'seasons'),
				);
				if (cancelled) return;
				const list = [];
				snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
				list.sort((a, b) =>
					String(a.seasonLabel || '').localeCompare(String(b.seasonLabel || '')),
				);
				seasons = list;
				selectedId = list.length ? list[list.length - 1].id : '';
			} catch (e) {
				console.error(e);
				if (!cancelled) seasons = [];
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	const selected = $derived(seasons.find((s) => s.id === selectedId));

	const hasTelemetryDetails = $derived(
		telemetryTotalXp !== '' || telemetryWorkouts !== '' || telemetryJoinDate !== '',
	);

	function num(v) {
		const n = Number(v);
		return Number.isFinite(n) ? n : 0;
	}

	$effect(() => {
		if (!browser || !chartJsReady || !ChartCtor || !radarEl || !selected) {
			if (radarInstance) {
				radarInstance.destroy();
				radarInstance = null;
			}
			return;
		}

		const phys = /** @type {Record<string, unknown>} */ (selected.physical || {});
		const tech = /** @type {Record<string, unknown>} */ (selected.technical || {});
		const labels = [
			'Pace',
			'Stamina',
			'Strength',
			'Passing',
			'Shooting',
			'Dribbling',
			'Defending',
		];
		const data = [
			num(phys.pace),
			num(phys.stamina),
			num(phys.strength),
			num(tech.passing),
			num(tech.shooting),
			num(tech.dribbling),
			num(tech.defending),
		];

		if (radarInstance) {
			radarInstance.destroy();
			radarInstance = null;
		}

		const cs = getComputedStyle(document.documentElement);
		const gold = cs.getPropertyValue('--aggie-gold').trim() || '#f59e0b';
		const grid = cs.getPropertyValue('--chart-grid').trim() || 'rgba(15,23,42,0.12)';
		const tick = cs.getPropertyValue('--chart-tick').trim() || '#334155';

		radarInstance = new ChartCtor(radarEl, {
			type: 'radar',
			data: {
				labels,
				datasets: [
					{
						label: String(selected.seasonLabel || 'Season'),
						data,
						backgroundColor: gold + '40',
						borderColor: gold,
						borderWidth: 2,
						pointBackgroundColor: gold,
						pointBorderColor: '#fff',
					},
				],
			},
			options: {
				scales: {
					r: {
						min: 0,
						max: 100,
						ticks: {
							stepSize: 25,
							color: tick,
							backdropColor: 'transparent',
						},
						grid: { color: grid },
						angleLines: { color: grid },
						pointLabels: { color: tick, font: { size: 11, weight: '600' } },
					},
				},
				plugins: {
					legend: {
						display: true,
						labels: { color: tick, font: { weight: '700' } },
					},
				},
				responsive: true,
				maintainAspectRatio: false,
			},
		});

		return () => {
			if (radarInstance) {
				radarInstance.destroy();
				radarInstance = null;
			}
		};
	});
</script>

{#if playerEmailKey}
	{#snippet operativeCardBody()}
	<div
		class="pro-card-outer bento-section"
		class:pro-card-outer--dossier-preview={dossierPreview}
	>
		<div class="ppc-id-wrap">
			<p
				class="ppc-flip-hint tw-mb-2 tw-text-center tw-text-[11px] tw-font-extrabold tw-uppercase tw-tracking-[0.2em] tw-text-cyan-500/80"
			>
				Click to flip
			</p>
			<div
				class="ppc-flip-scene tw-relative tw-mx-auto tw-h-[360px] tw-w-full tw-max-w-[280px] tw-cursor-pointer tw-overflow-hidden tw-rounded-2xl"
				style="perspective: 1000px;"
				role="button"
				tabindex="0"
				aria-pressed={isFlipped}
				aria-label="Operative ID card. Click to view operative telemetry on the back."
				onclick={() => (isFlipped = !isFlipped)}
				onkeydown={onOperativeIdKeydown}
			>
				<div
					class="ppc-flip-inner tw-relative tw-h-full tw-w-full tw-transition-transform tw-duration-700"
					style="transform-style: preserve-3d;{isFlipped ? ' transform: rotateY(180deg);' : ''}"
				>
					<div
						class="ppc-face ppc-face--front tw-absolute tw-inset-0 tw-flex tw-flex-col tw-items-center tw-justify-center tw-overflow-visible tw-rounded-2xl tw-border tw-p-6"
						style="-webkit-backface-visibility: hidden; backface-visibility: hidden;"
					>
						<OperativeIdCardFrame
							variant="card"
							portraitSvg={portraitLayers.portraitSvg}
							borderSvg={portraitLayers.borderSvg}
							bannerSvg={portraitLayers.bannerSvg}
							frameClass={portraitLayers.frameClass}
							displayName={playerDisplayName || 'Operative'}
							clubName={clubName}
							rankName={rankName}
							{operativeLevel}
							{cardMetadata}
						/>
					</div>
					<div
						class="ppc-face ppc-face--back tw-absolute tw-inset-0 tw-flex tw-min-h-0 tw-flex-col tw-overflow-hidden tw-rounded-2xl tw-border tw-p-5 tw-text-left"
						style="transform: rotateY(180deg); -webkit-backface-visibility: hidden; backface-visibility: hidden;"
					>
						<ProPlayerCardBack
							{cardMetadata}
							{telemetryTitle}
							{hasTelemetryDetails}
							{telemetryTotalXp}
							{telemetryWorkouts}
							{telemetryJoinDate}
							showIllustratorCredit={!publicRecruit}
						/>
					</div>
				</div>
			</div>
		</div>

		{#if !dossierPreview}
			<div class="card pro-card-shell">
				<div class="pro-card-header-row">
					<div class="pro-card-title-row">
						<h2 class="pro-card-title">Pro player card</h2>
						<IntelModal title={PRO_CARD_INTEL.title} instructions={PRO_CARD_INTEL.instructions} />
					</div>
					{#if selected?.verifiedBy}
					<div class="pro-verified-badge" title="Coach-endorsed verified metrics">
						<span class="pro-verified-icon" aria-hidden="true">✓</span>
						<span>Coach verified</span>
					</div>
				{/if}
			</div>

			{#if loading}
				<p class="pro-card-hint">Loading profile…</p>
			{:else if seasons.length === 0}
				<p class="pro-card-hint pro-card-hint--empty">
					<span class="tw-sr-only">No verified season metrics loaded.</span>
					<span aria-hidden="true">—</span>
				</p>
			{:else}
				<div class="pro-season-chips" role="tablist" aria-label="Season">
					{#each seasons as s (s.id)}
						<button
							type="button"
							class="pro-season-chip"
							class:active={selectedId === s.id}
							role="tab"
							aria-selected={selectedId === s.id}
							onclick={() => (selectedId = s.id)}
						>
							{String(s.seasonLabel || s.id)}
						</button>
					{/each}
				</div>

				<div class="pro-card-inner-bento">
					<div class="card pro-radar-card">
						<div class="card-header pro-inner-head">Performance radar</div>
						<div class="card-body pro-radar-body">
							<div class="pro-radar-wrap">
								<canvas bind:this={radarEl} class="pro-radar-canvas"></canvas>
							</div>
						</div>
					</div>

					<div class="card pro-stats-card">
						<div class="card-header pro-inner-head">Verified metrics</div>
						<div class="card-body pro-stats-body">
							{#if selected}
								<div class="pro-stats-grid">
									<section class="pro-stats-block">
										<h3 class="pro-stats-heading">Physical</h3>
										<ul class="pro-metric-list">
											<li>
												<span>Pace</span>
												<strong>{num(selected.physical?.pace)}</strong>
											</li>
											<li>
												<span>Stamina</span>
												<strong>{num(selected.physical?.stamina)}</strong>
											</li>
											<li>
												<span>Strength</span>
												<strong>{num(selected.physical?.strength)}</strong>
											</li>
										</ul>
									</section>
									<section class="pro-stats-block">
										<h3 class="pro-stats-heading">Technical</h3>
										<ul class="pro-metric-list">
											<li>
												<span>Passing</span>
												<strong>{num(selected.technical?.passing)}</strong>
											</li>
											<li>
												<span>Shooting</span>
												<strong>{num(selected.technical?.shooting)}</strong>
											</li>
											<li>
												<span>Dribbling</span>
												<strong>{num(selected.technical?.dribbling)}</strong>
											</li>
											<li>
												<span>Defending</span>
												<strong>{num(selected.technical?.defending)}</strong>
											</li>
										</ul>
									</section>
								</div>
								<p class="pro-scale-note">All attributes are scored 0–100.</p>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
		{/if}
	</div>
	{/snippet}

	{#if dossierPreview}
		{@render operativeCardBody()}
	{:else}
	<StickerVariantShell
		variant={printVariant}
		class="pro-card-shell pd-glass-panel tw-rounded-2xl"
	>
		{#snippet children()}
			{@render operativeCardBody()}
		{/snippet}
	</StickerVariantShell>
	{/if}
{/if}

<style>
	.ppc-id-wrap {
		margin-bottom: clamp(16px, 3vw, 24px);
	}

	.ppc-flip-scene {
		transform: translateZ(0);
		contain: layout paint;
	}

	.pro-card-outer {
		grid-template-columns: 1fr;
		gap: clamp(16px, 3vw, 24px);
		margin-bottom: clamp(16px, 3vw, 24px);
	}

	.pro-card-outer--dossier-preview {
		margin-bottom: 0;
		gap: 0;
	}

	.pro-card-outer--dossier-preview .ppc-id-wrap {
		margin-bottom: 0;
	}

	.pro-card-outer--dossier-preview .ppc-flip-scene {
		height: auto;
		min-height: clamp(300px, 48vw, 360px);
		max-height: none;
	}

	.pro-card-outer--dossier-preview .ppc-flip-hint {
		display: none;
	}

	.pro-card-shell {
		margin-bottom: 0;
		padding: var(--spacing-fluid);
		border-radius: var(--radius-premium);
	}

	.pro-card-header-row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: clamp(12px, 2.5vw, 16px);
		margin-bottom: clamp(16px, 3vw, 20px);
		padding-bottom: clamp(12px, 2vw, 16px);
		border-bottom: 1px solid var(--border-subtle);
	}

	.pro-card-title {
		margin: 0;
		font-size: clamp(1.15rem, 3.5vw, 1.45rem);
		font-weight: 900;
		letter-spacing: -0.02em;
	}

	.pro-card-title-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.pro-verified-badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: clamp(8px, 2vw, 10px) clamp(14px, 3vw, 18px);
		border-radius: var(--radius-premium);
		font-size: 0.78rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-on-gold);
		background: linear-gradient(135deg, var(--aggie-gold) 0%, #fbbf24 100%);
		border: 1px solid rgba(180, 83, 9, 0.35);
		box-shadow: 0 8px 24px -8px rgba(245, 158, 11, 0.45);
	}

	.pro-verified-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: rgba(15, 23, 42, 0.15);
		font-size: 0.85rem;
	}

	.pro-card-hint {
		margin: 0;
		font-weight: 600;
		color: var(--text-secondary);
		line-height: 1.55;
		font-size: clamp(0.9rem, 2.5vw, 0.95rem);
	}

	.pro-card-hint--empty {
		text-align: center;
		font-family: ui-monospace, monospace;
		font-size: 1.25rem;
		color: rgba(148, 163, 184, 0.35);
		padding: clamp(12px, 3vw, 20px) 0;
	}

	.pro-season-chips {
		display: flex;
		flex-wrap: wrap;
		gap: clamp(8px, 2vw, 10px);
		margin-bottom: clamp(16px, 3vw, 20px);
	}

	.pro-season-chip {
		margin: 0;
		padding: clamp(8px, 2vw, 10px) clamp(14px, 3vw, 16px);
		border-radius: var(--radius-premium);
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		font: inherit;
		font-weight: 800;
		font-size: 0.82rem;
		cursor: pointer;
		color: var(--text-secondary);
		-webkit-backdrop-filter: blur(12px);
		backdrop-filter: blur(12px);
	}

	.pro-season-chip.active {
		background: var(--aggie-blue);
		color: #fff;
		border-color: var(--aggie-blue);
	}

	.pro-card-inner-bento {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));
		gap: clamp(16px, 3vw, 24px);
		align-items: stretch;
	}

	.pro-radar-card,
	.pro-stats-card {
		margin-bottom: 0;
		padding: clamp(14px, 2.5vw, var(--spacing-fluid));
		border-radius: var(--radius-premium);
	}

	.pro-inner-head {
		font-size: 1rem;
		padding-bottom: clamp(10px, 2vw, 12px);
		margin-bottom: clamp(10px, 2vw, 12px);
	}

	.pro-radar-body,
	.pro-stats-body {
		padding-top: 0;
	}

	.pro-radar-wrap {
		position: relative;
		height: min(340px, 55vw);
		width: 100%;
	}

	.pro-radar-canvas {
		display: block;
		width: 100%;
		height: 100%;
	}

	.pro-stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));
		gap: clamp(16px, 3vw, 20px);
	}

	.pro-stats-heading {
		margin: 0 0 clamp(10px, 2vw, 12px);
		font-size: 0.78rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
	}

	.pro-metric-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: clamp(10px, 2vw, 12px);
	}

	.pro-metric-list li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: clamp(10px, 2vw, 12px);
		border-radius: var(--radius-premium);
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.pro-metric-list strong {
		font-size: 1.1rem;
		font-weight: 900;
		color: var(--text-primary);
	}

	.pro-scale-note {
		margin: clamp(14px, 2.5vw, 18px) 0 0;
		font-size: 0.78rem;
		color: var(--text-secondary);
		font-weight: 600;
	}
</style>
