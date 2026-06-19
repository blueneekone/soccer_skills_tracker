<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { useTrainReadinessStrip } from '$lib/player/workout/useTrainReadinessStrip.svelte.js';

	const readiness = useTrainReadinessStrip(
		() => authStore.user?.uid,
		() => authStore.role,
	);
</script>

{#if readiness.showReadinessStrip}
	<p class="hq-readiness-prompt bento-span-12" role="status" aria-live="polite">
		<span class="hq-readiness-prompt__label pd-label pd-mono">Pre-session check</span>
		<button
			type="button"
			class="hq-readiness-prompt__link pd-mono"
			onclick={() => goto('/player/workout')}
		>
			Log sleep &amp; readiness on Train →
		</button>
	</p>
{/if}
