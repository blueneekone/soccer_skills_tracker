<script lang="ts">
	import type { CommandCenterEngine } from './CommandCenterEngine.svelte.js';

	let { engine }: { engine: CommandCenterEngine } = $props();
</script>

<section class="cc-roster-pane lg:tw-col-span-8">
	<div class="tw-px-5 tw-py-3 tw-border-b tw-border-white/6 tw-flex tw-items-center tw-justify-between">
		<p class="tw-text-[8px] tw-uppercase tw-tracking-[0.42em] tw-text-[#fafafa]/30">
			ROSTER GRID · {engine.roster.length} OPERATIVE{engine.roster.length !== 1 ? 'S' : ''}
		</p>
		<span class="cc-live-dot" aria-label="Live connection active"></span>
	</div>

	<!-- Roster table -->
	<div class="tw-overflow-x-auto tw-overflow-y-auto">
		{#if engine.rosterLoading}
			<!-- Skeleton rows -->
			<div class="tw-p-8 tw-space-y-3">
				{#each Array(4) as _, i (i)}
					<div
						class="tw-h-8 tw-rounded tw-bg-[#0f172a]/4 tw-animate-pulse"
						style:opacity={1 - i * 0.15}
					></div>
				{/each}
			</div>
		{:else if engine.rosterError}
			<div class="tw-p-10 tw-text-center tw-text-[10px] tw-text-[#fafafa]/30 tw-font-mono tw-uppercase tw-tracking-widest">
				<p class="tw-text-[#ff4444] tw-mb-2">⚠ ROSTER SYNC FAILURE</p>
				<p class="tw-text-[8px] tw-text-[#fafafa]/20">{engine.rosterError}</p>
			</div>
		{:else if engine.roster.length === 0}
			<div class="tw-p-10 tw-text-center tw-font-mono">
				<p class="tw-text-[42px] tw-text-[#fafafa]/8 tw-mb-3">⊘</p>
				<p class="tw-text-[10px] tw-uppercase tw-tracking-[0.4em] tw-text-[#fafafa]/25">NO OPERATIVES ASSIGNED</p>
				<p class="tw-mt-1 tw-text-[8px] tw-tracking-[0.2em] tw-text-[#fafafa]/15">
					{engine.teamId ? 'No players are assigned to this team.' : 'No player accounts found.'}
				</p>
			</div>
		{:else}
			<div class="tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-p-4 tw-min-w-0 tw-overflow-x-auto">
				<table class="tw-w-full tw-font-mono tw-text-sm cc-table">
				<thead>
					<tr>
						<th>OPERATIVE</th>
						<th>GUARDIAN</th>
						<th>VPC</th>
						<th>POSITION</th>
						<th>TIER</th>
						<th class="tw-text-[#14b8a6]/50">VAN</th>
						<th>LAST ACTIVE</th>
						<th class="tw-text-right">ACTIONS</th>
					</tr>
				</thead>
				<tbody>
					{#each engine.roster as player (player.id)}
						{@const tier = engine.tierForPlayer(player)}
						{@const van = player.armory?.stats?.VAN ?? '—'}
						{@const isRemoving = player._removing === true}
						{@const isConfirming = engine.confirmRemoveId === player.id}
						<tr
							class="cc-row"
							class:cc-row--removing={isRemoving}
						>
							<td class="cc-td-name">
								<span class="tw-text-[#fafafa]/85 tw-font-semibold">
									{player.playerName ?? player.id}
								</span>
								<span class="tw-block tw-text-[8px] tw-text-[#fafafa]/25 tw-tracking-[0.15em] tw-mt-0.5 tw-uppercase">
									{player.id}
								</span>
							</td>

							<td class="tw-text-[10px] tw-text-[#fafafa]/50 tw-font-mono tw-max-w-[140px] tw-truncate" title={engine.guardianLine(player)}>
								<span class:tw-text-[#ff6666]={engine.guardianLine(player) === 'Unlinked'}>
									{engine.guardianLine(player)}
								</span>
							</td>

							<td class="tw-text-[10px] tw-uppercase tw-tracking-widest">
								<span class:tw-text-[#14b8a6]={engine.vpcLine(player) === 'Verified'}
									class:tw-text-teal-400={engine.vpcLine(player) === 'Pending'}>
									{engine.vpcLine(player)}
								</span>
							</td>

							<td class="tw-text-[#fafafa]/45 tw-uppercase tw-tracking-widest">
								{player.position ?? '—'}
							</td>

							<td>
								<span
									class="cc-tier-badge"
									style:color={tier.accent}
									style:border-color="{tier.accent}40"
									style:background="{tier.accent}0e"
								>
									{tier.label}
								</span>
							</td>

							<td>
								<span
									class="tw-font-bold tw-tabular-nums"
									class:cc-van-active={van !== '—'}
									style:color={van !== '—' ? '#14b8a6' : 'rgba(255,255,255,0.2)'}
									style:filter={van !== '—' ? 'drop-shadow(0 0 6px rgba(20, 184, 166,0.6))' : 'none'}
								>
									{van}
								</span>
							</td>

							<td class="tw-text-[#fafafa]/35 tw-tabular-nums tw-tracking-[0.12em]">
								{engine.formatLastActive(player.lastActivityDate)}
							</td>

							<td class="tw-text-right tw-whitespace-nowrap">
								<div class="tw-inline-flex tw-items-center tw-gap-2">
									<a
										href="/admin/users/{player.id}"
										class="cc-btn-primary cc-btn-primary--edit"
										title="Edit profile"
										aria-label="Edit {player.playerName ?? player.id}"
									>
										✎
									</a>
									<button
										class="cc-btn-primary"
										class:cc-btn-primary--remove={!isConfirming}
										class:cc-btn-primary--confirm={isConfirming}
										onclick={() => engine.handleRemoveClick(player.id)}
										disabled={isRemoving}
										title={isConfirming ? 'Click again to confirm' : 'Remove from team'}
										aria-label={isConfirming ? 'Confirm remove' : 'Remove player'}
									>
										{#if isRemoving}
											⌛
										{:else if isConfirming}
											CONFIRM?
										{:else}
											⊗
										{/if}
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			</div>
		{/if}
	</div>
</section>

<style>
	.cc-roster-pane {
		display: flex;
		flex-direction: column;
		flex: 1;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		min-height: 0;
		overflow: hidden;
	}

	@media (min-width: 1024px) {
		.cc-roster-pane {
			border-bottom: none;
			border-right: 1px solid rgba(255, 255, 255, 0.06);
		}
	}

	.cc-live-dot {
		display: inline-block;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #14b8a6;
		box-shadow: 0 0 8px #14b8a6;
		animation: cc-pulse-dot 2s ease-in-out infinite;
	}

	@keyframes cc-pulse-dot {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	.cc-table {
		border-collapse: collapse;
	}

	.cc-table thead tr {
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.cc-table th {
		padding: clamp(10px, 1vw, 16px);
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.38em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.28);
		text-align: left;
		white-space: nowrap;
	}

	.cc-table td {
		padding: clamp(12px, 1vw, 16px);
		font-size: 11px;
		letter-spacing: 0.08em;
		color: rgba(255, 255, 255, 0.6);
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		vertical-align: middle;
	}

	.cc-row {
		transition: background 0.12s ease, opacity 0.2s ease;
	}

	.cc-row:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.cc-row--removing {
		opacity: 0.25;
		pointer-events: none;
	}

	.cc-td-name {
		max-width: 200px;
	}

	.cc-tier-badge {
		display: inline-block;
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.25em;
		text-transform: uppercase;
		padding: clamp(2px, 0.5vw, 7px);
		border-radius: 3px;
		border: 1px solid;
	}

	.cc-btn-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: transparent;
		font-size: 12px;
		cursor: pointer;
		transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
		color: rgba(255, 255, 255, 0.35);
		text-decoration: none;
	}

	.cc-btn-primary--edit:hover {
		color: #14b8a6;
		border-color: rgba(20, 184, 166, 0.4);
		background: rgba(20, 184, 166, 0.08);
	}

	.cc-btn-primary--remove {
		color: rgba(255, 255, 255, 0.25);
	}

	.cc-btn-primary--remove:hover {
		color: #ff4444;
		border-color: rgba(255, 68, 68, 0.4);
		background: rgba(255, 68, 68, 0.08);
	}

	.cc-btn-primary--confirm {
		font-size: 7px;
		letter-spacing: 0.12em;
		width: auto;
		padding: 0 8px;
		color: #ff4444;
		border-color: rgba(255, 68, 68, 0.5);
		background: rgba(255, 68, 68, 0.1);
		animation: cc-text-pulse 0.8s ease-in-out infinite;
	}

	@keyframes cc-text-pulse {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 0.8; }
	}

	@media (prefers-reduced-motion: reduce) {
		.cc-live-dot,
		.cc-btn-primary--confirm {
			animation: none;
		}
	}
</style>
