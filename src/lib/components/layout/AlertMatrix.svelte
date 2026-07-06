<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { AdminOverviewEngine } from '../../../routes/(app)/admin/overview/AdminOverviewEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { actionIcon, actionTone, prettyAction, relativeTime } from '$lib/admin/overviewFeed.js';
	import '../../../routes/(app)/admin/overview/admin-overview.css';

	let engine = $state<AdminOverviewEngine | null>(null);

	$effect(() => {
		if (authStore.role === 'global_admin' || authStore.role === 'super_admin') {
			if (!engine) {
				const e = new AdminOverviewEngine();
				e.subscribe();
				engine = e;
			}
		} else {
			engine = null;
		}
	});
</script>

<!--
	AlertMatrix — Pane 3: Global Alert Matrix / Telemetry Rail.

	Renders on ultra-wide (2xl: 1536px+) viewports only.
	Typography: Geist Mono via tw-font-mono — required for technical data readouts.
	Color tokens: Void Black bg-[#0B0F19], border-slate-800, text-slate-300/400.
-->
<aside
	class="tw-hidden 2xl:tw-flex 2xl:tw-flex-col tw-w-96 tw-flex-shrink-0 tw-border-l tw-border-slate-800 tw-bg-[#0B0F19] tw-p-[clamp(16px,2vw,24px)] tw-overflow-y-auto tw-gap-[clamp(16px,2vw,24px)]"
	aria-label="Global Alert Matrix"
>
	<header
		class="tw-font-mono tw-text-xs tw-tracking-widest tw-uppercase tw-text-[#D4D4D8]"
	>
		Global Alert Matrix
	</header>

	{#if engine}
		<article class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-[clamp(16px,2vw,24px)] tw-mt-2">
			<header class="tw-flex tw-items-start tw-gap-3 tw-mb-4">
				<div class="tw-bg-amber-500/20 tw-text-amber-500 tw-p-2" aria-hidden="true">
					<Icon name={"status.warning" as IconName} />
				</div>
				<div>
					<h2 class="tw-text-[#FAFAFA] tw-font-bold tw-text-base tw-m-0">Action Inbox</h2>
					<p class="tw-text-[#D4D4D8] tw-text-xs tw-m-0 tw-mt-1">Pending workflows</p>
				</div>
			</header>
			<div class="tw-text-sm tw-text-[#D4D4D8]">
				<ul class="tw-space-y-3 tw-m-0 tw-p-0" style="list-style: none;">
					<li class="tw-flex tw-justify-between tw-items-center">
						<span>Pending VPC requests</span>
						<strong class="tw-text-[#FAFAFA] tw-font-mono tw-text-lg">0</strong>
					</li>
					<li class="tw-flex tw-justify-between tw-items-center">
						<span>Past Due Stripe accounts</span>
						<strong class="tw-text-[#FAFAFA] tw-font-mono tw-text-lg">0</strong>
					</li>
				</ul>
			</div>
		</article>

		<article class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-[clamp(16px,2vw,24px)]">
			<header class="tw-flex tw-flex-col tw-gap-1 tw-mb-4">
				<h2 class="tw-text-[#FAFAFA] tw-font-bold tw-text-base tw-m-0">Live event stream</h2>
				<p class="tw-text-[#D4D4D8] tw-text-xs tw-m-0">
					<code class="tw-bg-slate-800 tw-px-1 tw-py-0.5 tw-text-[10px]">security_audit</code>
					· {engine.liveFeed.length} events ingested
				</p>
			</header>
			{#if engine.feedErr}
				<p class="cc-err cc-err--inline" role="alert">{engine.feedErr}</p>
			{/if}
			{#if engine.feedLoading && engine.liveFeed.length === 0}
				<div class="cc-feed-empty tw-text-[#D4D4D8]">
					<Icon name={"status.loading" as IconName} class="cc-spin" />
					Loading audit stream…
				</div>
			{:else if engine.liveFeed.length === 0}
				<div class="cc-feed-empty tw-text-[#D4D4D8]">
					<Icon name={"env.moon" as IconName} />
					No audit events yet.
				</div>
			{:else}
				<ol class="cc-feed-list tw-mt-4">
					{#each engine.liveFeed as ev (ev.id)}
						<li class="cc-feed-item cc-feed-item--{actionTone(ev.action)}">
						<span class="cc-feed-item__icon" aria-hidden="true">
							<Icon name={actionIcon(ev.action)} />
						</span>
							<div class="cc-feed-item__body tw-min-w-0">
								<div class="cc-feed-item__row">
									<span class="cc-feed-item__action tw-break-words tw-whitespace-normal tw-text-[#FAFAFA]">{prettyAction(ev.action)}</span>
									<span class="cc-feed-item__time tw-whitespace-nowrap tw-flex-shrink-0 tw-text-[#A1A1AA]">{relativeTime(ev.createdAt)}</span>
								</div>
								{#if ev.targetEmail}
									<span class="cc-feed-item__target tw-break-words tw-whitespace-normal tw-text-[#D4D4D8]">{ev.targetEmail}</span>
								{/if}
								{#if ev.details}
									<span class="cc-feed-item__details tw-break-words tw-whitespace-normal tw-text-[#D4D4D8]">{ev.details}</span>
								{/if}
							</div>
						</li>
					{/each}
				</ol>
			{/if}
		</article>
	{:else}
		<ul class="tw-flex tw-flex-col tw-gap-2 tw-list-none tw-p-0 tw-m-0 tw-mt-4">
			<li
				class="tw-px-3 tw-py-2 tw-bg-slate-900 tw-border tw-border-slate-800 tw-rounded-md tw-text-sm tw-font-mono tw-text-[#D4D4D8] hover:tw-bg-slate-800 hover:tw-border-slate-700 tw-transition-colors tw-duration-150 tw-ease-out"
			>
				SafeSport Intercept: Clear
			</li>
			<li
				class="tw-px-3 tw-py-2 tw-bg-slate-900 tw-border tw-border-slate-800 tw-rounded-md tw-text-sm tw-font-mono tw-text-[#D4D4D8] hover:tw-bg-slate-800 hover:tw-border-slate-700 tw-transition-colors tw-duration-150 tw-ease-out"
			>
				Tomorrow.io: Optimal
			</li>
			<li
				class="tw-px-3 tw-py-2 tw-bg-slate-900 tw-border tw-border-slate-800 tw-rounded-md tw-text-sm tw-font-mono tw-text-[#D4D4D8] hover:tw-bg-slate-800 hover:tw-border-slate-700 tw-transition-colors tw-duration-150 tw-ease-out"
			>
				VPC Bottlenecks: Nominal
			</li>
			<li
				class="tw-px-3 tw-py-2 tw-bg-slate-900 tw-border tw-border-slate-800 tw-rounded-md tw-text-sm tw-font-mono tw-text-[#D4D4D8] hover:tw-bg-slate-800 hover:tw-border-slate-700 tw-transition-colors tw-duration-150 tw-ease-out"
			>
				Stripe: Nominal
			</li>
		</ul>
	{/if}
</aside>
