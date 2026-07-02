<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import AdminConsoleSearch from '$lib/components/admin/AdminConsoleSearch.svelte';
	import type { AdminAuditEngine } from './AdminAuditEngine.svelte.js';

	let { engine }: { engine: AdminAuditEngine } = $props();
</script>

<div class="adm-toolbar al-page__toolbar">
	<div class="adm-toolbar__left">
		<h1 class="adm-toolbar__title adm-toolbar__title--icon">
			<Icon name={"status.shield-check" as IconName} />
			Security Audit Log
		</h1>
		<div class="adm-toolbar__meta">
			<span class="adm-toolbar__sub">Immutable platform-level event history.</span>
			<span class="adm-toolbar__count">
				Showing {engine.filteredLogs.length} of {engine.totalLoaded} loaded events
			</span>
		</div>
	</div>
	<div class="adm-toolbar__right">
		<div class="adm-toolbar__search-flex">
			<AdminConsoleSearch
				bind:value={engine.searchQuery}
				placeholder="Search events…"
				ariaLabel="Search audit log"
			/>
		</div>
		<AdminConsoleSearch
			bind:value={engine.actionFilter}
			compact
			icon="action.filter"
			placeholder="Action…"
			ariaLabel="Filter audit log by action"
			showClear={false}
		/>
		<button
			type="button"
			class="al-toolbar-refresh"
			onclick={() => engine.loadLogs()}
			disabled={engine.loading}
			title={engine.loading ? 'Loading…' : 'Refresh audit log'}
			aria-label="Refresh audit log"
		>
			<Icon name={"nav.refresh" as IconName} class="tw-text-lg {engine.loading ? 'al-refresh-spin' : ''}" />
		</button>
	</div>
</div>
