<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { SupportConsoleEngine } from './SupportConsoleEngine.svelte.js';
	import SupportConsoleHUD from './SupportConsoleHUD.svelte';
	import SupportConsoleArena from './SupportConsoleArena.svelte';
	import '$lib/styles/admin-support-console.css';

	const engine = new SupportConsoleEngine();
</script>

<svelte:head>
	<title>Support Terminal | Admin OS</title>
</svelte:head>

<div class="tw-flex tw-flex-col tw-w-full tw-min-h-0 tw-gap-[clamp(12px,1.5vw,20px)]">
	<!-- Header -->
	<header class="tw-flex tw-items-center tw-justify-between tw-flex-wrap tw-gap-[clamp(8px,1vw,16px)]">
		<div>
			<h1 class="tw-font-mono tw-text-lg tw-font-extrabold tw-tracking-[0.1em] tw-text-[#FAFAFA] tw-uppercase tw-m-0">
				VANGUARD SUPPORT TERMINAL
			</h1>
			<p class="tw-text-sm tw-text-[#A1A1AA] tw-m-0">Direct Admin SDK execution bridge for global support agents.</p>
		</div>
		<span class="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-xs tw-font-bold tw-text-emerald-400 tw-uppercase tw-tracking-wider">
			<span class="tw-inline-block tw-w-2 tw-h-2 tw-rounded-none tw-bg-emerald-400 tw-animate-pulse"></span>
			ONLINE
		</span>
	</header>

	{#if authStore.isLoading}
		<p class="tw-font-mono tw-text-[#A1A1AA]">Authenticating connection...</p>
	{:else if !['global_admin', 'super_admin', 'admin'].includes(authStore.role ?? '')}
		<div class="tw-p-[clamp(16px,2vw,32px)] tw-bg-rose-500/10 tw-border tw-border-rose-500/30 tw-rounded-none">
			<h3 class="tw-font-mono tw-text-base tw-font-bold tw-text-rose-300 tw-tracking-wide tw-m-0 tw-mb-2">ACCESS DENIED</h3>
			<p class="tw-text-[#D4D4D8] tw-m-0">Your current clearance level ({authStore.role || 'none'}) is insufficient for the Support Terminal.</p>
		</div>
	{:else}
		<section class="tw-flex tw-flex-col tw-flex-1 tw-min-h-0 tw-bg-[#020617] tw-border tw-border-slate-800 tw-p-[clamp(16px,2vw,32px)] admin-support-panel">
			<SupportConsoleHUD {engine} />
			<SupportConsoleArena {engine} />
		</section>
	{/if}
</div>
