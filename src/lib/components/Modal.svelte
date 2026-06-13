<script>
	import { portal } from '$lib/actions/portal.js';
	import { lockBody, unlockBody } from '$lib/utils/modalLock.js';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let {
		open = $bindable(false),
		title = '',
		maxWidth = '500px',
		certStyle = false,
		titleSlot = undefined,
		children,
	} = $props();

	const close = () => {
		open = false;
	};

	const handleBackdrop = (e) => {
		if (e.target === e.currentTarget) close();
	};

	const handleKey = (e) => {
		if (e.key === 'Escape') close();
	};

	$effect(() => {
		if (!open) return;
		lockBody();
		return () => unlockBody();
	});
</script>

<svelte:window onkeydown={handleKey} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal tw-z-[9999]"
		use:portal
		transition:fade={{ duration: 150 }}
		onclick={handleBackdrop}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="modal-content tw-vanguard-panel"
			class:cert-content={certStyle}
			style="--modal-max-width:{maxWidth};"
			transition:fly={{ y: 20, duration: 250, easing: cubicOut }}
		>
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
