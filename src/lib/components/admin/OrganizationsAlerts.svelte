<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	interface Props {
		clubsErr: string;
		loginAsDirectorErr: string;
	}

	let { clubsErr, loginAsDirectorErr }: Props = $props();
</script>

{#if clubsErr}
	<div class="orgs3-err" role="alert">
		<Icon name={'status.warning-circle' as IconName} aria-hidden="true" />
		{clubsErr}
	</div>
{/if}
{#if loginAsDirectorErr}
	<div class="orgs3-err" role="alert">
		<Icon name={'status.warning-circle' as IconName} aria-hidden="true" />
		{loginAsDirectorErr}
	</div>
{/if}
