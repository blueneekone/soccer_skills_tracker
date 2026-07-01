<script>
	/** Admin shares EnterpriseConsoleShell; field-mode CSS in enterprise-console.css (max-width 1023px). */
	let { children } = $props();
</script>

<div class="ga-workspace tw-col-span-12 tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6 tw-w-full">
	<div class="lg:tw-col-span-8 tw-min-w-0">
		{@render children()}
	</div>
	<aside class="lg:tw-col-span-4 tw-min-w-0">
		<!-- Admin Sidecar Panel -->
	</aside>
</div>
