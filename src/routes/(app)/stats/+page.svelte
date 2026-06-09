<script lang="ts">
	import { browser } from '$app/environment';
	import { doc, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import { deriveVanguardPrism } from '$lib/utils/vanguard-prism.js';
	import { hasVanguardTelemetry } from '$lib/player/dashboard/vanguardProtocol.js';
	import '$lib/styles/director-os.css';
	import '$lib/styles/player-dossier.css';
	import '$lib/styles/player-dashboard-hud.css';
	import Icon from '$lib/components/ui/Icon.svelte';
	import PlayerOsPageStrap from '$lib/components/player/PlayerOsPageStrap.svelte';
	import VanguardProtocolPanel from '$lib/components/player/dashboard/VanguardProtocolPanel.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import type { VanguardAxisId } from '$lib/player/dashboard/vanguardProtocol.js';

	const isPlayerRole = $derived(authStore.role === 'player');

	const userUid = $derived(authStore.user?.uid ?? '');

	/** @type {null | typeof import('chart.js').Chart} */
	let ChartCtor = $state(null);
	let chartOk = $state(false);
	/** @type {HTMLCanvasElement | undefined} */
	let workoutCanvas = $state();

	let selectedVanguardAxis = $state<VanguardAxisId | null>(null);

	/** @type {Array<{ month: string; xp: number }>} */
	let monthlyPerformance = $state([]);
	/** @type {Array<{ day: string; xp: number }>} */
	let dailyPerformance = $state([]);
	/** @type {Array<{ week: string; xp: number }>} */
	let weeklyPerformance = $state([]);
	let workoutViewMode = $state(/** @type {'daily' | 'weekly' | 'monthly'} */ ('monthly'));

	let dossierLevel = $state(1);
	let dossierXp = $state(0);

	/**
	 * @typedef {{ id: string; title: string; icon: IconName; unlocked: boolean; tier?: 'standard' | 'elite' }} BadgeDef
	 */

	/** Monthly XP chart rows — mirrored on `player_stats` when recruit profile is private. */
	function parseMonthlyPerformance(mp) {
		return Array.isArray(mp) ?
			mp
				.filter(
					(/** @type {unknown} */ row) =>
						row &&
						typeof row === 'object' &&
						typeof /** @type {{month?: unknown}} */ (row).month === 'string',
				)
				.map((/** @type {unknown} */ row) => {
					const r = /** @type {{month?: string; xp?: unknown}} */ (row);
					const xp =
						typeof r.xp === 'number' && !Number.isNaN(r.xp) ?
							Math.floor(r.xp) :
							0;
					return { month: String(r.month ?? ''), xp };
				}) :
			[];
	}

	function parseDailyPerformance(raw) {
		return Array.isArray(raw) ?
			raw
				.filter(
					(/** @type {unknown} */ row) =>
						row &&
						typeof row === 'object' &&
						typeof /** @type {{day?: unknown}} */ (row).day === 'string',
				)
				.map((/** @type {unknown} */ row) => {
					const r = /** @type {{day?: string; xp?: unknown}} */ (row);
					const xp =
						typeof r.xp === 'number' && !Number.isNaN(r.xp) ?
							Math.floor(r.xp) :
							0;
					return { day: String(r.day ?? ''), xp };
				}) :
			[];
	}

	function parseWeeklyPerformance(raw) {
		return Array.isArray(raw) ?
			raw
				.filter(
					(/** @type {unknown} */ row) =>
						row &&
						typeof row === 'object' &&
						typeof /** @type {{week?: unknown}} */ (row).week === 'string',
				)
				.map((/** @type {unknown} */ row) => {
					const r = /** @type {{week?: string; xp?: unknown}} */ (row);
					const xp =
						typeof r.xp === 'number' && !Number.isNaN(r.xp) ?
							Math.floor(r.xp) :
							0;
					return { week: String(r.week ?? ''), xp };
				}) :
			[];
	}

	/**
	 * @param {number} level
	 * @param {number} totalXp
	 * @returns {BadgeDef[]}
	 */
	function computeBadges(level, totalXp) {
		const lv = Math.max(1, Math.floor(level || 1));
		const xp = Math.max(0, Math.floor(totalXp || 0));
		return [
		{
			id: 'streak',
			title: '100_DAY_STREAK',
			icon: /** @type {IconName} */ ('game.flame'),
			unlocked: lv >= 8 || xp >= 12000,
			tier: 'elite',
		},
		{
			id: 'marksman',
			title: 'ELITE_MARKSMAN',
			icon: /** @type {IconName} */ ('data.target'),
			unlocked: lv >= 14 || xp >= 28000,
			tier: 'elite',
		},
		{
			id: 'vector',
			title: 'VECTOR_ACE',
			icon: /** @type {IconName} */ ('data.radar'),
			unlocked: lv >= 6 || xp >= 9000,
			tier: 'standard',
		},
		{
			id: 'iron',
			title: 'IRON_LUNGS',
			icon: /** @type {IconName} */ ('env.wind'),
			unlocked: lv >= 10 || xp >= 18000,
			tier: 'standard',
		},
		{
			id: 'ghost',
			title: 'GHOST_PRESS',
			icon: /** @type {IconName} */ ('game.ghost'),
			unlocked: lv >= 18 || xp >= 42000,
			tier: 'elite',
		},
		{
			id: 'crown',
			title: 'DYNASTY_MODE',
			icon: /** @type {IconName} */ ('game.crown'),
			unlocked: lv >= 22 || xp >= 55000,
			tier: 'elite',
		},
		{
			id: 'sword',
			title: 'BLADE_RUNNER',
			icon: /** @type {IconName} */ ('game.sword'),
			unlocked: lv >= 16 || xp >= 38000,
			tier: 'standard',
		},
		{
			id: 'lock',
			title: 'ZERO_DAY_PROTOCOL',
			icon: /** @type {IconName} */ ('status.shield-check'),
			unlocked: lv >= 12 || xp >= 24000,
			tier: 'standard',
		},
		{
			id: 'flame',
			title: 'COMBUSTION_99',
			icon: /** @type {IconName} */ ('game.flame'),
			unlocked: lv >= 26 || xp >= 72000,
			tier: 'elite',
		},
		{
			id: 'medal',
			title: 'ORBITAL_STRIKE',
			icon: /** @type {IconName} */ ('game.medal'),
			unlocked: lv >= 20 || xp >= 48000,
			tier: 'elite',
		},
		{
			id: 'timer',
			title: 'CHRONO_LOCK',
			icon: /** @type {IconName} */ ('sys.timer'),
			unlocked: lv >= 24 || xp >= 62000,
			tier: 'standard',
		},
		{
			id: 'code',
			title: 'OVERRIDE_KEY',
			icon: /** @type {IconName} */ ('sys.key'),
			unlocked: lv >= 30 || xp >= 95000,
			tier: 'elite',
		},
		];
	}

	let badges = $state(/** @type {BadgeDef[]} */ (computeBadges(1, 0)));

	/** @type {Record<string, unknown> | null} */
	let playerStatsSnapshot = $state(null);

	const attrRadarValues = $derived(
		deriveVanguardPrism(
			playerStatsSnapshot,
			/** @type {import('$lib/utils/vanguard-prism.js').ArmoryStats} */ (
				authStore.userProfile?.armory?.stats ?? {}
			),
		),
	);
	const telemetryReady = $derived(hasVanguardTelemetry(attrRadarValues));

	$effect(() => {
		if (!browser || !userUid) return;

		const refPub = doc(db, 'public_player_profiles', userUid);
		const refPs = doc(db, 'player_stats', userUid);

		const unsubPub = onSnapshot(
			refPub,
			(snap) => {
				const profileXp = Math.max(
					0,
					Math.floor(
						Number(
							authStore.userProfile?.totalXp ??
								authStore.userProfile?.xp ??
								0,
						),
					),
				);
				const lvFallback = getLevelProgressFromTotalXp(profileXp).level;

				if (!snap.exists()) {
					dossierLevel = lvFallback;
					dossierXp = profileXp;
					badges = computeBadges(lvFallback, profileXp);
					return;
				}

				const d = snap.data() || {};

				const lv =
					typeof d.current_level === 'number' && !Number.isNaN(d.current_level) ?
						Math.floor(d.current_level) :
						lvFallback;
				const tx =
					typeof d.total_xp === 'number' && !Number.isNaN(d.total_xp) ?
						Math.floor(d.total_xp) :
						profileXp;

				dossierLevel = lv;
				dossierXp = tx;
				badges = computeBadges(lv, tx);
			},
			(e) => {
				console.warn('[stats] public_player_profiles snapshot', e);
			},
		);

		const unsubPs = onSnapshot(
			refPs,
			(snap) => {
				const d = snap.exists() ? snap.data() || {} : {};
				playerStatsSnapshot = /** @type {Record<string, unknown>} */ (d);
				monthlyPerformance = parseMonthlyPerformance(d.monthly_performance);
				dailyPerformance = parseDailyPerformance(d.daily_performance);
				weeklyPerformance = parseWeeklyPerformance(d.weekly_performance);
			},
			(e) => {
				console.warn('[stats] player_stats snapshot', e);
			},
		);

		return () => {
			unsubPub();
			unsubPs();
		};
	});

	$effect(() => {
		if (!browser) return;
		(async () => {
			const mod = await import('chart.js');
			ChartCtor = mod.Chart;
			mod.Chart.register(...mod.registerables);
			chartOk = true;
		})();
	});

	// CLB-2 — raw Chart.js skill radar removed; the cohesive VanguardProtocolPanel
	// (SVG prism radar) now renders for every role. Workout XP timeline below stays Chart.js.

	/** @type {import('chart.js').Chart | null} */
	let workoutChartInst = null;

	// Effect 1 — chart lifecycle: create (with cinematic intro) when canvas, constructor, or view
	// mode changes. Teardown destroys on unmount or when these structural deps change.
	$effect(() => {
		chartOk;
		workoutCanvas;
		ChartCtor;
		workoutViewMode;
		if (!chartOk || !ChartCtor || !workoutCanvas || !browser) return;

		if (workoutChartInst) {
			workoutChartInst.destroy();
			workoutChartInst = null;
		}

		const dsLabel =
			workoutViewMode === 'daily' ? 'DAILY_XP' :
			workoutViewMode === 'weekly' ? 'WEEKLY_XP' :
			'MONTHLY_XP';

		workoutChartInst = new ChartCtor(workoutCanvas, {
			type: 'line',
			data: {
				labels: [],
				datasets: [
					{
						label: dsLabel,
						data: [],
						borderColor: 'rgba(0, 255, 200, 0.92)',
						backgroundColor: 'rgba(20, 184, 166, 0.14)',
						fill: true,
						tension: 0.32,
						borderWidth: 2,
						pointBackgroundColor: 'rgba(52, 211, 153, 0.95)',
						pointBorderColor: 'rgba(0, 255, 200, 1)',
						pointRadius: 3,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				layout: {
					padding: { top: 12, bottom: 28, left: 16, right: 16 },
				},
				animation: { duration: 380 },
				plugins: {
					legend: {
						display: true,
						position: 'bottom',
						align: 'center',
						labels: {
							color: 'rgba(226, 232, 240, 0.85)',
							font: { family: 'ui-monospace, monospace', size: 10 },
							boxWidth: 10,
							padding: 10,
						},
					},
					tooltip: {
						backgroundColor: 'rgba(0,0,0,0.9)',
						borderColor: 'rgba(255,255,255,0.12)',
						borderWidth: 1,
						titleFont: { family: 'ui-monospace, monospace' },
						bodyFont: { family: 'ui-monospace, monospace' },
					},
				},
				scales: {
					x: {
						ticks: { color: 'rgba(148, 163, 184, 0.95)', font: { family: 'ui-monospace, monospace', size: 9 } },
						grid: { color: 'rgba(34, 211, 255, 0.12)' },
					},
					y: {
						beginAtZero: true,
						ticks: {
							color: 'rgba(148, 163, 184, 0.95)',
							font: { family: 'ui-monospace, monospace', size: 9 },
						},
						grid: { color: 'rgba(0, 255, 200, 0.08)' },
					},
				},
			},
		});

		return () => {
			if (workoutChartInst) {
				workoutChartInst.destroy();
				workoutChartInst = null;
			}
		};
	});

	// Effect 2 — data-only updates: patch existing chart instance without re-animating.
	// Runs on every Firestore snapshot (performance data change) without destroying the chart.
	$effect(() => {
		workoutViewMode;
		monthlyPerformance;
		dailyPerformance;
		weeklyPerformance;
		if (!workoutChartInst || !browser) return;

		/** @type {string[]} */
		let labels = [];
		/** @type {number[]} */
		let data = [];
		let dsLabel = 'MONTHLY_XP';

		if (workoutViewMode === 'daily') {
			const rows = dailyPerformance;
			labels = rows.map((r) => String(r.day ?? '').slice(5));
			data = rows.map((r) =>
				typeof r.xp === 'number' && !Number.isNaN(r.xp) ? r.xp : 0,
			);
			dsLabel = 'DAILY_XP';
		} else if (workoutViewMode === 'weekly') {
			const rows = weeklyPerformance;
			labels = rows.map((r) => String(r.week ?? '').slice(5));
			data = rows.map((r) =>
				typeof r.xp === 'number' && !Number.isNaN(r.xp) ? r.xp : 0,
			);
			dsLabel = 'WEEKLY_XP';
		} else {
			const rows = monthlyPerformance;
			labels = rows.map((r) => String(r.month ?? ''));
			data = rows.map((r) =>
				typeof r.xp === 'number' && !Number.isNaN(r.xp) ? r.xp : 0,
			);
			dsLabel = 'MONTHLY_XP';
		}

		workoutChartInst.data.labels = labels;
		workoutChartInst.data.datasets[0].data = data;
		workoutChartInst.data.datasets[0].label = dsLabel;
		workoutChartInst.update('none');
		workoutChartInst.resize();
	});

	/** @param {BadgeDef} b @param {number} i */
	function lockedLine(b, i) {
		if (b.unlocked) return b.title;
		return i % 2 === 0 ? 'CLASSIFIED' : 'ENCRYPTED_DATA';
	}
</script>

<div
	class="ec-page ec-player-stats view-section dossier-page player-dossier-root pd-page-root"
	class:player-hud-root={isPlayerRole}
	class:pos-stats={isPlayerRole}
>
	<div class="pd-content-wrap" class:pd-route-stack={isPlayerRole}>
	{#if isPlayerRole}
		<PlayerOsPageStrap eyebrow="Progress / Analytics" title="Operative analytics">
			{#snippet status()}
				<span class="pd-label">LV {dossierLevel}</span>
			{/snippet}
		</PlayerOsPageStrap>
	{:else}
	<h1 class="tw-text-2xl tw-font-bold tw-text-white tw-mb-6">Operative Analytics</h1>
	{/if}

	<div
		class="dossier-grid"
		role="region"
		aria-label="Skill radar and analytics"
	>
		<section
			class="stats-analytics-void pd-os-deck pd-os-deck--recessed bento-span-12"
			class:stats-analytics-void--compact={!telemetryReady}
			data-region="stats-analytics-void"
			aria-label="Vanguard protocol telemetry"
		>
			<header class="pd-hq-section-head stats-analytics-void__head">
				<h2 class="pd-hq-section-head__title stats-analytics-void__title">Vanguard telemetry</h2>
				<p class="pd-hq-section-head__eyebrow pd-label stats-analytics-void__eyebrow">Performance</p>
			</header>
			<VanguardProtocolPanel
				prismValues={attrRadarValues}
				bind:selectedAxis={selectedVanguardAxis}
				compact={!telemetryReady}
				hideHeadTitle={true}
			/>
		</section>

		<section
			class="dossier-workout pd-panel-section"
			class:stats-workout-band={isPlayerRole}
			class:pd-os-deck={isPlayerRole}
			class:pd-os-deck--hero={isPlayerRole}
			class:bento-span-12={isPlayerRole}
			class:dossier-panel={!isPlayerRole}
			class:pd-page-panel={!isPlayerRole}
			aria-label="Workout telemetry"
		>
			{#if isPlayerRole}
				<header class="pd-hq-section-head stats-workout-band__head">
					<h2 class="pd-hq-section-head__title stats-workout-band__title">Workout telemetry</h2>
					<p class="pd-hq-section-head__eyebrow pd-label stats-workout-band__eyebrow">Training</p>
				</header>
			{:else}
			<div class="dossier-radar__head">
				<span class="dossier-label">Workout telemetry</span>
				<span class="dossier-mono dossier-tx-tag">
					{workoutViewMode === 'daily' ?
						'WX_DAILY_14' :
						workoutViewMode === 'weekly' ?
							'WX_WEEK_8' :
							'WX_MONTHLY'}
				</span>
			</div>
			{/if}
			<div
				class="dossier-workout__seg"
				class:stats-chip-rail={isPlayerRole}
				role="group"
				aria-label="Workout aggregation window"
			>
				<button
					type="button"
					class:dossier-seg={!isPlayerRole}
					class:dossier-seg--on={!isPlayerRole && workoutViewMode === 'daily'}
					class:stats-chip={isPlayerRole}
					class:stats-chip--on={isPlayerRole && workoutViewMode === 'daily'}
					onclick={() => (workoutViewMode = 'daily')}
				>
					Daily
				</button>
				<button
					type="button"
					class:dossier-seg={!isPlayerRole}
					class:dossier-seg--on={!isPlayerRole && workoutViewMode === 'weekly'}
					class:stats-chip={isPlayerRole}
					class:stats-chip--on={isPlayerRole && workoutViewMode === 'weekly'}
					onclick={() => (workoutViewMode = 'weekly')}
				>
					Weekly
				</button>
				<button
					type="button"
					class:dossier-seg={!isPlayerRole}
					class:dossier-seg--on={!isPlayerRole && workoutViewMode === 'monthly'}
					class:stats-chip={isPlayerRole}
					class:stats-chip--on={isPlayerRole && workoutViewMode === 'monthly'}
					onclick={() => (workoutViewMode = 'monthly')}
				>
					Monthly
				</button>
			</div>
			<p class="dossier-radar__hint no-print" class:stats-workout-band__hint={isPlayerRole}>
				Training XP from workout logs — UTC day / Monday-week / calendar-month buckets (toggle above)
			</p>
			<div
				class="dossier-workout__chart tw-min-w-0 tw-h-[300px] tw-relative"
				class:pd-os-deck__well={isPlayerRole}
			>
				<canvas
					bind:this={workoutCanvas}
					class="dossier-canvas"
					aria-label="Training XP trend by selected period"
				></canvas>
			</div>
			{#if !isPlayerRole}
			<div class="dossier-radar__footer font-mono dossier-radar__footer-tx">
				{#if workoutViewMode === 'daily'}
					SERIES=DAILY · N={dailyPerformance.length} · UTC · XP
				{:else if workoutViewMode === 'weekly'}
					SERIES=WEEKLY · N={weeklyPerformance.length} · MON_START · XP
				{:else}
					SERIES=MONTHLY · N={monthlyPerformance.length} · YYYY-MM · XP
				{/if}
			</div>
			{/if}
		</section>
	</div>

	<!-- Trophy matrix -->
	<section
		class="pd-panel-section bento-span-12"
		class:stats-achievement-deck={isPlayerRole}
		class:dossier-panel={!isPlayerRole}
		class:dossier-badges={!isPlayerRole}
		class:pd-page-panel={!isPlayerRole}
		id="trophy-room"
		aria-label="Achievement matrix"
	>
		{#if isPlayerRole}
			<header class="pd-hq-section-head stats-achievement-deck__head">
				<div class="stats-achievement-deck__id">
					<h2 class="pd-hq-section-head__title stats-achievement-deck__title">Achievement matrix</h2>
					<p class="pd-hq-section-head__eyebrow pd-label stats-achievement-deck__eyebrow">Asset registry</p>
				</div>
				<div class="stats-achievement-deck__status" role="status">
					<p class="pd-label pd-mono">
						UNL={badges.filter((b) => b.unlocked).length} · LCK={badges.filter((b) => !b.unlocked).length}
					</p>
				</div>
			</header>
		{:else}
		<div class="dossier-badges__head">
			<div>
				<span class="dossier-label">Asset registry</span>
				<h3 class="dossier-badges__title">ACHIEVEMENT_MATRIX</h3>
			</div>
			<div class="dossier-badges__stat font-mono dossier-statline">
				UNL={badges.filter((b) => b.unlocked).length} · LCK={badges.filter((b) => !b.unlocked).length}
			</div>
		</div>
		{/if}
		<div
			class="dossier-badges__grid"
			class:stats-achievement-deck__grid={isPlayerRole}
			role="list"
		>
			{#each badges as b, i (b.id)}
				<div
					class="dossier-badge"
					class:pd-os-deck={isPlayerRole}
					class:stats-achievement-row={isPlayerRole}
					class:stats-achievement-row--unlocked={isPlayerRole && b.unlocked}
					class:stats-achievement-row--elite={isPlayerRole && b.unlocked && b.tier === 'elite'}
					class:dossier-badge--unlocked={!isPlayerRole && b.unlocked}
					class:dossier-badge--elite={!isPlayerRole && b.unlocked && b.tier === 'elite'}
					role="listitem"
				>
					<div
						class="dossier-badge__icon"
						aria-hidden="true"
						class:dossier-badge__icon--locked={!b.unlocked}
					>
						<Icon name={b.icon} />
					</div>
					<div class="dossier-badge__text font-mono">
						{#if b.unlocked}
							<span class="dossier-badge__label">{b.title}</span>
						{:else}
							<span class="dossier-badge__obscure">{lockedLine(b, i)}</span>
						{/if}
					</div>
					<div class="dossier-badge__meta font-mono">
						{b.unlocked ? 'SIG_OK' : 'LOCKED'}
					</div>
				</div>
			{/each}
		</div>
	</section>
	</div>
</div>

<style>
	:global(:where(.dossier-page.player-dossier-root)) {
		--d-bg: var(--pd-bg, #000000);
		--d-panel: var(--pd-panel, #05050a);
		--d-line: var(--pd-line, rgba(255, 255, 255, 0.1));
		--d-cyber: var(--pd-accent-data, #14b8a6);
		--d-iso: #4ade80;
		background: var(--d-bg);
		color: var(--pd-text, #f4f4f5);
		padding-bottom: clamp(1.25rem, 3vw, 2rem);
	}

	.dossier-label {
		display: block;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.5);
	}

	.dossier-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--bento-gap-sm);
		margin-bottom: var(--bento-gap-sm);
	}

	/* Player OS — single-column stack; VPP + workout bands span full route width (HQ parity) */
	:global(.player-hud-root.pos-stats) .dossier-grid {
		grid-template-columns: 1fr;
	}

	:global(.player-hud-root.pos-stats) .dossier-grid > :is(.stats-analytics-void, .dossier-workout) {
		grid-column: 1 / -1;
		min-width: 0;
		width: 100%;
	}

	@media (min-width: 60rem) {
		.dossier-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		/* Sprint 2.20c — workout chart spans full grid width below VPP radar */
		.dossier-workout {
			grid-column: 1 / -1;
		}

		:global(.player-hud-root.pos-stats) .dossier-grid {
			grid-template-columns: 1fr;
		}
	}

	.dossier-panel {
		border: 1px solid var(--d-line);
		border-radius: 0;
		padding: var(--bento-pad-sm);
		min-width: 0;
	}

	.dossier-mono {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.7);
	}
	.dossier-tx-tag {
		color: rgba(110, 231, 183, 0.85);
	}
	.dossier-statline {
		font-size: 11px;
		color: rgba(255, 255, 255, 0.4);
	}
	.dossier-radar__footer-tx {
		font-size: 10px;
		color: rgba(255, 255, 255, 0.35);
	}

	.dossier-radar__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.35rem;
	}

	.dossier-workout__seg {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0 0 0.5rem;
	}

	.dossier-seg {
		font-family: ui-monospace, monospace;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.06em;
		padding: 6px 10px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(0, 0, 0, 0.35);
		color: rgba(226, 232, 240, 0.75);
		border-radius: 0;
		cursor: pointer;
	}

	.dossier-seg--on {
		border-color: rgba(45, 212, 191, 0.75);
		color: rgba(167, 243, 208, 0.95);
		background: rgba(6, 78, 59, 0.25);
	}

	.dossier-radar__hint {
		margin: 0 0 0.5rem;
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.4);
		font-weight: 600;
	}

	.dossier-canvas {
		display: block;
		width: 100% !important;
		height: 100% !important;
	}

	.dossier-radar__footer {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.dossier-badges__head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
	}
	.dossier-badges__title {
		margin: 0.2rem 0 0;
		font-size: 0.85rem;
		font-weight: 900;
		letter-spacing: 0.16em;
		color: rgba(255, 255, 255, 0.9);
	}

	.dossier-badges__grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--bento-gap-xs);
	}

	@media (min-width: 40rem) {
		.dossier-badges__grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (min-width: 69rem) {
		.dossier-badges__grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.dossier-badge {
		border: 1px solid var(--d-line);
		background: #000;
		padding: 0.5rem 0.45rem 0.4rem;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		text-align: center;
	}

	.dossier-badge--unlocked {
		border-color: rgba(20, 184, 166, 0.28);
		box-shadow: 0 0 0 1px rgba(20, 184, 166, 0.15);
	}

	.dossier-badge--elite {
		border-color: rgba(0, 255, 200, 0.45);
		box-shadow:
			0 0 0 1px rgba(0, 255, 200, 0.25),
			0 0 18px rgba(0, 255, 200, 0.2);
	}

	.dossier-badge--unlocked .dossier-badge__label {
		color: #e0f2fe;
		text-shadow: 0 0 8px rgba(20, 184, 166, 0.35);
	}

	.dossier-badge--elite .dossier-badge__icon {
		color: #5eead4;
		filter: drop-shadow(0 0 6px rgba(0, 255, 200, 0.55));
	}

	.dossier-badge__icon :global(svg) {
		width: 1.45rem;
		height: 1.45rem;
		color: rgba(20, 184, 166, 0.9);
	}
	.dossier-badge__icon--locked {
		color: rgba(255, 255, 255, 0.2);
		filter: grayscale(1) brightness(0.6);
	}

	.dossier-badge__text {
		font-size: 0.6rem;
		letter-spacing: 0.04em;
		line-height: 1.25;
		word-break: break-all;
	}

	.dossier-badge__obscure {
		color: rgba(255, 255, 255, 0.32);
		letter-spacing: 0.08em;
	}

	.dossier-badge__meta {
		font-size: 0.5rem;
		color: rgba(255, 255, 255, 0.3);
		letter-spacing: 0.12em;
	}

	.dossier-badge--unlocked .dossier-badge__meta {
		color: rgba(52, 211, 153, 0.65);
	}

	.font-mono {
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
	}
	.tw-min-w-0 {
		min-width: 0;
	}
	.tw-h-\[300px\] {
		height: 300px;
	}
	.tw-relative {
		position: relative;
	}

	/* Sprint 2.22 slice 4e — workout chart full-width parity with VPP radar */
	.dossier-workout__chart {
		width: 100%;
		min-height: 300px;
	}

	.dossier-workout .dossier-canvas {
		width: 100% !important;
		height: 100% !important;
	}

	/* Team leaderboard strip — readable on Operative Analytics dark shell */
	:global(.stats-team-lb .lb-shell--compact) {
		background: rgba(5, 5, 12, 0.92) !important;
		border: 1px solid rgba(148, 163, 184, 0.22) !important;
		box-shadow: none !important;
	}
	:global(.stats-team-lb .lb-title) {
		color: #f8fafc !important;
	}
	:global(.stats-team-lb .lb-sub),
	:global(.stats-team-lb .lb-hint) {
		color: rgba(226, 232, 240, 0.72) !important;
	}
	:global(.stats-team-lb .lb-card) {
		background: rgba(15, 23, 42, 0.65) !important;
		border-color: rgba(148, 163, 184, 0.18) !important;
	}
	:global(.stats-team-lb .lb-card-name) {
		color: #f1f5f9 !important;
	}
</style>
