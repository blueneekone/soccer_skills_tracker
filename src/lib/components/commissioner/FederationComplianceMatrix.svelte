<script lang="ts">
	/**
	 * FederationComplianceMatrix.svelte — Compliance Data Overview
	 * Tracks SafeSport, Background Checks, and COPPA 2.0 per club.
	 * Max 80 lines limit.
	 */

	interface ComplianceEntry {
		clubId: string;
		complianceStatus: 'green' | 'amber' | 'red';
		safeSportRate: number;
	}

	interface Props {
		complianceData: ComplianceEntry[];
		isLoading?: boolean;
	}

	let { complianceData, isLoading = false }: Props = $props();

	function getBadgeClass(status: string) {
		switch(status) {
			case 'green': return 'tw-bg-[#14b8a6] tw-text-black';
			case 'red': return 'tw-bg-[#ef4444] tw-text-white';
			case 'amber':
			default: return 'tw-bg-[#f59e0b] tw-text-black';
		}
	}
</script>

<section class="z2-panel siem-panel tw-flex tw-flex-col tw-h-full tw-rounded-none tw-bg-[#0f172a] tw-border tw-border-[#334155]">
	<header class="tw-border-b tw-border-[#334155] tw-p-4">
		<h2 class="tw-font-geist-sans tw-text-white tw-uppercase tw-tracking-widest tw-text-sm tw-m-0">
			Federation Compliance Matrix
		</h2>
		<p class="tw-font-geist-mono tw-text-[#334155] tw-text-xs tw-uppercase tw-m-0 tw-mt-1">
			Live COPPA 2.0 / SafeSport / AB 506 Registry
		</p>
	</header>

	<div class="tw-flex-1 tw-overflow-y-auto tw-p-4">
		<table class="tw-w-full tw-text-left tw-text-white tw-border-collapse">
			<thead>
				<tr class="tw-border-b tw-border-[#334155] tw-text-[#334155] tw-font-geist-mono tw-text-xs">
					<th class="tw-py-2 tw-px-2 tw-font-normal tw-uppercase">Club ID Node</th>
					<th class="tw-py-2 tw-px-2 tw-font-normal tw-uppercase tw-text-center">VPC/SafeSport Status</th>
					<th class="tw-py-2 tw-px-2 tw-font-normal tw-uppercase tw-text-right">Compliance %</th>
				</tr>
			</thead>
			<tbody class="tw-font-geist-mono tw-text-sm">
				{#if isLoading}
					<tr><td colspan="3" class="tw-py-6 tw-text-center tw-text-[#334155]">SCANNING REGISTRY...</td></tr>
				{:else if complianceData.length === 0}
					<tr><td colspan="3" class="tw-py-6 tw-text-center tw-text-[#334155]">NO DATA FOUND</td></tr>
				{:else}
					{#each complianceData as item (item.clubId)}
						<tr class="tw-border-b tw-border-[#334155] tw-border-opacity-30 hover:tw-bg-[rgba(20,184,166,0.1)] tw-transition-colors">
							<td class="tw-py-3 tw-px-2 tw-uppercase">{item.clubId}</td>
							<td class="tw-py-3 tw-px-2 tw-text-center">
								<span class="tw-px-3 tw-py-1 tw-text-xs tw-font-bold tw-tracking-wider tw-rounded-none {getBadgeClass(item.complianceStatus)}">
									{item.complianceStatus.toUpperCase()}
								</span>
							</td>
							<td class="tw-py-3 tw-px-2 tw-text-right tw-text-[#14b8a6] tw-font-mono">
								{item.safeSportRate}%
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>
