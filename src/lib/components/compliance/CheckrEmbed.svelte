<script lang="ts">
	import { onMount } from 'svelte';
	import {
		buildNewInvitationOptions,
		buildReportsOverviewOptions,
		type CoachClearanceContext
	} from '$lib/compliance/checkrCoachClearance.js';

	let {
		context,
		clubConfig,
		mode = 'invitation'
	}: {
		context: CoachClearanceContext;
		clubConfig?: any;
		mode?: 'invitation' | 'reports';
	} = $props();

	let container: HTMLDivElement | undefined = $state();

	onMount(() => {
		if (!container) return;

		const script = document.createElement('script');
		script.src = 'https://sdk.checkr.com/latest/checkr.js';
		
		script.onload = () => {
			if (typeof window !== 'undefined' && (window as any).Checkr) {
				const options =
					mode === 'reports'
						? buildReportsOverviewOptions(context)
						: buildNewInvitationOptions(context, clubConfig);
				const checkr = new (window as any).Checkr(options);
				if (container) {
					checkr.mount(container);
				}
			}
		};

		document.head.appendChild(script);

		return () => {
			if (document.head.contains(script)) {
				document.head.removeChild(script);
			}
		};
	});
</script>

<div bind:this={container} class="checkr-embed-wrapper tw-w-full"></div>

<style>
	.checkr-embed-wrapper {
		min-height: 400px;
	}
</style>
