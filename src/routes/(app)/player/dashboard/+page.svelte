<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { collection, getDocs } from 'firebase/firestore';
	import { untrack } from 'svelte';
	import { db } from '$lib/firebase.js';
	import LevelProgressRing from '$lib/components/LevelProgressRing.svelte';
	import ProPlayerCard from '$lib/components/stats/ProPlayerCard.svelte';
	import PlayerActionInbox from '$lib/components/shell/PlayerActionInbox.svelte';
	import { getCurrentRank, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { playerEngine } from '$lib/stores/playerEngine.svelte.js';

	const profile = $derived(authStore.userProfile);
	const profileXp = $derived(Math.max(0, Math.floor(Number(profile?.totalXp ?? profile?.xp) || 0)));
	const totalXpHud = $derived(
		playerEngine.hydrated ? Math.max(playerEngine.totalXp, profileXp) : profileXp,
	);
	const rankProgress = $derived(getCurrentRank(totalXpHud));
	const osLevel = $derived(getLevelProgressFromTotalXp(totalXpHud).level);
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

	$effect(() => {
		if (!browser) return;
		const u = authStore.user;
		if (authStore.role === 'player' && u?.uid) {
			playerEngine.attach(u.uid);
			return () => playerEngine.detach();
		}
		playerEngine.detach();
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

	const xp = $derived(Number(profile?.xp) || 0);
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
</script>

<svelte:head>
	<title>Player Dashboard · SSTRACKER</title>
</svelte:head>

<section
	class="pd-wrap tw-mx-auto tw-min-w-0 tw-w-full tw-max-w-3xl tw-overflow-x-hidden tw-box-border tw-px-2"
>
	<div
		class="tw-flex tw-flex-col tw-items-center tw-gap-8 tw-w-full tw-max-w-md tw-mx-auto tw-pb-24"
		data-region="player-hq-column"
	>
		<div class="tw-w-full">
			<ProPlayerCard
				playerEmailKey={email}
				playerDisplayName={profile?.playerName || ''}
				prefetchedSeasons={seasons}
				rankLabel={rankProgress.rank}
			/>
		</div>
		<div
			class="pd-progress-stack tw-flex tw-w-full tw-min-w-0 tw-flex-col tw-gap-4"
			aria-label="Career progress and activity"
		>
			<div
				class="pd-rank-bar tw-flex tw-w-full tw-min-w-0 tw-flex-col tw-items-center tw-gap-4 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between tw-border-b tw-border-cyan-500/20 tw-pb-5"
				aria-label="Career rank progress"
			>
				<div class="tw-mx-auto tw-w-fit tw-shrink-0 sm:tw-mx-0">
					<LevelProgressRing
						currentXp={rankProgress.xpInCurrentTier}
						nextRankXp={rankProgress.xpToNextRank}
						rankName={rankProgress.rank}
						totalXp={totalXpHud}
						level={osLevel}
						size="lg"
						variant="dark"
					/>
				</div>
				<div class="tw-w-full tw-min-w-0 tw-text-center sm:tw-flex-1 sm:tw-text-left">
					<p
						class="tw-m-0 tw-text-[0.7rem] tw-font-bold tw-uppercase tw-tracking-[0.35em] tw-text-cyan-500/80"
					>
						Active rank
					</p>
					<p
						class="tw-m-0 tw-break-words tw-text-2xl tw-font-black tw-uppercase tw-tracking-widest tw-text-cyan-100 [overflow-wrap:anywhere] sm:tw-text-3xl"
					>
						{rankProgress.rank}
					</p>
				</div>
			</div>
			<div class="pd-stat-grid">
				<div class="pd-stat tw-min-w-0">
					<span class="pd-stat__label">XP</span>
					<span class="pd-stat__value tabular-num tw-min-w-0 tw-truncate">{xp.toLocaleString()}</span>
				</div>
				<div class="pd-stat tw-min-w-0">
					<span class="pd-stat__label">Level</span>
					<span class="pd-stat__value tabular-num tw-min-w-0 tw-truncate">{osLevel}</span>
				</div>
				<div class="pd-stat tw-min-w-0">
					<span class="pd-stat__label">Streak</span>
					<span class="pd-stat__value tabular-num tw-min-w-0 tw-truncate">{streak}d</span>
				</div>
				<div class="pd-stat tw-min-w-0">
					<span class="pd-stat__label">Best Streak</span>
					<span class="pd-stat__value tabular-num tw-min-w-0 tw-truncate">{longestStreak}d</span>
				</div>
			</div>
		</div>
		<div class="tw-w-full tw-min-w-0">
			<!-- Active assignments / action inbox (assignments, drills) -->
			<PlayerActionInbox />
		</div>
	</div>

		<section class="pd-radar-shell tw-min-w-0">
		<header class="pd-radar-head">
			<div class="pd-radar-head__blurb tw-min-w-0">
				<h2 class="pd-radar-title tw-break-words">Player Stat Radar</h2>
				<p class="pd-radar-sub tw-whitespace-normal tw-break-words [overflow-wrap:anywhere]">
					Five-axis profile across the core attributes. Update metrics in the Field Ops combine to see new
					shapes.
				</p>
			</div>
			{#if seasons.length > 1}
				<label class="pd-season-picker tw-shrink-0">
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
			<div class="pd-alert tw-whitespace-normal tw-break-words [overflow-wrap:anywhere]" role="alert"
				>{loadError}</div
			>
		{/if}

		<div class="pd-radar-body">
			<div class="pd-radar-canvas tw-min-w-0">
				<canvas bind:this={canvasEl}></canvas>
			</div>

			<ul class="pd-attrs tw-min-w-0" aria-label="Attribute breakdown">
				<li class="pd-attr tw-min-w-0">
					<span class="pd-attr__abbr">PAC</span>
					<span class="pd-attr__label">Pace</span>
					<span class="pd-attr__val tabular-num tw-min-w-0 tw-shrink-0">{radarValues.pace}</span>
				</li>
				<li class="pd-attr tw-min-w-0">
					<span class="pd-attr__abbr">SHO</span>
					<span class="pd-attr__label">Shooting</span>
					<span class="pd-attr__val tabular-num tw-min-w-0 tw-shrink-0">{radarValues.shooting}</span>
				</li>
				<li class="pd-attr tw-min-w-0">
					<span class="pd-attr__abbr">PAS</span>
					<span class="pd-attr__label">Passing</span>
					<span class="pd-attr__val tabular-num tw-min-w-0 tw-shrink-0">{radarValues.passing}</span>
				</li>
				<li class="pd-attr tw-min-w-0">
					<span class="pd-attr__abbr">DRI</span>
					<span class="pd-attr__label">Dribbling</span>
					<span class="pd-attr__val tabular-num tw-min-w-0 tw-shrink-0">{radarValues.dribbling}</span>
				</li>
				<li class="pd-attr tw-min-w-0">
					<span class="pd-attr__abbr">PHY</span>
					<span class="pd-attr__label">Physical</span>
					<span class="pd-attr__val tabular-num tw-min-w-0 tw-shrink-0">{radarValues.physical}</span>
				</li>
			</ul>
		</div>

		{#if loading}
			<p class="pd-loading">Loading season metrics…</p>
		{:else if seasons.length === 0}
			<p class="pd-loading tw-whitespace-normal tw-break-words [overflow-wrap:anywhere]">
				No combine metrics recorded yet. Your coach or director can log baseline attributes under Field Ops →
				Combine.
			</p>
		{/if}
	</section>

	<nav class="pd-quick-nav" aria-label="Quick actions">
		<button type="button" class="pd-quick-nav__btn tw-min-w-0" onclick={goToQuests}>
			<i class="ph ph-lightning tw-shrink-0" aria-hidden="true"></i>
			<span class="pd-quick-nav__label">Today's Quests</span>
		</button>
		<button type="button" class="pd-quick-nav__btn tw-min-w-0" onclick={goToStats}>
			<i class="ph ph-chart-line-up tw-shrink-0" aria-hidden="true"></i>
			<span class="pd-quick-nav__label">Career Stats</span>
		</button>
	</nav>
</section>

<style>
	.pd-wrap {
		position: relative;
		min-width: 0;
		max-width: 100%;
		padding: 4px 2px 12px;
		color: #fafafa;
		background: transparent;
		box-sizing: border-box;
		overflow-x: hidden;
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

	.pd-stat-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 130px), 1fr));
		gap: 12px;
		margin-bottom: 22px;
		min-width: 0;
	}

	.pd-stat-grid > * {
		min-width: 0;
	}

	.pd-stat {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
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
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.pd-radar-shell {
		padding: 20px;
		border-radius: 20px;
		min-width: 0;
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
		min-width: 0;
	}

	.pd-radar-head__blurb {
		flex: 1 1 0;
		min-width: 0;
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
		max-width: min(500px, 100%);
		white-space: normal;
		overflow-wrap: anywhere;
		word-wrap: break-word;
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
		grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
		gap: 24px;
		align-items: center;
		min-width: 0;
	}

	.pd-radar-body > * {
		min-width: 0;
	}

	@media (max-width: 780px) {
		.pd-radar-body {
			grid-template-columns: 1fr;
		}
	}

	.pd-radar-canvas {
		position: relative;
		width: 100%;
		min-width: 0;
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
		min-width: 0;
	}

	.pd-attr {
		display: grid;
		grid-template-columns: 52px minmax(0, 1fr) auto;
		align-items: center;
		gap: 12px;
		min-width: 0;
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
		flex-shrink: 0;
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
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pd-attr__val {
		font-size: 26px;
		font-weight: 900;
		letter-spacing: -0.02em;
		background: linear-gradient(135deg, #22d3ee, #a855f7);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		min-width: 0;
		flex-shrink: 0;
	}

	.pd-alert {
		padding: 12px 14px;
		border-radius: 10px;
		background: rgba(248, 113, 113, 0.1);
		border: 1px solid rgba(248, 113, 113, 0.3);
		color: #fecaca;
		font-size: 13px;
		margin-bottom: 14px;
		min-width: 0;
		white-space: normal;
		overflow-wrap: anywhere;
		word-wrap: break-word;
	}

	.pd-loading {
		margin: 14px 0 0;
		color: #a1a1aa;
		font-size: 13.5px;
		min-width: 0;
		white-space: normal;
		overflow-wrap: anywhere;
		word-wrap: break-word;
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
		flex-shrink: 0;
	}

	.pd-quick-nav__label {
		min-width: 0;
		flex: 1 1 0;
		text-align: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
