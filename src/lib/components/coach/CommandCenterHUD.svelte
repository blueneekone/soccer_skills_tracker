<script lang="ts">
	import { DRILL_CATALOG, type CommandCenterEngine } from './CommandCenterEngine.svelte.js';

	let { engine }: { engine: CommandCenterEngine } = $props();
</script>

<div class="cc-page-header">
	<div>
		<p class="tw-text-[8px] tw-uppercase tw-tracking-[0.5em] tw-text-[#fafafa]/25">
			VANGUARD SYSTEM · COACH CLEARANCE
		</p>
		<h1 class="tw-mt-0.5 tw-text-[13px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-[#fafafa]">
			COMMAND CENTER
			<span class="tw-text-[#fafafa]/25">·</span>
			OPERATIONAL CONTROL
		</h1>
	</div>
	<div class="tw-flex tw-items-center tw-gap-4 tw-text-[9px] tw-font-mono tw-text-[#fafafa]/30 tw-tracking-[0.25em]">
		{#if engine.rosterLoading}
			<span class="cc-pulse">SYNCING ROSTER…</span>
		{:else if engine.rosterError}
			<span class="tw-text-[#ff4444]">⚠ SYNC ERROR</span>
		{:else}
			<span>{engine.roster.length} OPERATIVES ONLINE</span>
		{/if}
	</div>
</div>

<aside class="cc-mission-pane lg:tw-col-span-4">
	<div class="tw-px-5 tw-py-3 tw-border-b tw-border-white/6">
		<p class="tw-text-[8px] tw-uppercase tw-tracking-[0.42em] tw-text-[#fafafa]/30">
			MISSION CONSOLE · DIRECTIVE AUTHORING
		</p>
	</div>

	<form
		class="tw-p-5 tw-space-y-6"
		onsubmit={(e) => { e.preventDefault(); void engine.deployMission(); }}
	>
		<div class="cc-form-group">
			<label for="cc-drill" class="cc-label">SELECT DRILL</label>
			<select id="cc-drill" bind:value={engine.selectedDrillId} class="cc-select">
				<option value="" disabled>— CHOOSE PROTOCOL —</option>
				{#each DRILL_CATALOG as drill (drill.id)}
					<option value={drill.id}>{drill.label}</option>
				{/each}
			</select>
			{#if engine.selectedDrillId}
				{@const drill = DRILL_CATALOG.find(d => d.id === engine.selectedDrillId)}
				<p class="tw-mt-1.5 tw-text-[8px] tw-tracking-[0.2em] tw-text-[#fafafa]/25 tw-uppercase">
					WRITES → <span class="tw-text-[#14b8a6]/60">{drill?.statKey}</span> METRIC
				</p>
			{/if}
		</div>

		<div class="cc-form-group">
			<p class="cc-label">TARGET OPERATIVES</p>

			<div class="tw-flex tw-gap-1 tw-mb-3" role="group" aria-label="Target mode">
				{#each [
					{ value: 'all', label: 'ENTIRE ROSTER' },
					{ value: 'position', label: 'BY POSITION' },
					{ value: 'specific', label: 'SPECIFIC' },
				] as mode (mode.value)}
					<button
						type="button"
						class="cc-mode-btn"
						class:cc-mode-btn--active={engine.targetMode === mode.value}
						onclick={() => { engine.targetMode = mode.value as any; }}
					>
						{mode.label}
					</button>
				{/each}
			</div>

			{#if engine.targetMode === 'position'}
				<select bind:value={engine.targetPosition} class="cc-select cc-select--sm">
					<option value="" disabled>— CHOOSE POSITION —</option>
					{#each engine.positions as pos (pos)}
						<option value={pos}>{pos}</option>
					{/each}
					{#if engine.positions.length === 0}
						<option value="" disabled>No positions found</option>
					{/if}
				</select>
			{/if}

			{#if engine.targetMode === 'specific'}
				<div class="cc-player-checklist">
					{#each engine.roster as p (p.id)}
						<label class="cc-check-row">
							<input
								type="checkbox"
								class="cc-checkbox"
								checked={engine.selectedPlayerIds.includes(p.id)}
								onchange={() => engine.togglePlayer(p.id)}
							/>
							<span class="tw-text-[10px] tw-text-[#fafafa]/65 tw-tracking-[0.15em]">
								{p.playerName ?? p.id}
							</span>
							{#if p.position}
								<span class="tw-ml-auto tw-text-[8px] tw-text-[#fafafa]/25 tw-uppercase tw-tracking-widest">
									{p.position}
								</span>
							{/if}
						</label>
					{/each}
					{#if engine.roster.length === 0}
						<p class="tw-text-[9px] tw-text-[#fafafa]/25 tw-text-center tw-py-4 tw-uppercase tw-tracking-widest">
							No operatives loaded
						</p>
					{/if}
				</div>
			{/if}

			<p class="tw-mt-2 tw-text-[8px] tw-uppercase tw-tracking-[0.28em] tw-text-[#fafafa]/25">
				{engine.missionTargetIds.length} OPERATIVE{engine.missionTargetIds.length !== 1 ? 'S' : ''} TARGETED
			</p>
		</div>

		<div class="cc-form-group">
			<label for="cc-deadline" class="cc-label">MISSION DEADLINE</label>
			<input
				id="cc-deadline"
				type="date"
				bind:value={engine.missionDeadline}
				min={new Date().toISOString().slice(0, 10)}
				class="cc-input"
			/>
		</div>

		<div class="tw-pt-2">
			<button
				type="submit"
				class="cc-deploy-btn"
				class:cc-deploy-btn--ready={engine.canDeploy}
				class:cc-deploy-btn--deploying={engine.deployState === 'deploying'}
				class:cc-deploy-btn--success={engine.deployState === 'success'}
				class:cc-deploy-btn--error={engine.deployState === 'error'}
				disabled={!engine.canDeploy || engine.deployState !== 'idle'}
			>
				{#if engine.deployState === 'deploying'}
					⌛ &nbsp;TRANSMITTING…
				{:else if engine.deployState === 'success'}
					◉ &nbsp;MISSION DEPLOYED
				{:else if engine.deployState === 'error'}
					⚠ &nbsp;TRANSMISSION FAILED
				{:else}
					[ &nbsp;DEPLOY MISSION&nbsp; ]
				{/if}
			</button>

			<ul class="tw-mt-3 tw-space-y-1.5 tw-text-[8px] tw-font-mono tw-tracking-[0.2em] tw-text-[#fafafa]/25">
				<li class={engine.selectedDrillId ? 'tw-text-[#14b8a6]/50' : ''}>
					{engine.selectedDrillId ? '◉' : '○'} DRILL SELECTED
				</li>
				<li class={engine.missionTargetIds.length > 0 ? 'tw-text-[#14b8a6]/50' : ''}>
					{engine.missionTargetIds.length > 0 ? '◉' : '○'} TARGETS LOCKED ({engine.missionTargetIds.length})
				</li>
				<li class={engine.missionDeadline ? 'tw-text-[#14b8a6]/50' : ''}>
					{engine.missionDeadline ? '◉' : '○'} DEADLINE SET
				</li>
			</ul>
		</div>
	</form>
</aside>

<style>
	.cc-page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: clamp(8px, 2vw, 16px) 20px 14px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		flex-shrink: 0;
	}

	.cc-mission-pane {
		flex-shrink: 0;
		overflow-y: auto;
		background: rgba(0, 0, 0, 0.2);
	}

	.cc-pulse {
		animation: cc-text-pulse 1.4s ease-in-out infinite;
	}

	@keyframes cc-text-pulse {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 0.8; }
	}

	.cc-form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.cc-label {
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.42em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.3);
	}

	.cc-select,
	.cc-input {
		width: 100%;
		background: rgba(10, 14, 20, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		padding: clamp(4px, 1vw, 8px) 10px;
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.7);
		font-family: inherit;
		outline: none;
		cursor: pointer;
		transition: border-color 0.15s ease;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath fill='rgba(255,255,255,0.25)' d='M0 0l4 5 4-5z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 10px center;
		padding-right: 28px;
	}

	.cc-input {
		background-image: none;
		padding-right: 10px;
		color-scheme: dark;
	}

	.cc-select:focus,
	.cc-input:focus {
		border-color: rgba(20, 184, 166, 0.4);
	}

	.cc-select option {
		background: #0a0e14;
		color: #fafafa;
		letter-spacing: 0;
		text-transform: none;
	}

	.cc-select--sm {
		font-size: 9px;
		padding: clamp(6px, 1vw, 10px) clamp(16px, 2vw, 28px) clamp(6px, 1vw, 10px) clamp(10px, 1vw, 16px);
	}

	.cc-mode-btn {
		flex: 1;
		padding: clamp(5px, 0.5vw, 8px);
		font-family: inherit;
		font-size: 7px;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		background: transparent;
		color: rgba(255, 255, 255, 0.3);
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.cc-mode-btn:hover {
		border-color: rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.5);
	}

	.cc-mode-btn--active {
		color: #14b8a6;
		border-color: rgba(20, 184, 166, 0.45);
		background: rgba(20, 184, 166, 0.08);
	}

	.cc-player-checklist {
		max-height: 180px;
		overflow-y: auto;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.2);
	}

	.cc-check-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: clamp(7px, 1vw, 10px);
		cursor: pointer;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		transition: background 0.1s ease;
	}

	.cc-check-row:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.cc-check-row:last-child {
		border-bottom: none;
	}

	.cc-checkbox {
		width: 12px;
		height: 12px;
		accent-color: #14b8a6;
		cursor: pointer;
		flex-shrink: 0;
	}

	.cc-deploy-btn {
		width: 100%;
		padding: clamp(14px, 1.5vw, 20px);
		font-family: inherit;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.35em;
		text-transform: uppercase;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		background: transparent;
		color: rgba(255, 255, 255, 0.2);
		cursor: not-allowed;
		transition: all 0.18s ease;
	}

	.cc-deploy-btn--ready {
		color: #ff2a2a;
		border-color: #ff2a2a;
		background: transparent;
		cursor: pointer;
	}

	.cc-deploy-btn--ready:hover {
		background: rgba(255, 42, 42, 0.12);
		box-shadow:
			0 0 20px rgba(255, 42, 42, 0.18),
			inset 0 0 20px rgba(255, 42, 42, 0.04);
	}

	.cc-deploy-btn--deploying {
		color: rgba(255, 42, 42, 0.6);
		border-color: rgba(255, 42, 42, 0.4);
		cursor: not-allowed;
		animation: cc-text-pulse 1s ease-in-out infinite;
	}

	.cc-deploy-btn--success {
		color: #2dd4bf;
		border-color: rgba(45, 212, 191, 0.5);
		background: rgba(45, 212, 191, 0.06);
		box-shadow: 0 0 20px rgba(45, 212, 191, 0.1);
		cursor: default;
	}

	.cc-deploy-btn--error {
		color: #ff4444;
		border-color: rgba(255, 68, 68, 0.4);
		background: rgba(255, 68, 68, 0.05);
		cursor: default;
	}

	@media (prefers-reduced-motion: reduce) {
		.cc-pulse,
		.cc-deploy-btn--deploying {
			animation: none;
		}
	}
</style>
