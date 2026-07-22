<script lang="ts">
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { DashboardEngine } from './DashboardEngine.svelte.js';
	import DashboardArena from './DashboardArena.svelte';
	import ClearanceGate from './ClearanceGate.svelte';

	const engine = new DashboardEngine();

	let tickerNow = $state('--:--:--');
	$effect(() => {
		if (!browser) return;
		const tick = () => {
			const d = new Date();
			tickerNow = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
		};
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	});
</script>

<svelte:head>
	<title>Nexus Command · Coach OS</title>
</svelte:head>

<!-- ── Epic 14: Clearance Protocol — locked dashboard state ───────────────── -->
{#if engine.clearanceRequired && !engine.isCleared && !authStore.isLoading}
	<ClearanceGate {engine} />
{:else}
	<!-- Vanguard root: deep void background, native page scrolling, no overflow traps. -->
	<div class="coach-nexus-canvas tw-relative tw-flex tw-flex-col tw-h-full tw-w-full tw-text-slate-200">
		<!-- Background ambient grid -->
		<div
			class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-0 tw-opacity-[0.08]"
			style="background-image: linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px); background-size: 44px 44px;"
			aria-hidden="true"
		></div>

		<!-- ── NEXUS COMMAND BANNER ─────────────────────────────────────────────── -->
		<header
			class="coach-os-z4-header nexus-banner tw-relative tw-z-10 tw-w-full tw-overflow-visible tw-rounded-t-none"
			aria-label="Nexus Command"
		>
			<div class="nexus-banner__media" aria-hidden="true">
				<div class="nexus-banner__grid"></div>
				<div class="nexus-banner__glow nexus-banner__glow--a"></div>
				<div class="nexus-banner__glow nexus-banner__glow--b"></div>
				<div class="nexus-banner__scanline"></div>
			</div>

			<div
				class="coach-os-z4-strip vanguard-surface tw-absolute tw-inset-x-4 tw-bottom-4 tw-z-20 tw-flex tw-flex-wrap tw-items-end bento-gap-md tw-px-5 tw-py-4 md:tw-inset-x-8 md:tw-bottom-6"
			>
				<div
					class="coach-os-badge tw-relative tw-flex tw-h-12 tw-w-12 tw-shrink-0 tw-items-center tw-justify-center md:tw-h-14 md:tw-w-14"
				>
					<span class="tw-font-mono tw-text-2xl tw-font-black tw-tracking-widest md:tw-text-3xl">{engine.nexusBadgeLetter}</span>
				</div>
				<div class="tw-min-w-0 tw-flex-1">
					<h1 class="tw-m-0 tw-font-mono tw-text-lg tw-font-black tw-uppercase tw-tracking-[0.18em] tw-text-white md:tw-text-xl">
						Nexus Command
					</h1>
					<p class="tw-mt-1 tw-font-mono tw-text-[10px] tw-tracking-[0.22em] tw-text-[#14b8a6]/85 tw-uppercase">
						{engine.clubNameDisplay} <span class="tw-text-slate-600">//</span> {engine.teamNameDisplay}
					</p>
				</div>
				<div class="tw-flex tw-shrink-0 tw-flex-col tw-items-end tw-gap-1 tw-font-mono coach-os-uplink">
					<span class="tw-text-[9px] tw-font-semibold tw-uppercase tw-tracking-[0.05em] tw-text-[var(--text-muted)]">UPLINK</span>
					<span class="coach-os-uplink tw-text-2xl tw-font-black tw-tabular-nums">{tickerNow}</span>
				</div>
			</div>
		</header>

		<!-- ── BODY — 12-col asymmetric bento ───────────────────────────────────── -->
		<main 
			class="coach-nexus-main tw-relative tw-z-10 tw-mx-auto tw-box-border tw-w-full tw-max-w-7xl tw-flex-1 tw-min-h-0"
			style="padding: var(--bento-pad-liquid); padding-bottom: calc(var(--bento-pad-liquid) + 84px + env(safe-area-inset-bottom, 0px));"
		>
			<DashboardArena {engine} />
		</main>
	</div>
{/if}

<style>
	.nexus-banner {
		aspect-ratio: 16 / 5;
		min-height: 180px;
		max-height: 320px;
		mask-image: linear-gradient(to bottom, #000 0%, #000 78%, transparent 100%);
		-webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 78%, transparent 100%);
	}

	.nexus-banner__media {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: radial-gradient(ellipse at 30% 25%, rgba(20, 184, 166, 0.25) 0%, transparent 55%),
			radial-gradient(ellipse at 75% 60%, rgba(168, 85, 247, 0.22) 0%, transparent 55%),
			linear-gradient(135deg, #020617 0%, #020202 60%, #050511 100%);
	}

	.nexus-banner__grid {
		position: absolute;
		inset: 0;
		background-image: linear-gradient(rgba(20, 184, 166, 0.08) 1px, transparent 1px),
			linear-gradient(90deg, rgba(20, 184, 166, 0.08) 1px, transparent 1px);
		background-size: 36px 36px;
		mask-image: linear-gradient(to bottom, #000 0%, transparent 95%);
		-webkit-mask-image: linear-gradient(to bottom, #000 0%, transparent 95%);
	}

	.nexus-banner__glow {
		position: absolute;
		border-radius: 50%;
		filter: blur(48px);
		opacity: 0.7;
		pointer-events: none;
	}

	.nexus-banner__glow--a {
		top: -12%;
		left: 8%;
		width: 38%;
		height: 70%;
		background: radial-gradient(ellipse, rgba(20, 184, 166, 0.55), transparent 70%);
	}

	.nexus-banner__glow--b {
		bottom: -15%;
		right: -10%;
		width: 45%;
		height: 85%;
		background: radial-gradient(ellipse, rgba(168, 85, 247, 0.45), transparent 70%);
	}

	.nexus-banner__scanline {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom,
			transparent 50%,
			rgba(20, 184, 166, 0.03) 51%,
			transparent 52%
		);
		background-size: 100% 4px;
		opacity: 0.5;
		pointer-events: none;
	}

	.coach-nexus-canvas {
		background-color: var(--vanguard-void);
	}
	
	.coach-os-z4-strip {
		background-color: rgba(2, 6, 23, 0.85);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(51, 65, 85, 0.5);
		border-radius: 2px;
	}

	.coach-os-badge {
		background-color: var(--vanguard-slate);
		color: var(--vanguard-cyan);
		border: 1px solid rgba(20, 184, 166, 0.3);
		border-radius: 2px;
		box-shadow: inset 0 0 12px rgba(20, 184, 166, 0.1);
	}

	.coach-os-uplink {
		color: var(--vanguard-cyan);
		text-shadow: 0 0 12px rgba(20, 184, 166, 0.4);
	}

	/* CLEARANCE GATE STYLES */
	:global(.clearance-gate) {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--vanguard-void);
		color: var(--text-primary);
		padding: clamp(16px, 4vw, 32px);
		text-align: center;
		font-family: var(--font-mono);
	}

	:global(.clearance-gate__grid) {
		position: absolute;
		inset: 0;
		background-image: linear-gradient(rgba(220, 38, 38, 0.05) 1px, transparent 1px),
			linear-gradient(90deg, rgba(220, 38, 38, 0.05) 1px, transparent 1px);
		background-size: 32px 32px;
		z-index: 0;
		pointer-events: none;
	}

	:global(.clearance-gate__shield) {
		position: relative;
		z-index: 10;
		margin-bottom: 24px;
		animation: pulse-red 2s infinite;
	}

	:global(.clearance-gate__status) {
		position: relative;
		z-index: 10;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.25em;
		color: var(--vanguard-red);
		margin-bottom: 8px;
	}

	:global(.clearance-gate__title) {
		position: relative;
		z-index: 10;
		font-size: clamp(24px, 4vw, 40px);
		font-weight: 900;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		margin: 0;
		text-shadow: 0 0 20px rgba(220, 38, 38, 0.3);
	}

	:global(.clearance-gate__diag) {
		position: relative;
		z-index: 10;
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		justify-content: center;
		font-size: 0.75rem;
		color: var(--text-muted);
		background: rgba(220, 38, 38, 0.05);
		padding: 12px 24px;
		border: 1px solid rgba(220, 38, 38, 0.2);
		border-radius: 4px;
	}

	:global(.clearance-gate__contact) {
		position: relative;
		z-index: 10;
		margin-top: 32px;
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--vanguard-slate);
		text-decoration: none;
		transition: all 0.2s;
	}

	:global(.clearance-gate__contact:hover) {
		color: var(--vanguard-red);
		text-shadow: 0 0 10px rgba(220, 38, 38, 0.4);
	}

	@keyframes pulse-red {
		0% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(220, 38, 38, 0.5)); }
		50% { transform: scale(1.05); filter: drop-shadow(0 0 25px rgba(220, 38, 38, 0.8)); }
		100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(220, 38, 38, 0.5)); }
	}
</style>
