<script lang="ts">
	import HudSeededRingCanvas from '$lib/components/hud/HudSeededRingCanvas.svelte';
	import type { SquadTelemetryEngine } from './SquadTelemetryEngine.svelte.js';
	
	let { engine }: { engine: SquadTelemetryEngine } = $props();
</script>
<style src="./squad_styles.css"></style>
<!-- ── SQUAD UPTIME — aggregate readiness ticker (Epic 1.2 bento HUD) ─────── -->
<div class="hud-telemetry-root bento-grid bento-grid--12col bento-grid--liquid tw-w-full tw-min-w-0 tw-grid tw-grid-cols-1 lg:tw-grid-cols-12">
<section
	class="bento-span-12 hud-telemetry-panel tw-backdrop-blur-3xl tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),_0_0_30px_rgba(20, 184, 166,0.08)] tw-border-[#14b8a6]/25"
	aria-label="Squad uptime"
>
	<div class="hud-telemetry-uptime__grid">
		<div class="hud-telemetry-uptime__label">
			<p class="tw-font-mono tw-text-[10px] tw-font-black tw-uppercase tw-tracking-[0.3em] tw-text-[#14b8a6]/85 tw-m-0">
				<span class="tw-inline-block tw-h-2 tw-w-2 tw-animate-pulse tw-rounded-full tw-bg-[#14b8a6] tw-shadow-[0_0_8px_rgba(20, 184, 166,0.95)] tw-mr-2 tw-align-middle"></span>
				SQUAD UPTIME · LIVE TICKER
			</p>
		</div>
		<div class="hud-telemetry-uptime__score">
			<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#fafafa]/35 tw-font-mono">READINESS SCORE</span>
			<span class="tw-text-3xl tw-font-black tw-tabular-nums tw-text-[#14b8a6] tw-drop-shadow-[0_0_12px_rgba(20, 184, 166,0.55)] tw-font-mono">{engine.squadUptimePct}%</span>
		</div>
		<div class="hud-telemetry-uptime__bar">
			<div class="hud-telemetry-uptime__bar-fill" style="width: {engine.squadUptimePct}%;"></div>
		</div>
	</div>
</section>

<!-- ── Readiness Matrix (glassmorphic SIEM grid) ──────────────────────────── -->
<section
	class="bento-span-12 hud-telemetry-panel"
	aria-labelledby="readiness-matrix-title"
>
	<div class="hud-telemetry-matrix__head">
		<div class="hud-telemetry-matrix__title">
			<h2
				id="readiness-matrix-title"
				class="tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-[0.2em] tw-text-[#14b8a6] tw-m-0"
			>
				<span class="tw-inline-block tw-h-2 tw-w-2 tw-animate-pulse tw-rounded-full tw-bg-[#14b8a6] tw-shadow-[0_0_8px_rgba(20, 184, 166,0.8)] tw-mr-2 tw-align-middle"></span>
				READINESS MATRIX · {engine.readinessMatrixLabel}
			</h2>
		</div>
		<div class="hud-telemetry-matrix__stats">
			<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#fafafa]/35">
				COMBAT READY <span class="tw-ml-1 tw-tabular-nums tw-text-[#14b8a6]">{engine.rmReady}</span>
			</span>
			<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#fafafa]/35">
				CONSENT PENDING <span class="tw-ml-1 tw-tabular-nums tw-text-[#ff003c]">{engine.rmConsent}</span>
			</span>
			<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#fafafa]/35">
				OFFLINE <span class="tw-ml-1 tw-tabular-nums tw-text-[#fafafa]/50">{engine.rmOffline}</span>
			</span>
			<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#fafafa]/35">
				INJURY RISK <span class="tw-ml-1 tw-tabular-nums tw-text-[#ff003c]">{engine.rmAtRisk}</span>
			</span>
		</div>
	</div>

	{#if engine.loading}
		<p class="tw-font-mono tw-text-[11px] tw-uppercase tw-tracking-widest tw-text-[#fafafa]/40 tw-m-0 tw-py-4">
			Loading roster…
		</p>
	{:else if engine.readinessRoster.length === 0}
		<p class="tw-font-mono tw-text-[11px] tw-uppercase tw-tracking-widest tw-text-[#fafafa]/40 tw-m-0 tw-py-4">
			No athletes on roster — ingest below or
			<a class="tw-text-[#14b8a6] tw-underline tw-underline-offset-2" href="/coach/logistics?tab=roster"
				>import CSV on Team Ops</a
			>.
		</p>
	{:else}
		<div class="bento-grid bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12">
			{#each engine.readinessRoster as p (p.id)}
				{@const staminaFill = Math.max(0, Math.min(1, p.stamina / 100))}
				<div
					class="bento-span-3 hud-readiness-card hud-telemetry-panel"
					role="button"
					tabindex="0"
					onclick={() => engine.openDrawer(p.rosterKey)}
					onkeydown={(e) => e.key === 'Enter' && engine.openDrawer(p.rosterKey)}
				>
					<div class="hud-readiness-card__ring hud-telemetry-avatar">
						<HudSeededRingCanvas
							uid={p.id}
							size={64}
							fill={staminaFill}
							strokeColor="#14b8a6"
							showAvatar={true}
							avatarSeed={p.name}
							showCenter={false}
						/>
					</div>
					<div class="hud-readiness-card__meta">
						<p class="tw-font-mono tw-text-[10px] tw-font-black tw-uppercase tw-tracking-wider tw-text-[#fafafa] tw-m-0">{p.name}</p>
						<p class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6] tw-m-0">{p.position} · #{p.number}</p>
						<p class="tw-font-mono tw-text-[10px] tw-uppercase tw-tracking-widest tw-m-0" style="color: {p.status === 'READY' ? '#14b8a6' : p.status === 'INJURY RISK' ? '#ff003c' : '#666'}">{p.status}</p>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>
</div>

