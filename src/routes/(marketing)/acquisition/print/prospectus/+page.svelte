<script lang="ts">
	import AcquisitionPrintLayout from '$lib/components/marketing/acquisition/AcquisitionPrintLayout.svelte';
	import AcquisitionPrintSection from '$lib/components/marketing/acquisition/AcquisitionPrintSection.svelte';
	import { PROSPECTUS_PRINT_SECTIONS } from '$lib/components/marketing/acquisition/acquisitionContent.js';

	export const prerender = true;

	let { data } = $props();
</script>

<svelte:head>
	<title>SSTracker — Acquisition prospectus (print)</title>
</svelte:head>

<AcquisitionPrintLayout
	title="Acquisition prospectus"
	subtitle="Confidential — for qualified acquirer diligence"
	buildDate={data.buildDate}
	shortSha={data.shortSha}
>
	{#each PROSPECTUS_PRINT_SECTIONS as section, i (section.id)}
		<AcquisitionPrintSection section={section} breakBefore={i > 0 && i % 3 === 0} />
	{/each}
</AcquisitionPrintLayout>
