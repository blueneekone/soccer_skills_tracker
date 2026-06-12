<script lang="ts">
	import PlayerModalScrim from '$lib/components/player/PlayerModalScrim.svelte';

	let {
		open = false,
		missionId = '',
		title = '',
		readout = '',
		onEngage,
		onTerminate,
	}: {
		open?: boolean;
		missionId?: string;
		title?: string;
		readout?: string;
		onEngage?: () => void;
		onTerminate?: () => void;
	} = $props();

	const titleId = 'mission-hero-modal-title';
	const readoutId = 'mission-hero-modal-readout';

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onTerminate?.();
	}

	function handleScrimClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onTerminate?.();
	}
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

<PlayerModalScrim
	{open}
	dialog
	labelledBy={titleId}
	describedBy={readout ? readoutId : undefined}
	panelClass="mission-hero-modal__panel"
	onScrimClick={handleScrimClick}
>
	<div class="mission-hero-modal__brackets" aria-hidden="true"></div>

	{#if missionId}
		<div class="mission-hero-modal__well">
			<p class="mission-hero-modal__well-label">Mission ID</p>
			<p class="mission-hero-modal__mission-id">{missionId}</p>
		</div>
	{/if}

	{#if title}
		<h2 id={titleId} class="mission-hero-modal__title">{title}</h2>
	{/if}

	{#if readout}
		<p id={readoutId} class="mission-hero-modal__readout">{readout}</p>
	{/if}

	<div class="mission-hero-modal__actions">
		<button type="button" class="mission-hero-modal__terminate" onclick={() => onTerminate?.()}>
			TERMINATE_LINK
		</button>
		<button type="button" class="mission-hero-modal__engage" onclick={() => onEngage?.()}>
			ENGAGE MISSION
		</button>
	</div>
</PlayerModalScrim>

<style>
	:global(.mission-hero-modal__panel) {
		width: min(100%, 32rem);
	}

	.mission-hero-modal__brackets {
		pointer-events: none;
		position: absolute;
		inset: 0;
	}

	.mission-hero-modal__brackets::before,
	.mission-hero-modal__brackets::after {
		content: '';
		position: absolute;
		width: 14px;
		height: 14px;
		border: 2px solid var(--pd-action-gold, #fbbf24);
	}

	.mission-hero-modal__brackets::before {
		top: 6px;
		left: 6px;
		border-right: none;
		border-bottom: none;
	}

	.mission-hero-modal__brackets::after {
		right: 6px;
		bottom: 6px;
		border-top: none;
		border-left: none;
	}

	.mission-hero-modal__well {
		margin: 0 0 0.85rem;
		padding: 0.55rem 0.65rem;
		background: var(--pd-void-base, #000000);
		border: 1px solid var(--pd-grey-trim, #334155);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pd-grey-trim, #334155) 35%, transparent);
	}

	.mission-hero-modal__well-label {
		margin: 0 0 0.25rem;
		font-family: var(--pd-font-mono, ui-monospace, monospace);
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--pd-grey-trim, #334155);
	}

	.mission-hero-modal__mission-id {
		margin: 0;
		font-family: var(--pd-font-mono, ui-monospace, monospace);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		color: var(--pd-data-cyan, #14b8a6);
		word-break: break-all;
	}

	.mission-hero-modal__title {
		margin: 0 0 0.65rem;
		font-family: var(--pd-font-display, ui-sans-serif, sans-serif);
		font-size: clamp(0.95rem, 2.2vw, 1.1rem);
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--pd-action-gold, #fbbf24);
		line-height: 1.25;
	}

	.mission-hero-modal__readout {
		margin: 0 0 1rem;
		font-family: var(--pd-font-display, ui-sans-serif, sans-serif);
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--pd-grey-trim, #334155);
	}

	.mission-hero-modal__actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.mission-hero-modal__terminate {
		padding: 0.35rem 0;
		font-family: var(--pd-font-mono, ui-monospace, monospace);
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--pd-atom-amber, #d97706);
		background: transparent;
		border: none;
		cursor: pointer;
	}

	.mission-hero-modal__terminate:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.mission-hero-modal__engage {
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

	.mission-hero-modal__engage:active {
		filter: brightness(0.92);
	}
</style>

