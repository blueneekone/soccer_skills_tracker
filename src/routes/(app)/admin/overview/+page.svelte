<script lang="ts">
	import { browser } from '$app/environment';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { hydrateAdminOverview } from '$lib/admin/overviewHydrate.js';
	import {
		mountMauLineChart,
		mountRevenueDoughnutChart,
		mountSportBarChart,
		readOverviewCssVar,
	} from '$lib/admin/overviewCharts.js';
	import { actionIcon, actionTone, prettyAction, relativeTime } from '$lib/admin/overviewFeed.js';
	import '$lib/styles/enterprise-console.css';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	/** Strike 16 — Tabbed command center (SOAR/SIEM-style statistical surfaces) */
	const TAB_IDS = /** @type {const} */ (['executive', 'growth', 'security', 'platform']);
	const TAB_LABELS = /** @type {const} */ (['Executive', 'Growth', 'Security', 'Platform']);

	/** @type {'executive' | 'growth' | 'security' | 'platform'} */
	let activeTab = $state('executive');

	/** SOC-style ribbon — headline operational telemetry (representative / demo). */
	const SOC_RIBBON = /** @type {const} */ ([
		{ k: 'MTTR', v: '18m', s: 'Incidents · rolling 7d p50' },
		{ k: 'Playbooks', v: '2.4k', s: 'Automation runs · 24h' },
		{ k: 'Detections', v: '847/s', s: 'Rule evaluations · pipeline' },
		{ k: 'Ingest lag', v: '240ms', s: 'Audit + metrics · p95' },
	]);

	/**
	 * @typedef {'crit' | 'high' | 'med' | 'low' | 'ok' | 'info'} SocBand
	 * @typedef {{ label: string, value: string, hint: string, band?: SocBand, delta?: string, deltaDir?: 'up' | 'down' | 'flat' }} SocMetric
	 */

	/** @type {SocMetric[]} */
	let strike13Executive = $state([
		{ label: 'MRR', value: '$42.5k', hint: 'Monthly recurring', band: 'info', delta: '+4.2%', deltaDir: 'up' },
		{ label: 'ARR', value: '$510k', hint: 'Annual run rate', band: 'info', delta: '+11%', deltaDir: 'up' },
		{ label: 'Active Orgs', value: '142', hint: 'Tenant footprint', band: 'low', delta: '+6', deltaDir: 'up' },
		{ label: 'Total Players', value: '12.4k', hint: 'Platform headcount', band: 'low', delta: '+2.1%', deltaDir: 'up' },
		{ label: 'WAU/MAU', value: '68%', hint: 'Weekly / monthly', band: 'ok', delta: '—', deltaDir: 'flat' },
		{ label: 'ARPU', value: '$299', hint: 'Blended ARPU', band: 'info', delta: '+$12', deltaDir: 'up' },
		{ label: 'Gross Retention', value: '98%', hint: 'Logo gross', band: 'ok', delta: '+0.4pp', deltaDir: 'up' },
		{ label: 'LTV', value: '$12k', hint: 'Cohort average', band: 'info', delta: '+3%', deltaDir: 'up' },
	]);

	/** @type {SocMetric[]} */
	let strike13Security = $state([
		{ label: 'WAF Blocks', value: '1,402', hint: 'Edge policy · 24h', band: 'info', delta: '+112', deltaDir: 'up' },
		{ label: 'Failed Auth', value: '45', hint: 'Rolling 24h', band: 'med', delta: '−8%', deltaDir: 'down' },
		{ label: 'MFA Bypasses', value: '0', hint: 'Policy exceptions', band: 'ok', delta: '0', deltaDir: 'flat' },
		{ label: 'Vetting Pending', value: '14', hint: 'Background queue', band: 'med', delta: '+3', deltaDir: 'up' },
		{ label: 'Flagged Orgs', value: '2', hint: 'Compliance review', band: 'high', delta: '−1', deltaDir: 'down' },
		{ label: 'API Abuse', value: '12', hint: 'Throttle / WAF', band: 'med', delta: '+2', deltaDir: 'up' },
		{ label: 'Priv. Escalation', value: '0', hint: 'Elevation attempts', band: 'ok', delta: '0', deltaDir: 'flat' },
		{ label: 'Suspicious IPs', value: '4', hint: 'Threat intel feed', band: 'high', delta: '+1', deltaDir: 'up' },
	]);

	/** Growth / platform tiles (charts hydrate from Firestore aggregates). */
	const MOCK_KPI = /** @type {const} */ ({
		growth: { ltvCac: '4.2', churn: '1.2%', pipelineARR: '$1.8M', paybackMo: '14' },
		platform: { apiLatency: '42ms', uptime: '99.99%', dbReads: '1.2M', storage: '2.4 TB' },
	});

	/** @type {SocMetric[]} */
	const GROWTH_TILES = [
		{
			label: 'LTV:CAC',
			value: MOCK_KPI.growth.ltvCac,
			hint: 'Blended cohort',
			band: 'ok',
			delta: '+0.3',
			deltaDir: 'up',
		},
		{
			label: 'Churn',
			value: MOCK_KPI.growth.churn,
			hint: 'Logo + revenue',
			band: 'low',
			delta: '−0.1pp',
			deltaDir: 'down',
		},
		{
			label: 'Pipeline ARR',
			value: MOCK_KPI.growth.pipelineARR,
			hint: 'Weighted forecast',
			band: 'info',
			delta: '+$180k',
			deltaDir: 'up',
		},
		{
			label: 'CAC payback',
			value: `${MOCK_KPI.growth.paybackMo} mo`,
			hint: 'Months to recover',
			band: 'med',
			delta: '−1 mo',
			deltaDir: 'down',
		},
	];

	/** @type {SocMetric[]} */
	const PLATFORM_TILES = [
		{
			label: 'API latency',
			value: MOCK_KPI.platform.apiLatency,
			hint: 'p50 edge → API',
			band: 'ok',
			delta: '−4ms',
			deltaDir: 'down',
		},
		{
			label: 'Uptime',
			value: MOCK_KPI.platform.uptime,
			hint: 'Trailing 30d SLO',
			band: 'ok',
			delta: '+0.01%',
			deltaDir: 'up',
		},
		{
			label: 'DB reads',
			value: MOCK_KPI.platform.dbReads,
			hint: 'Firestore aggregate',
			band: 'info',
			delta: '+8%',
			deltaDir: 'up',
		},
		{
			label: 'Storage',
			value: MOCK_KPI.platform.storage,
			hint: 'Object + media vault',
			band: 'low',
			delta: '+120 GB',
			deltaDir: 'up',
		},
	];

	/** @typedef {{ label: string, value: number }} SeriesPoint */
	/** @typedef {'live' | 'mock'} ChartSource */

	let mauSeries = $state(/** @type {SeriesPoint[]} */ ([]));
	let revenueByTier = $state(/** @type {SeriesPoint[]} */ ([]));
	let playersBySport = $state(/** @type {SeriesPoint[]} */ ([]));

	let mauSource = $state(/** @type {ChartSource} */ ('mock'));
	let revenueSource = $state(/** @type {ChartSource} */ ('mock'));
	let sportSource = $state(/** @type {ChartSource} */ ('mock'));

	let liveFeed = $state(
		/** @type {{ id: string, action: string, targetEmail: string, details: string, createdAt: Date | null }[]} */ (
			[]
		),
	);
	let feedLoading = $state(false);
	let feedErr = $state('');

	$effect(() => {
		if (!browser) return;
		if (authStore.isLoading || !authStore.isAuthenticated) return;
		if (!authStore.user || !authStore.tenantId) return; // Strict truthiness guard for IDs

		let destroyed = false;
		feedLoading = true;
		feedErr = '';

		hydrateAdminOverview(db)
			.then((result) => {
				if (destroyed) return;
				mauSeries = result.mauSeries;
				mauSource = result.mauSource;
				revenueByTier = result.revenueByTier;
				revenueSource = result.revenueSource;
				playersBySport = result.playersBySport;
				sportSource = result.sportSource;
				liveFeed = result.liveFeed;
				feedErr = result.feedErr;
				feedLoading = false;
			})
			.catch((e) => {
				console.warn('[overview] hydrate failed', e);
				if (!destroyed) {
					feedErr = e instanceof Error ? e.message : 'Could not load overview data.';
					feedLoading = false;
				}
			});

		return () => {
			destroyed = true;
		};
	});

	let mauCanvasEl = $state(/** @type {HTMLCanvasElement | undefined} */ (undefined));
	let revenueCanvasEl = $state(/** @type {HTMLCanvasElement | undefined} */ (undefined));
	let sportCanvasEl = $state(/** @type {HTMLCanvasElement | undefined} */ (undefined));

	$effect(() => {
		if (!browser || !mauCanvasEl) return;
		const target = mauCanvasEl;
		const series = mauSeries;
		let destroyed = false;
		/** @type {(() => void) | null} */
		let destroyChart = null;

		mountMauLineChart(target, series, readOverviewCssVar)
			.then((destroy) => {
				if (destroyed) {
					destroy();
					return;
				}
				destroyChart = destroy;
			})
			.catch((e) => console.warn('[overview] MAU chart init failed', e));

		return () => {
			destroyed = true;
			destroyChart?.();
			destroyChart = null;
		};
	});

	$effect(() => {
		if (!browser || !revenueCanvasEl) return;
		const target = revenueCanvasEl;
		const series = revenueByTier;
		let destroyed = false;
		/** @type {(() => void) | null} */
		let destroyChart = null;

		mountRevenueDoughnutChart(target, series, readOverviewCssVar)
			.then((destroy) => {
				if (destroyed) {
					destroy();
					return;
				}
				destroyChart = destroy;
			})
			.catch((e) => console.warn('[overview] Revenue chart init failed', e));

		return () => {
			destroyed = true;
			destroyChart?.();
			destroyChart = null;
		};
	});

	$effect(() => {
		if (!browser || !sportCanvasEl) return;
		const target = sportCanvasEl;
		const series = playersBySport;
		let destroyed = false;
		/** @type {(() => void) | null} */
		let destroyChart = null;

		mountSportBarChart(target, series, readOverviewCssVar)
			.then((destroy) => {
				if (destroyed) {
					destroy();
					return;
				}
				destroyChart = destroy;
			})
			.catch((e) => console.warn('[overview] Sport chart init failed', e));

		return () => {
			destroyed = true;
			destroyChart?.();
			destroyChart = null;
		};
	});
