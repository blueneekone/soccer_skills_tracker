<script lang="ts">
	import type { RecruitersEngine } from './RecruitersEngine.svelte.js';
	import AdminConsoleSearch from '$lib/components/admin/AdminConsoleSearch.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { engine }: { engine: RecruitersEngine } = $props();
</script>

<div class="adm-toolbar">
	<div class="adm-toolbar__left">
		<h1 class="adm-toolbar__title">Recruiter Marketplace</h1>
		<div class="adm-toolbar__meta">
			<span class="adm-toolbar__sub">
				Super-admin oversight for NCAA, Pro and Club scouts. Approve, reject, and monitor
				subscription health. Every action is written to <code>security_audit</code>.
			</span>
			<span class="adm-toolbar__count">
				{engine.filteredRows.length} of {engine.rows.length} scouts
			</span>
		</div>
	</div>
	<div class="adm-toolbar__right">
		<AdminConsoleSearch
			bind:value={engine.searchInput}
			narrow
			placeholder="Search by email, scout name, or agency"
			ariaLabel="Filter recruiters"
		/>
		<button
			type="button"
			class="ar-toolbar-refresh"
			onclick={() => void engine.loadRecruiters()}
			disabled={engine.loading}
			title={engine.loading ? 'Syncing…' : 'Refresh'}
			aria-label="Refresh recruiter list from Firestore"
		>
			<Icon name={"nav.refresh" as IconName} class="tw-text-lg {engine.loading ? 'ar-toolbar-sync__spin' : ''}" />
		</button>
		<Tabs
			tabs={[
				{ id: '', label: `All (${engine.counts.total})` },
				{ id: 'pending', label: `Pending (${engine.counts.pending})` },
				{ id: 'verified', label: `Verified (${engine.counts.verified})` },
				{ id: 'rejected', label: `Rejected (${engine.counts.rejected})` }
			]}
			activeTab={engine.statusFilter}
			onTabChange={(id) => (engine.statusFilter = id as 'pending' | 'verified' | 'rejected' | '')}
		/>
	</div>
</div>

{#if engine.flashErr}
	<p class="v-flash v-flash--err" role="alert">{engine.flashErr}</p>
{/if}
{#if engine.flashOk}
	<p class="v-flash v-flash--ok" role="status">{engine.flashOk}</p>
{/if}
{#if engine.err}
	<p class="v-flash v-flash--err" role="alert">{engine.err}</p>
{/if}
