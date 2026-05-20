<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	export type OrgToast = { id: number; text: string; tone: 'info' | 'ok' | 'warn' };

	interface Props {
		toasts: OrgToast[];
	}

	let { toasts }: Props = $props();
</script>

{#if toasts.length > 0}
	<div class="orgs3-toasts" role="status" aria-live="polite">
		{#each toasts as t (t.id)}
			<div class="orgs3-toast orgs3-toast--{t.tone}">
				<Icon
					name={t.tone === 'ok'
						? ('status.verified' as IconName)
						: t.tone === 'warn'
							? ('status.warning-circle' as IconName)
							: ('status.info' as IconName)}
					aria-hidden="true"
				/>
				<span>{t.text}</span>
			</div>
		{/each}
	</div>
{/if}
