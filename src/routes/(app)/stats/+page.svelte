<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import '$lib/styles/director-os.css';

	const isPlayerRole = $derived(authStore.role === 'player');

	/** @type {null | typeof import('chart.js').Chart} */
	let ChartCtor = $state(null);
	let chartOk = $state(false);
	/** @type {HTMLCanvasElement | undefined} */
	let radarCanvas = $state();

	/** Skill vector 0–100: Technical, Physical, Tactical, Mental */
	let skillsVector = $state(
		/** @type {number[]} */ ([78, 84, 71, 88]),
	);

	/**
	 * @typedef {{ id: string; title: string; phIcon: string; unlocked: boolean; tier?: 'standard' | 'elite' }} BadgeDef
	 * @type {BadgeDef[]}
	 */
	const initialBadges = () => [
		{ id: 'streak', title: '100_DAY_STREAK', phIcon: 'ph-fire', unlocked: true, tier: 'elite' },
		{ id: 'marksman', title: 'ELITE_MARKSMAN', phIcon: 'ph-target', unlocked: true, tier: 'elite' },
		{ id: 'vector', title: 'VECTOR_ACE', phIcon: 'ph-radar', unlocked: true, tier: 'standard' },
		{ id: 'iron', title: 'IRON_LUNGS', phIcon: 'ph-wind', unlocked: true, tier: 'standard' },
		{ id: 'ghost', title: 'GHOST_PRESS', phIcon: 'ph-ghost', unlocked: false },
		{ id: 'crown', title: 'DYNASTY_MODE', phIcon: 'ph-crown', unlocked: false },
		{ id: 'sword', title: 'BLADE_RUNNER', phIcon: 'ph-sword', unlocked: false },
		{ id: 'lock', title: 'ZERO_DAY_PROTOCOL', phIcon: 'ph-shield-chevron', unlocked: false },
		{ id: 'flame', title: 'COMBUSTION_99', phIcon: 'ph-flame', unlocked: false },
		{ id: 'medal', title: 'ORBITAL_STRIKE', phIcon: 'ph-medal', unlocked: false },
		{ id: 'timer', title: 'CHRONO_LOCK', phIcon: 'ph-timer', unlocked: false },
		{ id: 'code', title: 'OVERRIDE_KEY', phIcon: 'ph-key', unlocked: false },
	];

	let badges = $state(initialBadges());

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
				Vector overlay · 0–100 scale · auto-refresh on field inject (mock)
			</p>
			<div class="dossier-radar__chart tw-min-w-0 tw-h-[300px] tw-relative">
				<canvas
					bind:this={radarCanvas}
					class="dossier-canvas"
					aria-label="Skill dimensions radar: Technical, Physical, Tactical, Mental"
				></canvas>
			</div>
			<div class="dossier-radar__footer font-mono dossier-radar__footer-tx">
				GRD_LINE_NEON=OK · ANGLE_LINES=0.20 · AXIS=SUPPRESSED
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
	.tw-relative {
		position: relative;
	}
</style>
