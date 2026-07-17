<script lang="ts">
	import { AdminOverviewEngine } from './AdminOverviewEngine.svelte.js';
	import AdminOverviewHUD from './AdminOverviewHUD.svelte';
	import '$lib/styles/enterprise-console.css';
	import './admin-overview.css';

	const engine = new AdminOverviewEngine();
	engine.subscribe();

	const activeTab = $derived(engine.activeTab);

	import { mountMauLineChart, mountRevenueDoughnutChart, mountSportBarChart, readOverviewCssVar } from '$lib/admin/overviewCharts.js';
	import { browser } from '$app/environment';

	$effect(() => {
		if (!browser || !engine.mauCanvasEl) return;
		let destroyed = false;
		let chart: any = null;

		mountMauLineChart(engine.mauCanvasEl, engine.mauSeries, readOverviewCssVar)
			.then((c) => {
				if (destroyed) {
					c.destroy();
					return;
				}
				chart = c;
			})
			.catch((e) => console.warn('[overview] MAU chart init failed', e));

		return () => {
			destroyed = true;
			chart?.destroy();
			chart = null;
		};
	});

	$effect(() => {
		if (!browser || !engine.revenueCanvasEl) return;
		let destroyed = false;
		let chart: any = null;

		mountRevenueDoughnutChart(engine.revenueCanvasEl, engine.revenueByTier, readOverviewCssVar)
			.then((c) => {
				if (destroyed) {
					c.destroy();
					return;
				}
				chart = c;
			})
			.catch((e) => console.warn('[overview] Revenue chart init failed', e));

		return () => {
			destroyed = true;
			chart?.destroy();
			chart = null;
		};
	});

	$effect(() => {
		if (!browser || !engine.sportCanvasEl) return;
		let destroyed = false;
		let chart: any = null;

		mountSportBarChart(engine.sportCanvasEl, engine.playersBySport, readOverviewCssVar)
			.then((c) => {
				if (destroyed) {
					c.destroy();
					return;
				}
				chart = c;
			})
			.catch((e) => console.warn('[overview] Sport chart init failed', e));

		return () => {
			destroyed = true;
			chart?.destroy();
			chart = null;
		};
	});

</script>

<div
	class="tw-col-span-1 lg:tw-col-span-12 tw-flex tw-flex-col tw-w-full tw-bg-[#0B0F19] tw-text-[#FAFAFA] dark-form-surface cc-root tw-box-border tw-mx-auto tw-max-w-[1680px]"
	style="padding: var(--bento-pad-liquid, clamp(20px, 4vw, 32px));"
	data-admin-shell="true"
