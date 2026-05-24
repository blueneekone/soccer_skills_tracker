<script>
	import { lockBody, unlockBody } from '$lib/utils/modalLock.js';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let {
		title = '',
		/** @type {string[]} */
		instructions = [],
		/** Set to e.g. `[ INTEL ]` for full intel chrome */
		triggerText = '[ ? ]',
		dossierMode = false,
	} = $props();

	let open = $state(false);
	const idBase = `intel-briefing-${Math.random().toString(36).slice(2, 9)}`;
	const titleId = `${idBase}-title`;
	const listId = `${idBase}-list`;

	const lines = $derived(Array.isArray(instructions) ? instructions : []);

	function close() {
		open = false;
	}

	function openModal() {
		open = true;
	}

	/** @param {KeyboardEvent} e */
	function onWinKey(e) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}

	/** @param {MouseEvent} e */
	function onBackdrop(e) {
		if (e.target === e.currentTarget) close();
	}

	$effect(() => {
		if (!open) return;
		lockBody();
		return () => unlockBody();
	});
</script>

<svelte:window onkeydown={onWinKey} />

<div class="tw-inline-flex tw-align-middle">
	<button
		type="button"
		class="im-trigger tw-inline-flex tw-items-center tw-justify-center !tw-min-h-0 !tw-h-5 !tw-w-auto !tw-px-1.5 !tw-py-0 !tw-text-[0.55rem] tw-border tw-font-mono tw-font-extrabold tw-tracking-[0.12em] tw-uppercase tw-transition focus-visible:tw-outline focus-visible:tw-outline-2 {dossierMode
			? 'im-trigger--dossier'
			: '!tw-border-cyan-500/55 tw-bg-[#05050a] tw-text-cyan-300 tw-shadow-[inset_0_0_0_1px_rgba(20, 184, 166,0.2)] hover:tw-border-cyan-400/80 hover:tw-text-cyan-200 hover:tw-shadow-[0_0_12px_rgba(20, 184, 166,0.15)] focus-visible:tw-outline-cyan-400/70'}"
		onclick={openModal}
		aria-haspopup="dialog"
		aria-expanded={open}
		aria-controls={open ? titleId : undefined}
	>
		{triggerText}
	</button>
</div>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="im-backdrop tw-fixed tw-inset-0 tw-z-[9999] tw-flex tw-items-center tw-justify-center tw-p-4 tw-bg-black/80 tw-backdrop-blur-sm"
		role="presentation"
		transition:fade={{ duration: 150 }}
		onclick={onBackdrop}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="im-panel tw-relative tw-w-full tw-max-w-lg tw-px-5 tw-pt-5 tw-pb-4 {dossierMode
				? 'pd-panel im-panel--dossier'
				: 'tw-vanguard-panel'}"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={listId}
			tabindex="-1"
			transition:fly={{ y: 20, duration: 250, easing: cubicOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<h2
				id={titleId}
				class="im-title tw-m-0 tw-mb-4 tw-text-left tw-font-mono {dossierMode
					? 'tw-text-[var(--pd-text,#f4f4f5)]'
					: 'tw-vanguard-section-header tw-text-cyan-200'}"
			>
				{title}
			</h2>
			<ol
				id={listId}
				class="im-list tw-m-0 tw-mb-5 tw-list-decimal tw-pl-5 tw-text-sm tw-leading-relaxed tw-text-zinc-200"
			>
				{#each lines as line, idx (idx)}
					<li class="im-li tw-mb-2 tw-font-mono tw-text-[0.8rem] tw-pl-1 [overflow-wrap:anywhere]">
						{line}
					</li>
				{/each}
			</ol>
			<button
				type="button"
				class="im-ack tw-w-full tw-min-h-[2.75rem] tw-border tw-font-mono tw-text-[0.7rem] tw-font-black tw-uppercase tw-tracking-[0.25em] tw-transition focus-visible:tw-outline focus-visible:tw-outline-2 {dossierMode
					? 'im-ack--dossier'
					: 'tw-border-cyan-500/50 tw-bg-cyan-950/40 tw-text-cyan-200 hover:tw-border-cyan-400/80 hover:tw-bg-cyan-900/30 focus-visible:tw-outline-cyan-400/80'}"
				onclick={close}
			>
				Acknowledge
			</button>
		</div>
	</div>
{/if}

<style>
	.im-list::marker {
		color: var(--pd-accent-data, #14b8a6);
	}

	.im-trigger--dossier {
		border-color: var(--pd-line, rgba(255, 255, 255, 0.1));
		background: var(--pd-panel, #05050a);
		color: var(--pd-accent-data, #14b8a6);
	}

	.im-trigger--dossier:hover {
		border-color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 55%, var(--pd-line, rgba(255, 255, 255, 0.1)));
		color: var(--pd-text, #f4f4f5);
	}

	.im-panel--dossier {
		background: var(--pd-panel, #05050a);
		border: 1px solid var(--pd-line, rgba(255, 255, 255, 0.1));
		color: var(--pd-text, #f4f4f5);
	}

	.im-ack--dossier {
		border-color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 45%, var(--pd-line, rgba(255, 255, 255, 0.1)));
		background: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 10%, var(--pd-panel, #05050a));
		color: var(--pd-text, #f4f4f5);
	}

	.im-ack--dossier:hover {
		border-color: var(--pd-accent-data, #14b8a6);
		background: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 18%, var(--pd-panel, #05050a));
	}
</style>
