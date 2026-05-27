<script lang="ts">
	import OperativePathway from '$lib/components/player/OperativePathway.svelte';

	/** @type {{ level?: number }} */
	let { level = 1 } = $props();

	const paddedLevel = $derived(String(Math.max(1, Math.floor(Number(level) || 1))).padStart(2, '0'));
</script>

<section
	class="opp-preview opp-preview--void pd-os-deck bento-span-12"
	aria-label="Mission rewards pathway"
	data-region="operative-pathway-preview"
>
	<header class="pd-hq-section-head opp-preview__head">
		<div class="opp-preview__id">
			<h2 class="pd-hq-section-head__title opp-preview__title">Mission rewards pathway</h2>
			<p class="pd-hq-section-head__eyebrow pd-label opp-preview__eyebrow">Progression</p>
		</div>
		<div class="opp-preview__status" role="status">
			<p class="pd-label pd-mono">LVL {paddedLevel} / 50</p>
		</div>
	</header>

	<div class="pd-os-deck__well opp-preview__track-well">
		<OperativePathway
			level={level}
			dossierMode={true}
			compact={false}
			hideScrollHud={true}
			scrollToCurrent={true}
			hqTealCurrent={true}
		/>
	</div>
</section>
