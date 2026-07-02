<script lang="ts">
	import type { RecruitersEngine } from './RecruitersEngine.svelte.js';
	import AdminConsoleSearch from '$lib/components/admin/AdminConsoleSearch.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
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
		<div class="ar-tabs" role="tablist" aria-label="Verification filter">
			<button
				type="button"
				role="tab"
				aria-selected={engine.statusFilter === ''}
				class="ar-tab"
				class:ar-tab--on={engine.statusFilter === ''}
				onclick={() => (engine.statusFilter = '')}
			>
				All <span class="ar-tab__n ar-tab__n--total">{engine.counts.total}</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={engine.statusFilter === 'pending'}
				class="ar-tab"
				class:ar-tab--on={engine.statusFilter === 'pending'}
				onclick={() => (engine.statusFilter = 'pending')}
			>
				Pending <span class="ar-tab__n ar-tab__n--pending text-amber-500">{engine.counts.pending}</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={engine.statusFilter === 'verified'}
				class="ar-tab"
				class:ar-tab--on={engine.statusFilter === 'verified'}
				onclick={() => (engine.statusFilter = 'verified')}
			>
				Verified <span class="ar-tab__n ar-tab__n--verified text-emerald-500">{engine.counts.verified}</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={engine.statusFilter === 'rejected'}
				class="ar-tab"
				class:ar-tab--on={engine.statusFilter === 'rejected'}
				onclick={() => (engine.statusFilter = 'rejected')}
			>
				Rejected <span class="ar-tab__n ar-tab__n--rejected text-rose-500">{engine.counts.rejected}</span>
			</button>
		</div>
	</div>
</div>

{#if engine.flashErr}
	<p class="ar-flash ar-flash--err" role="alert">{engine.flashErr}</p>
{/if}
{#if engine.flashOk}
	<p class="ar-flash ar-flash--ok" role="status">{engine.flashOk}</p>
{/if}
{#if engine.err}
	<p class="ar-flash ar-flash--err" role="alert">{engine.err}</p>
{/if}
