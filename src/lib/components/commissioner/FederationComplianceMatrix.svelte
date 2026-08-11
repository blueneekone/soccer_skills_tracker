<script lang="ts">
	// Commissioner Federation Compliance Matrix component
	// High-density visual matrix for SafeSport, Background Checks, COPPA 2.0.

	type ClubCompliance = {
		id: string;
		name: string;
		safesport: 'green' | 'amber' | 'red';
		background: 'green' | 'amber' | 'red';
		coppa: 'green' | 'amber' | 'red';
		lastUpdated: string;
	};

	let { clubs = [] as ClubCompliance[] } = $props();

	function getStatusColor(status: 'green' | 'amber' | 'red') {
		switch (status) {
			case 'green': return '#14b8a6'; // Data Cyan
			case 'amber': return '#fbbf24'; // Action Gold
			case 'red': return '#ef4444'; // Red
			default: return '#334155'; // Structural Grey
		}
	}
</script>

<div class="federation-compliance-matrix tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-none tw-p-4 tw-flex tw-flex-col tw-gap-4">
	<div class="tw-flex tw-items-center tw-justify-between">
		<h3 class="tw-text-[#fafafa] tw-font-sans tw-text-lg tw-font-bold">Federation Compliance Matrix</h3>
		<span class="tw-font-mono tw-text-sm tw-text-[#14b8a6]">
			Total Clubs: {clubs.length}
		</span>
	</div>

	<div class="tw-overflow-x-auto">
		<table class="tw-w-full tw-text-left tw-border-collapse">
			<thead>
				<tr class="tw-border-b tw-border-[#334155]">
					<th class="tw-p-2 tw-text-[#fafafa] tw-font-sans">Club Name</th>
					<th class="tw-p-2 tw-text-[#fafafa] tw-font-sans">SafeSport</th>
					<th class="tw-p-2 tw-text-[#fafafa] tw-font-sans">Background</th>
					<th class="tw-p-2 tw-text-[#fafafa] tw-font-sans">COPPA 2.0</th>
					<th class="tw-p-2 tw-text-[#fafafa] tw-font-sans">Last Updated</th>
				</tr>
			</thead>
			<tbody>
				{#each clubs as club}
					<tr class="tw-border-b tw-border-[#334155] tw-bg-[#000000]">
						<td class="tw-p-2 tw-text-[#fafafa] tw-font-sans">{club.name}</td>
						<td class="tw-p-2">
							<div class="tw-w-4 tw-h-4 tw-rounded-full" style="background-color: {getStatusColor(club.safesport)};" title={club.safesport}></div>
						</td>
						<td class="tw-p-2">
							<div class="tw-w-4 tw-h-4 tw-rounded-full" style="background-color: {getStatusColor(club.background)};" title={club.background}></div>
						</td>
						<td class="tw-p-2">
							<div class="tw-w-4 tw-h-4 tw-rounded-full" style="background-color: {getStatusColor(club.coppa)};" title={club.coppa}></div>
						</td>
						<td class="tw-p-2 tw-text-[#14b8a6] tw-font-mono tw-text-sm">
							{club.lastUpdated}
						</td>
					</tr>
				{/each}
				{#if clubs.length === 0}
					<tr>
						<td colspan="5" class="tw-p-4 tw-text-center tw-text-[#334155] tw-font-mono">
							No data available
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>

<style>
	.federation-compliance-matrix {
		min-width: 100%;
	}
</style>
