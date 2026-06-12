<script lang="ts">
	import PlayerModalScrim from '$lib/components/player/PlayerModalScrim.svelte';

	let {
		open = false,
		tierCode = '',
		tierLabel = '',
		attributesReadout = '',
		onCommit,
		onDefer,
	}: {
		open?: boolean;
		tierCode?: string;
		tierLabel?: string;
		attributesReadout?: string;
		onCommit?: () => void;
		onDefer?: () => void;
	} = $props();

	const headerId = 'skill-tier-unlock-header';
	const readoutId = 'skill-tier-unlock-readout';

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onDefer?.();
	}

	function handleScrimClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onDefer?.();
	}
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

<PlayerModalScrim
	{open}
	directive
	dialog
	labelledBy={headerId}
	describedBy={attributesReadout ? readoutId : undefined}
	panelClass="skill-tier-modal__panel"
	onScrimClick={handleScrimClick}
>
	<p id={headerId} class="skill-tier-modal__header">SYNAPTIC_EVOLUTION_CONFIRMED</p>

	{#if tierCode}
		<p class="skill-tier-modal__tier-code">{tierCode}</p>
	{/if}

	{#if tierLabel}
		<p class="skill-tier-modal__tier-name">{tierLabel}</p>
	{/if}

	{#if attributesReadout}
		<div class="skill-tier-modal__well">
			<p class="skill-tier-modal__well-label">Attribute sync</p>
			<p id={readoutId} class="skill-tier-modal__readout">{attributesReadout}</p>
		</div>
	{/if}

	<div class="skill-tier-modal__actions">
		<button type="button" class="skill-tier-modal__defer" onclick={() => onDefer?.()}>
			DEFER_INTEGRATION
		</button>
		<button type="button" class="skill-tier-modal__commit" onclick={() => onCommit?.()}>
			COMMIT_UPGRADE
		</button>
	</div>
</PlayerModalScrim>

<style>
	:global(.skill-tier-modal__panel) {
		width: min(100%, 30rem);
		background: var(--pd-panel, #05050a);
		border: 2px solid var(--pd-action-gold, #fbbf24);
		clip-path: polygon(
			var(--pd-chamfer-lg, 16px) 0%,
			100% 0%,
			100% calc(100% - var(--pd-chamfer-lg, 16px)),
			calc(100% - var(--pd-chamfer-lg, 16px)) 100%,
			0% 100%,
			0% var(--pd-chamfer-lg, 16px)
		);
	}

	.skill-tier-modal__header {
		margin: 0 0 0.5rem;
		font-family: var(--pd-font-display, ui-sans-serif, sans-serif);
		font-size: clamp(0.82rem, 2vw, 0.95rem);
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--pd-action-gold, #fbbf24);
		line-height: 1.25;
	}

	.skill-tier-modal__tier-code {
		margin: 0 0 0.25rem;
		font-family: var(--pd-font-mono, ui-monospace, monospace);
		font-size: clamp(1rem, 2.4vw, 1.25rem);
		font-weight: 700;
		letter-spacing: 0.16em;
		color: var(--pd-atom-amber, #d97706);
	}

	.skill-tier-modal__tier-name {
		margin: 0 0 0.85rem;
		font-family: var(--pd-font-mono, ui-monospace, monospace);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.55));
	}

	.skill-tier-modal__well {
		margin: 0 0 1rem;
		padding: 0.55rem 0.65rem;
		background: var(--pd-void-base, #000000);
		border: 1px solid var(--pd-grey-trim, #334155);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pd-grey-trim, #334155) 35%, transparent);
	}

	.skill-tier-modal__well-label {
		margin: 0 0 0.35rem;
		font-family: var(--pd-font-mono, ui-monospace, monospace);
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--pd-grey-trim, #334155);
	}

	.skill-tier-modal__readout {
		margin: 0;
		font-family: var(--pd-font-mono, ui-monospace, monospace);
		font-size: 0.72rem;
		font-weight: 600;
		line-height: 1.55;
		letter-spacing: 0.06em;
		color: var(--pd-data-cyan, #14b8a6);
	}

	.skill-tier-modal__actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.skill-tier-modal__defer {
		padding: 0.35rem 0.65rem;
		font-family: var(--pd-font-mono, ui-monospace, monospace);
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--pd-grey-trim, #334155);
		background: transparent;
		border: 1px solid var(--pd-grey-trim, #334155);
		cursor: pointer;
		clip-path: polygon(
			var(--pd-chamfer-sm, 6px) 0%,
			100% 0%,
			100% calc(100% - var(--pd-chamfer-sm, 6px)),
			calc(100% - var(--pd-chamfer-sm, 6px)) 100%,
			0% 100%,
			0% var(--pd-chamfer-sm, 6px)
		);
	}

	.skill-tier-modal__commit {
		margin-left: auto;
		min-height: 44px;
		padding: 0.6rem 1.15rem;
		font-family: var(--pd-font-mono, ui-monospace, monospace);
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--pd-void-base, #000000);
		background: var(--pd-action-gold, #fbbf24);
		border: none;
		cursor: pointer;
		clip-path: polygon(
			var(--pd-chamfer-sm, 6px) 0%,
			100% 0%,
			100% calc(100% - var(--pd-chamfer-sm, 6px)),
			calc(100% - var(--pd-chamfer-sm, 6px)) 100%,
			0% 100%,
			0% var(--pd-chamfer-sm, 6px)
		);
		transition: filter 100ms ease;
	}

	.skill-tier-modal__commit:active {
		filter: brightness(0.92);
	}
</style>

