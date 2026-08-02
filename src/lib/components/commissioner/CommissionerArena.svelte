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

<div class="tenant-matrix-grid w-full h-full p-4 overflow-y-auto">
	<div
		class="grid gap-4"
		style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));"
	>

		<!-- Federation Compliance Matrix -->
		<section class="bg-[#0f172a] border border-[#334155] rounded-none p-4 flex flex-col min-h-[300px]">
			<header class="border-b border-[#334155] pb-2 mb-4">
				<h2 class="font-geist-sans text-white uppercase tracking-widest text-sm m-0">
					Federation Compliance Matrix
				</h2>
				<p class="font-geist-mono text-[#334155] text-xs uppercase m-0 mt-1">
					Live COPPA/SafeSport Status
				</p>
			</header>

			<div class="flex-1 overflow-auto">
				<table class="w-full text-left font-geist-mono text-xs text-white border-collapse">
					<thead>
						<tr class="border-b border-[#334155] text-[#334155]">
							<th class="py-2 px-1 font-normal uppercase">Club ID</th>
							<th class="py-2 px-1 font-normal uppercase">Status</th>
							<th class="py-2 px-1 font-normal uppercase text-right">SafeSport</th>
						</tr>
					</thead>
					<tbody>
						{#await engine.loadFederationCompliance()}
							<tr>
								<td colspan="3" class="py-4 text-center text-[#334155]">SCANNING REGISTRY...</td>
							</tr>
						{:then complianceData}
							{#each complianceData as item}
								<tr class="border-b border-[#334155] border-opacity-30">
									<td class="py-2 px-1 uppercase">{item.clubId}</td>
									<td class="py-2 px-1">
										<span class="px-2 py-0.5 rounded-none {item.complianceStatus === 'green' ? 'bg-[#14b8a6] text-black' : 'bg-[#fbbf24] text-black'}">
											{item.complianceStatus.toUpperCase()}
										</span>
									</td>
									<td class="py-2 px-1 text-right text-[#14b8a6]">{item.safeSportRate}%</td>
								</tr>
							{/each}
						{/await}
					</tbody>
				</table>
			</div>
		</section>

		<!-- Tournament Operations & Live Results Hub -->
		<section class="bg-[#0f172a] border border-[#334155] rounded-none p-4 flex flex-col min-h-[300px]">
			<header class="border-b border-[#334155] pb-2 mb-4">
				<h2 class="font-geist-sans text-white uppercase tracking-widest text-sm m-0">
					Tournament Operations
				</h2>
				<p class="font-geist-mono text-[#334155] text-xs uppercase m-0 mt-1">
					Live Multi-Venue Scheduling
				</p>
			</header>

			<div class="flex-1 overflow-auto">
				<table class="w-full text-left font-geist-mono text-xs text-white border-collapse">
					<thead>
						<tr class="border-b border-[#334155] text-[#334155]">
							<th class="py-2 px-1 font-normal uppercase">Event ID</th>
							<th class="py-2 px-1 font-normal uppercase text-center">Status</th>
							<th class="py-2 px-1 font-normal uppercase text-right">Teams</th>
						</tr>
					</thead>
					<tbody>
						{#await engine.loadTournamentOperations()}
							<tr>
								<td colspan="3" class="py-4 text-center text-[#334155]">INITIALIZING SCHEDULES...</td>
							</tr>
						{:then operationsData}
							{#each operationsData as item}
								<tr class="border-b border-[#334155] border-opacity-30">
									<td class="py-2 px-1 uppercase">{item.tournamentId}</td>
									<td class="py-2 px-1 text-center">
										{#if item.status === 'live'}
											<span class="text-[#14b8a6]">LIVE</span>
										{:else}
											<span class="text-[#334155]">SCHEDULING</span>
										{/if}
									</td>
									<td class="py-2 px-1 text-right">{item.teams}</td>
								</tr>
							{/each}
						{/await}
					</tbody>
				</table>
			</div>
		</section>

	</div>
</div>