</script>

<div
	class="cc-root tw-box-border tw-mx-auto tw-w-full tw-max-w-[1680px] tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-8"
	style="padding: var(--bento-pad-liquid);"
	data-admin-shell="true"
>
	<div class="xl:tw-col-span-8 tw-min-w-0 tw-flex tw-flex-col">
	{#snippet socMetric(kpi)}
		<article
			class="cc-soc-card"
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

	<header class="cc-hero">
		<div class="cc-hero__text">
			<span class="cc-eyebrow">Global admin · operations console</span>
			<h1
				class="tw-m-0 tw-!text-4xl tw-!font-black tw-!tracking-tighter tw-!text-white md:tw-!text-5xl"
				style="line-height: 1.08;"
			>
				Command center
			</h1>
			<p class="cc-lede">
				Dense statistical surfaces in the spirit of SOAR / SIEM control rooms: KPI ribbons, severity-banded
				cards, and live audit ingest. Charts — MAU <strong class="cc-lede-strong">{mauSource}</strong>, revenue
				<strong class="cc-lede-strong">{revenueSource}</strong>, sports
				<strong class="cc-lede-strong">{sportSource}</strong>.
			</p>
		</div>
		<div class="cc-hero__badges">
			<span class="cc-live" title="Telemetry and audit stream connected">
				<span class="cc-live__dot" aria-hidden="true"></span>
				Live ingest
			</span>
			<span class="cc-hero__meta">Last refresh · client</span>
		</div>
	</header>

	<div
		class="cc-tabs tw-flex tw-flex-wrap tw-gap-1 tw-border-b tw-border-white/10 tw-px-0 tw-py-0"
		role="tablist"
		aria-label="Command center departments"
	>
		{#each TAB_IDS as tid, idx (tid)}
			<button
				type="button"
				id="cc-tab-{tid}"
				class="cc-tab"
				class:cc-tab--active={activeTab === tid}
				role="tab"
				aria-selected={activeTab === tid}
				aria-controls="cc-panel-{tid}"
				tabindex={activeTab === tid ? 0 : -1}
				onclick={() => (activeTab = tid)}
			>
				{TAB_LABELS[idx]}
			</button>
		{/each}
	</div>

	<div class="cc-body tw-pb-12">
		<div class="cc-soc-ribbon" aria-label="Operations snapshot">
			{#each SOC_RIBBON as row (row.k)}
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

		{#if activeTab === 'executive'}
			<div
				class="cc-panel bento-grid bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12"
				id="cc-panel-executive"
				role="tabpanel"
				aria-labelledby="cc-tab-executive"
			>
			{#each strike13Executive as kpi (kpi.label)}
				<div class="bento-span-3 tw-min-w-0">
					{@render socMetric(kpi)}
				</div>
			{/each}

				<article class="cc-chart-card cc-chart-card--soc bento-span-12 tw-min-w-0">
					<header class="cc-chart-card__head">
					<div class="cc-chart-card__icon cc-chart-card__icon--indigo" aria-hidden="true">
						<Icon name={"data.trending" as IconName} />
					</div>
						<div>
							<h2 class="cc-chart-card__title">Master activation (MAU)</h2>
							<p class="cc-chart-card__sub">Trailing six months · enterprise growth signal</p>
							<span
								class="cc-src"
								class:cc-src--live={mauSource === 'live'}
								class:cc-src--mock={mauSource === 'mock'}
							>
								{mauSource === 'live' ? 'Live' : 'Synthetic'}
							</span>
						</div>
					</header>
					<div class="tw-relative tw-h-[350px] tw-min-w-0 tw-w-full">
						<canvas
							class="cc-canvas-fill"
							bind:this={mauCanvasEl}
							aria-label="Master activation line chart"
						></canvas>
					</div>
				</article>
			</div>
		{:else if activeTab === 'growth'}
			<div class="cc-panel bento-grid bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12" id="cc-panel-growth" role="tabpanel" aria-labelledby="cc-tab-growth">
			{#each GROWTH_TILES as kpi (kpi.label)}
				<div class="bento-span-3 tw-min-w-0">
					{@render socMetric(kpi)}
				</div>
			{/each}

				<div class="cc-chart-row bento-span-12 bento-grid bento-grid--12col bento-grid--liquid tw-min-w-0 tw-grid tw-grid-cols-1 lg:tw-grid-cols-12">
					<article class="cc-chart-card cc-chart-card--half cc-chart-card--soc bento-span-6 tw-min-w-0">
						<header class="cc-chart-card__head">
						<div class="cc-chart-card__icon cc-chart-card__icon--emerald" aria-hidden="true">
							<Icon name={"data.chart-pie" as IconName} />
						</div>
							<div>
								<h2 class="cc-chart-card__title">Revenue by tier</h2>
								<p class="cc-chart-card__sub">MRR composition</p>
								<span
									class="cc-src"
									class:cc-src--live={revenueSource === 'live'}
									class:cc-src--mock={revenueSource === 'mock'}
								>
									{revenueSource === 'live' ? 'Live' : 'Synthetic'}
								</span>
							</div>
						</header>
						<div class="tw-relative tw-h-[350px] tw-min-w-0 tw-w-full">
							<canvas
								class="cc-canvas-fill"
								bind:this={revenueCanvasEl}
								aria-label="Revenue doughnut chart"
							></canvas>
						</div>
					</article>

					<article class="cc-chart-card cc-chart-card--half cc-chart-card--soc bento-span-6 tw-min-w-0">
						<header class="cc-chart-card__head">
							<div class="cc-chart-card__icon cc-chart-card__icon--cyan" aria-hidden="true">
							<Icon name={"sport.soccer" as IconName} />
							</div>
							<div>
								<h2 class="cc-chart-card__title">Players by sport</h2>
								<p class="cc-chart-card__sub">Headcount distribution</p>
								<span
									class="cc-src"
									class:cc-src--live={sportSource === 'live'}
									class:cc-src--mock={sportSource === 'mock'}
								>
									{sportSource === 'live' ? 'Live' : 'Synthetic'}
								</span>
							</div>
						</header>
						<div class="tw-relative tw-h-[350px] tw-min-w-0 tw-w-full">
							<canvas
								class="cc-canvas-fill"
								bind:this={sportCanvasEl}
								aria-label="Players by sport bar chart"
							></canvas>
						</div>
					</article>
				</div>
			</div>
		{:else if activeTab === 'security'}
			<div class="cc-panel bento-grid bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12" id="cc-panel-security" role="tabpanel" aria-labelledby="cc-tab-security">
				{#each strike13Security as kpi (kpi.label)}
					<div class="bento-span-3 tw-min-w-0">
						{@render socMetric(kpi)}
					</div>
				{/each}
					<aside class="cc-soc-aside tw-col-span-12 lg:tw-col-span-4 tw-min-w-0" aria-label="Automation and orchestration">
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


			</div>
		{:else}
			<div class="cc-panel bento-grid bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12" id="cc-panel-platform" role="tabpanel" aria-labelledby="cc-tab-platform">
			{#each PLATFORM_TILES as kpi (kpi.label)}
				<div class="bento-span-3 tw-min-w-0">
					{@render socMetric(kpi)}
				</div>
			{/each}

				<div class="cc-platform-note bento-span-12 tw-min-w-0">
					<p>
						<Icon name={"status.info" as IconName} />
						KPI tiles above are fixed for executive review; charts on other tabs still hydrate from
						<code class="cc-code">analytics/platform_totals</code> when available.
					</p>
				</div>
			</div>
		{/if}
	</div>
	</div>
	
	<aside class="xl:tw-col-span-4 tw-min-w-0 tw-flex tw-flex-col tw-gap-6">
		<article class="cc-chart-card cc-chart-card--soc">
			<header class="cc-chart-card__head">
				<div class="cc-chart-card__icon cc-chart-card__icon--amber" aria-hidden="true">
					<Icon name={"status.warning" as IconName} />
				</div>
				<div>
					<h2 class="cc-chart-card__title">Action Inbox</h2>
					<p class="cc-chart-card__sub">Pending workflows</p>
				</div>
			</header>
			<div class="tw-p-4 tw-text-sm tw-text-vanguard-text-secondary">
				<ul class="tw-space-y-3 tw-m-0 tw-p-0" style="list-style: none;">
					<li class="tw-flex tw-justify-between tw-items-center">
						<span>Pending VPC requests</span>
						<strong class="tw-text-vanguard-text-primary tw-font-mono tw-text-lg">0</strong>
					</li>
					<li class="tw-flex tw-justify-between tw-items-center">
						<span>Past Due Stripe accounts</span>
						<strong class="tw-text-vanguard-text-primary tw-font-mono tw-text-lg">0</strong>
					</li>
				</ul>
			</div>
		</article>

		<article class="cc-feed-shell cc-feed-shell--soc">
			<header class="cc-feed-shell__head">
				<h2 class="cc-feed-shell__title">Live event stream</h2>
				<p class="cc-feed-shell__sub">
					<code class="cc-code">security_audit</code>
					· {liveFeed.length} events ingested
				</p>
			</header>
			{#if feedErr}
				<p class="cc-err cc-err--inline" role="alert">{feedErr}</p>
			{/if}
			{#if feedLoading && liveFeed.length === 0}
				<div class="cc-feed-empty">
					<Icon name={"status.loading" as IconName} class="cc-spin" />
					Loading audit stream…
				</div>
			{:else if liveFeed.length === 0}
				<div class="cc-feed-empty">
					<Icon name={"env.moon" as IconName} />
					No audit events yet.
				</div>
			{:else}
				<ol class="cc-feed-list">
					{#each liveFeed as ev (ev.id)}
						<li class="cc-feed-item cc-feed-item--{actionTone(ev.action)}">
						<span class="cc-feed-item__icon" aria-hidden="true">
							<Icon name={actionIcon(ev.action)} />
						</span>
							<div class="cc-feed-item__body">
								<div class="cc-feed-item__row">
									<span class="cc-feed-item__action">{prettyAction(ev.action)}</span>
									<span class="cc-feed-item__time">{relativeTime(ev.createdAt)}</span>
								</div>
								{#if ev.targetEmail}
									<span class="cc-feed-item__target">{ev.targetEmail}</span>
								{/if}
								{#if ev.details}
									<span class="cc-feed-item__details">{ev.details}</span>
								{/if}
							</div>
						</li>
					{/each}
				</ol>
			{/if}
		</article>
	</aside>
</div>

<style>
	/* Layout shell: height + overflow come from Tailwind on the root element */
	.cc-root {
		box-sizing: border-box;
	}

	.cc-err {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border-radius: 10px;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--danger-red, #b91c1c);
		background: rgba(185, 28, 28, 0.08);
		margin: 0 0 14px;
	}

	.cc-err--inline {
		margin: 0 0 12px;
	}

	.cc-hero {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		margin-bottom: 8px;
	}

	.cc-hero__text {
		min-width: 0;
	}

	.cc-eyebrow {
		display: block;
		font-size: 0.625rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.cc-hero__text > h1 {
		margin: 4px 0 6px;
	}

	.cc-lede {
		margin: 0;
		max-width: 72ch;
		font-size: 0.875rem;
		line-height: 1.45;
		color: var(--text-secondary);
	}

	.cc-lede-strong {
		font-weight: 800;
		color: #a5f3fc;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		font-size: 0.72em;
	}

	.cc-hero__badges {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 8px;
		flex-shrink: 0;
	}

	.cc-hero__meta {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.35);
		font-variant-numeric: tabular-nums;
	}

	/* Operations ribbon (SOAR / SIEM density) */
	.cc-soc-ribbon {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--bento-gap-sm);
		margin-bottom: var(--bento-gap-sm);
	}

	@media (min-width: 33rem) {
		.cc-soc-ribbon {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 64rem) {
		.cc-soc-ribbon {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.cc-soc-ribbon__cell {
		padding: 12px 14px;
		border-radius: 12px;
		background: linear-gradient(145deg, rgba(9, 9, 11, 0.92), rgba(24, 24, 27, 0.88));
		border: 1px solid rgba(20, 184, 166, 0.22);
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.35) inset,
			0 12px 28px rgba(0, 0, 0, 0.35);
	}

	.cc-soc-ribbon__metric {
		display: block;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(165, 243, 252, 0.85);
		margin-bottom: 4px;
	}

	.cc-soc-ribbon__value {
		display: block;
		font-size: 1.35rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		font-variant-numeric: tabular-nums;
		color: #fafafa;
		line-height: 1.1;
	}

	.cc-soc-ribbon__sub {
		display: block;
		margin-top: 4px;
		font-size: 0.68rem;
		font-weight: 600;
		line-height: 1.35;
		color: rgba(161, 161, 170, 0.95);
	}

	.cc-soc-legend {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 16px;
		margin: 0 0 18px;
		padding: 8px 12px;
		border-radius: 10px;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.06);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.45);
	}

	.cc-soc-legend__title {
		color: rgba(255, 255, 255, 0.55);
		margin-right: 4px;
	}

	.cc-soc-legend__items {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 14px;
	}

	.cc-soc-legend__items span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.cc-soc-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.cc-soc-dot--crit {
		background: #f87171;
		box-shadow: 0 0 10px rgba(248, 113, 113, 0.45);
	}
	.cc-soc-dot--high {
		background: #fb923c;
		box-shadow: 0 0 8px rgba(251, 146, 60, 0.35);
	}
	.cc-soc-dot--med {
		background: #facc15;
	}
	.cc-soc-dot--low {
		background: #4ade80;
	}
	.cc-soc-dot--ok {
		background: #34d399;
	}
	.cc-soc-dot--info {
		background: #14b8a6;
	}

	/* Severity-banded metric tiles � Sprint 1.1: liquid shadow + inner highlight */
	.cc-soc-card {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 16px 18px;
		border-radius: 14px;
		background: linear-gradient(180deg, rgba(12, 12, 14, 0.98), rgba(9, 9, 11, 0.99));
		background-image: linear-gradient(
			160deg,
			rgba(255, 255, 255, 0.035) 0%,
			rgba(255, 255, 255, 0) 60%
		);
		border: 1px solid rgba(148, 163, 184, 0.14);
		box-shadow: var(--shadow-liquid);
		border-left: 3px solid rgba(113, 113, 122, 0.6);
		min-width: 0;
	}

	.cc-soc-card--crit {
		border-left-color: #ef4444;
		box-shadow:
			0 14px 36px rgba(0, 0, 0, 0.4),
			0 0 24px rgba(239, 68, 68, 0.12);
	}
	.cc-soc-card--high {
		border-left-color: #f97316;
		box-shadow:
			0 14px 36px rgba(0, 0, 0, 0.4),
			0 0 20px rgba(249, 115, 22, 0.1);
	}
	.cc-soc-card--med {
		border-left-color: #eab308;
	}
	.cc-soc-card--low {
		border-left-color: #84cc16;
	}
	.cc-soc-card--ok {
		border-left-color: #22c55e;
	}
	.cc-soc-card--info {
		border-left-color: #14b8a6;
	}

	.cc-soc-card__top {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 10px;
	}

	.cc-soc-card__label {
		font-size: 0.625rem;
		font-weight: 800;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: rgba(161, 161, 170, 0.95);
	}

	.cc-soc-card__delta {
		font-size: 0.65rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.cc-soc-card__delta--up {
		color: #67e8f9;
	}
	.cc-soc-card__delta--down {
		color: #fde68a;
	}
	.cc-soc-card__delta--flat {
		color: #71717a;
	}

	.cc-soc-card__value {
		font-size: 1.35rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		font-variant-numeric: tabular-nums;
		color: #fafafa;
		line-height: 1.15;
	}

	@media (min-width: 1024px) {
		.cc-soc-card__value {
			font-size: 1.5rem;
		}
	}

	.cc-soc-card--ok .cc-soc-card__value {
		color: #86efac;
	}

	.cc-soc-card__hint {
		font-size: 0.72rem;
		font-weight: 600;
		line-height: 1.35;
		color: rgba(113, 113, 122, 0.98);
	}

	.cc-soc-split {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--bento-gap-md);
		align-items: start;
		margin-bottom: var(--bento-gap-lg);
	}

	@media (min-width: 69rem) {
		.cc-soc-split {
			grid-template-columns: minmax(0, 1fr) minmax(240px, 300px);
		}
	}

	.cc-soc-aside {
		padding: 16px 18px;
		border-radius: 14px;
		background: rgba(9, 9, 11, 0.75);
		border: 1px solid rgba(20, 184, 166, 0.18);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
	}

	.cc-soc-aside__head {
		margin-bottom: 14px;
	}

	.cc-soc-aside__eyebrow {
		display: block;
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(20, 184, 166, 0.85);
		margin-bottom: 4px;
	}

	.cc-soc-aside__title {
		margin: 0;
		font-size: 1rem;
		font-weight: 900;
		letter-spacing: -0.02em;
		color: #fafafa;
	}

	.cc-soc-aside__sub {
		margin: 6px 0 0;
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1.4;
		color: rgba(161, 161, 170, 0.95);
	}

	.cc-soc-aside__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.cc-soc-aside__list li {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		padding: 10px 0;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		font-size: 0.78rem;
	}

	.cc-soc-aside__list li:first-child {
		border-top: none;
		padding-top: 0;
	}

	.cc-soc-aside__k {
		font-weight: 600;
		color: rgba(212, 212, 216, 0.95);
	}

	.cc-soc-aside__v {
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: #e4e4e7;
	}

	.cc-chart-card--soc {
		border-top: 2px solid rgba(20, 184, 166, 0.35);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.06) inset,
			0 18px 40px rgba(0, 0, 0, 0.18);
	}

	:global(html.dark) .cc-chart-card--soc {
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.04) inset,
			0 18px 48px rgba(0, 0, 0, 0.45);
	}

	.cc-chart-card__icon--cyan {
		background: rgba(20, 184, 166, 0.2);
		color: #14b8a6;
	}

	:global(html.dark) .cc-chart-card__icon--cyan {
		background: rgba(20, 184, 166, 0.22);
		color: #a5f3fc;
	}

	.cc-feed-shell--soc {
		border-top: 2px solid rgba(99, 102, 241, 0.35);
		background: rgba(9, 9, 11, 0.35);
	}

	:global(html.dark) .cc-feed-shell--soc {
		background: rgba(9, 9, 11, 0.72);
		border-color: rgba(129, 140, 248, 0.35);
	}

	.cc-feed-shell--soc .cc-feed-shell__title {
		font-family: ui-monospace, 'Cascadia Code', 'Segoe UI Mono', monospace;
		letter-spacing: -0.03em;
	}

	.cc-live {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 999px;
		font-size: 0.6875rem;
		font-weight: 700;
		color: #047857;
		background: rgba(34, 197, 94, 0.1);
		flex-shrink: 0;
	}

	:global(html.dark) .cc-live {
		color: #a7f3d0;
		background: rgba(34, 197, 94, 0.16);
	}

	.cc-live__dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #22c55e;
		animation: cc-pulse 1.8s ease-in-out infinite;
	}

	@keyframes cc-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45);
		}
		50% {
			box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
		}
	}

	.cc-tabs {
		flex-shrink: 0;
		margin-bottom: 10px;
		padding-top: 8px;
		position: sticky;
		top: 0;
		z-index: 8;
		/* Opaque bar so scrolling KPIs / charts never show through the sticky tabs */
		background-color: var(--ec-canvas-bg, #09090b);
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.12);
	}

	:global(html.dark) .cc-tabs {
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	.cc-tab {
		appearance: none;
		margin: 0;
		cursor: pointer;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		padding: 10px 14px 12px;
		color: rgba(255, 255, 255, 0.45);
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		border-radius: 0;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.cc-tab:hover {
		color: rgba(255, 255, 255, 0.72);
	}

	.cc-tab:focus-visible {
		outline: 2px solid var(--brand-primary, #6366f1);
		outline-offset: 2px;
		border-radius: 4px;
	}

	.cc-tab--active {
		color: #fafafa;
		border-bottom-color: rgba(255, 255, 255, 0.85);
	}

	.cc-body {
		overscroll-behavior: contain;
	}

	.cc-panel {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding-bottom: 32px;
	}

	.cc-kpi-grid {
		display: grid;
		gap: 12px;
	}

	.cc-kpi-grid--3 {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	@media (max-width: 900px) {
		.cc-kpi-grid--3 {
			grid-template-columns: 1fr;
		}
	}

	.cc-kpi {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 14px 16px;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.55);
		backdrop-filter: blur(12px);
		border: 1px solid var(--glass-border, rgba(0, 0, 0, 0.06));
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.35) inset;
	}

	:global(html.dark) .cc-kpi {
		background: rgba(24, 24, 27, 0.72);
		border-color: rgba(255, 255, 255, 0.08);
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset;
	}

	.cc-kpi__label {
		font-size: 0.625rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.cc-kpi__value {
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary);
		line-height: 1.1;
	}

	.cc-kpi__value--ok {
		color: #15803d;
	}

	:global(html.dark) .cc-kpi__value--ok {
		color: #86efac;
	}

	.cc-kpi__hint {
		font-size: 0.7rem;
		color: var(--text-secondary);
		line-height: 1.3;
	}

	.cc-chart-card {
		border-radius: 16px;
		padding: 16px 18px 18px;
		background: rgba(255, 255, 255, 0.5);
		backdrop-filter: blur(14px);
		border: 1px solid var(--glass-border, rgba(0, 0, 0, 0.06));
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.4) inset;
	}

	:global(html.dark) .cc-chart-card {
		background: rgba(24, 24, 27, 0.72);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.cc-chart-row {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
		min-width: 0;
	}

	@media (max-width: 960px) {
		.cc-chart-row {
			grid-template-columns: 1fr;
		}
	}

	.cc-chart-card--half {
		min-width: 0;
	}

	.cc-chart-card__head {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		margin-bottom: 12px;
	}

	.cc-chart-card__icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
		flex-shrink: 0;
	}

	.cc-chart-card__icon--indigo {
		background: rgba(99, 102, 241, 0.2);
		color: #4f46e5;
	}

	.cc-chart-card__icon--emerald {
		background: rgba(16, 185, 129, 0.18);
		color: #059669;
	}

	.cc-chart-card__icon--rose {
		background: rgba(244, 63, 94, 0.18);
		color: #e11d48;
	}

	:global(html.dark) .cc-chart-card__icon--indigo {
		background: rgba(99, 102, 241, 0.28);
		color: #c7d2fe;
	}

	:global(html.dark) .cc-chart-card__icon--emerald {
		background: rgba(16, 185, 129, 0.24);
		color: #a7f3d0;
	}

	:global(html.dark) .cc-chart-card__icon--rose {
		background: rgba(244, 63, 94, 0.26);
		color: #fda4af;
	}

	.cc-chart-card__title {
		margin: 0;
		font-size: 1rem;
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	.cc-chart-card__sub {
		margin: 2px 0 0;
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.cc-src {
		display: inline-block;
		margin-top: 6px;
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.cc-src--live {
		color: #10b981;
		background: rgba(16, 185, 129, 0.12);
	}

	.cc-src--mock {
		color: #f59e0b;
		background: rgba(245, 158, 11, 0.12);
	}

	.cc-canvas-fill {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}

	.cc-feed-shell {
		border-radius: 16px;
		padding: 16px 18px 20px;
		background: rgba(255, 255, 255, 0.45);
		backdrop-filter: blur(14px);
		border: 1px solid var(--glass-border, rgba(0, 0, 0, 0.06));
	}

	:global(html.dark) .cc-feed-shell {
		background: rgba(9, 9, 11, 0.55);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.cc-feed-shell__head {
		margin-bottom: 14px;
	}

	.cc-feed-shell__title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.cc-feed-shell__sub {
		margin: 4px 0 0;
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.cc-code {
		padding: 1px 6px;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.06);
		font-size: 0.75rem;
		font-weight: 700;
	}

	:global(html.dark) .cc-code {
		background: rgba(255, 255, 255, 0.08);
	}

	.cc-feed-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 48px 16px;
		color: var(--text-secondary);
		font-weight: 600;
		font-size: 0.875rem;
	}

	.cc-spin {
		animation: cc-spin 1s linear infinite;
	}

	@keyframes cc-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.cc-feed-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.cc-feed-item {
		display: flex;
		gap: 12px;
		padding: 12px 14px;
		border-radius: 12px;
		background: rgba(0, 0, 0, 0.03);
	}

	:global(html.dark) .cc-feed-item {
		background: rgba(255, 255, 255, 0.04);
	}

	.cc-feed-item--success {
		box-shadow: inset 3px 0 0 #22c55e;
	}
	.cc-feed-item--danger {
		box-shadow: inset 3px 0 0 #ef4444;
	}
	.cc-feed-item--warn {
		box-shadow: inset 3px 0 0 #f59e0b;
	}
	.cc-feed-item--info {
		box-shadow: inset 3px 0 0 #6366f1;
	}

	.cc-feed-item__icon {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.05);
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.cc-feed-item__body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.cc-feed-item__row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 10px;
	}

	.cc-feed-item__action {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.cc-feed-item__time {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.cc-feed-item__target {
		font-size: 0.8rem;
		font-weight: 600;
		word-break: break-all;
	}

	.cc-feed-item__details {
		font-size: 0.78rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.cc-platform-note {
		padding: 16px 18px;
		border-radius: 14px;
		background: rgba(99, 102, 241, 0.08);
		border: 1px solid rgba(99, 102, 241, 0.2);
		color: var(--text-primary);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.cc-platform-note p {
		margin: 0;
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}

	/* ── Mobile progressive disclosure (< 768px) ─────────────────────────────
	   Keep the KPI tiles as the primary surface; collapse the verbose hero
	   text and compress chart heights so the page is scannable on one screen.
	   Bottom padding reserves space for the MobileTabBar.
	 ─────────────────────────────────────────────────────────────────────────── */
	@media (max-width: 767.98px) {
		.cc-root {
			padding-bottom: calc(7rem + env(safe-area-inset-bottom, 0px));
			padding-left: 0.75rem;
			padding-right: 0.75rem;
		}

		/* Hide verbose hero description; keep only the heading */
		.cc-lede {
			display: none;
		}

		.cc-hero__badges {
			display: none;
		}

		.cc-hero__text h1 {
			font-size: 1.5rem !important;
		}

		/* SOC ribbon: horizontal scroll instead of grid */
		.cc-soc-ribbon {
			display: flex;
			flex-direction: row;
			overflow-x: auto;
			scrollbar-width: none;
			gap: 8px;
			padding-bottom: 4px;
		}

		.cc-soc-ribbon__cell {
			flex: 0 0 auto;
			min-width: 100px;
		}

		/* Compress chart heights on mobile */
		.tw-h-\[350px\] {
			height: 200px !important;
		}

		.tw-h-\[260px\] {
			height: 180px !important;
		}

		/* Full-width chart row on mobile */
		.cc-chart-row {
			flex-direction: column;
		}

		.cc-chart-card--half {
			width: 100%;
		}
	}

	/* Reserve bottom space on tablet too (for tab bar) */
	@media (max-width: 1023.98px) {
		.cc-root {
			padding-bottom: calc(7rem + env(safe-area-inset-bottom, 0px));
		}
	}
</style>
