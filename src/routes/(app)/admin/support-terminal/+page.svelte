<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { SupportConsoleEngine } from './SupportConsoleEngine.svelte.js';
	import SupportConsoleHUD from './SupportConsoleHUD.svelte';
	import SupportConsoleArena from './SupportConsoleArena.svelte';
	import '$lib/styles/admin-support-console.css';

	const engine = new SupportConsoleEngine();
</script>

<svelte:head>
	<title>Support Terminal · NEXUS COMMAND</title>
</svelte:head>

<div
	class="tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-flex-1 tw-gap-6 tw-bg-[#0B0F19] tw-text-[#FAFAFA] tw-p-6 lg:tw-p-8 tw-box-border tw-overflow-y-auto"
	data-admin-shell="true"
>
	<!-- Header -->
	<header class="tw-flex tw-justify-between tw-items-end tw-border-b tw-border-[#334155] tw-pb-4">
		<div>
			<h1 class="tw-text-xl lg:tw-text-2xl tw-font-extrabold tw-text-[#FAFAFA] tw-m-0 tw-leading-none">Support Terminal</h1>
			<div class="tw-text-[#94A3B8] tw-text-xs tw-font-mono tw-mt-2">Direct Admin SDK execution bridge for global support agents</div>
		</div>
		<div class="tw-text-right">
			<span class="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-xs tw-font-mono tw-font-bold tw-text-emerald-400 tw-uppercase tw-tracking-wider tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-px-3 tw-py-1.5">
				<span class="tw-inline-block tw-w-2 tw-h-2 tw-rounded-full tw-bg-emerald-400 tw-animate-pulse"></span>
				ONLINE
			</span>
		</div>
	</header>

	{#if authStore.isLoading}
		<p class="tw-font-mono tw-text-[#A1A1AA] tw-text-xs">Authenticating connection...</p>
	{:else if !['global_admin', 'super_admin', 'admin'].includes(authStore.role ?? '')}
		<div class="tw-p-6 tw-bg-rose-500/10 tw-border tw-border-rose-500/30">
			<h3 class="tw-font-mono tw-text-sm tw-font-bold tw-text-rose-300 tw-tracking-wide tw-m-0 tw-mb-2">ACCESS DENIED</h3>
			<p class="tw-text-[#D4D4D8] tw-text-xs tw-font-mono tw-m-0">Your current clearance level ({authStore.role || 'none'}) is insufficient for the Support Terminal.</p>
		</div>
	{:else}
		<SupportConsoleHUD {engine} />
		<SupportConsoleArena {engine} />
	{/if}
</div>
