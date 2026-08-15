<script lang="ts">
	// Commissioner Federation Compliance Matrix component
	// High-density visual matrix for SafeSport, Background Checks, COPPA 2.0.
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	type ClubCompliance = {
		id: string;
		name: string;
		safesport: 'green' | 'amber' | 'red';
		background: 'green' | 'amber' | 'red';
		coppa: 'green' | 'amber' | 'red';
		lastUpdated: string;
	};

	let { clubs = [] as ClubCompliance[] } = $props();
</script>

<div class="st-bento z2-panel siem-panel federation-compliance-matrix tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-none tw-p-6 tw-flex tw-flex-col tw-gap-4 hover:tw-border-amber-500 tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
	<div class="tw-flex tw-items-center tw-justify-between">
		<div>
			<h3 class="tw-text-[#FAFAFA] tw-font-sans tw-text-sm tw-font-bold tw-uppercase tw-tracking-wider tw-flex tw-items-center tw-gap-2 tw-m-0">
				<Icon name={"status.shield-check" as IconName} size={18} class="tw-text-amber-500" />
				Federation Compliance Matrix
			</h3>
			<p class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6] tw-uppercase tw-m-0 tw-mt-1">
				Real-Time SafeSport · Background Screening · COPPA 2.0 Telemetry
			</p>
		</div>
		<span class="tw-font-mono tw-text-xs tw-text-amber-500 tw-border tw-border-slate-700 tw-bg-slate-900 tw-px-2.5 tw-py-1 tw-rounded-none">
			TOTAL CLUBS: {clubs.length}
		</span>
	</div>

	<div class="tw-overflow-x-auto">
		<table class="tw-w-full tw-text-left tw-border-collapse">
			<thead>
				<tr class="tw-border-b tw-border-[#334155]">
					<th class="tw-p-2 tw-text-slate-400 tw-font-sans tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest">Club Name</th>
					<th class="tw-p-2 tw-text-slate-400 tw-font-sans tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest">SafeSport</th>
					<th class="tw-p-2 tw-text-slate-400 tw-font-sans tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest">Background</th>
					<th class="tw-p-2 tw-text-slate-400 tw-font-sans tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest">COPPA 2.0</th>
					<th class="tw-p-2 tw-text-slate-400 tw-font-sans tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest">Last Updated</th>
					<th class="tw-p-2 tw-text-slate-400 tw-font-sans tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-right">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each clubs as club}
					<tr class="tw-border-b tw-border-[#334155] tw-bg-[#000000] hover:tw-bg-slate-900 tw-transition-colors">
						<td class="tw-p-3 tw-text-[#FAFAFA] tw-font-sans tw-font-bold tw-text-xs">{club.name}</td>
						<td class="tw-p-3">
							{#if club.safesport === 'green'}
								<span class="tw-inline-flex tw-items-center tw-gap-1 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-mono tw-font-bold tw-bg-[#14b8a6] tw-text-black tw-rounded-none">
									<Icon name={"status.check" as IconName} size={10} /> PASS
								</span>
							{:else if club.safesport === 'amber'}
								<span class="tw-inline-flex tw-items-center tw-gap-1 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-mono tw-font-bold tw-bg-amber-500 tw-text-black tw-rounded-none">
									<Icon name={"status.warning" as IconName} size={10} /> AUDIT
								</span>
							{:else}
								<span class="tw-inline-flex tw-items-center tw-gap-1 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-mono tw-font-bold tw-bg-red-500 tw-text-white tw-rounded-none">
									<Icon name={"status.error" as IconName} size={10} /> ALERT
								</span>
							{/if}
						</td>
						<td class="tw-p-3">
							{#if club.background === 'green'}
								<span class="tw-inline-flex tw-items-center tw-gap-1 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-mono tw-font-bold tw-bg-[#14b8a6] tw-text-black tw-rounded-none">
									<Icon name={"status.check" as IconName} size={10} /> PASS
								</span>
							{:else if club.background === 'amber'}
								<span class="tw-inline-flex tw-items-center tw-gap-1 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-mono tw-font-bold tw-bg-amber-500 tw-text-black tw-rounded-none">
									<Icon name={"status.warning" as IconName} size={10} /> AUDIT
								</span>
							{:else}
								<span class="tw-inline-flex tw-items-center tw-gap-1 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-mono tw-font-bold tw-bg-red-500 tw-text-white tw-rounded-none">
									<Icon name={"status.error" as IconName} size={10} /> ALERT
								</span>
							{/if}
						</td>
						<td class="tw-p-3">
							{#if club.coppa === 'green'}
								<span class="tw-inline-flex tw-items-center tw-gap-1 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-mono tw-font-bold tw-bg-[#14b8a6] tw-text-black tw-rounded-none">
									<Icon name={"status.check" as IconName} size={10} /> PASS
								</span>
							{:else if club.coppa === 'amber'}
								<span class="tw-inline-flex tw-items-center tw-gap-1 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-mono tw-font-bold tw-bg-amber-500 tw-text-black tw-rounded-none">
									<Icon name={"status.warning" as IconName} size={10} /> AUDIT
								</span>
							{:else}
								<span class="tw-inline-flex tw-items-center tw-gap-1 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-mono tw-font-bold tw-bg-red-500 tw-text-white tw-rounded-none">
									<Icon name={"status.error" as IconName} size={10} /> ALERT
								</span>
							{/if}
						</td>
						<td class="tw-p-3 tw-text-[#14b8a6] tw-font-mono tw-text-xs">
							{club.lastUpdated}
						</td>
						<td class="tw-p-3 tw-text-right">
							<button
								type="button"
								class="tw-px-2.5 tw-py-1 tw-text-[10px] tw-font-mono tw-font-bold tw-tracking-wider tw-uppercase tw-bg-[#1E293B] tw-border tw-border-slate-700 tw-text-slate-300 hover:tw-border-amber-500 hover:tw-text-amber-500 tw-transition-colors tw-inline-flex tw-items-center tw-gap-1 cursor-pointer tw-rounded-none"
							>
								<Icon name={"sys.eye" as IconName} size={12} />
								Inspect
							</button>
						</td>
					</tr>
				{/each}
				{#if clubs.length === 0}
					<tr>
						<td colspan="6" class="tw-p-8 tw-text-center tw-text-slate-400 tw-font-mono tw-text-xs">
							NO FEDERATION CLUBS DISCOVERED IN TENANT REGISTRY
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
		border-radius: 0;
	}
</style>
