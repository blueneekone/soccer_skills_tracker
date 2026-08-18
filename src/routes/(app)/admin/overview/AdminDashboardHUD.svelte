<script lang="ts">
	import type AdminDashboardEngine from './AdminDashboardEngine.svelte.ts';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { engine }: { engine: AdminDashboardEngine } = $props();

	// The HUD: Renders the command-plane system status bar and top-rail telemetry metrics.
	// Constraints: Apply strict 90-degree corners. B2B administrative surfaces use
	// Enterprise Nuclear Yellow and Data Cyan accents.
</script>

<header class="command-plane-system-status tw-w-full tw-bg-[#0B0F19] tw-border-b tw-border-[#1E293B] tw-rounded-none">
	<div class="tw-max-w-[1920px] tw-mx-auto tw-px-6 tw-py-4 tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-4">

		<div class="tw-flex tw-items-center tw-gap-4">
			<div class="tw-w-10 tw-h-10 tw-bg-[#1E293B] tw-rounded-none tw-flex tw-items-center tw-justify-center tw-border tw-border-[#334155] tw-text-amber-500">
				<Icon name={"data.radar" as IconName} size={20} />
			</div>
			<div>
				<h1 class="tw-text-sm tw-font-bold tw-font-sans tw-tracking-[0.2em] tw-uppercase tw-text-[#FAFAFA] tw-flex tw-items-center tw-gap-2">
					Nexus Command
					<span class="tw-text-[9px] tw-px-1.5 tw-py-0.5 tw-font-mono tw-border tw-border-amber-500/30 tw-bg-amber-500/10 tw-text-amber-500 tw-rounded-none">ADMIN-OS</span>
				</h1>
				<p class="tw-text-[10px] tw-font-mono tw-text-[#94A3B8] tw-tracking-widest">
					SYSTEM_STATUS: <span class={engine.isReady ? "tw-text-amber-500 tw-font-bold" : "tw-text-amber-400"}>{engine.isReady ? 'ONLINE' : 'INITIALIZING'}</span>
				</p>
			</div>
		</div>

		<nav class="tw-flex tw-gap-2" aria-label="Admin tabs">
			<button
				class="tw-px-4 tw-py-2 tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase tw-rounded-none tw-transition-colors tw-border tw-flex tw-items-center tw-gap-2"
				class:tw-bg-amber-500={engine.activeTab === 'overview'}
				class:tw-text-void-black={engine.activeTab === 'overview'}
				class:tw-border-amber-500={engine.activeTab === 'overview'}
				class:tw-bg-transparent={engine.activeTab !== 'overview'}
				class:tw-text-[#94A3B8]={engine.activeTab !== 'overview'}
				class:tw-border-[#1E293B]={engine.activeTab !== 'overview'}
				class:hover:tw-border-amber-500={engine.activeTab !== 'overview'}
				class:hover:tw-text-amber-500={engine.activeTab !== 'overview'}
				onclick={() => engine.setTab('overview')}
			>
				<Icon name={"content.grid" as IconName} size={14} />
				Overview
			</button>
			<button
				class="tw-px-4 tw-py-2 tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase tw-rounded-none tw-transition-colors tw-border tw-flex tw-items-center tw-gap-2"
				class:tw-bg-amber-500={engine.activeTab === 'security'}
				class:tw-text-void-black={engine.activeTab === 'security'}
				class:tw-border-amber-500={engine.activeTab === 'security'}
				class:tw-bg-transparent={engine.activeTab !== 'security'}
				class:tw-text-[#94A3B8]={engine.activeTab !== 'security'}
				class:tw-border-[#1E293B]={engine.activeTab !== 'security'}
				class:hover:tw-border-amber-500={engine.activeTab !== 'security'}
				class:hover:tw-text-amber-500={engine.activeTab !== 'security'}
				onclick={() => engine.setTab('security')}
			>
				<Icon name={"status.shield-check" as IconName} size={14} />
				Security
			</button>
			<button
				class="tw-px-4 tw-py-2 tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase tw-rounded-none tw-transition-colors tw-border tw-flex tw-items-center tw-gap-2"
				class:tw-bg-amber-500={engine.activeTab === 'platform'}
				class:tw-text-void-black={engine.activeTab === 'platform'}
				class:tw-border-amber-500={engine.activeTab === 'platform'}
				class:tw-bg-transparent={engine.activeTab !== 'platform'}
				class:tw-text-[#94A3B8]={engine.activeTab !== 'platform'}
				class:tw-border-[#1E293B]={engine.activeTab !== 'platform'}
				class:hover:tw-border-amber-500={engine.activeTab !== 'platform'}
				class:hover:tw-text-amber-500={engine.activeTab !== 'platform'}
				onclick={() => engine.setTab('platform')}
			>
				<Icon name={"sys.server" as IconName} size={14} />
				Platform
			</button>
		</nav>
	</div>
</header>
