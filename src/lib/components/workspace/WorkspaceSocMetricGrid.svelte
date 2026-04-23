<script>
	import '$lib/styles/workspace-soc-dashboard.css';

	/**
	 * @typedef {'crit' | 'high' | 'med' | 'low' | 'ok' | 'info'} SocBand
	 * @typedef {{ label: string, value: string, hint: string, band?: SocBand, delta?: string, deltaDir?: 'up' | 'down' | 'flat' }} SocMetric
	 */

	let {
		metrics = /** @type {SocMetric[]} */ ([]),
		gridClass = 'tw-grid-cols-1 md:tw-grid-cols-2 xl:tw-grid-cols-4',
	} = $props();
</script>

<div class="wsd-metric-grid tw-grid {gridClass}">
	{#each metrics as m (m.label)}
		<article
			class="wsd-metric"
			class:wsd-metric--crit={m.band === 'crit'}
			class:wsd-metric--high={m.band === 'high'}
			class:wsd-metric--med={m.band === 'med'}
			class:wsd-metric--low={m.band === 'low'}
			class:wsd-metric--ok={m.band === 'ok'}
			class:wsd-metric--info={m.band === 'info' || !m.band}
		>
			<div class="wsd-metric__top">
				<span class="wsd-metric__label">{m.label}</span>
				{#if m.delta}
					<span
						class="wsd-metric__delta"
						class:wsd-metric__delta--up={m.deltaDir === 'up'}
						class:wsd-metric__delta--down={m.deltaDir === 'down'}
						class:wsd-metric__delta--flat={m.deltaDir === 'flat' || !m.deltaDir}
						>{m.delta}</span
					>
				{/if}
			</div>
			<span class="wsd-metric__value">{m.value}</span>
			<span class="wsd-metric__hint">{m.hint}</span>
		</article>
	{/each}
</div>
