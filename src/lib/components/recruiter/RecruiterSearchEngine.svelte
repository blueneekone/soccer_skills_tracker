<script lang="ts">
	import { browser } from '$app/environment';
	import { db } from '$lib/firebase.js';
	import {
		collection,
		getDocs,
		limit,
		orderBy,
		query,
		where,
	} from 'firebase/firestore';
	import Modal from '$lib/components/Modal.svelte';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import LevelProgressRing from '$lib/components/LevelProgressRing.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	const AGE_GROUPS = ['U10', 'U12', 'U14', 'U16', 'U18', 'U19+'];
	const POSITIONS = ['Forward', 'Midfield', 'Defender', 'Goalkeeper', 'Unlisted'];

	let ageFilter = $state('all');
	let positionFilter = $state('all');
	let minLevel = $state(1);

	let loading = $state(false);
	let errorMsg = $state('');
	/** @type {Array<Record<string, unknown> & { id: string }>} */
	let results = $state([]);

	let modalOpen = $state(false);
	/** @type {Record<string, unknown> & { id: string } | null} */
	let selected = $state(null);
	let videoModalOpen = $state(false);
	let videoUrl = $state('');
	let videoTitle = $state('');
	let chartCanvas = $state(/** @type {HTMLCanvasElement | null} */ (null));
	/** @type {import('chart.js').Chart | null} */
	let chartInstance = null;

	function parseTrialSortValue(raw) {
		const s = String(raw ?? '');
		const n = parseFloat(s.replace(/[^0-9.]/g, ''));
		return Number.isFinite(n) ? n : 0;
	}

	/**
	 * @param {Record<string, unknown>} scores
	 * @returns {Array<{ skill: string, value: string }>}
	 */
	function topThreeTrials(scores) {
		if (!scores || typeof scores !== 'object') return [];
		const rows = Object.entries(scores).map(([skill, v]) => ({
			skill,
			value: String(v),
			sort: parseTrialSortValue(v),
		}));
		rows.sort((a, b) => b.sort - a.sort);
		return rows.slice(0, 3).map(({ skill, value }) => ({ skill, value }));
	}

	async function runSearch() {
		if (!browser) return;
		loading = true;
		errorMsg = '';
		results = [];
		const min = Math.max(1, Math.min(99, Math.floor(Number(minLevel) || 1)));
		const col = collection(db, 'public_player_profiles');
		try {
			/** @type {import('firebase/firestore').Query} */
			let q;
			const ag = ageFilter !== 'all' ? ageFilter : '';
			const pos = positionFilter !== 'all' ? positionFilter : '';
			if (ag && pos) {
				q = query(
					col,
					where('ageGroup', '==', ag),
					where('position', '==', pos),
					where('current_level', '>=', min),
					orderBy('current_level', 'desc'),
					limit(36),
				);
			} else if (ag) {
				q = query(
					col,
					where('ageGroup', '==', ag),
					where('current_level', '>=', min),
					orderBy('current_level', 'desc'),
					limit(36),
				);
			} else if (pos) {
				q = query(
					col,
					where('position', '==', pos),
					where('current_level', '>=', min),
					orderBy('current_level', 'desc'),
					limit(36),
				);
			} else {
				q = query(
					col,
					where('current_level', '>=', min),
					orderBy('current_level', 'desc'),
					limit(36),
				);
			}
			const snap = await getDocs(q);
			/** @type {typeof results} */
			const rows = [];
			snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
			results = rows;
		} catch (e) {
			console.error(e);
			errorMsg =
				'Search failed. If this is the first deploy, create Firestore composite indexes (see firestore.indexes.json) and wait for them to build.';
			results = [];
		} finally {
			loading = false;
		}
	}

	function openDetail(row) {
		selected = row;
		modalOpen = true;
	}

	/**
	 * @param {Record<string, unknown> & { id: string }} row
	 */
	function openVideo(row) {
		const u =
			typeof row.verified_video_url === 'string' ?
				row.verified_video_url.trim() :
				'';
		if (!u) return;
		videoUrl = u;
		videoTitle = String(row.displayName ?? 'Athlete');
		videoModalOpen = true;
	}

	$effect(() => {
		if (!browser || !modalOpen || !selected || !chartCanvas) {
			if (chartInstance) {
				chartInstance.destroy();
				chartInstance = null;
			}
			return;
		}
		const perf = selected.monthly_performance;
		const rows = Array.isArray(perf) ? perf : [];
		let cancelled = false;
		(async () => {
			try {
				const { Chart, registerables } = await import('chart.js');
				Chart.register(...registerables);
				if (cancelled || !chartCanvas) return;
				if (chartInstance) {
					chartInstance.destroy();
					chartInstance = null;
				}
				const labels = rows.map((r) => String(r.month ?? ''));
				const data = rows.map((r) =>
					typeof r.xp === 'number' && !Number.isNaN(r.xp) ? r.xp : 0,
				);
				chartInstance = new Chart(chartCanvas, {
					type: 'line',
					data: {
						labels,
						datasets: [
							{
								label: 'Verified XP (monthly)',
								data,
								borderColor: 'rgba(251, 191, 36, 0.95)',
								backgroundColor: 'rgba(251, 191, 36, 0.12)',
								fill: true,
								tension: 0.35,
							},
						],
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: { labels: { color: '#e2e8f0' } },
						},
						scales: {
							x: {
								ticks: { color: '#94a3b8' },
								grid: { color: 'rgba(148, 163, 184, 0.15)' },
							},
							y: {
								ticks: { color: '#94a3b8' },
								grid: { color: 'rgba(148, 163, 184, 0.15)' },
								beginAtZero: true,
							},
						},
					},
				});
			} catch (e) {
				console.error(e);
			}
		})();
		return () => {
			cancelled = true;
			if (chartInstance) {
				chartInstance.destroy();
				chartInstance = null;
			}
		};
	});

	$effect(() => {
		if (!browser) return;
		ageFilter;
		positionFilter;
		minLevel;
		runSearch();
	});
