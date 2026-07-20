<script>
	/** Admin shares EnterpriseConsoleShell; field-mode CSS in enterprise-console.css (max-width 1023px). */
	import '$lib/styles/vanguard-siem-tables.css';
	import AlertMatrix from '$lib/components/layout/AlertMatrix.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	let { children } = $props();
</script>

<div class="tw-flex tw-w-full">
	<div class="ga-workspace tw-w-full lg:tw-col-span-12 tw-flex-1 tw-min-w-0">
		{@render children()}
	</div>
	{#if authStore.role === 'super_admin' || authStore.role === 'global_admin'}
		<AlertMatrix />
	{/if}
</div>
