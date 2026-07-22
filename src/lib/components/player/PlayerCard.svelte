<script lang="ts">
	import { browser } from '$app/environment';
	import { untrack } from 'svelte';
	import { buildVanguardPrismOptions, buildVanguardPrismData } from '$lib/configs/chartConfigs.js';

	interface Props {
		avatarSrc: string;
		playerName?: string;
		position?: string;
		rankName?: string;
		clubName?: string;
		/** Scout's Six: [POW, AGI, ACC, PAC, STM, COMP] — values 0-100 */
		stats?: number[];
		variant?: 'base' | 'holo' | 'radiant';
		onScout?: () => void;
	}

	let {
		avatarSrc,
		playerName = 'OPERATIVE',
		position = 'FWD',
		rankName = 'Recruit',
		clubName = 'SSTracker FC',
		stats = [72, 85, 68, 91, 77, 65],
		variant = 'base',
		onScout
	}: Props = $props();

	let canvasEl: HTMLCanvasElement | undefined = $state();
	let isFlipped = $state(false);

	// Lazy-load Chart.js only in browser — prevents SSR crash
	$effect(() => {
		if (!browser || !canvasEl) return;
		const chartData = untrack(() => buildVanguardPrismData(stats));
		const chartOpts = untrack(() => buildVanguardPrismOptions());
		let chart: import('chart.js').Chart | null = null;

		import('chart.js').then(({ Chart, RadarController, RadialLinearScale,
			PointElement, LineElement, Filler, Tooltip }) => {
			Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip);
			if (!canvasEl) return;
			chart = new Chart(canvasEl, { type: 'radar', data: chartData, options: chartOpts });
		});

		return () => { if (chart) { chart.destroy(); chart = null; } };
	});

	const overallRating = $derived(Math.round(stats.reduce((a, b) => a + b, 0) / stats.length));

	const variantClass = $derived(
		variant === 'holo' ? 'card--holo' :
		variant === 'radiant' ? 'card--radiant' :
		'card--base'
	);
</script>

