<script>
	import { onMount } from 'svelte';
	import legacyHtml from '$lib/legacy-body.html?raw';

	onMount(async () => {
		await import('$lib/legacy/app.js');
	});
</script>

<div class="legacy-root">
	{@html legacyHtml}
</div>
