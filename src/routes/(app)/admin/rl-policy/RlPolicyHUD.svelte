<script lang="ts">
	/**
	 * RlPolicyHUD.svelte
	 * ───────────────────
	 * Phase 3, Epic 4 (deliverable 2) — RL Adaptive Workout Engine (S10)
	 *
	 * Floating status pill for the RL policy admin console.
	 * Shows: policyVersion · abPercent · frozen state · last save outcome.
	 */
	import type { RlPolicyEngine } from './RlPolicyEngine.svelte.js';

	type Props = { engine: RlPolicyEngine };
	const { engine }: Props = $props();

	const statusColor = $derived.by(() => {
		if (engine.saveState === 'error') return '#ff6b6b';
		if (engine.saveState === 'saving') return '#f59e0b';
		if (engine.saveState === 'success') return '#39ff14';
		if (engine.frozen) return '#ff6b6b';
		if (engine.abPercent === 0) return 'rgba(255,255,255,0.25)';
		if (engine.abPercent === 100) return '#39ff14';
		return '#00d4ff';
	});

	const statusLabel = $derived.by(() => {
		if (engine.saveState === 'saving') return 'SAVING…';
		if (engine.saveState === 'error') return 'ERROR';
		if (engine.saveState === 'success') return 'SAVED ✓';
		if (engine.frozen) return 'FROZEN — ALL PLAYERS ON HEURISTIC';
		if (engine.abPercent === 0) return 'OFF — 0% ROLLOUT';
		if (engine.abPercent === 100) return 'FULLY DEPLOYED — 100%';
		return `ROLLING OUT — ${engine.abPercent}%`;
	});
</script>

<div class="hud-bar">
	<div class="hud-version">
		<span class="hud-label">POLICY</span>
		<span class="hud-value">v{engine.policyVersion}</span>
	</div>

	<div class="hud-divider"></div>

	<div class="hud-status" style="color: {statusColor}">
		<span class="hud-dot" style="background: {statusColor}"></span>
		<span class="hud-status-text">{statusLabel}</span>
	</div>

	{#if engine.safetyOverrideCount7d > 0}
		<div class="hud-divider"></div>
		<div class="hud-overrides">
			<span class="hud-label">OVERRIDES 7D</span>
			<span class="hud-value hud-warn">{engine.safetyOverrideCount7d}</span>
		</div>
	{/if}
</div>

<style>
	.hud-bar {
		position: sticky;
		top: 0;
		z-index: 40;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.6rem 1.25rem;
		background: rgba(5, 5, 15, 0.82);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.hud-version {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.hud-label {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(226, 232, 240, 0.35);
		font-family: monospace;
	}

	.hud-value {
		font-size: 0.75rem;
		font-weight: 800;
		color: #e2e8f0;
		font-family: monospace;
	}

	.hud-warn {
		color: #f59e0b;
	}

	.hud-divider {
		width: 1px;
		height: 1.25rem;
		background: rgba(255, 255, 255, 0.1);
	}

	.hud-status {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.hud-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.hud-status-text {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-family: monospace;
	}

	.hud-overrides {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
</style>
