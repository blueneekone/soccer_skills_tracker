<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { collection, getDocs } from 'firebase/firestore';
	import { untrack } from 'svelte';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const profile = $derived(authStore.userProfile);
	const user = $derived(authStore.user);
	const email = $derived((authStore.user?.email || '').toLowerCase());

	/** @param {string | undefined} uid */
	function getOperativeAvatarUrl(uid) {
		const seed = uid && uid.length > 0 ? uid : 'anonymous';
		return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}&baseColor=05050A&primaryColor=06b6d4`;
	}

	const operativeAvatarSrc = $derived(getOperativeAvatarUrl(user?.uid || email || undefined));

	/** @param {unknown} v */
	function statNum(v) {
		const n = Number(v);
		if (!Number.isFinite(n)) return 0;
		return n;
	}

	/**
	 * First present numeric field; 0 is valid.
	 * @param {Record<string, unknown>} s
	 * @param {string[]} keys
	 */
	function coalesceStat(s, keys) {
		for (const k of keys) {
			if (!Object.prototype.hasOwnProperty.call(s, k)) continue;
			const v = s[k];
			if (v === undefined || v === null || v === '') continue;
			return statNum(v);
		}
		return 0;
	}

	/** @param {number} p */
	function formatPassPct(p) {
		if (!Number.isFinite(p)) return '0';
		return Math.abs(p - Math.round(p)) < 1e-6 ? String(Math.round(p)) : p.toFixed(1);
	}

	const gameDayStats = $derived.by(() => {
		const raw = profile && typeof profile.stats === 'object' && profile.stats !== null ? profile.stats : null;
		/** @type {Record<string, unknown>} */
		const s = raw ? /** @type {Record<string, unknown>} */ (raw) : {};
		return {
			goals: coalesceStat(s, ['goals', 'gameDayGoals']),
			assists: coalesceStat(s, ['assists', 'gameDayAssists']),
			shots: coalesceStat(s, ['shots', 'gameDayShots']),
			passPct: coalesceStat(s, ['passPct', 'passPercent', 'passingPct', 'gameDayPassPct']),
		};
	});

	/** Mobile / coarse pointer: tap to flip; md+ uses hover */
	let operativeCardFlipped = $state(false);

	function operativeTapFlipEnabled() {
		if (typeof window === 'undefined') return false;
		return (
			window.matchMedia('(max-width: 767.98px)').matches ||
			window.matchMedia('(hover: none)').matches
		);
	}

	function onOperativeCardActivate() {
		if (!operativeTapFlipEnabled()) return;
		operativeCardFlipped = !operativeCardFlipped;
	}

	function onOperativeKeydown(/** @type {KeyboardEvent} */ e) {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault();
		onOperativeCardActivate();
	}

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

<section class="pd-wrap tw-min-w-0 tw-w-full tw-max-w-full tw-overflow-x-hidden tw-box-border tier-{tier}">
	<header class="pd-hero">
		<div class="pd-hero__identity tw-min-w-0">
			<span class="pd-hero__eyebrow">Command center</span>
			<h1 class="pd-hero__name tw-break-words tw-text-balance [overflow-wrap:anywhere]">
				{profile?.playerName || 'Athlete'}
			</h1>
			<span
				class="pd-hero__meta tw-break-words [overflow-wrap:break-word] tw-whitespace-normal"
			>
				{#if profile?.teamId && profile.teamId !== 'admin'}
					Team {profile.teamId}
				{:else}
					Household athlete
				{/if}
			</span>
		</div>

		<div class="pd-hero__card pd-card tw-min-w-0 tw-shrink-0" aria-label="Overall rating">
			<span class="pd-card__label">Overall</span>
			<span class="pd-card__rating tabular-num tw-max-w-full tw-text-center">{overallRating || '—'}</span>
			<span class="pd-card__tier tw-max-w-full tw-text-center tw-truncate">{tier.toUpperCase()}</span>
		</div>
	</header>

	<div
		class="oid-wrap tw-mx-auto tw-mb-6 tw-w-full tw-max-w-md"
		class:oid-wrap--flipped={operativeCardFlipped}
	>
		<p
			class="oid-hint tw-mb-2 tw-text-center tw-text-[11px] tw-font-extrabold tw-uppercase tw-tracking-[0.2em] tw-text-cyan-400/80"
		>
			Tap to flip · hover to flip
		</p>
		<div
			class="oid-surface tw-relative tw-w-full tw-cursor-pointer tw-perspective-[1000px] tw-outline-none"
			role="button"
			tabindex="0"
			aria-pressed={operativeCardFlipped}
			aria-label="Operative ID card. Tap on mobile or hover on desktop to view game day telemetry."
			onclick={onOperativeCardActivate}
			onkeydown={onOperativeKeydown}
		>
			<div class="oid-flipper tw-relative tw-h-[min(52vw,260px)] tw-w-full tw-transform-gpu">
				<div
					class="oid-face oid-face--front tw-absolute tw-inset-0 tw-flex tw-h-full tw-w-full tw-flex-col tw-items-center tw-justify-between tw-overflow-hidden tw-rounded-2xl tw-border-2 tw-border-cyan-500/80 tw-bg-[#05050A] tw-px-5 tw-py-5 tw-shadow-[0_0_32px_-8px_rgba(6,182,212,0.45)] tw-backface-hidden tw-[transform:rotateY(0deg)]"
				>
					<div class="tw-flex tw-w-full tw-flex-col tw-items-center tw-gap-3">
						<div
							class="tw-flex tw-h-24 tw-w-24 tw-shrink-0 tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-xl tw-border tw-border-cyan-500/50 tw-bg-black/60 tw-p-1 tw-shadow-[inset_0_0_12px_rgba(6,182,212,0.25)]"
						>
							<img
								class="tw-h-full tw-w-full tw-object-cover"
								src={operativeAvatarSrc}
								alt=""
								width="96"
								height="96"
								loading="lazy"
								decoding="async"
								fetchpriority="low"
							/>
						</div>
						<div class="tw-w-full tw-text-center">
							<p class="tw-mb-0.5 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.35em] tw-text-cyan-400/90">
								Operative
							</p>
							<p
								class="tw-m-0 tw-text-lg tw-font-black tw-leading-tight tw-tracking-tight tw-text-white [overflow-wrap:anywhere]"
							>
								{profile?.playerName || 'Athlete'}
							</p>
							<p class="tw-mt-1 tw-font-mono tw-text-xs tw-text-cyan-200/90">
								TEAM_ID:
								{#if profile?.teamId && profile.teamId !== 'admin'}
									<span class="tw-text-cyan-300">{profile.teamId}</span>
								{:else}
									<span class="tw-text-zinc-500">UNASSIGNED</span>
								{/if}
							</p>
						</div>
					</div>
					<div
						class="tw-w-full tw-rounded-lg tw-border tw-border-emerald-500/40 tw-bg-emerald-950/40 tw-px-3 tw-py-2 tw-text-center tw-text-[11px] tw-font-black tw-uppercase tw-tracking-[0.2em] tw-text-emerald-400 tw-shadow-[0_0_20px_rgba(52,211,153,0.35)]"
					>
						Clearance: Active
					</div>
				</div>

				<div
					class="oid-face oid-face--back tw-absolute tw-inset-0 tw-flex tw-h-full tw-w-full tw-flex-col tw-rounded-2xl tw-border-2 tw-border-cyan-500/70 tw-bg-[#05050A] tw-px-4 tw-py-4 tw-shadow-[0_0_28px_-6px_rgba(6,182,212,0.4)] tw-backface-hidden tw-[transform:rotateY(180deg)]"
				>
					<p
						class="tw-mb-3 tw-border-b tw-border-cyan-500/30 tw-pb-2 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-cyan-400/90"
					>
						Telemetry · Game day
					</p>
					<div
						class="tw-grid tw-flex-1 tw-grid-cols-2 tw-gap-2 tw-font-mono tw-text-sm tw-text-cyan-100/95"
					>
						<div class="oid-tel tw-rounded-lg tw-border tw-border-white/10 tw-bg-black/50 tw-px-3 tw-py-2">
							<span class="tw-block tw-text-[10px] tw-uppercase tw-tracking-wider tw-text-zinc-500">Goals</span>
							<span class="tabular-num tw-text-xl tw-font-bold tw-text-cyan-300">{gameDayStats.goals}</span>
						</div>
						<div class="oid-tel tw-rounded-lg tw-border tw-border-white/10 tw-bg-black/50 tw-px-3 tw-py-2">
							<span class="tw-block tw-text-[10px] tw-uppercase tw-tracking-wider tw-text-zinc-500"
								>Assists</span
							>
							<span class="tabular-num tw-text-xl tw-font-bold tw-text-cyan-300">{gameDayStats.assists}</span>
						</div>
						<div class="oid-tel tw-rounded-lg tw-border tw-border-white/10 tw-bg-black/50 tw-px-3 tw-py-2">
							<span class="tw-block tw-text-[10px] tw-uppercase tw-tracking-wider tw-text-zinc-500">Shots</span>
							<span class="tabular-num tw-text-xl tw-font-bold tw-text-cyan-300">{gameDayStats.shots}</span>
						</div>
						<div class="oid-tel tw-col-span-2 tw-rounded-lg tw-border tw-border-white/10 tw-bg-black/50 tw-px-3 tw-py-2">
							<span class="tw-block tw-text-[10px] tw-uppercase tw-tracking-wider tw-text-zinc-500"
								>Pass %</span
							>
							<span class="tabular-num tw-text-xl tw-font-bold tw-text-cyan-300"
								>{formatPassPct(gameDayStats.passPct)}%</span
							>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="pd-stat-grid">
		<div class="pd-stat tw-min-w-0">
			<span class="pd-stat__label">XP</span>
			<span class="pd-stat__value tabular-num tw-min-w-0 tw-truncate">{xp.toLocaleString()}</span>
		</div>
		<div class="pd-stat tw-min-w-0">
			<span class="pd-stat__label">Level</span>
			<span class="pd-stat__value tabular-num tw-min-w-0 tw-truncate">{level}</span>
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

	/* 3D Operative ID: preserve-3d; tap (.oid-wrap--flipped) + fine-pointer hover */
	.oid-flipper {
		transform-style: preserve-3d;
		transform: rotateY(0deg);
		transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
		will-change: transform;
	}
	.oid-wrap--flipped .oid-flipper {
		transform: rotateY(180deg);
	}
	@media (min-width: 768px) and (hover: hover) {
		.oid-wrap:hover .oid-flipper {
			transform: rotateY(180deg);
		}
	}

	.pd-hero {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 18px;
		margin-bottom: 22px;
		flex-wrap: wrap;
		min-width: 0;
	}

	.pd-hero__identity {
		flex: 1 1 0;
		min-width: 0;
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
		overflow-wrap: anywhere;
		word-wrap: break-word;
	}

	.pd-hero__meta {
		color: #a1a1aa;
		font-size: 13px;
		font-weight: 700;
		white-space: normal;
		overflow-wrap: anywhere;
		word-wrap: break-word;
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