<!-- TCG Player Card — Z2 Panel w/ chamfered clip-path (Player OS rules) -->
<div class="player-card-wrapper {variantClass}" class:is-flipped={isFlipped}>
	<div class="player-card" onclick={() => isFlipped = !isFlipped} onkeydown={(e) => e.key === 'Enter' && (isFlipped = !isFlipped)} role="button" tabindex="0" aria-label="Player card for {playerName}">

		<!-- FRONT FACE -->
		<div class="card-face card-front">
			<!-- Variant shimmer layer -->
			<div class="card-shimmer" aria-hidden="true"></div>

			<!-- Overall Rating Badge -->
			<div class="card-rating">
				<span class="rating-number">{overallRating}</span>
				<span class="rating-pos">{position}</span>
			</div>

			<!-- Avatar Portrait -->
			<div class="card-portrait-frame">
				<img src={avatarSrc} alt="{playerName} operative portrait" class="card-portrait-img" loading="lazy" />
				<div class="portrait-scanline" aria-hidden="true"></div>
			</div>

			<!-- Identity Strip -->
			<div class="card-identity">
				<div class="identity-name">{playerName}</div>
				<div class="identity-sub">{clubName}</div>
			</div>

			<!-- Vanguard Prism HUD — radar inset -->
			<div class="card-prism-hud">
				<canvas bind:this={canvasEl} width="100" height="100" aria-label="Scout's Six radar chart"></canvas>
			</div>

			<!-- Rank badge -->
			<div class="card-rank">{rankName.toUpperCase()}</div>
		</div>

		<!-- BACK FACE — telemetry detail -->
		<div class="card-face card-back">
			<div class="card-back-header">OPERATIVE TELEMETRY</div>
			<div class="card-back-stats">
				{#each ['POW','AGI','ACC','PAC','STM','COMP'] as label, i}
					<div class="stat-row">
						<span class="stat-label">{label}</span>
						<div class="stat-bar-track">
							<div class="stat-bar-fill" style="width: {stats[i]}%"></div>
						</div>
						<span class="stat-value">{stats[i]}</span>
					</div>
				{/each}
			</div>
			<div class="card-back-footer">{clubName} // {position}</div>
		</div>
	</div>
</div>

<!-- Action Gold CTA — singular, beneath card -->
<button class="card-cta" onclick={onScout} type="button">
	SCOUT PROFILE
</button>

<style>
	/* ── Card Shell ─────────────────────────────────────────────── */
	.player-card-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		perspective: 1000px;
	}

	.player-card {
		width: clamp(200px, 22vw, 260px);
		aspect-ratio: 5 / 7;
		position: relative;
		transform-style: preserve-3d;
		transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
		cursor: pointer;
		border-radius: 0;
		/* Chamfered clip-path — Player OS specialty card rule */
		clip-path: polygon(
			12px 0%, calc(100% - 12px) 0%,
			100% 12px, 100% calc(100% - 12px),
			calc(100% - 12px) 100%, 12px 100%,
			0% calc(100% - 12px), 0% 12px
		);
	}

	.is-flipped .player-card {
		transform: rotateY(180deg);
	}

	/* ── Faces ─────────────────────────────────────────────────── */
	.card-face {
		position: absolute;
		inset: 0;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		overflow: hidden;
		background: #0f172a;
		border: 1px solid #334155;
	}

	.card-back {
		transform: rotateY(180deg);
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 16px;
		background: #020617;
	}

	/* ── Variant Shimmer ───────────────────────────────────────── */
	.card-shimmer {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 5;
		opacity: 0;
		transition: opacity 0.3s;
	}

	.card--holo .card-shimmer {
		opacity: 1;
		background: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 3px,
			rgba(20, 184, 166, 0.06) 3px,
			rgba(20, 184, 166, 0.06) 4px
		);
		animation: holo-scan 3s linear infinite;
	}

	.card--radiant .card-shimmer {
		opacity: 1;
		background: radial-gradient(ellipse at 30% 20%, rgba(251, 191, 36, 0.15) 0%, transparent 60%),
			radial-gradient(ellipse at 70% 80%, rgba(20, 184, 166, 0.12) 0%, transparent 55%);
	}

	@keyframes holo-scan {
		0% { background-position: 0 0; }
		100% { background-position: 40px 40px; }
	}

	/* ── Rating Badge ──────────────────────────────────────────── */
	.card-rating {
		position: absolute;
		top: 8px;
		left: 10px;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1;
	}

	.rating-number {
		font-family: 'Geist Mono', monospace;
		font-size: clamp(20px, 3.5vw, 28px);
		font-weight: 900;
		color: #fafafa;
		text-shadow: 0 0 12px rgba(20, 184, 166, 0.6);
	}

	.rating-pos {
		font-family: 'Geist Mono', monospace;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.15em;
		color: #14b8a6;
	}

	/* ── Portrait ──────────────────────────────────────────────── */
	.card-portrait-frame {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}

	.card-portrait-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center top;
		display: block;
		transition: transform 0.4s ease;
	}

	.player-card:hover .card-portrait-img {
		transform: scale(1.03);
	}

	.portrait-scanline {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			to bottom,
			transparent 0px,
			transparent 3px,
			rgba(0, 0, 0, 0.08) 3px,
			rgba(0, 0, 0, 0.08) 4px
		);
		pointer-events: none;
	}

	/* ── Identity Strip ────────────────────────────────────────── */
	.card-identity {
		position: absolute;
		bottom: 44px;
		left: 0;
		right: 0;
		padding: 8px 10px 4px;
		background: linear-gradient(to top, rgba(2, 6, 23, 0.95) 0%, rgba(2, 6, 23, 0.7) 70%, transparent 100%);
		z-index: 10;
	}

	.identity-name {
		font-family: 'Geist Mono', monospace;
		font-size: clamp(10px, 1.8vw, 13px);
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #fafafa;
		text-shadow: 0 1px 4px rgba(0,0,0,0.8);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.identity-sub {
		font-family: 'Geist Mono', monospace;
		font-size: 8px;
		letter-spacing: 0.2em;
		color: #14b8a6;
		text-transform: uppercase;
	}

	/* ── Vanguard Prism HUD ────────────────────────────────────── */
	.card-prism-hud {
		position: absolute;
		bottom: 42px;
		right: 6px;
		width: 68px;
		height: 68px;
		background: rgba(2, 6, 23, 0.82);
		border: 1px solid rgba(20, 184, 166, 0.25);
		z-index: 15;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
	}

	.card-prism-hud canvas {
		width: 100% !important;
		height: 100% !important;
	}

	/* ── Rank strip ────────────────────────────────────────────── */
	.card-rank {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 24px;
		background: #020617;
		border-top: 1px solid #334155;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Geist Mono', monospace;
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.3em;
		color: #64748b;
		z-index: 10;
	}

	/* ── Back face ─────────────────────────────────────────────── */
	.card-back-header {
		font-family: 'Geist Mono', monospace;
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.3em;
		color: #14b8a6;
		text-align: center;
		padding-bottom: 8px;
		border-bottom: 1px solid #1e293b;
	}

	.card-back-stats {
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex: 1;
		justify-content: center;
	}

	.stat-row {
		display: grid;
		grid-template-columns: 36px 1fr 28px;
		align-items: center;
		gap: 6px;
	}

	.stat-label {
		font-family: 'Geist Mono', monospace;
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: #94a3b8;
	}

	.stat-bar-track {
		height: 4px;
		background: #1e293b;
		border-radius: 0;
		overflow: hidden;
	}

	.stat-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #14b8a6, #06b6d4);
		transition: width 0.6s ease;
	}

	.stat-value {
		font-family: 'Geist Mono', monospace;
		font-size: 9px;
		font-weight: 700;
		color: #fafafa;
		text-align: right;
	}

	.card-back-footer {
		font-family: 'Geist Mono', monospace;
		font-size: 7px;
		letter-spacing: 0.2em;
		color: #334155;
		text-align: center;
		padding-top: 6px;
		border-top: 1px solid #1e293b;
	}

	/* ── CTA ───────────────────────────────────────────────────── */
	.card-cta {
		font-family: 'Geist Mono', monospace;
		font-size: 10px;
		font-weight: 900;
		letter-spacing: 0.25em;
		text-transform: uppercase;
		color: #020617;
		background: #fbbf24;
		border: none;
		padding: 8px 20px;
		cursor: pointer;
		clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
		transition: background 0.15s ease, transform 0.1s ease;
	}

	.card-cta:hover { background: #f59e0b; }
	.card-cta:active { transform: scale(0.97); }
</style>
