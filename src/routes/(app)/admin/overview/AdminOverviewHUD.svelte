<script lang="ts">
	import type { AdminOverviewEngine, TabId } from './AdminOverviewEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { TAB_IDS, TAB_LABELS } from './AdminOverviewEngine.svelte.js';
	import { actionIcon, actionTone, prettyAction, relativeTime } from '$lib/admin/overviewFeed.js';

	let { engine, area }: { engine: AdminOverviewEngine, area: 'header' | 'sidebar' } = $props();
</script>

{#if area === 'header'}
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
				cards, and live audit ingest. Charts — MAU, revenue, sports.
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
		class="tw-flex tw-flex-wrap tw-gap-2 tw-rounded-lg tw-border tw-border-slate-800 tw-bg-slate-900/60 tw-p-2 tw-mt-4 tw-mb-6"
		role="tablist"
		aria-label="Command center departments"
	>
		{#each TAB_IDS as tid, idx (tid)}
			<button
				type="button"
				id="cc-tab-{tid}"
				class="tab-nav focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-teal-500"
				class:tab-nav--active={engine.activeTab === tid}
				role="tab"
				aria-selected={engine.activeTab === tid}
				aria-controls="cc-panel-{tid}"
				tabindex={engine.activeTab === tid ? 0 : -1}
				onclick={() => (engine.activeTab = tid as TabId)}
			>
				{TAB_LABELS[idx]}
			</button>
		{/each}
	</div>
{:else}
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
				· {engine.liveFeed.length} events ingested
			</p>
		</header>
		{#if engine.feedErr}
			<p class="cc-err cc-err--inline" role="alert">{engine.feedErr}</p>
		{/if}
		{#if engine.feedLoading && engine.liveFeed.length === 0}
			<div class="cc-feed-empty">
				<Icon name={"status.loading" as IconName} class="cc-spin" />
				Loading audit stream…
			</div>
		{:else if engine.liveFeed.length === 0}
			<div class="cc-feed-empty">
				<Icon name={"env.moon" as IconName} />
				No audit events yet.
			</div>
		{:else}
			<ol class="cc-feed-list">
				{#each engine.liveFeed as ev (ev.id)}
					<li class="cc-feed-item cc-feed-item--{actionTone(ev.action)}">
					<span class="cc-feed-item__icon" aria-hidden="true">
						<Icon name={actionIcon(ev.action)} />
					</span>
						<div class="cc-feed-item__body tw-min-w-0">
							<div class="cc-feed-item__row">
								<span class="cc-feed-item__action tw-break-words tw-whitespace-normal">{prettyAction(ev.action)}</span>
								<span class="cc-feed-item__time tw-whitespace-nowrap tw-flex-shrink-0">{relativeTime(ev.createdAt)}</span>
							</div>
							{#if ev.targetEmail}
								<span class="cc-feed-item__target tw-break-words tw-whitespace-normal">{ev.targetEmail}</span>
							{/if}
							{#if ev.details}
								<span class="cc-feed-item__details tw-break-words tw-whitespace-normal">{ev.details}</span>
							{/if}
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</article>
{/if}
