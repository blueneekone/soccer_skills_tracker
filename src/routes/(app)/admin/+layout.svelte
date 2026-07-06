<script>
	/** Admin shares EnterpriseConsoleShell; field-mode CSS in enterprise-console.css (max-width 1023px). */
	import '$lib/styles/vanguard-siem-tables.css';
	let { children } = $props();
</script>

<div class="ga-workspace tw-w-full lg:tw-col-span-12">
	{@render children()}
</div>
