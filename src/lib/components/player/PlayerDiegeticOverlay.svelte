<script lang="ts">
	import '$lib/styles/player-terminal.css';
	import PlayerModalScrim from '$lib/components/player/PlayerModalScrim.svelte';

	type OverlayVariant = 'success' | 'error' | 'confirm';

	let {
		open = false,
		variant = 'confirm',
		title = '',
		message = '',
		confirmLabel = 'CONFIRM',
		cancelLabel = 'ABORT',
		autoDismissMs = 0,
		onConfirm,
		onCancel,
		onClose,
	}: {
		open?: boolean;
		variant?: OverlayVariant;
		title?: string;
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		/** Success variant: auto-dismiss after ms (0 = manual acknowledge). */
		autoDismissMs?: number;
		onConfirm?: () => void;
		onCancel?: () => void;
		onClose?: () => void;
	} = $props();

	const resolvedConfirmLabel = $derived(
		variant === 'success' && confirmLabel === 'CONFIRM' ? 'Acknowledge' : confirmLabel,
	);

	$effect(() => {
		if (!open || variant !== 'success' || autoDismissMs <= 0) return;
		const timer = setTimeout(() => {
			onConfirm?.();
		}, autoDismissMs);
		return () => clearTimeout(timer);
	});

	const titleId = 'pd-diegetic-overlay-title';
	const messageId = 'pd-diegetic-overlay-message';

	const accentVar = $derived(
		variant === 'error'
			? 'var(--pd-accent-action, #fbbf24)'
			: 'var(--pd-accent-data, #14b8a6)',
	);

	function handleScrimClick(e: MouseEvent) {
		if (e.target === e.currentTarget) handleCancel();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') handleCancel();
	}

	function handleConfirm() {
		onConfirm?.();
	}

	function handleCancel() {
		onCancel?.();
		onClose?.();
	}
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

<PlayerModalScrim
	{open}
	dialog
	labelledBy={titleId}
	describedBy={messageId}
	panelClass="pd-diegetic-overlay__panel pg-terminal-chrome"
	panelStyle="--pd-overlay-accent: {accentVar}"
	onScrimClick={handleScrimClick}
>
	<p class="pd-diegetic-overlay__eyebrow" aria-hidden="true" style:--pd-overlay-accent={accentVar}>
		{#if variant === 'error'}
			⚠ SYSTEM ALERT
		{:else if variant === 'success'}
			✓ MISSION COMPLETE
		{:else}
			› AWAITING CONFIRMATION
		{/if}
	</p>

	{#if title}
		<h2 id={titleId} class="pd-diegetic-overlay__title">{title}</h2>
	{/if}

	{#if message}
		<p id={messageId} class="pd-diegetic-overlay__message">{message}</p>
	{/if}

	<div class="pd-diegetic-overlay__actions">
		{#if variant === 'confirm'}
			<button type="button" class="pd-os-btn pd-os-btn--ghost" onclick={handleCancel}>
				{cancelLabel}
			</button>
		{/if}
		<button
			type="button"
			class="pd-os-btn"
			class:pd-os-btn--primary={variant !== 'error'}
			class:pd-os-btn--danger={variant === 'error'}
			onclick={handleConfirm}
		>
			{resolvedConfirmLabel}
		</button>
	</div>
</PlayerModalScrim>

<style>
	:global(.pd-diegetic-overlay__panel) {
		width: min(100%, 28rem);
		border-color: color-mix(in srgb, var(--pd-overlay-accent, var(--pd-data-cyan)) 42%, var(--pd-line, rgba(255, 255, 255, 0.1)));
	}

	.pd-diegetic-overlay__eyebrow {
		margin: 0 0 0.5rem;
		font-family: var(--pd-font-mono, ui-monospace, monospace);
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--pd-overlay-accent, var(--pd-data-cyan));
	}

	.pd-diegetic-overlay__title {
		margin: 0 0 0.65rem;
		font-family: var(--pd-font-display, ui-sans-serif, sans-serif);
		font-size: clamp(1rem, 2.4vw, 1.15rem);
		font-weight: 800;
		letter-spacing: 0.04em;
		color: var(--pd-text, #f4f4f5);
		line-height: 1.2;
	}

	.pd-diegetic-overlay__message {
		margin: 0 0 1rem;
		font-family: var(--pd-font-mono, ui-monospace, monospace);
		font-size: 0.78rem;
		line-height: 1.5;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.65));
	}

	.pd-diegetic-overlay__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.pd-diegetic-overlay__actions :global(.pd-os-btn) {
		min-height: 44px;
		min-width: 44px;
	}
</style>
