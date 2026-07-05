<script lang="ts">
	import type { AdminOverviewEngine } from './AdminOverviewEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { engine }: { engine: AdminOverviewEngine } = $props();
</script>

{#snippet socMetric(kpi: any)}
	<article
		class="cc-soc-card dark-form-surface"
		class:cc-soc-card--crit={kpi.band === 'crit'}
		class:cc-soc-card--high={kpi.band === 'high'}
		class:cc-soc-card--med={kpi.band === 'med'}
		class:cc-soc-card--low={kpi.band === 'low'}
		class:cc-soc-card--ok={kpi.band === 'ok'}
		class:cc-soc-card--info={kpi.band === 'info' || !kpi.band}
	>
		<div class="cc-soc-card__top">
			<span class="cc-soc-card__label">{kpi.label}</span>
			{#if kpi.delta}
				<span
					class="cc-soc-card__delta"
					class:cc-soc-card__delta--up={kpi.deltaDir === 'up'}
					class:cc-soc-card__delta--down={kpi.deltaDir === 'down'}
					class:cc-soc-card__delta--flat={kpi.deltaDir === 'flat' || !kpi.deltaDir}
					>{kpi.delta}</span
				>
			{/if}
		</div>
		<span class="cc-soc-card__value">{kpi.value}</span>
		<span class="cc-soc-card__hint">{kpi.hint}</span>
	</article>
{/snippet}

<div class="cc-body tw-pb-12">
	<div class="cc-soc-ribbon" aria-label="Operations snapshot">
		{#each engine.socRibbon as row (row.k)}
			<div class="cc-soc-ribbon__cell">
				<span class="cc-soc-ribbon__metric">{row.k}</span>
				<span class="cc-soc-ribbon__value">{row.v}</span>
				<span class="cc-soc-ribbon__sub">{row.s}</span>
			</div>
		{/each}
	</div>
	<p class="cc-soc-legend">
		<span class="cc-soc-legend__title">Severity key</span>
		<span class="cc-soc-legend__items">
			<span><i class="cc-soc-dot cc-soc-dot--crit"></i> critical</span>
			<span><i class="cc-soc-dot cc-soc-dot--high"></i> high</span>
			<span><i class="cc-soc-dot cc-soc-dot--med"></i> medium</span>
			<span><i class="cc-soc-dot cc-soc-dot--low"></i> low</span>
			<span><i class="cc-soc-dot cc-soc-dot--ok"></i> steady</span>
			<span><i class="cc-soc-dot cc-soc-dot--info"></i> info</span>
		</span>
	</p>

	{#if engine.activeTab === 'executive'}
		<section
			class="cc-panel bento-grid bento-grid--liquid tw-grid tw-gap-6 tw-w-full"
			style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));"
			id="cc-panel-executive"
			role="tabpanel"
			aria-labelledby="cc-tab-executive"
		>
		{#each engine.strike13Executive as kpi (kpi.label)}
			<div class="bento-span-3 tw-min-w-0">
				{@render socMetric(kpi)}
			</div>
		{/each}

			<article class="cc-chart-card cc-chart-card--soc bento-span-12 tw-col-span-full tw-min-w-0">
				<header class="cc-chart-card__head">
				<div class="cc-chart-card__icon cc-chart-card__icon--indigo" aria-hidden="true">
					<Icon name={"data.trending" as IconName} />
				</div>
					<div>
						<h2 class="cc-chart-card__title">Master activation (MAU)</h2>
						<p class="cc-chart-card__sub">Trailing six months · enterprise growth signal</p>
					</div>
				</header>
				<div class="tw-relative tw-h-[350px] tw-min-w-0 tw-w-full">
					<canvas
						class="cc-canvas-fill"
						bind:this={engine.mauCanvasEl}
						aria-label="Master activation line chart"
					></canvas>
				</div>
			</article>
		</section>
	{:else if engine.activeTab === 'growth'}
		<section class="cc-panel bento-grid bento-grid--liquid tw-grid tw-gap-6 tw-w-full" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));" id="cc-panel-growth" role="tabpanel" aria-labelledby="cc-tab-growth">
		{#each engine.GROWTH_TILES as kpi (kpi.label)}
			<div class="bento-span-3 tw-min-w-0">
				{@render socMetric(kpi)}
			</div>
		{/each}

			<div class="cc-chart-row bento-span-12 tw-col-span-full tw-min-w-0 tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6">
				<article class="cc-chart-card cc-chart-card--half cc-chart-card--soc lg:tw-col-span-8 tw-min-w-0">
					<header class="cc-chart-card__head">
					<div class="cc-chart-card__icon cc-chart-card__icon--emerald" aria-hidden="true">
						<Icon name={"data.chart-pie" as IconName} />
					</div>
						<div>
							<h2 class="cc-chart-card__title">Revenue by tier</h2>
							<p class="cc-chart-card__sub">MRR composition</p>
						</div>
					</header>
					<div class="tw-relative tw-h-[350px] tw-min-w-0 tw-w-full">
						<canvas
							class="cc-canvas-fill"
							bind:this={engine.revenueCanvasEl}
							aria-label="Revenue doughnut chart"
						></canvas>
					</div>
				</article>

				<article class="cc-chart-card cc-chart-card--half cc-chart-card--soc lg:tw-col-span-4 tw-min-w-0">
					<header class="cc-chart-card__head">
						<div class="cc-chart-card__icon cc-chart-card__icon--cyan" aria-hidden="true">
						<Icon name={"sport.soccer" as IconName} />
						</div>
						<div>
							<h2 class="cc-chart-card__title">Players by sport</h2>
							<p class="cc-chart-card__sub">Headcount distribution</p>
						</div>
					</header>
					<div class="tw-relative tw-h-[350px] tw-min-w-0 tw-w-full">
						<canvas
							class="cc-canvas-fill"
							bind:this={engine.sportCanvasEl}
							aria-label="Players by sport bar chart"
						></canvas>
					</div>
				</article>
			</div>
		</section>
	{:else if engine.activeTab === 'security'}
		<section class="cc-panel bento-grid bento-grid--liquid tw-grid tw-gap-6 tw-w-full" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));" id="cc-panel-security" role="tabpanel" aria-labelledby="cc-tab-security">
			{#each engine.strike13Security as kpi (kpi.label)}
				<div class="bento-span-3 tw-min-w-0">
					{@render socMetric(kpi)}
				</div>
			{/each}
				<aside class="cc-soc-aside bento-span-4 tw-col-span-full tw-min-w-0" aria-label="Automation and orchestration">
					<div class="cc-soc-aside__head">
						<span class="cc-soc-aside__eyebrow">SOAR-style</span>
						<h3 class="cc-soc-aside__title">Playbooks &amp; queue</h3>
						<p class="cc-soc-aside__sub">Representative automation counters for executive review.</p>
					</div>
					<ul class="cc-soc-aside__list">
						<li>
							<span class="cc-soc-aside__k">Armed playbooks</span>
							<span class="cc-soc-aside__v">12</span>
						</li>
						<li>
							<span class="cc-soc-aside__k">Open cases</span>
							<span class="cc-soc-aside__v">7</span>
						</li>
						<li>
							<span class="cc-soc-aside__k">Auto-remediated (24h)</span>
							<span class="cc-soc-aside__v">94%</span>
						</li>
						<li>
							<span class="cc-soc-aside__k">Mean queue depth</span>
							<span class="cc-soc-aside__v">23</span>
						</li>
						<li>
							<span class="cc-soc-aside__k">False-positive rate</span>
							<span class="cc-soc-aside__v">4.1%</span>
						</li>
					</ul>
				</aside>


		</section>
	{:else}
		<section class="cc-panel bento-grid bento-grid--liquid tw-grid tw-gap-6 tw-w-full" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));" id="cc-panel-platform" role="tabpanel" aria-labelledby="cc-tab-platform">
		{#each engine.PLATFORM_TILES as kpi (kpi.label)}
			<div class="bento-span-3 tw-min-w-0">
				{@render socMetric(kpi)}
			</div>
		{/each}
		</section>
	{/if}
</div>
