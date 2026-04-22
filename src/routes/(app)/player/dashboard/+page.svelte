<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { collection, getDocs } from 'firebase/firestore';
	import { untrack } from 'svelte';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const profile = $derived(authStore.userProfile);
	const email = $derived((authStore.user?.email || '').toLowerCase());

	/** @typedef {{ id: string, seasonLabel?: string, physical?: Record<string, unknown>, technical?: Record<string, unknown> }} SeasonRow */

	/** @type {SeasonRow[]} */
	let seasons = $state([]);
	let selectedSeasonId = $state('');
	let loading = $state(true);
	let loadError = $state('');

	$effect(() => {
		if (!browser) return;
		if (authStore.isLoading || !authStore.isAuthenticated) return;
		if (!email) {
			seasons = [];
			loading = false;
			return;
		}
		loading = true;
		loadError = '';
		let cancelled = false;
		(async () => {
			try {
				const snap = await getDocs(
					collection(db, 'player_metrics', email, 'seasons'),
				);
				if (cancelled) return;
				const list = [];
				snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
				list.sort((a, b) =>
					String(a.seasonLabel || a.id).localeCompare(
						String(b.seasonLabel || b.id),
					),
				);
				seasons = list;
				selectedSeasonId = list.length ? list[list.length - 1].id : '';
			} catch (e) {
				if (!cancelled) {
					console.error('[player dashboard] load', e);
					loadError =
						e instanceof Error ? e.message : 'Could not load season metrics.';
					seasons = [];
				}
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	const selectedSeason = $derived(
		seasons.find((s) => s.id === selectedSeasonId) || null,
	);

	function num(v) {
		const n = Number(v);
		if (!Number.isFinite(n)) return 0;
		return Math.max(0, Math.min(99, Math.round(n)));
	}

	const radarValues = $derived.by(() => {
		const phys = (selectedSeason?.physical || {});
		const tech = (selectedSeason?.technical || {});
		const pace = num(phys.pace);
		const shooting = num(tech.shooting);
		const passing = num(tech.passing);
		const dribbling = num(tech.dribbling);
		const stamina = num(phys.stamina);
		const strength = num(phys.strength);
		const physical =
			stamina > 0 || strength > 0 ? Math.round((stamina + strength) / 2) : 0;
		return { pace, shooting, passing, dribbling, physical };
	});

	const overallRating = $derived.by(() => {
		const v = radarValues;
		const total = v.pace + v.shooting + v.passing + v.dribbling + v.physical;
		return Math.round(total / 5);
	});

	const xp = $derived(Number(profile?.xp) || 0);
	const level = $derived(Math.floor(Math.sqrt(xp / 50)) + 1);
	const streak = $derived(Number(profile?.currentStreak) || 0);
	const longestStreak = $derived(Number(profile?.longestStreak) || streak);

	// ── Chart.js radar (Svelte 5 $effect lifecycle — zero onDestroy) ─────────
	let canvasEl = $state(/** @type {HTMLCanvasElement | undefined} */ (undefined));
	/** @type {import('chart.js').Chart | null} */
	let chart = null;

	/**
	 * Mounts the radar chart exactly once per canvas element and destroys it
	 * on teardown. The `destroyed` flag is declared INSIDE the effect so every
	 * re-run gets a fresh closure — guaranteeing the async `import('chart.js')`
	 * cannot land a stale `new Chart()` on a torn-down canvas, which is the
	 * canonical Svelte 5 cleanup pattern from `.cursorrules`.
	 */
	$effect(() => {
		if (!browser || !canvasEl) return;

		const targetCanvas = canvasEl;
		let destroyed = false;

		(async () => {
			try {
				const mod = await import('chart.js');
				if (destroyed || !targetCanvas.isConnected) return;
				mod.Chart.register(...mod.registerables);

				const v = untrack(() => radarValues);

				chart = new mod.Chart(targetCanvas, {
					type: 'radar',
					data: {
						labels: ['Pace', 'Shooting', 'Passing', 'Dribbling', 'Physical'],
						datasets: [
							{
								label: 'Player Rating',
								data: [v.pace, v.shooting, v.passing, v.dribbling, v.physical],
								backgroundColor: 'rgba(168, 85, 247, 0.25)',
								borderColor: '#a855f7',
								borderWidth: 2.5,
								pointBackgroundColor: '#22d3ee',
								pointBorderColor: '#09090b',
								pointBorderWidth: 2,
								pointRadius: 5,
								pointHoverRadius: 7,
								pointHoverBackgroundColor: '#f472b6',
							},
						],
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							r: {
								min: 0,
								max: 99,
								ticks: {
									stepSize: 25,
									color: '#a1a1aa',
									backdropColor: 'transparent',
									font: { size: 10, weight: '600' },
								},
								grid: { color: 'rgba(168, 85, 247, 0.12)' },
								angleLines: { color: 'rgba(34, 211, 238, 0.18)' },
								pointLabels: {
									color: '#fafafa',
									font: { size: 13, weight: '700' },
								},
							},
						},
						plugins: {
							legend: { display: false },
							tooltip: {
								backgroundColor: '#18181b',
								borderColor: '#3f3f46',
								borderWidth: 1,
								titleColor: '#fafafa',
								bodyColor: '#fafafa',
								padding: 10,
								boxPadding: 6,
							},
						},
					},
				});
			} catch (e) {
				console.error('[player dashboard] chart.js init', e);
			}
		})();

		return () => {
			destroyed = true;
			chart?.destroy();
			chart = null;
		};
	});

	/**
	 * Data-only refresh. We deliberately do NOT tear the chart down when
	 * radarValues changes — we mutate the existing dataset and call
	 * `update('none')` so the radar animates smoothly without thrashing the
	 * GL context. The teardown in the effect above is the single source of
	 * chart destruction.
	 */
	$effect(() => {
		const v = radarValues;
		if (!chart) return;
		const next = [v.pace, v.shooting, v.passing, v.dribbling, v.physical];
		chart.data.datasets[0].data = next;
		chart.update('none');
	});

	function goToQuests() {
		goto('/player/workout');
	}

	function goToStats() {
		goto('/stats');
	}

	function ratingTier(rating) {
		if (rating >= 85) return 'legendary';
		if (rating >= 75) return 'gold';
		if (rating >= 60) return 'silver';
		if (rating >= 40) return 'bronze';
		return 'rookie';
	}

	const tier = $derived(ratingTier(overallRating));
</script>

<svelte:head>
	<title>Player Dashboard · SSTRACKER</title>
</svelte:head>

<section class="pd-wrap tier-{tier}">
	<header class="pd-hero">
		<div class="pd-hero__identity">
			<span class="pd-hero__eyebrow">Player Dashboard</span>
			<h1 class="pd-hero__name">{profile?.playerName || 'Athlete'}</h1>
			<span class="pd-hero__meta">
				{#if profile?.teamId && profile.teamId !== 'admin'}
					Team {profile.teamId}
				{:else}
					Household athlete
				{/if}
			</span>
		</div>

		<div class="pd-hero__card pd-card" aria-label="Overall rating">
			<span class="pd-card__label">Overall</span>
			<span class="pd-card__rating tabular-num">{overallRating || '—'}</span>
			<span class="pd-card__tier">{tier.toUpperCase()}</span>
		</div>
	</header>

	<div class="pd-stat-grid">
		<div class="pd-stat">
			<span class="pd-stat__label">XP</span>
			<span class="pd-stat__value tabular-num">{xp.toLocaleString()}</span>
		</div>
		<div class="pd-stat">
			<span class="pd-stat__label">Level</span>
			<span class="pd-stat__value tabular-num">{level}</span>
		</div>
		<div class="pd-stat">
			<span class="pd-stat__label">Streak</span>
			<span class="pd-stat__value tabular-num">{streak}d</span>
		</div>
		<div class="pd-stat">
			<span class="pd-stat__label">Best Streak</span>
			<span class="pd-stat__value tabular-num">{longestStreak}d</span>
		</div>
	</div>

	<section class="pd-radar-shell">
		<header class="pd-radar-head">
			<div>
				<h2 class="pd-radar-title">Player Stat Radar</h2>
				<p class="pd-radar-sub">
					Five-axis profile across the core attributes. Update metrics in the Field Ops combine to see new shapes.
				</p>
			</div>
			{#if seasons.length > 1}
				<label class="pd-season-picker">
					<span class="sr-only">Season</span>
					<select bind:value={selectedSeasonId}>
						{#each seasons as s (s.id)}
							<option value={s.id}>{s.seasonLabel || s.id}</option>
						{/each}
					</select>
				</label>
			{/if}
		</header>

		{#if loadError}
			<div class="pd-alert" role="alert">{loadError}</div>
		{/if}

		<div class="pd-radar-body">
			<div class="pd-radar-canvas">
				<canvas bind:this={canvasEl}></canvas>
			</div>

			<ul class="pd-attrs" aria-label="Attribute breakdown">
				<li class="pd-attr">
					<span class="pd-attr__abbr">PAC</span>
					<span class="pd-attr__label">Pace</span>
					<span class="pd-attr__val tabular-num">{radarValues.pace}</span>
				</li>
				<li class="pd-attr">
					<span class="pd-attr__abbr">SHO</span>
					<span class="pd-attr__label">Shooting</span>
					<span class="pd-attr__val tabular-num">{radarValues.shooting}</span>
				</li>
				<li class="pd-attr">
					<span class="pd-attr__abbr">PAS</span>
					<span class="pd-attr__label">Passing</span>
					<span class="pd-attr__val tabular-num">{radarValues.passing}</span>
				</li>
				<li class="pd-attr">
					<span class="pd-attr__abbr">DRI</span>
					<span class="pd-attr__label">Dribbling</span>
					<span class="pd-attr__val tabular-num">{radarValues.dribbling}</span>
				</li>
				<li class="pd-attr">
					<span class="pd-attr__abbr">PHY</span>
					<span class="pd-attr__label">Physical</span>
					<span class="pd-attr__val tabular-num">{radarValues.physical}</span>
				</li>
			</ul>
		</div>

		{#if loading}
			<p class="pd-loading">Loading season metrics…</p>
		{:else if seasons.length === 0}
			<p class="pd-loading">
				No combine metrics recorded yet. Your coach or director can log baseline attributes under Field Ops → Combine.
			</p>
		{/if}
	</section>

	<nav class="pd-quick-nav" aria-label="Quick actions">
		<button type="button" class="pd-quick-nav__btn" onclick={goToQuests}>
			<i class="ph ph-lightning" aria-hidden="true"></i>
			<span class="pd-quick-nav__label">Today's Quests</span>
		</button>
		<button type="button" class="pd-quick-nav__btn" onclick={goToStats}>
			<i class="ph ph-chart-line-up" aria-hidden="true"></i>
			<span class="pd-quick-nav__label">Career Stats</span>
		</button>
	</nav>
</section>

<style>
	.pd-wrap {
		position: relative;
		min-height: 100vh;
		padding: 28px clamp(16px, 4vw, 32px) 100px;
		color: #fafafa;
		background:
			radial-gradient(90% 60% at 50% -10%, rgba(168, 85, 247, 0.22), transparent 60%),
			radial-gradient(60% 40% at 100% 40%, rgba(34, 211, 238, 0.14), transparent 60%),
			#09090b;
		overflow: hidden;
	}

	.tabular-num {
		font-variant-numeric: tabular-nums;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.pd-hero {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 18px;
		margin-bottom: 22px;
		flex-wrap: wrap;
	}

	.pd-hero__eyebrow {
		display: inline-block;
		padding: 4px 10px;
		border-radius: 999px;
		background: rgba(34, 211, 238, 0.14);
		color: #67e8f9;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.pd-hero__name {
		margin: 10px 0 4px;
		font-size: clamp(1.75rem, 5vw, 2.4rem);
		font-weight: 900;
		letter-spacing: -0.02em;
	}

	.pd-hero__meta {
		color: #a1a1aa;
		font-size: 13px;
		font-weight: 700;
	}

	.pd-hero__card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		width: 148px;
		padding: 16px 12px;
		border-radius: 18px;
		background:
			linear-gradient(150deg, rgba(250, 204, 21, 0.18), rgba(168, 85, 247, 0.12)) padding-box,
			linear-gradient(150deg, #facc15, #a855f7) border-box;
		border: 2px solid transparent;
		box-shadow: 0 18px 36px -18px rgba(250, 204, 21, 0.5);
	}

	.tier-silver .pd-hero__card {
		background:
			linear-gradient(150deg, rgba(226, 232, 240, 0.18), rgba(148, 163, 184, 0.1)) padding-box,
			linear-gradient(150deg, #e2e8f0, #64748b) border-box;
		box-shadow: 0 18px 36px -18px rgba(148, 163, 184, 0.5);
	}

	.tier-bronze .pd-hero__card {
		background:
			linear-gradient(150deg, rgba(251, 146, 60, 0.18), rgba(180, 83, 9, 0.1)) padding-box,
			linear-gradient(150deg, #fb923c, #b45309) border-box;
		box-shadow: 0 18px 36px -18px rgba(251, 146, 60, 0.5);
	}

	.tier-rookie .pd-hero__card {
		background:
			linear-gradient(150deg, rgba(163, 163, 163, 0.18), rgba(82, 82, 82, 0.1)) padding-box,
			linear-gradient(150deg, #a3a3a3, #525252) border-box;
		box-shadow: 0 18px 36px -18px rgba(163, 163, 163, 0.5);
	}

	.pd-card__label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #fde68a;
		font-weight: 800;
	}

	.tier-silver .pd-card__label {
		color: #cbd5e1;
	}

	.tier-bronze .pd-card__label {
		color: #fed7aa;
	}

	.tier-rookie .pd-card__label {
		color: #d4d4d4;
	}

	.pd-card__rating {
		font-size: 44px;
		font-weight: 900;
		letter-spacing: -0.03em;
		line-height: 1;
		background: linear-gradient(135deg, #fef9c3, #facc15);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.tier-silver .pd-card__rating {
		background: linear-gradient(135deg, #f8fafc, #94a3b8);
		-webkit-background-clip: text;
		background-clip: text;
	}

	.tier-bronze .pd-card__rating {
		background: linear-gradient(135deg, #fed7aa, #b45309);
		-webkit-background-clip: text;
		background-clip: text;
	}

	.tier-rookie .pd-card__rating {
		background: linear-gradient(135deg, #fafafa, #a3a3a3);
		-webkit-background-clip: text;
		background-clip: text;
	}

	.pd-card__tier {
		font-size: 11px;
		font-weight: 900;
		letter-spacing: 0.22em;
		color: #fafafa;
	}

	.pd-stat-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
		gap: 12px;
		margin-bottom: 22px;
	}

	.pd-stat {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 14px 16px;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
	}

	.pd-stat__label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #a1a1aa;
		font-weight: 800;
	}

	.pd-stat__value {
		font-size: 24px;
		font-weight: 900;
		color: #fafafa;
	}

	.pd-radar-shell {
		padding: 20px;
		border-radius: 20px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		margin-bottom: 22px;
	}

	.pd-radar-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		margin-bottom: 14px;
		flex-wrap: wrap;
	}

	.pd-radar-title {
		margin: 0 0 4px;
		font-size: 1.2rem;
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.pd-radar-sub {
		margin: 0;
		color: #a1a1aa;
		font-size: 13px;
		line-height: 1.5;
		max-width: 500px;
	}

	.pd-season-picker select {
		height: 36px;
		padding: 0 10px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: #18181b;
		color: #fafafa;
		font-size: 13px;
	}

	.pd-radar-body {
		display: grid;
		grid-template-columns: minmax(300px, 1.3fr) minmax(220px, 1fr);
		gap: 24px;
		align-items: center;
	}

	@media (max-width: 780px) {
		.pd-radar-body {
			grid-template-columns: 1fr;
		}
	}

	.pd-radar-canvas {
		position: relative;
		width: 100%;
		height: clamp(280px, 48vw, 420px);
	}

	.pd-radar-canvas canvas {
		display: block;
		width: 100% !important;
		height: 100% !important;
	}

	.pd-attrs {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.pd-attr {
		display: grid;
		grid-template-columns: 52px 1fr auto;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border-radius: 12px;
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid rgba(255, 255, 255, 0.06);
	}

	.pd-attr__abbr {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 52px;
		padding: 4px 0;
		border-radius: 8px;
		background: linear-gradient(135deg, #a855f7, #6366f1);
		color: #fff;
		font-size: 11px;
		font-weight: 900;
		letter-spacing: 0.12em;
	}

	.pd-attr__label {
		font-weight: 700;
		font-size: 14px;
		color: #fafafa;
	}

	.pd-attr__val {
		font-size: 26px;
		font-weight: 900;
		letter-spacing: -0.02em;
		background: linear-gradient(135deg, #22d3ee, #a855f7);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.pd-alert {
		padding: 12px 14px;
		border-radius: 10px;
		background: rgba(248, 113, 113, 0.1);
		border: 1px solid rgba(248, 113, 113, 0.3);
		color: #fecaca;
		font-size: 13px;
		margin-bottom: 14px;
	}

	.pd-loading {
		margin: 14px 0 0;
		color: #a1a1aa;
		font-size: 13.5px;
	}

	.pd-quick-nav {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 12px;
	}

	.pd-quick-nav__btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 56px;
		padding: 0 20px;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
		color: #fafafa;
		font-weight: 800;
		font-size: 14px;
		cursor: pointer;
		transition: background 0.15s ease, transform 0.08s ease;
	}

	.pd-quick-nav__btn:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.pd-quick-nav__btn:active {
		transform: translateY(1px);
	}

	.pd-quick-nav__btn i {
		font-size: 18px;
		color: #22d3ee;
	}
</style>
