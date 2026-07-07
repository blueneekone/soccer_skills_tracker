<script lang="ts">
	import type { AdminOverviewEngine, TabId } from './AdminOverviewEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { TAB_IDS, TAB_LABELS } from './AdminOverviewEngine.svelte.js';
	import { actionIcon, actionTone, prettyAction, relativeTime } from '$lib/admin/overviewFeed.js';

	let { engine }: { engine: AdminOverviewEngine } = $props();
</script>
	<header class="cc-hero">
		<div class="cc-hero__text">
			<span class="cc-eyebrow">Global admin · operations console</span>
			<h1
				class="tw-m-0 tw-!text-4xl tw-!font-black tw-!tracking-tighter tw-!text-[#FAFAFA] md:tw-!text-5xl"
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
		class="tw-flex tw-flex-wrap tw-gap-2 tw-rounded-lg tw-border tw-border-slate-800 tw-bg-[#0B0F19] tw-p-2 tw-mt-4 tw-mb-6"
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
