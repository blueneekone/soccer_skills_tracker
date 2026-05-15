<script>
	import { DELAY_STEP_MS } from '$lib/states/war-room/constants';

	/** @typedef {{ id: string; x1: number; y1: number; delay: number }} HudRoute */

	/** @type {HudRoute} */
	let { hudRoute, bumpDelay } = $props();
</script>

<g transform="translate({hudRoute.x1}, {hudRoute.y1 - 54})" pointer-events="all">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<foreignObject x="-100" y="-20" width="200" height="42">
		<div
			xmlns="http://www.w3.org/1999/xhtml"
			class="tw-z-[60] tw-box-border tw-inline-flex tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-border-[#14b8a6]/50 tw-bg-[#050505]/95 tw-px-3 tw-py-2 tw-font-mono tw-text-[10px] tw-text-[#14b8a6] tw-backdrop-blur-md tw-overflow-visible"
			onpointerdown={(e) => e.stopPropagation()}
		>
			<span class="tw-tracking-wide">HOLD: {(hudRoute.delay / 1000).toFixed(1)}s</span>
			<button
				type="button"
				class="tw-shrink-0 tw-rounded-full tw-border tw-border-[#14b8a6]/60 tw-bg-black/50 tw-px-2 tw-py-0.5 tw-font-mono tw-text-[10px] tw-text-[#14b8a6] tw-transition-colors hover:tw-bg-[#14b8a6]/15"
				aria-label="Decrease route delay"
				onclick={(e) => {
					e.stopPropagation();
					bumpDelay(hudRoute.id, -DELAY_STEP_MS);
				}}
			>
				−
			</button>
			<button
				type="button"
				class="tw-shrink-0 tw-rounded-full tw-border tw-border-[#14b8a6]/60 tw-bg-black/50 tw-px-2 tw-py-0.5 tw-font-mono tw-text-[10px] tw-text-[#14b8a6] tw-transition-colors hover:tw-bg-[#14b8a6]/15"
				aria-label="Increase route delay"
				onclick={(e) => {
					e.stopPropagation();
					bumpDelay(hudRoute.id, DELAY_STEP_MS);
				}}
			>
				+
			</button>
		</div>
	</foreignObject>
</g>
