<script lang="ts">
	import AcquisitionPrintLayout from '$lib/components/marketing/acquisition/AcquisitionPrintLayout.svelte';
	import AcquisitionPrintSection from '$lib/components/marketing/acquisition/AcquisitionPrintSection.svelte';
	import { EXECUTIVE_BRIEF_SECTIONS, WIN_MESSAGE } from '$lib/components/marketing/acquisition/acquisitionContent.js';

	export const prerender = true;

	let { data } = $props();
</script>

<svelte:head>
	<title>SSTracker — Executive brief (print)</title>
</svelte:head>

<AcquisitionPrintLayout
	title="Executive brief"
	subtitle={WIN_MESSAGE}
	buildDate={data.buildDate}
	shortSha={data.shortSha}
>
	{#each EXECUTIVE_BRIEF_SECTIONS as section, i (section.id)}
		<AcquisitionPrintSection section={section} breakBefore={i === 4} />
	{/each}
</AcquisitionPrintLayout>
