<script lang="ts">
	/**
	 * CommissionerArena.svelte — The Glass
	 * High-Density Data UI. Tournament Operations matrix and Federation Compliance matrix.
	 * 12-column asymmetric Bento Grid using fluid anti-squish math.
	 * Strict 90-degree corners, Geist Mono typography, zero gamification.
	 */
	import { CommissionerEngine } from './CommissionerEngine.svelte';

	let engine = new CommissionerEngine();
</script>

<div data-panel="compliance-matrix" class="tenant-matrix-grid federation-matrix-grid tw-w-full tw-h-full tw-p-6 tw-overflow-y-auto">
	<div class="bento-grid-container">

		<!-- Federation Compliance Matrix -->
		<section class="z2-panel siem-panel tw-p-4 tw-flex tw-flex-col tw-min-h-[300px]">
			<header class="tw-border-b tw-border-[#334155] tw-pb-2 tw-mb-4">
				<h2 class="tw-font-geist-sans tw-text-white tw-uppercase tw-tracking-widest tw-text-sm tw-m-0">
					Federation Compliance Matrix
				</h2>
				<p class="tw-font-geist-mono tw-text-[#334155] tw-text-xs tw-uppercase tw-m-0 tw-mt-1">
					Live COPPA/SafeSport Status
				</p>
			</header>

			<div class="tw-flex-1 tw-overflow-auto">
				<table class="tw-w-full tw-text-left tw-font-geist-mono tw-text-xs tw-text-white tw-border-collapse">
					<thead>
						<tr class="tw-border-b tw-border-[#334155] tw-text-[#334155]">
							<th class="tw-py-2 tw-px-1 tw-font-normal tw-uppercase">Club ID</th>
							<th class="tw-py-2 tw-px-1 tw-font-normal tw-uppercase">Status</th>
							<th class="tw-py-2 tw-px-1 tw-font-normal tw-uppercase tw-text-right">SafeSport</th>
						</tr>
					</thead>
					<tbody>
						{#await engine.loadFederationCompliance()}
							<tr>
								<td colspan="3" class="tw-py-4 tw-text-center tw-text-[#334155]">SCANNING REGISTRY...</td>
							</tr>
						{:then complianceData}
							{#each complianceData as item}
								<tr class="tw-border-b tw-border-[#334155] tw-border-opacity-30">
									<td class="tw-py-2 tw-px-1 tw-uppercase">{item.clubId}</td>
									<td class="tw-py-2 tw-px-1">
										<span class="tw-px-2 tw-py-0.5 tw-rounded-none status-dot-indicator {item.complianceStatus === 'green' ? 'tw-bg-[#14b8a6] tw-text-black' : 'tw-bg-[#334155] tw-text-black'}">
											{item.complianceStatus.toUpperCase()}
										</span>
									</td>
									<td class="tw-py-2 tw-px-1 tw-text-right tw-text-[#14b8a6] tw-font-mono odp-analytics-val">{item.safeSportRate}%</td>
								</tr>
							{/each}
						{/await}
					</tbody>
				</table>
			</div>
		</section>

		<!-- Tournament Operations & Live Results Hub -->
		<section class="z2-panel siem-panel tw-p-4 tw-flex tw-flex-col tw-min-h-[300px]">
			<header class="tw-border-b tw-border-[#334155] tw-pb-2 tw-mb-4">
				<h2 class="tw-font-geist-sans tw-text-white tw-uppercase tw-tracking-widest tw-text-sm tw-m-0">
					Tournament Operations
				</h2>
				<p class="tw-font-geist-mono tw-text-[#334155] tw-text-xs tw-uppercase tw-m-0 tw-mt-1">
					Live Multi-Venue Scheduling
				</p>
			</header>

			<div class="tw-flex-1 tw-overflow-auto">
				<table class="tw-w-full tw-text-left tw-font-geist-mono tw-text-xs tw-text-white tw-border-collapse">
					<thead>
						<tr class="tw-border-b tw-border-[#334155] tw-text-[#334155]">
							<th class="tw-py-2 tw-px-1 tw-font-normal tw-uppercase">Event ID</th>
							<th class="tw-py-2 tw-px-1 tw-font-normal tw-uppercase tw-text-center">Status</th>
							<th class="tw-py-2 tw-px-1 tw-font-normal tw-uppercase tw-text-right">Teams</th>
						</tr>
					</thead>
					<tbody>
						{#await engine.loadTournamentOperations()}
							<tr>
								<td colspan="3" class="tw-py-4 tw-text-center tw-text-[#334155]">INITIALIZING SCHEDULES...</td>
							</tr>
						{:then operationsData}
							{#each operationsData as item}
								<tr class="tw-border-b tw-border-[#334155] tw-border-opacity-30">
									<td class="tw-py-2 tw-px-1 tw-uppercase">{item.tournamentId}</td>
									<td class="tw-py-2 tw-px-1 tw-text-center">
										{#if item.status === 'live'}
											<span class="tw-text-[#14b8a6]">LIVE</span>
										{:else}
											<span class="tw-text-[#334155]">SCHEDULING</span>
										{/if}
									</td>
									<td class="tw-py-2 tw-px-1 tw-text-right">{item.teams}</td>
								</tr>
							{/each}
						{/await}
					</tbody>
				</table>
			</div>
		</section>

	</div>
</div>
