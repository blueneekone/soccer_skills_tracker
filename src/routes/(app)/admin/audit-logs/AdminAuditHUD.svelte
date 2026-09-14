<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import AdminConsoleSearch from '$lib/components/admin/AdminConsoleSearch.svelte';
	import type { AdminAuditEngine } from './AdminAuditEngine.svelte.js';

	let { engine }: { engine: AdminAuditEngine } = $props();
</script>

<div class="tw-flex tw-flex-col tw-gap-4 tw-mb-4 tw-w-full">
	<!-- Top Row: Title and Metrics -->
	<div class="tw-flex tw-justify-between tw-items-end tw-border-b tw-border-[#334155] tw-pb-4">
		<div>
			<h1 class="tw-text-2xl tw-font-bold tw-text-[#FAFAFA] tw-m-0 tw-leading-none tw-flex tw-items-center tw-gap-2">
				<Icon name={"status.shield-check" as IconName} />
				Security Audit Log
			</h1>
			<div class="tw-text-[#94A3B8] tw-text-sm tw-font-mono tw-mt-2">
				Immutable platform-level event history.
			</div>
		</div>
		<div class="tw-text-right">
			<div class="tw-text-[#14b8a6] tw-text-xl tw-font-bold tw-font-mono tw-leading-none">
				{engine.filteredLogs.length}
			</div>
			<div class="tw-text-[10px] tw-text-[#94A3B8] tw-font-mono tw-uppercase tw-tracking-widest tw-mt-1">
				OF {engine.totalLoaded} EVENTS
			</div>
		</div>
	</div>

	<!-- Bottom Row: Unified SIEM Action Bar -->
	<div class="v-admin-toolbar tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
		<div class="tw-flex-1 tw-min-w-[320px]">
			<AdminConsoleSearch
				bind:value={engine.searchQuery}
				placeholder="Search events…"
				ariaLabel="Search audit log"
			/>
		</div>

		<div class="tw-flex tw-items-center tw-gap-3">
			<div class="tw-w-48">
				<AdminConsoleSearch
					bind:value={engine.actionFilter}
					icon="action.filter"
					placeholder="Action…"
					ariaLabel="Filter audit log by action"
					showClear={false}
				/>
			</div>
			
			<button
				type="button"
				class="v-toolbar-btn tw-px-3"
				onclick={() => engine.loadLogs()}
				disabled={engine.loading}
				title={engine.loading ? 'Loading…' : 'Refresh audit log'}
				aria-label="Refresh audit log"
			>
				<Icon name={"nav.refresh" as IconName} class="tw-text-lg {engine.loading ? 'tw-animate-spin' : ''}" />
			</button>
		</div>
	</div>
</div>
