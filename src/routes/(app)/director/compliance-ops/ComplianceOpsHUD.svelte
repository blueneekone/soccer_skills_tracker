<script lang="ts">
	import { COMPLIANCE_OPS_TABS, type ComplianceOpsEngine } from './ComplianceOpsEngine.svelte.js';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let { engine }: { engine: ComplianceOpsEngine } = $props();
</script>

<header class="tw-w-full tw-bg-[#0B0F19] tw-border-b tw-border-[#1E293B] tw-rounded-none">
	<div class="tw-max-w-[1920px] tw-mx-auto tw-px-6 tw-py-4 tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-4">
		<div class="tw-flex tw-items-center tw-gap-4">
			{#if engine.clubId}
				<ClubLogoMark size="md" />
			{/if}
			<div>
				<h1 class="tw-text-sm tw-font-bold tw-font-sans tw-tracking-[0.2em] tw-uppercase tw-text-[#FAFAFA] tw-flex tw-items-center tw-gap-2 tw-m-0">
					Compliance & Ops
					<span class="tw-text-[9px] tw-px-1.5 tw-py-0.5 tw-font-mono tw-border tw-border-teal-400/30 tw-bg-teal-400/10 tw-text-teal-400 tw-rounded-none">DIR-OS</span>
				</h1>
				<p class="tw-text-[10px] tw-font-mono tw-text-[#94A3B8] tw-tracking-widest tw-m-0 tw-mt-0.5">
					TENANT: <span class="tw-text-teal-400 tw-font-bold">{engine.clubLabel}</span>
				</p>
			</div>
		</div>

		<nav class="tw-flex tw-gap-2 tw-overflow-x-auto tw-pb-1 sm:tw-pb-0" aria-label="Compliance sub-views">
			{#each COMPLIANCE_OPS_TABS as tab (tab.id)}
				<button
					type="button"
					class="tw-px-3 tw-py-2 tw-text-[11px] sm:tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase tw-rounded-none tw-transition-colors tw-border tw-flex tw-items-center tw-gap-2 tw-whitespace-nowrap {engine.activeTab === tab.id ? 'tw-bg-teal-400 tw-text-[#020617] tw-border-teal-400' : 'tw-bg-transparent tw-text-[#94A3B8] tw-border-[#1E293B] hover:tw-border-teal-400 hover:tw-text-teal-400'}"
					onclick={() => engine.setActiveTab(tab.id)}
				>
					<Icon name={tab.icon} size={14} />
					{tab.label}
				</button>
			{/each}
		</nav>
	</div>
</header>
