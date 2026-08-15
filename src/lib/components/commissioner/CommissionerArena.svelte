<script lang="ts">
	/**
	 * CommissionerArena.svelte — The Glass
	 * High-Density Data UI. Tournament Operations matrix and Federation Compliance matrix.
	 * 12-column asymmetric Bento Grid using fluid anti-squish math.
	 * Strict 90-degree corners, Geist Mono typography, zero gamification.
	 */
	import { CommissionerEngine } from './CommissionerEngine.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let engine = new CommissionerEngine();
</script>

<div data-panel="compliance-matrix" class="tenant-matrix-grid federation-matrix-grid tw-w-full tw-h-full tw-p-6 tw-overflow-y-auto tw-bg-[#000000]">
	<div class="bento-grid-container tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6">

		<!-- Federation Compliance Matrix (Spans 8 cols on lg) -->
		<section class="st-bento lg:tw-col-span-8 z2-panel siem-panel tw-p-6 tw-flex tw-flex-col tw-min-h-[300px] tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-none hover:tw-border-amber-500 tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
			<header class="tw-border-b tw-border-[#334155] tw-pb-3 tw-mb-4 tw-flex tw-items-center tw-justify-between">
				<div>
					<h2 class="tw-font-sans tw-text-[#FAFAFA] tw-uppercase tw-tracking-widest tw-text-sm tw-m-0 tw-flex tw-items-center tw-gap-2">
						<Icon name={"status.shield-check" as IconName} size={16} class="tw-text-amber-500" />
						Federation Compliance Matrix
					</h2>
					<p class="tw-font-mono tw-text-[#14b8a6] tw-text-[10px] tw-uppercase tw-m-0 tw-mt-1">
						Live COPPA / SafeSport Compliance Feed
					</p>
				</div>
				<span class="tw-font-mono tw-text-[10px] tw-text-amber-500 tw-border tw-border-slate-700 tw-bg-slate-900 tw-px-2 tw-py-0.5">
					REALTIME_TELEMETRY
				</span>
			</header>

			<div class="tw-flex-1 tw-overflow-auto">
				<table class="tw-w-full tw-text-left tw-font-mono tw-text-xs tw-text-white tw-border-collapse">
					<thead>
						<tr class="tw-border-b tw-border-[#334155] tw-text-slate-400">
							<th class="tw-py-2 tw-px-2 tw-font-bold tw-uppercase tw-text-[10px]">Club ID</th>
							<th class="tw-py-2 tw-px-2 tw-font-bold tw-uppercase tw-text-[10px]">Status</th>
							<th class="tw-py-2 tw-px-2 tw-font-bold tw-uppercase tw-text-[10px] tw-text-right">SafeSport</th>
						</tr>
					</thead>
					<tbody>
						{#await engine.loadFederationCompliance()}
							<tr>
								<td colspan="3" class="tw-py-8 tw-text-center tw-text-amber-500">
									<div class="tw-flex tw-items-center tw-justify-center tw-gap-2">
										<Icon name={"status.loading" as IconName} size={16} class="tw-animate-spin" />
										SCANNING REGISTRY...
									</div>
								</td>
							</tr>
						{:then complianceData}
							{#each complianceData as item}
								<tr class="tw-border-b tw-border-[#334155] tw-border-opacity-30 tw-bg-[#000000] hover:tw-bg-slate-900 tw-transition-colors">
									<td class="tw-py-2.5 tw-px-2 tw-uppercase tw-font-bold tw-text-white">{item.clubId}</td>
									<td class="tw-py-2.5 tw-px-2">
										<span class="tw-px-2 tw-py-0.5 tw-rounded-none tw-font-mono tw-font-bold tw-text-[10px] status-dot-indicator {item.complianceStatus === 'green' ? 'tw-bg-[#14b8a6] tw-text-black' : 'tw-bg-amber-500 tw-text-black'}">
											{item.complianceStatus.toUpperCase()}
										</span>
									</td>
									<td class="tw-py-2.5 tw-px-2 tw-text-right tw-text-amber-500 tw-font-mono tw-font-bold odp-analytics-val">{item.safeSportRate}%</td>
								</tr>
							{:else}
								<tr>
									<td colspan="3" class="tw-py-8 tw-text-center tw-text-slate-400 tw-font-mono tw-text-xs">
										NO FEDERATION CLUBS DISCOVERED
									</td>
								</tr>
							{/each}
						{/await}
					</tbody>
				</table>
			</div>
		</section>

		<!-- Tournament Operations & Live Results Hub (Spans 4 cols on lg) -->
		<section class="st-bento lg:tw-col-span-4 z2-panel siem-panel tw-p-6 tw-flex tw-flex-col tw-min-h-[300px] tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-none hover:tw-border-amber-500 tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
			<header class="tw-border-b tw-border-[#334155] tw-pb-3 tw-mb-4 tw-flex tw-items-center tw-justify-between">
				<div>
					<h2 class="tw-font-sans tw-text-[#FAFAFA] tw-uppercase tw-tracking-widest tw-text-sm tw-m-0 tw-flex tw-items-center tw-gap-2">
						<Icon name={"game.trophy" as IconName} size={16} class="tw-text-amber-500" />
						Tournament Operations
					</h2>
					<p class="tw-font-mono tw-text-[#14b8a6] tw-text-[10px] tw-uppercase tw-m-0 tw-mt-1">
						Multi-Venue Scheduling
					</p>
				</div>
				<span class="tw-font-mono tw-text-[10px] tw-text-amber-500 tw-border tw-border-slate-700 tw-bg-slate-900 tw-px-2 tw-py-0.5">
					HUB
				</span>
			</header>

			<div class="tw-flex-1 tw-overflow-auto">
				<table class="tw-w-full tw-text-left tw-font-mono tw-text-xs tw-text-white tw-border-collapse">
					<thead>
						<tr class="tw-border-b tw-border-[#334155] tw-text-slate-400">
							<th class="tw-py-2 tw-px-2 tw-font-bold tw-uppercase tw-text-[10px]">Event ID</th>
							<th class="tw-py-2 tw-px-2 tw-font-bold tw-uppercase tw-text-[10px] tw-text-center">Status</th>
							<th class="tw-py-2 tw-px-2 tw-font-bold tw-uppercase tw-text-[10px] tw-text-right">Teams</th>
						</tr>
					</thead>
					<tbody>
						{#await engine.loadTournamentOperations()}
							<tr>
								<td colspan="3" class="tw-py-8 tw-text-center tw-text-amber-500">
									<div class="tw-flex tw-items-center tw-justify-center tw-gap-2">
										<Icon name={"status.loading" as IconName} size={16} class="tw-animate-spin" />
										INITIALIZING SCHEDULES...
									</div>
								</td>
							</tr>
						{:then operationsData}
							{#each operationsData as item}
								<tr class="tw-border-b tw-border-[#334155] tw-border-opacity-30 tw-bg-[#000000] hover:tw-bg-slate-900 tw-transition-colors">
									<td class="tw-py-2.5 tw-px-2 tw-uppercase tw-font-bold tw-text-white">{item.tournamentId}</td>
									<td class="tw-py-2.5 tw-px-2 tw-text-center">
										{#if item.status === 'live'}
											<span class="tw-px-2 tw-py-0.5 tw-bg-[#14b8a6] tw-text-black tw-font-mono tw-font-bold tw-text-[10px] tw-rounded-none">LIVE</span>
										{:else}
											<span class="tw-px-2 tw-py-0.5 tw-bg-[#1E293B] tw-text-amber-500 tw-font-mono tw-font-bold tw-text-[10px] tw-border tw-border-slate-700 tw-rounded-none">SCHEDULING</span>
										{/if}
									</td>
									<td class="tw-py-2.5 tw-px-2 tw-text-right tw-text-amber-500 tw-font-mono tw-font-bold">{item.teams}</td>
								</tr>
							{/each}
						{/await}
					</tbody>
				</table>
			</div>
		</section>

	</div>
</div>

<style>
	.tenant-matrix-grid {
		border-radius: 0;
	}
</style>
