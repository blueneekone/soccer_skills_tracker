<script lang="ts">
	import OperativePathway from '$lib/components/player/OperativePathway.svelte';

	/** @type {{ level?: number }} */
	let { level = 1 } = $props();

	const paddedLevel = $derived(String(Math.max(1, Math.floor(Number(level) || 1))).padStart(2, '0'));
</script>

<section
	class="opp-preview opp-preview--void bento-span-12"
	aria-label="Mission rewards pathway"
	data-region="operative-pathway-preview"
>
	<header class="opp-preview__head">
		<div class="opp-preview__title-block">
			<p class="opp-preview__eyebrow pd-label">Progression</p>
			<h2 class="opp-preview__title">Mission rewards pathway</h2>
			<p class="opp-preview__meta">
				LV <span class="opp-preview__lv">{paddedLevel}</span> / 50
			</p>
		</div>
	</header>

	<OperativePathway
		level={level}
		dossierMode={true}
		compact={false}
		hideScrollHud={true}
		scrollToCurrent={true}
		hqTealCurrent={true}
	/>
</section>
