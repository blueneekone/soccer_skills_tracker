<script lang="ts">
	import SupportAgentArena from '$lib/components/admin/support/SupportAgentArena.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const quickActions = [
		{ label: 'Force Sync Roster', icon: 'nav.refresh', cmd: '/sync-roster' },
		{ label: 'Reset User Password', icon: 'sys.settings', cmd: '/reset-password' },
		{ label: 'Purge PII Cache', icon: 'sys.trash', cmd: '/purge-pii' },
		{ label: 'Invalidate Auth Tokens', icon: 'status.shield-check', cmd: '/invalidate-tokens' },
	] as const;

	const diagnostics = [
		{ label: 'UPTIME', value: '99.97%', hint: 'SLO · 30d' },
		{ label: 'API LATENCY', value: '42ms', hint: 'p50 · edge' },
		{ label: 'ACTIVE CONN', value: '1,204', hint: 'WebSocket pool' },
		{ label: 'DB OPS', value: '8.2K/s', hint: 'Firestore reads' },
	];
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
			<span class="tw-inline-block tw-w-2 tw-h-2 tw-rounded-full tw-bg-emerald-400 tw-animate-pulse"></span>
			ONLINE
		</span>
	</header>

	{#if authStore.isLoading}
		<p class="tw-font-mono tw-text-[#A1A1AA]">Authenticating connection...</p>
	{:else if !['global_admin', 'super_admin'].includes(authStore.role ?? '')}
		<div class="tw-p-[clamp(16px,2vw,32px)] tw-bg-rose-500/10 tw-border tw-border-rose-500/30 tw-rounded-none">
			<h3 class="tw-font-mono tw-text-base tw-font-bold tw-text-rose-300 tw-tracking-wide tw-m-0 tw-mb-2">ACCESS DENIED</h3>
			<p class="tw-text-[#D4D4D8] tw-m-0">Your current clearance level ({authStore.role || 'none'}) is insufficient for the Support Terminal.</p>
		</div>
	{:else}
		<!-- Bento Grid: 4-col Quick Actions + 8-col Chat -->
		<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-[clamp(12px,1.5vw,20px)] tw-flex-1 tw-min-h-0">
			
			<!-- LEFT RAIL: Quick Actions & Telemetry (4 cols) -->
			<aside class="lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-[clamp(12px,1.5vw,20px)] tw-min-h-0">
				
				<!-- Quick Action Scripts -->
				<div class="tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-[clamp(12px,1.5vw,20px)]">
					<h2 class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA] tw-m-0 tw-mb-[clamp(8px,1vw,12px)]">
						Quick Action Scripts
					</h2>
					<div class="tw-flex tw-flex-col tw-gap-2">
						{#each quickActions as action}
							<button
								type="button"
								class="v-toolbar-btn tw-w-full tw-justify-start tw-text-left"
								onclick={() => {
									const input = document.querySelector('.sa-input');
									if (input instanceof HTMLInputElement) {
										input.value = action.cmd;
										input.dispatchEvent(new Event('input', { bubbles: true }));
										input.focus();
									}
								}}
							>
								<Icon name={action.icon as IconName} />
								<span class="tw-text-xs">{action.label}</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- System Diagnostics -->
				<div class="tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-[clamp(12px,1.5vw,20px)] tw-flex-1">
					<h2 class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA] tw-m-0 tw-mb-[clamp(8px,1vw,12px)]">
						System Diagnostics
					</h2>
					<div class="tw-grid tw-grid-cols-2 tw-gap-[clamp(8px,1vw,12px)]">
						{#each diagnostics as d}
							<div class="tw-flex tw-flex-col">
								<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]">{d.label}</span>
								<span class="tw-text-lg tw-font-mono tw-font-bold tw-text-[#FAFAFA]">{d.value}</span>
								<span class="tw-text-[10px] tw-text-[#A1A1AA]">{d.hint}</span>
							</div>
						{/each}
					</div>
				</div>
			</aside>

			<!-- RIGHT PANE: AI Chat-to-Data Bridge (8 cols) -->
			<div class="lg:tw-col-span-8 tw-flex tw-flex-col tw-min-h-0">
				<SupportAgentArena />
			</div>
		</div>
	{/if}
</div>