</script>

<section class="rse">
	<header class="rse-hero">
		<p class="rse-kicker">Marketplace</p>
		<h1 class="rse-title">Athlete intelligence</h1>
		<p class="rse-lead">
			Read-only index of coach-verified metrics and trial data. No emails, rosters, or raw logs are
			exposed here.
		</p>
	</header>

	<div class="rse-filters glass-panel">
		<div class="rse-filter-row">
			<label class="rse-label" for="rse-age">Age group</label>
			<select id="rse-age" class="rse-select" bind:value={ageFilter}>
				<option value="all">All</option>
				{#each AGE_GROUPS as g}
					<option value={g}>{g}</option>
				{/each}
			</select>
		</div>
		<div class="rse-filter-row">
			<label class="rse-label" for="rse-pos">Primary position</label>
			<select id="rse-pos" class="rse-select" bind:value={positionFilter}>
				<option value="all">All</option>
				{#each POSITIONS as p}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</div>
		<div class="rse-filter-row rse-level">
			<label class="rse-label" for="rse-level">Minimum level (≥)</label>
			<div class="rse-level-input">
				<input
					id="rse-level"
					type="range"
					min="1"
					max="40"
					bind:value={minLevel}
				/>
				<span class="rse-level-val">{minLevel}</span>
			</div>
		</div>
		<button type="button" class="rse-apply primary-btn" onclick={() => runSearch()} disabled={loading}>
			{loading ? 'Searching…' : 'Apply filters'}
		</button>
	</div>

	{#if errorMsg}
		<p class="rse-error" role="alert">{errorMsg}</p>
	{/if}

	<div class="rse-grid">
		{#each results as row (row.id)}
			<div class="rse-card-wrap">
				<button
					type="button"
					class="rse-card"
					onclick={() => openDetail(row)}
					aria-label="Open profile for {String(row.displayName ?? 'player')}"
				>
				<div class="rse-card-watermark" aria-hidden="true">
					<ClubLogoMark size="xl" logoUrl={typeof row.brandLogoUrl === 'string' ? row.brandLogoUrl : ''} />
				</div>
				<div class="rse-card-top">
					<div class="rse-card-meta">
						<h2 class="rse-card-name">{String(row.displayName ?? '—')}</h2>
						<p class="rse-card-sub">
							{String(row.ageGroup ?? '—')} · {String(row.position ?? '—')}
							{#if row.clubDisplayName}
								· {String(row.clubDisplayName)}
							{/if}
						</p>
					</div>
					<div class="rse-ring">
						<LevelProgressRing
							totalXp={typeof row.total_xp === 'number' ? row.total_xp : 0}
							level={typeof row.current_level === 'number' ? row.current_level : 1}
						/>
					</div>
				</div>
				<div class="rse-trials">
					<p class="rse-trials-label">Top verified trials</p>
					<ul>
						{#each topThreeTrials(/** @type {Record<string, unknown>} */ (row.verified_trial_scores || {})) as t}
							<li><span>{t.skill}</span> <strong>{t.value}</strong></li>
						{:else}
							<li class="rse-muted">No coach trials indexed yet</li>
						{/each}
					</ul>
				</div>
				</button>
				{#if typeof row.verified_video_url === 'string' && row.verified_video_url.trim()}
					<button
						type="button"
						class="rse-play-fab"
						aria-label="Play verified video trial"
						onclick={(e) => {
							e.stopPropagation();
							openVideo(row);
						}}
					>
						<Icon name={"status.circle-play" as IconName} size={26} aria-hidden="true" />
					</button>
				{/if}
			</div>
		{:else}
			{#if !loading}
				<p class="rse-empty">No athletes match these filters. Widen age/position or lower the level floor.</p>
			{/if}
		{/each}
	</div>
</section>

<Modal
	bind:open={modalOpen}
	title=""
	maxWidth="720px"
>
	{#snippet titleSlot()}
		<div class="rse-modal-head">
			<span>{selected ? String(selected.displayName ?? '') : ''}</span>
		</div>
	{/snippet}
	{#if selected}
		<div class="rse-modal-body">
			<p class="rse-modal-meta">
				{String(selected.ageGroup ?? '')} · {String(selected.position ?? '')}
				{#if selected.clubDisplayName}
					· {String(selected.clubDisplayName)}
				{/if}
			</p>
			<div class="rse-modal-ring">
				<LevelProgressRing
					totalXp={typeof selected.total_xp === 'number' ? selected.total_xp : 0}
					level={typeof selected.current_level === 'number' ? selected.current_level : 1}
				/>
			</div>
			{#if Array.isArray(selected.top_attributes) && selected.top_attributes.length}
				<p class="rse-attr-label">Coach-verified attribute highlights</p>
				<div class="rse-attr-chips">
					{#each selected.top_attributes as a}
						<span class="rse-chip">{String(a)}</span>
					{/each}
				</div>
			{/if}
			<h3 class="rse-chart-title">Training volume (last ~6 months)</h3>
			<div class="rse-chart-wrap">
				<canvas bind:this={chartCanvas} class="rse-chart-canvas"></canvas>
			</div>
			<p class="rse-modal-footnote">
				Charts reflect verified session XP only. Trial scores on cards are coach-logged evaluations.
			</p>
		</div>
	{/if}
</Modal>

<Modal bind:open={videoModalOpen} title="Verified trial" maxWidth="900px">
	{#snippet titleSlot()}
		<div class="rse-video-modal-head">
			<span>{videoTitle}</span>
		</div>
	{/snippet}
	{#if videoUrl}
		<div class="rse-video-shell">
			<video class="rse-video-el" controls playsinline src={videoUrl} preload="metadata"></video>
			<p class="rse-video-note">Coach-verified clip. Distribution subject to athlete opt-in.</p>
		</div>
	{/if}
</Modal>

<style>
	.rse {
		padding-bottom: clamp(32px, 6vw, 64px);
	}

	.rse-hero {
		margin-bottom: clamp(20px, 4vw, 28px);
	}

	.rse-kicker {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--scout-muted, #94a3b8);
		margin: 0 0 8px;
	}

	.rse-title {
		font-size: clamp(1.75rem, 4vw, 2.25rem);
		font-weight: 800;
		letter-spacing: -0.03em;
		margin: 0 0 10px;
		color: var(--scout-fg, #f8fafc);
	}

	.rse-lead {
		margin: 0;
		max-width: 52ch;
		line-height: 1.55;
		color: var(--scout-muted, #94a3b8);
		font-size: 0.95rem;
	}

	.rse-filters {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: clamp(14px, 3vw, 18px);
		align-items: end;
		padding: clamp(16px, 3vw, 22px);
		margin-bottom: clamp(20px, 4vw, 28px);
		border: 1px solid rgba(148, 163, 184, 0.2);
		background: rgba(15, 23, 42, 0.65);
	}

	.rse-filter-row {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.rse-label {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--scout-muted, #94a3b8);
	}

	.rse-select {
		background: rgba(15, 23, 42, 0.9);
		color: #f8fafc;
		border: 1px solid rgba(148, 163, 184, 0.35);
		border-radius: 12px;
		padding: 10px 12px;
		font-weight: 600;
	}

	.rse-level-input {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.rse-level-input input[type='range'] {
		flex: 1;
		accent-color: var(--brand-primary, #f59e0b);
	}

	.rse-level-val {
		min-width: 2rem;
		font-weight: 800;
		color: var(--scout-fg, #f8fafc);
	}

	.rse-apply {
		align-self: end;
		border-radius: 14px;
		font-weight: 800;
		padding: 12px 18px;
	}

	.rse-error {
		color: #fca5a5;
		font-size: 0.9rem;
		margin: 0 0 16px;
	}

	.rse-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
		gap: clamp(14px, 3vw, 20px);
	}

	.rse-card-wrap {
		position: relative;
	}

	.rse-play-fab {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 3;
		width: 44px;
		height: 44px;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(
			145deg,
			color-mix(in srgb, var(--brand-primary, #f59e0b) 90%, #fff) 0%,
			var(--brand-primary, #d97706) 100%
		);
		color: #0f172a;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
	}

	.rse-play-fab :global(svg) {
		width: 1.65rem;
		height: 1.65rem;
	}

	.rse-card {
		position: relative;
		text-align: left;
		border: 1px solid rgba(148, 163, 184, 0.22);
		border-radius: 20px;
		padding: clamp(16px, 3vw, 20px);
		background: linear-gradient(
			155deg,
			rgba(30, 41, 59, 0.95) 0%,
			rgba(15, 23, 42, 0.92) 100%
		);
		color: #f8fafc;
		cursor: pointer;
		overflow: hidden;
		transition:
			transform 0.18s ease,
			box-shadow 0.18s ease,
			border-color 0.18s ease;
	}

	.rse-card:hover {
		transform: translateY(-3px);
		box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
		border-color: color-mix(in srgb, var(--brand-primary, #f59e0b) 45%, transparent);
	}

	.rse-card-watermark {
		position: absolute;
		right: -8px;
		bottom: -8px;
		opacity: 0.14;
		pointer-events: none;
		filter: grayscale(0.2);
	}

	.rse-card-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
		position: relative;
		z-index: 1;
	}

	.rse-card-name {
		margin: 0 0 6px;
		font-size: 1.15rem;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.rse-card-sub {
		margin: 0;
		font-size: 0.82rem;
		color: #94a3b8;
		line-height: 1.35;
	}

	.rse-ring {
		flex-shrink: 0;
		transform: scale(0.92);
		transform-origin: top right;
	}

	.rse-trials {
		margin-top: 14px;
		position: relative;
		z-index: 1;
	}

	.rse-trials-label {
		margin: 0 0 8px;
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: #94a3b8;
	}

	.rse-trials ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 0.88rem;
	}

	.rse-trials li {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		padding: 8px 10px;
		border-radius: 12px;
		background: rgba(15, 23, 42, 0.55);
		border: 1px solid rgba(148, 163, 184, 0.15);
	}

	.rse-trials li strong {
		color: #fde68a;
		font-weight: 800;
	}

	.rse-muted {
		color: #64748b !important;
		font-style: italic;
		justify-content: flex-start !important;
	}

	.rse-empty {
		grid-column: 1 / -1;
		text-align: center;
		color: #94a3b8;
		padding: 32px 16px;
	}

	.rse-modal-head {
		font-weight: 800;
		font-size: 1.1rem;
	}

	.rse-modal-body {
		padding: 4px 0 8px;
		color: #e2e8f0;
	}

	.rse-modal-meta {
		margin: 0 0 16px;
		color: #94a3b8;
		font-size: 0.9rem;
	}

	.rse-modal-ring {
		display: flex;
		justify-content: center;
		margin-bottom: 16px;
	}

	.rse-attr-label {
		margin: 0 0 8px;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: #94a3b8;
	}

	.rse-attr-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 20px;
	}

	.rse-chip {
		padding: 6px 12px;
		border-radius: 999px;
		background: rgba(251, 191, 36, 0.12);
		border: 1px solid rgba(251, 191, 36, 0.35);
		font-size: 0.82rem;
		font-weight: 700;
	}

	.rse-chart-title {
		margin: 0 0 10px;
		font-size: 0.95rem;
		font-weight: 700;
	}

	.rse-chart-wrap {
		height: 240px;
		margin-bottom: 12px;
	}

	.rse-chart-canvas {
		width: 100% !important;
		height: 100% !important;
	}

	.rse-modal-footnote {
		margin: 0;
		font-size: 0.78rem;
		color: #64748b;
		line-height: 1.45;
	}

	.rse-video-modal-head {
		font-weight: 800;
		font-size: 1.05rem;
	}

	.rse-video-shell {
		padding: 4px 0 8px;
	}

	.rse-video-el {
		width: 100%;
		max-height: min(70vh, 520px);
		border-radius: 14px;
		background: #020617;
	}

	.rse-video-note {
		margin: 12px 0 0;
		font-size: 0.78rem;
		color: #64748b;
	}
</style>
