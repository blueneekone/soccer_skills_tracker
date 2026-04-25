<script>
	import { lockBody, unlockBody } from '$lib/utils/modalLock.js';

	let {
		title = '',
		/** @type {string[]} */
		instructions = [],
		/** Set to e.g. `[ INTEL ]` for full intel chrome */
		triggerText = '[ ? ]',
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
		class="im-trigger tw-inline-flex tw-items-center tw-justify-center tw-min-h-[1.75rem] tw-px-2 tw-border tw-border-cyan-500/55 tw-bg-[#05050a] tw-font-mono tw-text-[0.65rem] tw-font-extrabold tw-tracking-[0.12em] tw-uppercase tw-text-cyan-300 tw-shadow-[inset_0_0_0_1px_rgba(6,182,212,0.2)] tw-transition hover:tw-border-cyan-400/80 hover:tw-text-cyan-200 hover:tw-shadow-[0_0_12px_rgba(34,211,238,0.15)] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-cyan-400/70"
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
		class="im-backdrop tw-fixed tw-inset-0 tw-z-[1200] tw-flex tw-items-center tw-justify-center tw-p-4 tw-backdrop-blur-sm tw-bg-black/80"
		role="presentation"
		onclick={onBackdrop}
	>
		<div
			class="im-panel tw-relative tw-w-full tw-max-w-lg tw-border tw-border-cyan-500/80 tw-bg-[#05050a] tw-px-5 tw-pt-5 tw-pb-4 tw-shadow-[0_0_32px_rgba(6,182,212,0.12)]"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={listId}
			onclick={(e) => e.stopPropagation()}
		>
			<h2
				id={titleId}
				class="im-title tw-m-0 tw-mb-4 tw-text-left tw-text-xs tw-font-black tw-uppercase tw-tracking-[0.2em] tw-text-cyan-200"
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
				class="im-ack tw-w-full tw-min-h-[2.75rem] tw-border tw-border-cyan-500/50 tw-bg-cyan-950/40 tw-font-mono tw-text-[0.7rem] tw-font-black tw-uppercase tw-tracking-[0.25em] tw-text-cyan-200 tw-transition hover:tw-border-cyan-400/80 hover:tw-bg-cyan-900/30 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-cyan-400/80"
				onclick={close}
			>
				Acknowledge
			</button>
		</div>
	</div>
{/if}

<style>
	/* Extra contrast on body text without fighting Tailwind layer order */
	.im-list::marker {
		color: #22d3ee;
	}
</style>
