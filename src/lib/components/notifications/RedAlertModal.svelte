<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	interface Props { open?: boolean; onAccept: () => void; onDefer: () => void; }
	let { open = false, onAccept, onDefer }: Props = $props();
</script>

{#if open}
	<div
		class="tw-pointer-events-auto tw-fixed tw-inset-0 tw-z-[100] tw-flex tw-items-center tw-justify-center tw-bg-red-950/80 tw-backdrop-blur-md tw-animate-pulse tw-px-4 tw-py-6"
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="red-alert-title"
		aria-describedby="red-alert-desc"
	>
		<div
			class="tw-relative tw-w-full tw-max-w-md tw-overflow-hidden tw-rounded-2xl tw-border-2 tw-border-red-500/70 tw-bg-zinc-950/95 tw-p-6 tw-shadow-[0_0_0_1px_rgba(248,113,113,0.35),0_0_40px_rgba(220,38,38,0.45),0_20px_50px_rgba(0,0,0,0.8)]"
		>
			<div
				class="tw-pointer-events-none tw-absolute tw-inset-0 tw-rounded-2xl tw-bg-gradient-to-b tw-from-red-950/40 tw-to-transparent"
				aria-hidden="true"
			></div>
			<div class="tw-relative tw-flex tw-flex-col tw-items-center tw-text-center">
				<div
					class="tw-mb-4 tw-flex tw-h-20 tw-w-20 tw-items-center tw-justify-center tw-rounded-2xl tw-border tw-border-red-500/50 tw-bg-red-950/60 tw-text-red-400 tw-shadow-[0_0_24px_rgba(239,68,68,0.45)]"
					aria-hidden="true"
				>
					<Icon name={"status.warning-circle" as IconName} size={48} />
				</div>
				<h2
					id="red-alert-title"
					class="tw-m-0 tw-text-lg tw-font-black tw-uppercase tw-tracking-[0.2em] tw-text-red-100"
				>
					Incoming directive
				</h2>
				<p
					id="red-alert-desc"
					class="tw-mt-3 tw-mb-8 tw-text-base tw-font-medium tw-leading-relaxed tw-text-zinc-300"
				>
					Command has issued a new tactical assignment.
				</p>
				<div class="tw-flex tw-w-full tw-min-w-0 tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-gap-3">
					<button
						type="button"
						class="tw-order-1 tw-min-h-12 tw-flex-1 tw-touch-manipulation tw-rounded-xl tw-border tw-border-red-400/50 tw-bg-gradient-to-b tw-from-red-600 tw-to-red-800 tw-px-4 tw-py-3 tw-text-center tw-font-mono tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-[0.15em] tw-text-white tw-shadow-[0_0_20px_rgba(239,68,68,0.4)] tw-transition tw-ring-1 tw-ring-red-400/30 hover:tw-brightness-110 active:tw-scale-[0.99] sm:tw-order-2"
						onclick={onAccept}
					>
						Accept mission
					</button>
					<button
						type="button"
						class="tw-order-2 tw-min-h-12 tw-flex-1 tw-touch-manipulation tw-rounded-xl tw-border tw-border-zinc-600/50 tw-bg-zinc-900/80 tw-px-4 tw-py-3 tw-text-center tw-font-mono tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-[0.12em] tw-text-zinc-400 tw-transition hover:tw-border-zinc-500 hover:tw-bg-zinc-800 hover:tw-text-zinc-200 active:tw-scale-[0.99] sm:tw-order-1"
						onclick={onDefer}
					>
						Defer for now
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
