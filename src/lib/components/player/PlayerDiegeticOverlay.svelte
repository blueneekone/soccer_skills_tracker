<script lang="ts">
	import '$lib/styles/player-terminal.css';

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

	function handleBackdrop(e: MouseEvent) {
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

{#if open}
	<div
		class="pd-diegetic-overlay"
		role="presentation"
		style:--pd-overlay-accent={accentVar}
		onclick={handleBackdrop}
	>
		<div
			class="pd-diegetic-overlay__panel pg-terminal-chrome"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={messageId}
		>
			<p class="pd-diegetic-overlay__eyebrow" aria-hidden="true">
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
		</div>
	</div>
{/if}

<style>
	.pd-diegetic-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(1rem, 4vw, 2rem);
		background: rgba(0, 0, 0, 0.72);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
	}

	.pd-diegetic-overlay__panel {
		width: min(100%, 28rem);
		border: 1px solid color-mix(in srgb, var(--pd-overlay-accent) 42%, var(--pd-line, rgba(255, 255, 255, 0.1)));
		box-shadow:
			0 24px 48px rgba(0, 0, 0, 0.75),
			0 0 28px color-mix(in srgb, var(--pd-overlay-accent) 22%, transparent);
	}

	.pd-diegetic-overlay__eyebrow {
		margin: 0 0 0.5rem;
		font-family: var(--pd-font-mono, ui-monospace, monospace);
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--pd-overlay-accent);
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
