<script lang="ts">
	import type { PrintSection } from './acquisitionContent.js';

	interface Props {
		section: PrintSection;
		breakBefore?: boolean;
	}

	let { section, breakBefore = false }: Props = $props();
</script>

<section
	class="acq-print-section"
	class:acq-print-section--break={breakBefore}
	aria-labelledby="print-{section.id}"
>
	<h2 class="acq-print-section__title" id="print-{section.id}">{section.title}</h2>

	{#if section.lead}
		<blockquote class="acq-print-section__lead">{section.lead}</blockquote>
	{/if}

	{#each section.paragraphs ?? [] as para}
		<p class="acq-print-section__p">{para}</p>
	{/each}

	{#if section.bullets?.length}
		<ul class="acq-print-section__ul">
			{#each section.bullets as item}
				<li>{item}</li>
			{/each}
		</ul>
	{/if}

	{#if section.tableRows?.length}
		<table class="acq-print-section__table">
			{#if section.tableHeaders}
				<thead>
					<tr>
						<th>{section.tableHeaders[0]}</th>
						<th>{section.tableHeaders[1]}</th>
					</tr>
				</thead>
			{/if}
			<tbody>
				{#each section.tableRows as [a, b]}
					<tr>
						<td>{a}</td>
						<td>{b}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<style>
	.acq-print-section {
		margin-bottom: 1.35rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #334155;
	}

	.acq-print-section:last-child {
		border-bottom: none;
	}

	.acq-print-section__title {
		margin: 0 0 0.65rem;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #fbbf24;
	}

	.acq-print-section__lead {
		margin: 0 0 0.75rem;
		padding: 0.65rem 0.85rem;
		border-left: 3px solid #fbbf24;
		background: rgb(51 65 85 / 0.25);
		font-size: 0.9rem;
		line-height: 1.5;
		color: #e2e8f0;
	}

	.acq-print-section__p {
		margin: 0 0 0.55rem;
		color: #cbd5e1;
	}

	.acq-print-section__ul {
		margin: 0;
		padding-left: 1.1rem;
		color: #cbd5e1;
	}

	.acq-print-section__ul li {
		margin-bottom: 0.35rem;
	}

	.acq-print-section__table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.82rem;
		margin-top: 0.35rem;
	}

	.acq-print-section__table th,
	.acq-print-section__table td {
		border: 1px solid #334155;
		padding: 0.45rem 0.55rem;
		text-align: left;
		vertical-align: top;
	}

	.acq-print-section__table th {
		background: rgb(51 65 85 / 0.35);
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.62rem;
		letter-spacing: 0.08em;
		color: #fbbf24;
	}
</style>
