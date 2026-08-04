<script lang="ts">
	import type AdminDashboardEngine from './AdminDashboardEngine.svelte.ts';

	let { engine }: { engine: AdminDashboardEngine } = $props();

	// The HUD: Renders the command-plane system status bar and top-rail telemetry metrics.
	// Constraints: Apply strict 90-degree corners. B2B administrative surfaces are prohibited
	// from using gamification chamfers or Action Gold accents.
</script>

<header class="command-plane-system-status tw-w-full tw-bg-[#0B0F19] tw-border-b tw-border-[#1E293B] tw-rounded-none">
	<div class="tw-max-w-[1920px] tw-mx-auto tw-px-6 tw-py-4 tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-4">

		<div class="tw-flex tw-items-center tw-gap-4">
			<div class="tw-w-10 tw-h-10 tw-bg-[#1E293B] tw-rounded-none tw-flex tw-items-center tw-justify-center tw-border tw-border-[#334155]">
				<svg class="tw-w-5 tw-h-5 tw-text-[#FAFAFA]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
				</svg>
			</div>
			<div>
				<h1 class="tw-text-sm tw-font-bold tw-font-sans tw-tracking-[0.2em] tw-uppercase tw-text-[#FAFAFA]">Nexus Command</h1>
				<p class="tw-text-[10px] tw-font-mono tw-text-[#94A3B8] tw-tracking-widest">SYSTEM_STATUS: {engine.isReady ? 'ONLINE' : 'INITIALIZING'}</p>
			</div>
		</div>

		<nav class="tw-flex tw-gap-2">
			<button
				class="tw-px-4 tw-py-2 tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase tw-rounded-none tw-transition-colors tw-border"
				class:tw-bg-[#FAFAFA]={engine.activeTab === 'overview'}
				class:tw-text-[#020617]={engine.activeTab === 'overview'}
				class:tw-border-[#FAFAFA]={engine.activeTab === 'overview'}
				class:tw-bg-transparent={engine.activeTab !== 'overview'}
				class:tw-text-[#94A3B8]={engine.activeTab !== 'overview'}
				class:tw-border-[#1E293B]={engine.activeTab !== 'overview'}
				class:hover:tw-border-[#334155]={engine.activeTab !== 'overview'}
				onclick={() => engine.setTab('overview')}
			>
				Overview
			</button>
			<button
				class="tw-px-4 tw-py-2 tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase tw-rounded-none tw-transition-colors tw-border"
				class:tw-bg-[#FAFAFA]={engine.activeTab === 'security'}
				class:tw-text-[#020617]={engine.activeTab === 'security'}
				class:tw-border-[#FAFAFA]={engine.activeTab === 'security'}
				class:tw-bg-transparent={engine.activeTab !== 'security'}
				class:tw-text-[#94A3B8]={engine.activeTab !== 'security'}
				class:tw-border-[#1E293B]={engine.activeTab !== 'security'}
				class:hover:tw-border-[#334155]={engine.activeTab !== 'security'}
				onclick={() => engine.setTab('security')}
			>
				Security
			</button>
			<button
				class="tw-px-4 tw-py-2 tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase tw-rounded-none tw-transition-colors tw-border"
				class:tw-bg-[#FAFAFA]={engine.activeTab === 'platform'}
				class:tw-text-[#020617]={engine.activeTab === 'platform'}
				class:tw-border-[#FAFAFA]={engine.activeTab === 'platform'}
				class:tw-bg-transparent={engine.activeTab !== 'platform'}
				class:tw-text-[#94A3B8]={engine.activeTab !== 'platform'}
				class:tw-border-[#1E293B]={engine.activeTab !== 'platform'}
				class:hover:tw-border-[#334155]={engine.activeTab !== 'platform'}
				onclick={() => engine.setTab('platform')}
			>
				Platform
			</button>
		</nav>
	</div>
</header>
