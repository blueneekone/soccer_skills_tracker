<script>
	import { lockEnterpriseShellScroll } from '$lib/utils/enterpriseModalScrollLock.js';

	let {
		open = $bindable(false),
		title = '',
		maxWidth = '500px',
		certStyle = false,
		children,
		titleSlot
	} = $props();

	const close = () => { open = false; };

	$effect(() => {
		if (typeof document === 'undefined' || !open) return;
		return lockEnterpriseShellScroll();
	});

	const handleBackdrop = (e) => {
		if (e.target === e.currentTarget) close();
	};

	const handleKey = (e) => {
		if (e.key === 'Escape') close();
	};
</script>

<svelte:window onkeydown={handleKey} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal" onclick={handleBackdrop} role="dialog" aria-modal="true">
		<div class="modal-content" class:cert-content={certStyle} style="--modal-max-width:{maxWidth};">
			{#if title || titleSlot}
				<div class="card-header" class:cert-modal-header={certStyle}>
					{#if titleSlot}
						{@render titleSlot()}
					{:else}
						<span>{title}</span>
					{/if}
					<button class="close-btn modal-close-icon" onclick={close} aria-label="Close">&times;</button>
				</div>
			{/if}
			<div class="modal-body">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
