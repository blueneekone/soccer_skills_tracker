<script>
	import '$lib/styles/workspace-soc-dashboard.css';

	/**
	 * @typedef {{ k: string, v: string, s: string }} RibbonRow
	 */

	let {
		eyebrow = '',
		title = '',
		lede = '',
		ribbon = /** @type {RibbonRow[]} */ ([]),
		showLegend = true,
		liveLabel = 'Live ingest',
		metaLine = 'Last refresh · client',
		/** @type {import('svelte').Snippet | undefined} */
		children,
	} = $props();
</script>

<div class="wsd-root tw-w-full tw-max-w-[1680px] tw-mx-auto tw-box-border">
	<header class="wsd-hero">
		<div class="wsd-hero__text">
			{#if eyebrow}
				<span class="wsd-eyebrow">{eyebrow}</span>
			{/if}
			<h2 class="wsd-title">{title}</h2>
			{#if lede}
				<p class="wsd-lede">{lede}</p>
			{/if}
		</div>
		<div class="wsd-hero__badges">
			<span class="wsd-live">
				<span class="wsd-live__dot" aria-hidden="true"></span>
				{liveLabel}
			</span>
			<span class="wsd-hero__meta">{metaLine}</span>
		</div>
	</header>

	{#if ribbon.length > 0}
		<div class="wsd-ribbon" aria-label="Operations snapshot">
			{#each ribbon as row (row.k)}
				<div class="wsd-ribbon__cell">
					<span class="wsd-ribbon__metric">{row.k}</span>
					<span class="wsd-ribbon__value">{row.v}</span>
					<span class="wsd-ribbon__sub">{row.s}</span>
				</div>
			{/each}
		</div>
	{/if}

	{#if showLegend}
		<p class="wsd-legend">
			<span class="wsd-legend__title">Severity key</span>
			<span class="wsd-legend__items">
				<span><i class="wsd-dot wsd-dot--crit"></i> critical</span>
				<span><i class="wsd-dot wsd-dot--high"></i> high</span>
				<span><i class="wsd-dot wsd-dot--med"></i> medium</span>
				<span><i class="wsd-dot wsd-dot--low"></i> low</span>
				<span><i class="wsd-dot wsd-dot--ok"></i> steady</span>
				<span><i class="wsd-dot wsd-dot--info"></i> info</span>
			</span>
		</p>
	{/if}

	<div class="wsd-body">
		{@render children?.()}
	</div>
</div>