>
	<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-[clamp(16px,2vw,24px)] tw-w-full tw-min-w-0">
		<div class="xl:tw-col-span-12 tw-min-w-0 tw-flex tw-flex-col tw-break-words tw-whitespace-normal">
			<AdminOverviewHUD {engine} />

			{#if activeTab === 'executive'}
				<!-- Executive KPI Strip -->
				<div class="tw-grid tw-grid-cols-2 lg:tw-grid-cols-4 tw-w-full tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-mb-6 tw-divide-y sm:tw-divide-y-0 sm:tw-divide-x tw-divide-[#1E293B]">
					{#each engine.strike13Executive.slice(0, 4) as tile}
						<div class="tw-flex-1 tw-p-4 sm:tw-p-6">
							<p class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#D4D4D8] tw-mb-1">{tile.label}</p>
							<p class="tw-font-mono tw-text-3xl tw-font-black tw-text-[#FAFAFA]">{tile.value}</p>
							<p class="tw-text-[10px] tw-text-[#A1A1AA] tw-uppercase tw-mt-1">{tile.hint}</p>
						</div>
					{/each}
				</div>

				<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6 tw-w-full">
					<div class="tw-col-span-1 xl:tw-col-span-6 tw-flex tw-flex-col">
						<!-- Revenue Doughnut Chart -->
						<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-p-6 tw-flex tw-flex-col tw-h-full">
							<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-font-sans tw-tracking-widest tw-text-[#FAFAFA] tw-mb-6">Revenue by Tier</h3>
							<div class="tw-relative tw-w-full tw-flex-1 tw-min-h-[280px]">
								<canvas bind:this={engine.revenueCanvasEl}></canvas>
							</div>
						</div>
					</div>

					<div class="tw-col-span-1 xl:tw-col-span-6 tw-flex tw-flex-col">
						<!-- Players by Sport Bar Chart -->
						<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-p-6 tw-flex tw-flex-col tw-h-full">
							<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-font-sans tw-tracking-widest tw-text-[#FAFAFA] tw-mb-6">Players by Sport</h3>
							<div class="tw-relative tw-w-full tw-flex-1 tw-min-h-[280px]">
								<canvas bind:this={engine.sportCanvasEl}></canvas>
							</div>
						</div>
					</div>
				</div>
			{/if}

			{#if activeTab === 'growth'}
				<div class="tw-flex tw-flex-col sm:tw-flex-row tw-w-full tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-mb-6 tw-divide-y sm:tw-divide-y-0 sm:tw-divide-x tw-divide-[#1E293B]">
					{#each engine.GROWTH_TILES as tile}
						<div class="tw-flex-1 tw-p-4 sm:tw-p-6">
							<p class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#D4D4D8] tw-mb-1">{tile.label}</p>
							<p class="tw-font-mono tw-text-3xl tw-font-black tw-text-[#FAFAFA]">{tile.value}</p>
							<p class="tw-text-[10px] tw-text-[#A1A1AA] tw-uppercase tw-mt-1">{tile.hint}</p>
						</div>
					{/each}
				</div>

				<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6 tw-w-full">
					<div class="tw-col-span-1 xl:tw-col-span-12 tw-flex tw-flex-col">
						<!-- MAU Line Chart -->
						<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-p-6 tw-flex tw-flex-col tw-h-full">
							<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-font-sans tw-tracking-widest tw-text-[#FAFAFA] tw-mb-6">Master Activation (MAU)</h3>
							<div class="tw-relative tw-w-full tw-h-[360px]">
								<canvas bind:this={engine.mauCanvasEl}></canvas>
							</div>
						</div>
					</div>
				</div>
			{/if}

			{#if activeTab === 'security'}
				<!-- Security Threat Matrix Strip -->
				<div class="tw-grid tw-grid-cols-2 lg:tw-grid-cols-4 tw-w-full tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-mb-6 tw-divide-y sm:tw-divide-y-0 sm:tw-divide-x tw-divide-[#1E293B]">
					{#each engine.strike13Security.slice(0, 4) as tile}
						<div class="tw-flex-1 tw-p-4 sm:tw-p-6">
							<p class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#D4D4D8] tw-mb-1">{tile.label}</p>
							<p class="tw-font-mono tw-text-3xl tw-font-black tw-text-[#FAFAFA]">{tile.value}</p>
						</div>
					{/each}
				</div>

				<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6 tw-w-full">
					<!-- Playbooks & Queue -->
					<div class="tw-col-span-1 xl:tw-col-span-8 tw-flex tw-flex-col">
						<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-p-6 tw-flex tw-flex-col tw-h-full">
							<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-font-sans tw-tracking-widest tw-text-[#FAFAFA] tw-mb-6">SOAR Playbooks & Automations</h3>
							<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
								{#each engine.socRibbon as ribbon}
									<div class="tw-p-5 tw-bg-[#1E293B] tw-border tw-border-[#1E293B] tw-rounded-none">
										<p class="tw-text-[10px] tw-font-bold tw-uppercase tw-text-[#A1A1AA] tw-mb-1 tw-tracking-widest">{ribbon.s}</p>
										<p class="tw-font-mono tw-text-2xl tw-font-black tw-text-[#FAFAFA]">{ribbon.k}: <span class="tw-text-[#D4D4D8] tw-font-bold">{ribbon.v}</span></p>
									</div>
								{/each}
							</div>
						</div>
					</div>

					<!-- Global Live Feed -->
					<div class="tw-col-span-1 xl:tw-col-span-4 tw-flex tw-flex-col">
						<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-flex tw-flex-col tw-h-full tw-overflow-hidden">
							<div class="tw-p-4 tw-border-b tw-border-[#1E293B] tw-bg-[#0B0F19]">
								<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-font-sans tw-tracking-widest tw-text-[#FAFAFA]">Global Live Feed</h3>
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
										<div class="tw-flex tw-flex-col tw-p-3 tw-border-b tw-border-[#1E293B] last:tw-border-0 hover:tw-bg-[#1E293B] tw-transition-colors">
											<div class="tw-flex tw-items-center tw-justify-between tw-mb-1">
												<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-px-1.5 tw-py-0.5 tw-rounded"
												class:tw-bg-[#14b8a6]={event.action === 'EVENT' || event.action.includes('SUCCESS')}
												class:tw-text-[#020617]={event.action === 'EVENT' || event.action.includes('SUCCESS') || event.action.includes('WARN')}
												class:tw-bg-[#f59e0b]={event.action.includes('WARN')}
												class:tw-bg-[#f43f5e]={event.action.includes('FAIL') || event.action.includes('BLOCK')}
												class:tw-text-[#FAFAFA]={event.action.includes('FAIL') || event.action.includes('BLOCK') || (!event.action.includes('SUCCESS') && !event.action.includes('WARN') && !event.action.includes('FAIL') && !event.action.includes('BLOCK') && event.action !== 'EVENT')}
												class:tw-bg-[#3b82f6]={!event.action.includes('SUCCESS') && !event.action.includes('WARN') && !event.action.includes('FAIL') && !event.action.includes('BLOCK') && event.action !== 'EVENT'}
											>{event.action}</span>
												<span class="tw-text-[10px] tw-text-[#A1A1AA] tw-font-mono tw-tracking-widest">{event.createdAt ? new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}</span>
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
				<div class="tw-flex tw-flex-col sm:tw-flex-row tw-w-full tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-mb-6 tw-divide-y sm:tw-divide-y-0 sm:tw-divide-x tw-divide-[#1E293B]">
					{#each engine.PLATFORM_TILES as tile}
						<div class="tw-flex-1 tw-p-4 sm:tw-p-6">
							<p class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#D4D4D8] tw-mb-1">{tile.label}</p>
							<p class="tw-font-mono tw-text-3xl tw-font-black tw-text-[#FAFAFA]">{tile.value}</p>
							<p class="tw-text-[10px] tw-text-[#A1A1AA] tw-uppercase tw-mt-1">{tile.hint}</p>
						</div>
					{/each}
				</div>

				<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6 tw-w-full">
					<div class="tw-col-span-1 xl:tw-col-span-12 tw-flex tw-flex-col">
						<!-- Premium Infrastructure Override -->
						<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-p-8 tw-relative tw-overflow-hidden tw-group tw-transition-all tw-duration-500" class:tw-shadow-[0_0_30px_rgba(239,68,68,0.15)]={engine.maintenanceMode}>
							<!-- Subtle background glow when active -->
							<div class="tw-absolute tw-inset-0 tw-opacity-0 tw-transition-opacity tw-duration-500 tw-pointer-events-none" class:tw-opacity-100={engine.maintenanceMode}>
								<div class="tw-absolute -tw-top-24 -tw-right-24 tw-w-48 tw-h-48 tw-bg-[#ef4444] tw-rounded-full tw-blur-[80px] tw-opacity-20"></div>
							</div>

							<div class="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-relative tw-z-10 tw-gap-6">
								<div class="tw-flex tw-flex-col">
									<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-font-sans tw-tracking-[0.2em] tw-mb-2 tw-flex tw-items-center tw-gap-2" class:tw-text-[#ef4444]={engine.maintenanceMode} class:tw-text-[#f59e0b]={!engine.maintenanceMode}>
										<div class="tw-w-2 tw-h-2 tw-rounded-full" class:tw-bg-[#ef4444]={engine.maintenanceMode} class:tw-bg-[#f59e0b]={!engine.maintenanceMode} class:tw-animate-pulse={engine.maintenanceMode}></div>
										Infrastructure Override
									</h3>
									<p class="tw-text-sm tw-text-[#94A3B8] tw-max-w-md tw-leading-relaxed">Instantly eject all non-admin users and block new sessions. API edges will return <code class="tw-font-mono tw-text-xs tw-text-[#FAFAFA] tw-bg-[#1E293B] tw-px-1.5 tw-py-0.5 tw-rounded tw-border tw-border-[#1E293B]">503 Service Unavailable</code>.</p>
								</div>
								
								<button 
									type="button"
									class="tw-group tw-relative tw-flex tw-items-center tw-gap-4 tw-pl-4 tw-pr-1.5 tw-py-1.5 tw-bg-[#0B0F19] tw-border tw-rounded-full tw-transition-all tw-duration-200 focus:tw-outline-none"
									class:tw-border-[#ef4444]={engine.maintenanceMode}
									class:tw-border-[#f59e0b]={!engine.maintenanceMode}
									onclick={() => void engine.toggleMaintenance()}
									disabled={engine.maintenanceBusy}
								>
									<div class="tw-flex tw-flex-col tw-text-right tw-pr-2">
										<span class="tw-font-sans tw-text-[10px] tw-font-bold tw-tracking-widest tw-transition-colors" class:tw-text-[#ef4444]={engine.maintenanceMode} class:tw-text-[#FAFAFA]={!engine.maintenanceMode}>GLOBAL LOCKOUT</span>
										<span class="tw-font-mono tw-text-[9px] tw-text-[#64748B] tw-uppercase">{engine.maintenanceMode ? 'ENGAGED' : 'STANDBY'}</span>
									</div>
									
									<div class="tw-relative tw-w-14 tw-h-8 tw-rounded-full tw-transition-colors tw-duration-200 tw-ease-in-out" class:tw-bg-[#ef4444]={engine.maintenanceMode} class:tw-bg-[#1E293B]={!engine.maintenanceMode}>
										<span class="tw-absolute tw-top-1 tw-left-1 tw-bg-[#FAFAFA] tw-w-6 tw-h-6 tw-rounded-full tw-transition-transform tw-duration-200 tw-ease-[cubic-bezier(0.34,1.56,0.64,1)] tw-flex tw-items-center tw-justify-center" class:tw-translate-x-6={engine.maintenanceMode}>
											{#if engine.maintenanceMode}
												<div class="tw-w-2 tw-h-2 tw-bg-[#020617] tw-rounded-full"></div>
											{/if}
										</span>
									</div>
								</button>
							</div>
						</div>
					</div>
				</div>
			{/if}

		</div>
	</div>
</div>
