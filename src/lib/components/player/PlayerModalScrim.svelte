<script lang="ts">
	import '$lib/styles/player-modal-scrim.css';

	let {
		open = false,
		directive = false,
		panelClass = '',
		panelStyle = '',
		dialog = false,
		labelledBy,
		describedBy,
		onScrimClick,
		children,
	}: {
		open?: boolean;
		/** Emissive gold glow — SkillTierUnlockModal only */
		directive?: boolean;
		panelClass?: string;
		panelStyle?: string;
		dialog?: boolean;
		labelledBy?: string;
		describedBy?: string;
		onScrimClick?: (e: MouseEvent) => void;
		children?: import('svelte').Snippet;
	} = $props();
</script>

{#if open}
	<div class="ss-scrim-overlay" role="presentation" onclick={onScrimClick}>
		<div
			class="ss-modal-z4-hero{panelClass ? ` ${panelClass}` : ''}"
			class:ss-modal-directive={directive}
			style={panelStyle || undefined}
			role={dialog ? 'alertdialog' : undefined}
			aria-modal={dialog ? 'true' : undefined}
			aria-labelledby={labelledBy}
			aria-describedby={describedBy}
			onclick={(e) => e.stopPropagation()}
		>
			{@render children?.()}
		</div>
	</div>
{/if}
