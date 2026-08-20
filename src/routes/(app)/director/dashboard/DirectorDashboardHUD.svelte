<script lang="ts">
	import type { DirectorDashboardEngine } from './DirectorDashboardEngine.svelte.js';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { engine }: { engine: DirectorDashboardEngine } = $props();

	const TABS = [
		{ label: 'Home',     icon: 'nav.home' as IconName,            tab: 'home' },
		{ label: 'Roster',   icon: 'user.group' as IconName,          tab: 'teams' },
		{ label: 'Field',    icon: 'sys.map-pin' as IconName,         tab: 'field' },
		{ label: 'Comply',   icon: 'status.shield-check' as IconName, tab: 'compliance' },
		{ label: 'Families', icon: 'nav.home' as IconName,            tab: 'household' },
		{ label: 'Sync',     icon: 'ph-arrows-left-right' as IconName, tab: 'sync' },
	];
</script>

<header class="command-plane-system-status tw-w-full tw-bg-[#0B0F19] tw-border-b tw-border-[#1E293B] tw-rounded-none">
	<div class="tw-max-w-[1920px] tw-mx-auto tw-px-6 tw-py-4 tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-4">

		<div class="tw-flex tw-items-center tw-gap-4">
			{#if engine.clubId}
				<ClubLogoMark size="md" />
			{/if}
			<div>
				<h1 class="tw-text-sm tw-font-bold tw-font-sans tw-tracking-[0.2em] tw-uppercase tw-text-[#FAFAFA] tw-flex tw-items-center tw-gap-2">
					Director Portal
					<span class="tw-text-[9px] tw-px-1.5 tw-py-0.5 tw-font-mono tw-border tw-border-teal-400/30 tw-bg-teal-400/10 tw-text-teal-400 tw-rounded-none">DIR-OS</span>
				</h1>
				<p class="tw-text-[10px] tw-font-mono tw-text-[#94A3B8] tw-tracking-widest">
					TENANT: <span class="tw-text-teal-400 tw-font-bold">{engine.clubLabel || 'UNRESOLVED'}</span>
				</p>
			</div>
		</div>

		<nav class="tw-flex tw-gap-2 tw-overflow-x-auto tw-pb-1 sm:tw-pb-0 hide-scrollbar" aria-label="Director sections">
			{#each TABS as item (item.tab)}
				<a
					href="/director/dashboard?tab={item.tab}"
					class="tw-px-3 tw-py-2 tw-text-[11px] sm:tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase tw-rounded-none tw-transition-colors tw-border tw-flex tw-items-center tw-gap-2 tw-whitespace-nowrap"
					class:tw-bg-teal-400={engine.activeTab === item.tab}
					class:tw-text-void-black={engine.activeTab === item.tab}
					class:tw-border-teal-400={engine.activeTab === item.tab}
					class:tw-bg-transparent={engine.activeTab !== item.tab}
					class:tw-text-[#94A3B8]={engine.activeTab !== item.tab}
					class:tw-border-[#1E293B]={engine.activeTab !== item.tab}
					class:hover:tw-border-teal-400={engine.activeTab !== item.tab}
					class:hover:tw-text-teal-400={engine.activeTab !== item.tab}
				>
					<Icon name={item.icon} size={14} />
					{item.label}
				</a>
			{/each}
		</nav>
	</div>
</header>

<style>
	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.hide-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
