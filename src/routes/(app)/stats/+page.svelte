<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { playerEngine } from '$lib/stores/playerEngine.svelte.js';
	import { getCardTierFromLevel, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import '$lib/styles/director-os.css';

	const profile = $derived(authStore.userProfile);
	const isPlayerRole = $derived(authStore.role === 'player');

	$effect(() => {
		if (!browser) return;
		if (isPlayerRole && authStore.user?.uid) {
			playerEngine.attach(authStore.user.uid);
			return () => playerEngine.detach();
		}
		playerEngine.detach();
	});

	/** @type {null | typeof import('chart.js').Chart} */
	let ChartCtor = $state(null);
	let chartOk = $state(false);
	/** @type {HTMLCanvasElement | undefined} */
	let radarCanvas = $state();

	/** Live dossier row (mocked telemetry pulse) */
	let pulseTick = $state(0);
	/** @type {ReturnType<typeof setInterval> | null} */
	let pulseId = null;

	/** Glowing border variant for high-tier */
	let rankBorderMode = $state(/** @type {'cyber' | 'isotope'} */ ('cyber'));

	const profileXp = $derived(Math.max(0, Math.floor(Number(profile?.totalXp ?? profile?.xp) || 0)));
	const profileStreak = $derived(Math.max(0, Math.floor(Number(profile?.currentStreak) || 0)));
	const operative = $derived.by(() => {
		const tx = playerEngine.hydrated
			? Math.max(playerEngine.totalXp, profileXp)
			: profileXp;
		const st = playerEngine.hydrated
			? Math.max(playerEngine.streakDays, profileStreak)
			: profileStreak;
		const lv = getLevelProgressFromTotalXp(tx).level;
		const callsign = authStore.user?.uid
			? `OPERATIVE_${authStore.user.uid.slice(-4).toUpperCase()}`
			: 'OPERATIVE____';
		return {
			codename: callsign,
			rankLabel: `LVL ${String(lv).padStart(2, '0')} // ${getCardTierFromLevel(lv).toUpperCase()}`,
			totalXp: tx,
			clearance: `STREAK · ${String(st).padStart(2, '0')}D // ACTIVE`,
		};
	});

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

	const displayName = $derived(
		(typeof profile?.playerName === 'string' && profile.playerName.trim() !== ''
			? profile.playerName.trim()
			: 'UNKNOWN_OPERATIVE'
		).toUpperCase().replace(/\s+/g, '_'),
	);

	onMount(() => {
		if (!browser) return;
		(async () => {
			const mod = await import('chart.js');
			ChartCtor = mod.Chart;
			mod.Chart.register(...mod.registerables);
			chartOk = true;
		})();

		pulseId = setInterval(() => {
			pulseTick += 1;
		}, 1100);
		return () => {
			if (pulseId) clearInterval(pulseId);
		};
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
	<header class="dossier-mast no-print" aria-label="Dossier header">
		<div class="dossier-mast__left">
			<span class="dossier-eyebrow">Project Phoenix // Player OS</span>
			<h1 class="dossier-title">OPERATIVE DOSSIER</h1>
			<p class="dossier-sub">
				Classified performance lattice · live retention telemetry · threat-matrix skill mapping
			</p>
		</div>
		<div class="dossier-mast__right font-mono dossier-mast__meta" aria-hidden="true">
			<div class="dossier-mast__kv">
				<span class="dossier-k">SESSION</span>
				<span class="dossier-v">LIVE_{(pulseTick % 9999).toString().padStart(4, '0')}</span>
			</div>
			<div class="dossier-mast__kv">
				<span class="dossier-k">LINK</span>
				<span class="dossier-v">SECURE_NODE</span>
			</div>
		</div>
	</header>

	<div
		class="dossier-grid"
		role="region"
		aria-label="Operative id and skill radar"
	>
		<!-- Operative ID -->
		<section
			class="dossier-panel dossier-id"
			aria-label="Operative identification"
		>
			<div
				class="dossier-id__frame"
				class:dossier-id__frame--cyber={rankBorderMode === 'cyber'}
				class:dossier-id__frame--isotope={rankBorderMode === 'isotope'}
			>
				<div class="dossier-id__strip">
					<span class="dossier-label">Subject ID</span>
					<button
						type="button"
						class="dossier-rank-mode"
						onclick={() =>
							(rankBorderMode = rankBorderMode === 'cyber' ? 'isotope' : 'cyber')}
					>
						Accent: {rankBorderMode}
					</button>
				</div>
				<div class="dossier-id__body">
					<div
						class="dossier-avatar"
						role="img"
						aria-label="Avatar channel placeholder, signal idle"
					>
						<div class="dossier-avatar__scan" aria-hidden="true"></div>
						<div class="dossier-avatar__glyph" aria-hidden="true">◇</div>
					</div>
					<div class="dossier-id__meta">
						<h2 class="dossier-name font-mono">{displayName}</h2>
						<div class="dossier-badline">
							<span class="dossier-label">Callsign</span>
							<span class="dossier-mono">{operative.codename}</span>
						</div>
						<div class="dossier-badline">
							<span class="dossier-label">Current rank</span>
							<span
								class="dossier-rank"
								class:dossier-glow--cyber={rankBorderMode === 'cyber'}
								class:dossier-glow--iso={rankBorderMode === 'isotope'}
							>
								{operative.rankLabel}
							</span>
						</div>
						<div class="dossier-badline">
							<span class="dossier-label">Total XP</span>
							<span class="dossier-xp font-mono"
								>{operative.totalXp.toLocaleString()}</span
							>
						</div>
						<div class="dossier-badline">
							<span class="dossier-label">Clearance</span>
							<span class="dossier-mono dossier-mono--muted">{operative.clearance}</span>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Radar -->
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

	.dossier-mast {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: clamp(1rem, 2.5vw, 1.5rem);
		padding: clamp(0.85rem, 2vw, 1.1rem) 0;
		border-bottom: 1px solid var(--d-line);
	}

	.dossier-eyebrow,
	.dossier-label {
		display: block;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.5);
	}

	.dossier-title {
		margin: 0.4rem 0 0.25rem;
		font-size: clamp(1.1rem, 2.2vw, 1.45rem);
		font-weight: 900;
		letter-spacing: 0.2em;
		color: #fafafa;
	}

	.dossier-sub {
		margin: 0;
		max-width: 52ch;
		font-size: 0.78rem;
		color: rgba(196, 196, 206, 0.85);
		font-weight: 600;
		line-height: 1.5;
	}

	.dossier-mast__right {
		text-align: right;
	}
	.dossier-mast__meta {
		font-size: 0.75rem;
	}

	.dossier-mast__kv {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 0.15rem;
	}

	.dossier-k {
		color: rgba(255, 255, 255, 0.4);
	}

	.dossier-v {
		color: rgba(34, 211, 238, 0.85);
		text-shadow: 0 0 10px rgba(34, 211, 238, 0.35);
	}

	.dossier-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: clamp(0.75rem, 2vw, 1.25rem);
		margin-bottom: clamp(0.75rem, 2vw, 1.25rem);
	}

	@media (min-width: 1024px) {
		.dossier-grid {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
			align-items: stretch;
		}
	}

	.dossier-panel {
		background: var(--d-panel);
		border: 1px solid var(--d-line);
		border-radius: 0;
		padding: clamp(0.9rem, 2vw, 1.1rem);
		min-width: 0;
	}

	.dossier-id__frame {
		padding: 0;
		border: 1px solid var(--d-line);
		background: #000;
	}
	.dossier-id__frame--cyber {
		box-shadow:
			0 0 0 1px rgba(34, 211, 238, 0.35),
			0 0 24px rgba(34, 211, 238, 0.2);
		border-color: rgba(34, 211, 238, 0.5);
	}
	.dossier-id__frame--isotope {
		box-shadow:
			0 0 0 1px rgba(74, 222, 128, 0.4),
			0 0 24px rgba(74, 222, 128, 0.22);
		border-color: rgba(74, 222, 128, 0.55);
	}

	.dossier-id__strip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--d-line);
		background: rgba(0, 0, 0, 0.55);
	}

	.dossier-rank-mode {
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(34, 211, 238, 0.75);
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 0.25rem 0.4rem;
		cursor: pointer;
	}
	.dossier-rank-mode:hover {
		border-color: rgba(34, 211, 238, 0.45);
		box-shadow: 0 0 12px rgba(34, 211, 238, 0.25);
	}

	.dossier-id__body {
		display: flex;
		gap: clamp(0.75rem, 2vw, 1.1rem);
		padding: clamp(0.85rem, 2vw, 1rem);
		flex-wrap: wrap;
	}

	.dossier-avatar {
		position: relative;
		width: 112px;
		height: 112px;
		flex-shrink: 0;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: repeating-linear-gradient(
			-45deg,
			#000 0,
			#000 3px,
			rgba(20, 20, 28, 1) 3px,
			rgba(20, 20, 28, 1) 6px
		);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}
	.dossier-avatar__scan {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			transparent 0%,
			rgba(34, 211, 238, 0.12) 50%,
			transparent 100%
		);
		animation: dossier-scan 2.2s ease-in-out infinite;
		pointer-events: none;
	}
	.dossier-avatar__glyph {
		font-size: 1.75rem;
		color: rgba(34, 211, 238, 0.45);
		text-shadow: 0 0 12px rgba(34, 211, 238, 0.4);
	}

	@keyframes dossier-scan {
		0%,
		100% {
			transform: translateY(-100%);
		}
		50% {
			transform: translateY(100%);
		}
	}

	.dossier-id__meta {
		flex: 1;
		min-width: 0;
	}

	.dossier-name {
		margin: 0 0 0.4rem;
		font-size: clamp(1rem, 2vw, 1.2rem);
		font-weight: 800;
		letter-spacing: 0.08em;
		color: #f8fafc;
		word-break: break-word;
	}

	.dossier-badline {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: 0.35rem;
		padding-top: 0.35rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.dossier-badline .dossier-label {
		margin: 0;
		flex-shrink: 0;
	}

	.dossier-mono {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.7);
	}
	.dossier-mono--muted {
		color: rgba(255, 255, 255, 0.5);
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

	.dossier-rank {
		font-size: 0.7rem;
		font-weight: 900;
		letter-spacing: 0.12em;
	}
	.dossier-glow--cyber {
		color: #67e8f9;
		text-shadow: 0 0 14px rgba(34, 211, 238, 0.55);
	}
	.dossier-glow--iso {
		color: #86efac;
		text-shadow: 0 0 14px rgba(74, 222, 128, 0.55);
	}

	.dossier-xp {
		font-size: 1.05rem;
		font-weight: 800;
		color: #a5f3fc;
		text-shadow: 0 0 10px rgba(34, 211, 238, 0.35);
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
