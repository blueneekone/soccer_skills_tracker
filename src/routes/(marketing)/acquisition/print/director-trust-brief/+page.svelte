<script lang="ts">
	import AcquisitionPrintLayout from '$lib/components/marketing/acquisition/AcquisitionPrintLayout.svelte';
	import AcquisitionPrintSection from '$lib/components/marketing/acquisition/AcquisitionPrintSection.svelte';
	import {
		DIRECTOR_TRUST_BRIEF_SECTIONS,
		DIRECTOR_TRUST_BRIEF_LEAD,
	} from '$lib/components/marketing/acquisition/acquisitionContent.js';

	export const prerender = true;

	let { data } = $props();
</script>

<svelte:head>
	<title>SSTracker — Director trust brief (print)</title>
</svelte:head>

<AcquisitionPrintLayout
	title="Registration resilience"
	subtitle={DIRECTOR_TRUST_BRIEF_LEAD}
	buildDate={data.buildDate}
	shortSha={data.shortSha}
>
	{#each DIRECTOR_TRUST_BRIEF_SECTIONS as section, i (section.id)}
		<AcquisitionPrintSection section={section} breakBefore={i === 3} />
	{/each}
</AcquisitionPrintLayout>
