<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { doc, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import TeamLeaderboard from '$lib/components/tracker/TeamLeaderboard.svelte';
	import '$lib/styles/director-os.css';

	const isPlayerRole = $derived(authStore.role === 'player');

	const userUid = $derived(authStore.user?.uid ?? '');

	/** @type {null | typeof import('chart.js').Chart} */
	let ChartCtor = $state(null);
	let chartOk = $state(false);
	/** @type {HTMLCanvasElement | undefined} */
	let radarCanvas = $state();
	/** @type {HTMLCanvasElement | undefined} */
	let workoutCanvas = $state();

	/** Skill vector 0–100: Technical, Physical, Tactical, Mental */
	let skillsVector = $state(/** @type {number[]} */ ([10, 10, 10, 10]));

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
	 * @typedef {{ id: string; title: string; phIcon: string; unlocked: boolean; tier?: 'standard' | 'elite' }} BadgeDef
	 */

	/** @param {unknown} raw */
	function parseTrialScore(raw) {
		const s = String(raw ?? '').trim();
		const frac = /^(\d+)\s*\/\s*(\d+)$/.exec(s);
		if (frac) {
			const a = Number(frac[1]);
			const b = Number(frac[2]);
			if (b > 0 && Number.isFinite(a)) {
				return Math.min(100, Math.max(0, Math.round((100 * a) / b)));
			}
		}
		const n = parseFloat(s);
		if (Number.isFinite(n)) return Math.min(100, Math.max(0, Math.round(n)));
		const low = s.toLowerCase();
		if (low.includes('master')) return 92;
		if (low.includes('good')) return 72;
		if (low.includes('struggle')) return 45;
		return 55;
	}

	/**
	 * @param {string} skill
	 * @returns {'technical' | 'physical' | 'tactical' | 'mental'}
	 */
	function categorizeSkill(skill) {
		const k = skill.toLowerCase();
		if (
			/(strength|speed|stamina|physical|conditioning|agility|jump|sprint|power)/.test(k)
		) {
			return 'physical';
		}
		if (/(tactical|position|press|shape|transition|defense|attack|team)/.test(k)) {
			return 'tactical';
		}
		if (/(mental|decision|composure|leadership|focus|discipline)/.test(k)) {
			return 'mental';
		}
		return 'technical';
	}

	/**
	 * @param {Record<string, unknown>} scores
	 */
	function skillVectorFromTrials(scores) {
		const buckets = {
			technical: /** @type {number[]} */ ([]),
			physical: /** @type {number[]} */ ([]),
			tactical: /** @type {number[]} */ ([]),
			mental: /** @type {number[]} */ ([]),
		};
		if (!scores || typeof scores !== 'object') {
			return [10, 10, 10, 10];
		}
		for (const [skill, raw] of Object.entries(scores)) {
			const v = parseTrialScore(raw);
			const cat = categorizeSkill(skill);
			buckets[cat].push(v);
		}
		const avg = (/** @type {number[]} */ arr) =>
			arr.length ?
				Math.min(99, Math.max(0, Math.round(arr.reduce((a, b) => a + b, 0) / arr.length))) :
				null;
		return [
			avg(buckets.technical) ?? 10,
			avg(buckets.physical) ?? 10,
			avg(buckets.tactical) ?? 10,
			avg(buckets.mental) ?? 10,
		];
	}

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
				phIcon: 'ph-fire',
				unlocked: lv >= 8 || xp >= 12000,
				tier: 'elite',
			},
			{
				id: 'marksman',
				title: 'ELITE_MARKSMAN',
				phIcon: 'ph-target',
				unlocked: lv >= 14 || xp >= 28000,
				tier: 'elite',
			},
			{
				id: 'vector',
				title: 'VECTOR_ACE',
				phIcon: 'ph-radar',
				unlocked: lv >= 6 || xp >= 9000,
				tier: 'standard',
			},
			{
				id: 'iron',
				title: 'IRON_LUNGS',
				phIcon: 'ph-wind',
				unlocked: lv >= 10 || xp >= 18000,
				tier: 'standard',
			},
			{
				id: 'ghost',
				title: 'GHOST_PRESS',
				phIcon: 'ph-ghost',
				unlocked: lv >= 18 || xp >= 42000,
				tier: 'elite',
			},
			{
				id: 'crown',
				title: 'DYNASTY_MODE',
				phIcon: 'ph-crown',
				unlocked: lv >= 22 || xp >= 55000,
				tier: 'elite',
			},
			{
				id: 'sword',
				title: 'BLADE_RUNNER',
				phIcon: 'ph-sword',
				unlocked: lv >= 16 || xp >= 38000,
				tier: 'standard',
			},
			{
				id: 'lock',
				title: 'ZERO_DAY_PROTOCOL',
				phIcon: 'ph-shield-chevron',
				unlocked: lv >= 12 || xp >= 24000,
				tier: 'standard',
			},
			{
				id: 'flame',
				title: 'COMBUSTION_99',
				phIcon: 'ph-flame',
				unlocked: lv >= 26 || xp >= 72000,
				tier: 'elite',
			},
			{
				id: 'medal',
				title: 'ORBITAL_STRIKE',
				phIcon: 'ph-medal',
				unlocked: lv >= 20 || xp >= 48000,
				tier: 'elite',
			},
			{
				id: 'timer',
				title: 'CHRONO_LOCK',
				phIcon: 'ph-timer',
				unlocked: lv >= 24 || xp >= 62000,
				tier: 'standard',
			},
			{
				id: 'code',
				title: 'OVERRIDE_KEY',
				phIcon: 'ph-key',
				unlocked: lv >= 30 || xp >= 95000,
				tier: 'elite',
			},
		];
	}

	let badges = $state(/** @type {BadgeDef[]} */ (computeBadges(1, 0)));

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
				monthlyPerformance = parseMonthlyPerformance(d.monthly_performance);
				dailyPerformance = parseDailyPerformance(d.daily_performance);
				weeklyPerformance = parseWeeklyPerformance(d.weekly_performance);
				const vt =
					d.verified_trial_scores && typeof d.verified_trial_scores === 'object' ?
						/** @type {Record<string, unknown>} */ (d.verified_trial_scores) :
						{};
				skillsVector = skillVectorFromTrials(vt);
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

	onMount(() => {
		if (!browser) return;
		(async () => {
			const mod = await import('chart.js');
			ChartCtor = mod.Chart;
			mod.Chart.register(...mod.registerables);
			chartOk = true;
		})();
	});

	$effect(() => {
		chartOk;
		radarCanvas;
		ChartCtor;
		const values = skillsVector;
		if (!chartOk || !ChartCtor || !radarCanvas || !browser) return;

		let inst = new ChartCtor(radarCanvas, {
			type: 'radar',
			data: {
				labels: ['TECHNICAL', 'PHYSICAL', 'TACTICAL', 'MENTAL'],
				datasets: [
					{
						label: 'SKILL_VECTOR',
						data: values,
						fill: true,
						borderColor: 'rgba(0, 255, 200, 0.95)',
						backgroundColor: 'rgba(0, 255, 200, 0.12)',
						borderWidth: 2,
						pointBackgroundColor: 'rgba(56, 189, 248, 0.95)',
						pointBorderColor: 'rgba(0, 255, 200, 1)',
						pointHoverBackgroundColor: '#00ffc8',
						pointRadius: 3,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: { duration: 420 },
				plugins: {
					legend: { display: false },
					filler: { propagate: true },
					tooltip: {
						enabled: true,
						backgroundColor: 'rgba(0,0,0,0.9)',
						borderColor: 'rgba(255,255,255,0.12)',
						borderWidth: 1,
						titleFont: { family: 'ui-monospace, monospace' },
						bodyFont: { family: 'ui-monospace, monospace' },
					},
				},
				scales: {
					r: {
						min: 0,
						max: 100,
						beginAtZero: true,
						angleLines: { color: 'rgba(0, 255, 200, 0.2)' },
						grid: { color: 'rgba(34, 211, 255, 0.15)' },
						pointLabels: {
							color: 'rgba(255,255,255,0.45)',
							font: { size: 10, family: 'ui-monospace, monospace' },
						},
						ticks: {
							display: false,
							backdropColor: 'transparent',
						},
					},
				},
			},
		});
		return () => {
			inst?.destroy();
		};
	});

	/** @type {import('chart.js').Chart | null} */
	let workoutChartInst = null;

	$effect(() => {
		chartOk;
		workoutCanvas;
		ChartCtor;
		workoutViewMode;
		monthlyPerformance;
		dailyPerformance;
		weeklyPerformance;
		if (!chartOk || !ChartCtor || !workoutCanvas || !browser) return;

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

		if (workoutChartInst) {
			workoutChartInst.destroy();
			workoutChartInst = null;
		}

		workoutChartInst = new ChartCtor(workoutCanvas, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: dsLabel,
						data,
						borderColor: 'rgba(0, 255, 200, 0.92)',
						backgroundColor: 'rgba(34, 211, 238, 0.14)',
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
				animation: { duration: 380 },
				plugins: {
					legend: {
						display: true,
						labels: {
							color: 'rgba(226, 232, 240, 0.85)',
							font: { family: 'ui-monospace, monospace', size: 10 },
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

	/** @param {BadgeDef} b @param {number} i */
	function lockedLine(b, i) {
		if (b.unlocked) return b.title;
		return i % 2 === 0 ? 'CLASSIFIED' : 'ENCRYPTED_DATA';
	}
</script>

<div
	class="ec-page ec-player-stats view-section dossier-page"
	class:pos-stats={isPlayerRole}
>
	<h1 class="tw-text-2xl tw-font-bold tw-text-white tw-mb-6">Operative Analytics</h1>

	<section class="stats-team-lb tw-mb-8 tw-min-w-0" aria-label="Team leaderboard HQ">
		<TeamLeaderboard compact />
	</section>

	<div
		class="dossier-grid"
		role="region"
		aria-label="Skill radar and analytics"
	>
		<section
			class="dossier-panel dossier-radar"
			aria-label="Skill radar telemetry matrix"
		>
			<div class="dossier-radar__head">
				<span class="dossier-label">Telemetry matrix</span>
				<span class="dossier-mono dossier-tx-tag">RDR_V4</span>
			</div>
			<p class="dossier-radar__hint no-print">
				Vector overlay · 0–100 · coach-verified trials + dossier sync
			</p>
			<div class="dossier-radar__chart tw-min-w-0 tw-h-[300px] tw-relative">
				<canvas
					bind:this={radarCanvas}
					class="dossier-canvas"
					aria-label="Skill dimensions radar: Technical, Physical, Tactical, Mental"
				></canvas>
			</div>
			<div class="dossier-radar__footer font-mono dossier-radar__footer-tx">
				LV {dossierLevel} · XP {dossierXp.toLocaleString()} · PIPE=PLAYER_STATS_TRIALS
			</div>
		</section>

		<section
			class="dossier-panel dossier-workout"
			aria-label="Workout telemetry"
		>
			<div class="dossier-radar__head">
				<span class="dossier-label">Workout Telemetry</span>
				<span class="dossier-mono dossier-tx-tag">
					{workoutViewMode === 'daily' ?
						'WX_DAILY_14' :
						workoutViewMode === 'weekly' ?
							'WX_WEEK_8' :
							'WX_MONTHLY'}
				</span>
			</div>
			<div class="dossier-workout__seg" role="group" aria-label="Workout aggregation window">
				<button
					type="button"
					class="dossier-seg"
					class:dossier-seg--on={workoutViewMode === 'daily'}
					onclick={() => (workoutViewMode = 'daily')}
				>
					Daily
				</button>
				<button
					type="button"
					class="dossier-seg"
					class:dossier-seg--on={workoutViewMode === 'weekly'}
					onclick={() => (workoutViewMode = 'weekly')}
				>
					Weekly
				</button>
				<button
					type="button"
					class="dossier-seg"
					class:dossier-seg--on={workoutViewMode === 'monthly'}
					onclick={() => (workoutViewMode = 'monthly')}
				>
					Monthly
				</button>
			</div>
			<p class="dossier-radar__hint no-print">
				Training XP from workout logs — UTC day / Monday-week / calendar-month buckets (toggle above)
			</p>
			<div class="dossier-workout__chart tw-min-w-0 tw-h-[260px] tw-relative">
				<canvas
					bind:this={workoutCanvas}
					class="dossier-canvas"
					aria-label="Training XP trend by selected period"
				></canvas>
			</div>
			<div class="dossier-radar__footer font-mono dossier-radar__footer-tx">
				{#if workoutViewMode === 'daily'}
					SERIES=DAILY · N={dailyPerformance.length} · UTC · XP
				{:else if workoutViewMode === 'weekly'}
					SERIES=WEEKLY · N={weeklyPerformance.length} · MON_START · XP
				{:else}
					SERIES=MONTHLY · N={monthlyPerformance.length} · YYYY-MM · XP
				{/if}
			</div>
		</section>
	</div>

	<!-- Trophy matrix -->
	<section
		class="dossier-panel dossier-badges"
		id="trophy-room"
		aria-label="Achievement matrix"
	>
		<div class="dossier-badges__head">
			<div>
				<span class="dossier-label">Asset registry</span>
				<h3 class="dossier-badges__title">ACHIEVEMENT_MATRIX</h3>
			</div>
			<div class="dossier-badges__stat font-mono dossier-statline">
				UNL={badges.filter((b) => b.unlocked).length} · LCK={badges.filter((b) => !b.unlocked)
					.length}
			</div>
		</div>
		<div class="dossier-badges__grid" role="list">
			{#each badges as b, i (b.id)}
				<div
					class="dossier-badge"
					class:dossier-badge--unlocked={b.unlocked}
					class:dossier-badge--elite={b.unlocked && b.tier === 'elite'}
					role="listitem"
				>
					<div
						class="dossier-badge__icon"
						aria-hidden="true"
						class:dossier-badge__icon--locked={!b.unlocked}
					>
						<i class="ph {b.phIcon}"></i>
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

<style>
	:global(:where(.dossier-page)) {
		--d-bg: #000000;
		--d-panel: #05050a;
		--d-line: rgba(255, 255, 255, 0.1);
		--d-cyber: #22d3ee;
		--d-iso: #4ade80;
		background: var(--d-bg);
		color: #f4f4f5;
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
		gap: clamp(0.75rem, 2vw, 1.25rem);
		margin-bottom: clamp(0.75rem, 2vw, 1.25rem);
	}

	@media (min-width: 960px) {
		.dossier-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.dossier-panel {
		background: var(--d-panel);
		border: 1px solid var(--d-line);
		border-radius: 0;
		padding: clamp(0.9rem, 2vw, 1.1rem);
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
		gap: 0.5rem;
	}

	@media (min-width: 640px) {
		.dossier-badges__grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (min-width: 1100px) {
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
		border-color: rgba(34, 211, 238, 0.28);
		box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.15);
	}

	.dossier-badge--elite {
		border-color: rgba(0, 255, 200, 0.45);
		box-shadow:
			0 0 0 1px rgba(0, 255, 200, 0.25),
			0 0 18px rgba(0, 255, 200, 0.2);
	}

	.dossier-badge--unlocked .dossier-badge__label {
		color: #e0f2fe;
		text-shadow: 0 0 8px rgba(34, 211, 238, 0.35);
	}

	.dossier-badge--elite .dossier-badge__icon {
		color: #5eead4;
		filter: drop-shadow(0 0 6px rgba(0, 255, 200, 0.55));
	}

	.dossier-badge__icon {
		font-size: 1.45rem;
		color: rgba(34, 211, 238, 0.9);
		line-height: 1;
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
	.tw-h-\[260px\] {
		height: 260px;
	}
	.tw-relative {
		position: relative;
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
	:global(.stats-team-lb .lb-compact-row) {
		background: rgba(15, 23, 42, 0.65) !important;
		border-color: rgba(148, 163, 184, 0.2) !important;
	}
	:global(.stats-team-lb .lb-compact-name) {
		color: #f1f5f9 !important;
	}
</style>
