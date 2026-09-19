<script lang="ts">
	import AthleteQuickStatsModal from './AthleteQuickStatsModal.svelte';
	import type { SquadMatrixEngine } from './SquadMatrixEngine.svelte.js';

	let { engine }: { engine: SquadMatrixEngine } = $props();
</script>

<div class="tw-w-full tw-flex tw-flex-col tw-gap-4">
	<section
		class="vanguard-panel tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-xl tw-p-5 tw-shadow-2xl"
		aria-labelledby="readiness-matrix-title"
	>
		<div class="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-3 tw-border-b tw-border-[#334155] tw-pb-3 tw-mb-4">
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-inline-block tw-h-2 tw-w-2 tw-rounded-full tw-bg-[#14b8a6] tw-shadow-[0_0_8px_#14b8a6]"></span>
				<h2
					id="readiness-matrix-title"
					class="tw-font-mono tw-text-xs tw-font-black tw-uppercase tw-tracking-[0.2em] tw-text-[#14b8a6] tw-m-0"
				>
					READINESS MATRIX · {engine.readinessMatrixLabel}
				</h2>
			</div>
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-font-mono tw-text-[11px] tw-text-[#daff0a] tw-bg-[#daff0a]/10 tw-border tw-border-[#daff0a]/30 tw-px-2 tw-py-0.5">
					↓ Click card → athlete quick stats modal · [✎ Edit Profile] opens drawer
				</span>
			</div>
		</div>

		{#if engine.loading}
			<div class="tw-py-8 tw-text-center">
				<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-animate-pulse tw-m-0">
					Loading squad readiness matrix…
				</p>
			</div>
		{:else if engine.readinessRoster.length === 0}
			<div class="tw-border tw-border-dashed tw-border-slate-800 tw-p-8 tw-text-center tw-bg-[#020617] tw-rounded-lg">
				<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-m-0">
					No athletes on roster —
					<a class="tw-text-[#14b8a6] tw-underline tw-underline-offset-2" href="/coach/logistics?tab=roster">
						import CSV on Team Ops
					</a>.
				</p>
			</div>
		{:else}
			<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 md:tw-grid-cols-3 lg:tw-grid-cols-4 xl:tw-grid-cols-6 tw-gap-3">
				{#each engine.readinessRoster as p (p.id)}
					{@const active = engine.isPlayerSelected(p)}
					<div
						class="tw-group tw-relative tw-flex tw-flex-col tw-justify-between tw-rounded-lg tw-p-3.5 tw-transition-all tw-duration-150 tw-cursor-pointer tw-select-none {active ? 'tw-bg-[#0f172a] tw-border-2 tw-border-[#daff0a] tw-shadow-[0_0_18px_rgba(218,255,10,0.25)]' : 'tw-bg-[#020617] tw-border tw-border-[#334155] hover:tw-border-[#14b8a6] hover:tw-bg-[#0b1329]'}"
						role="button"
						tabindex="0"
						onclick={() => engine.handleCardClick(p)}
						onkeydown={(e) => e.key === 'Enter' && engine.handleCardClick(p)}
					>
						<div class="tw-flex tw-items-center tw-justify-between tw-gap-2">
							<div class="tw-flex tw-items-center tw-gap-1.5">
								<span class="tw-font-mono tw-text-xs tw-font-black tw-px-1.5 tw-py-0.5 tw-rounded {active ? 'tw-bg-[#daff0a] tw-text-[#000000]' : 'tw-bg-[#0f172a] tw-text-[#daff0a]'}">
									#{p.number}
								</span>
								<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-text-[#14b8a6] tw-bg-[#14b8a6]/10 tw-px-1.5 tw-py-0.5 tw-rounded tw-border tw-border-[#14b8a6]/30">
									{p.position}
								</span>
							</div>

							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									engine.openDrawer(p.rosterKey);
								}}
								class="tw-bg-[#0f172a] hover:tw-bg-slate-700 tw-border tw-border-slate-700 hover:tw-border-[#14b8a6] tw-text-slate-300 hover:tw-text-[#fafafa] tw-font-mono tw-text-[10px] tw-px-2.5 tw-py-1 tw-rounded tw-transition-colors tw-cursor-pointer"
								title="Edit profile in drawer"
							>
								✎ Edit Profile
							</button>
						</div>

						<div class="tw-my-3">
							<h3 class="tw-font-mono tw-text-xs tw-font-black tw-text-[#fafafa] tw-tracking-wide tw-m-0 tw-truncate" title={p.name}>
								{p.name}
							</h3>
							<div class="tw-flex tw-items-center tw-gap-1.5 tw-mt-1.5">
								{#if p.status === 'READY'}
									<span class="tw-inline-block tw-h-1.5 tw-w-1.5 tw-rounded-full tw-bg-[#14b8a6] tw-shadow-[0_0_6px_#14b8a6]"></span>
									<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-text-[#14b8a6] tw-uppercase">Combat Ready</span>
								{:else if p.status === 'INJURY RISK'}
									<span class="tw-inline-block tw-h-1.5 tw-w-1.5 tw-rounded-full tw-bg-[#ef4444] tw-shadow-[0_0_6px_#ef4444]"></span>
									<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-text-[#ef4444] tw-uppercase">Injury Risk</span>
								{:else}
									<span class="tw-inline-block tw-h-1.5 tw-w-1.5 tw-rounded-full tw-bg-slate-500"></span>
									<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase">
										{!p.vpc_approved ? 'VPC Pending' : 'Offline'}
									</span>
								{/if}
							</div>
						</div>

						<div class="tw-pt-2 tw-border-t tw-border-slate-800/80 tw-flex tw-items-center tw-justify-between">
							{#if active}
								<span class="tw-font-mono tw-text-[9px] tw-font-black tw-text-[#daff0a] tw-tracking-widest tw-uppercase tw-animate-pulse">
									● ACTIVE RADAR
								</span>
							{:else}
								<span class="tw-font-mono tw-text-[9px] tw-text-slate-500 tw-uppercase tw-tracking-wider">
									STAMINA: {p.stamina}%
								</span>
							{/if}
							<span class="tw-font-mono tw-text-[9px] tw-text-[#14b8a6] group-hover:tw-translate-x-0.5 tw-transition-transform">
								SELECT →
							</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<AthleteQuickStatsModal
	isOpen={!!engine.quickModalPlayer}
	player={engine.quickModalPlayer}
	statsDoc={engine.quickModalPlayer ? engine.playerStats[engine.resolveStatsId(engine.quickModalPlayer.rosterKey || engine.quickModalPlayer.name, engine.playerStats)] : null}
	onClose={() => (engine.quickModalPlayer = null)}
/>
