<script lang="ts">
	import { AdminOverviewEngine } from './AdminOverviewEngine.svelte.js';
	import AdminOverviewHUD from './AdminOverviewHUD.svelte';
	import '$lib/styles/enterprise-console.css';
	import './admin-overview.css';

	const engine = new AdminOverviewEngine();
	engine.subscribe();

	let activeTab = $state('executive');
	
	$effect(() => {
		activeTab = engine.activeTab;
	});
</script>

<div
	class="tw-col-span-1 lg:tw-col-span-12 tw-flex tw-flex-col tw-w-full tw-bg-[#0B0F19] tw-text-[#FAFAFA] dark-form-surface cc-root tw-box-border tw-mx-auto tw-max-w-[1680px]"
	style="padding: var(--bento-pad-liquid);"
	data-admin-shell="true"
>
	<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-[clamp(16px,2vw,24px)] tw-w-full tw-min-w-0">
		<div class="xl:tw-col-span-12 tw-min-w-0 tw-flex tw-flex-col tw-break-words tw-whitespace-normal">
			<AdminOverviewHUD {engine} />

			{#if activeTab === 'executive'}
				<!-- Executive KPI Strip -->
				<div class="tw-flex tw-flex-col sm:tw-flex-row tw-w-full tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-rounded-lg tw-mb-6 tw-divide-y sm:tw-divide-y-0 sm:tw-divide-x tw-divide-[#334155]">
					<div class="tw-flex-1 tw-p-4 sm:tw-p-6">
						<p class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA] tw-mb-1">Total Users</p>
						<p class="tw-font-mono tw-text-3xl tw-font-black tw-text-[#FAFAFA]">{engine.executiveTotals.totalPlayers.toLocaleString()}</p>
					</div>
					<div class="tw-flex-1 tw-p-4 sm:tw-p-6">
						<p class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA] tw-mb-1">Active Orgs</p>
						<p class="tw-font-mono tw-text-3xl tw-font-black tw-text-[#FAFAFA]">{engine.executiveTotals.activeOrgs.toLocaleString()}</p>
					</div>
					<div class="tw-flex-1 tw-p-4 sm:tw-p-6">
						<p class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA] tw-mb-1">MRR</p>
						<p class="tw-font-mono tw-text-3xl tw-font-black tw-text-[#14b8a6]">${engine.executiveTotals.mrr.toLocaleString()}</p>
					</div>
					<div class="tw-flex-1 tw-p-4 sm:tw-p-6">
						<p class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA] tw-mb-1">Active Licenses</p>
						<p class="tw-font-mono tw-text-3xl tw-font-black tw-text-[#FAFAFA]">{engine.executiveTotals.activeLicenses.toLocaleString()}</p>
					</div>
				</div>

				<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6 tw-w-full">
					<div class="tw-col-span-1 xl:tw-col-span-12 tw-flex tw-flex-col tw-gap-6">
						<!-- MAU Line Chart -->
						<div class="tw-bg-[#0B0F19] tw-border tw-border-slate-800 tw-rounded-lg tw-p-4 tw-flex tw-flex-col">
							<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#FAFAFA] tw-mb-4">Master Activation (MAU) - 6 Month Signal</h3>
							<div class="tw-relative tw-w-full tw-h-[280px]">
								<canvas bind:this={engine.mauCanvasEl}></canvas>
							</div>
						</div>
					</div>
				</div>
			{/if}

			{#if activeTab === 'growth'}
				<div class="tw-flex tw-flex-col sm:tw-flex-row tw-w-full tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-rounded-lg tw-mb-6 tw-divide-y sm:tw-divide-y-0 sm:tw-divide-x tw-divide-[#334155]">
					{#each engine.GROWTH_TILES as tile}
						<div class="tw-flex-1 tw-p-4 sm:tw-p-6">
							<p class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA] tw-mb-1">{tile.label}</p>
							<p class="tw-font-mono tw-text-3xl tw-font-black" class:tw-text-[#14b8a6]={tile.label === 'LTV:CAC' || tile.label === 'Pipeline ARR'} class:tw-text-[#FAFAFA]={tile.label !== 'LTV:CAC' && tile.label !== 'Pipeline ARR'}>{tile.value}</p>
						</div>
					{/each}
				</div>

				<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6 tw-w-full">
					<div class="tw-col-span-1 xl:tw-col-span-6 tw-flex tw-flex-col">
						<!-- Revenue Doughnut Chart -->
						<div class="tw-bg-[#0B0F19] tw-border tw-border-slate-800 tw-rounded-lg tw-p-4 tw-flex tw-flex-col tw-h-full">
							<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#FAFAFA] tw-mb-4">Revenue by Tier</h3>
							<div class="tw-relative tw-w-full tw-h-[280px]">
								<canvas bind:this={engine.revenueCanvasEl}></canvas>
							</div>
						</div>
					</div>

					<div class="tw-col-span-1 xl:tw-col-span-6 tw-flex tw-flex-col">
						<!-- Players by Sport Bar Chart -->
						<div class="tw-bg-[#0B0F19] tw-border tw-border-slate-800 tw-rounded-lg tw-p-4 tw-flex tw-flex-col tw-h-full">
							<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#FAFAFA] tw-mb-4">Players by Sport</h3>
							<div class="tw-relative tw-w-full tw-h-[280px]">
								<canvas bind:this={engine.sportCanvasEl}></canvas>
							</div>
						</div>
					</div>
				</div>
			{/if}

			{#if activeTab === 'security'}
				<!-- Security Threat Matrix Strip -->
				<div class="tw-grid tw-grid-cols-2 lg:tw-grid-cols-4 tw-w-full tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-rounded-lg tw-mb-6 tw-divide-y sm:tw-divide-y-0 sm:tw-divide-x tw-divide-[#334155]">
					{#each engine.strike13Security.slice(0, 4) as tile}
						<div class="tw-flex-1 tw-p-4 sm:tw-p-6">
							<p class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA] tw-mb-1">{tile.label}</p>
							<p class="tw-font-mono tw-text-3xl tw-font-black" class:tw-text-[#f43f5e]={tile.value !== '0'} class:tw-text-[#FAFAFA]={tile.value === '0'}>{tile.value}</p>
						</div>
					{/each}
				</div>

				<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6 tw-w-full">
					<!-- Playbooks & Queue -->
					<div class="tw-col-span-1 xl:tw-col-span-8 tw-flex tw-flex-col">
						<div class="tw-bg-[#0B0F19] tw-border tw-border-slate-800 tw-rounded-lg tw-p-4 tw-flex tw-flex-col tw-h-full">
							<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#FAFAFA] tw-mb-4">SOAR Playbooks & Automations</h3>
							<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
								{#each engine.socRibbon as ribbon}
									<div class="tw-p-4 tw-bg-slate-800/20 tw-border tw-border-slate-800 tw-rounded-lg">
										<p class="tw-text-[10px] tw-font-bold tw-uppercase tw-text-[#A1A1AA] tw-mb-1">{ribbon.s}</p>
										<p class="tw-font-mono tw-text-xl tw-font-bold tw-text-[#FAFAFA]">{ribbon.k}: <span class="tw-text-[#14b8a6]">{ribbon.v}</span></p>
									</div>
								{/each}
							</div>
						</div>
					</div>

					<!-- Global Live Feed -->
					<div class="tw-col-span-1 xl:tw-col-span-4 tw-flex tw-flex-col">
						<div class="tw-bg-[#0B0F19] tw-border tw-border-slate-800 tw-rounded-lg tw-flex tw-flex-col tw-h-full">
							<div class="tw-p-4 tw-border-b tw-border-slate-800">
								<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#FAFAFA]">Global Live Feed</h3>
							</div>
							<div class="tw-flex-1 tw-overflow-y-auto tw-p-0 tw-flex tw-flex-col tw-h-[280px]">
								{#if engine.feedLoading}
									<div class="tw-p-4 tw-text-sm tw-text-[#A1A1AA]">Initializing telemetry stream...</div>
								{:else if engine.feedErr}
									<div class="tw-p-4 tw-text-sm tw-text-red-400">{engine.feedErr}</div>
								{:else if engine.liveFeed.length === 0}
									<div class="tw-p-4 tw-text-sm tw-text-[#A1A1AA]">No audit events in stream.</div>
								{:else}
									{#each engine.liveFeed as event}
										<div class="tw-flex tw-flex-col tw-p-3 tw-border-b tw-border-slate-800/50 last:tw-border-0 hover:tw-bg-slate-800/20 tw-transition-colors">
											<div class="tw-flex tw-items-center tw-justify-between tw-mb-1">
												<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider" class:tw-text-emerald-400={event.action === 'EVENT' || event.action.includes('SUCCESS')} class:tw-text-amber-400={event.action.includes('WARN')} class:tw-text-rose-400={event.action.includes('FAIL') || event.action.includes('BLOCK')} class:tw-text-cyan-400={!event.action.includes('SUCCESS') && !event.action.includes('WARN') && !event.action.includes('FAIL') && !event.action.includes('BLOCK') && event.action !== 'EVENT'}>{event.action}</span>
												<span class="tw-text-[10px] tw-text-[#A1A1AA] tw-font-mono">{event.createdAt ? new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}</span>
											</div>
											<span class="tw-text-xs tw-text-[#FAFAFA] tw-font-medium tw-break-all">{event.targetEmail}</span>
											<span class="tw-text-xs tw-text-[#A1A1AA] tw-mt-0.5">{event.details}</span>
										</div>
									{/each}
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}

			{#if activeTab === 'platform'}
				<div class="tw-flex tw-flex-col sm:tw-flex-row tw-w-full tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-rounded-lg tw-mb-6 tw-divide-y sm:tw-divide-y-0 sm:tw-divide-x tw-divide-[#334155]">
					{#each engine.PLATFORM_TILES as tile}
						<div class="tw-flex-1 tw-p-4 sm:tw-p-6">
							<p class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA] tw-mb-1">{tile.label}</p>
							<p class="tw-font-mono tw-text-3xl tw-font-black" class:tw-text-[#14b8a6]={tile.label === 'Uptime'} class:tw-text-[#FAFAFA]={tile.label !== 'Uptime'}>{tile.value}</p>
							<p class="tw-text-[10px] tw-text-[#A1A1AA] tw-uppercase tw-mt-1">{tile.hint}</p>
						</div>
					{/each}
				</div>
			{/if}

		</div>
	</div>
</div>
