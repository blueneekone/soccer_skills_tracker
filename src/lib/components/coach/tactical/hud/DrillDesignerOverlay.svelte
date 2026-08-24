<script lang="ts">
	import { fade } from 'svelte/transition';

	let { isOpen, onClose, onMistakeTrigger, onFinalizeDeploy } = $props<{
		isOpen: boolean;
		onClose: () => void;
		onMistakeTrigger: () => void;
		onFinalizeDeploy: () => void;
	}>();
</script>

{#if isOpen}
	<div
		class="drill-designer-overlay tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-[#0a0a0a]/90 tw-backdrop-blur-md"
		transition:fade={{ duration: 150 }}
	>
		<div class="tw-w-[500px] tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-p-6 tw-shadow-2xl" style="border-radius: 0px;">
			<div class="tw-mb-6 tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-4">
				<h2 class="tw-font-mono tw-text-lg tw-font-bold tw-text-[#fbbf24] tw-uppercase tw-tracking-widest">
					Drill Designer
				</h2>
				<button
					type="button"
					class="tw-text-slate-400 hover:tw-text-[#fbbf24] tw-transition-colors tw-font-mono tw-text-sm"
					onclick={onClose}
				>
					✕ CLOSE
				</button>
			</div>

			<div class="tw-space-y-6">
				<div class="tw-bg-[#050811] tw-border tw-border-[#334155] tw-p-4" style="border-radius: 0px;">
					<h3 class="tw-font-mono tw-text-xs tw-text-[#14b8a6] tw-mb-2 tw-uppercase">Mistake-Recovery Zones</h3>
					<p class="tw-text-xs tw-text-slate-300 tw-leading-relaxed tw-font-sans tw-mb-4">
						Trigger a forced mistake state to evaluate player cognitive reset abilities. This injects a path deviation into the simulation.
					</p>
					<button
						type="button"
						class="tw-w-full tw-bg-amber-950/40 tw-border tw-border-amber-500/50 tw-text-amber-400 tw-px-3 tw-py-2 tw-font-mono tw-text-[10px] tw-font-bold hover:tw-bg-amber-500/20 tw-transition-all"
						style="border-radius: 0px;"
						onclick={onMistakeTrigger}
					>
						[ SIMULATE MISTAKE ]
					</button>
				</div>

				<div class="tw-bg-[#050811] tw-border tw-border-[#334155] tw-p-4" style="border-radius: 0px;">
					<h3 class="tw-font-mono tw-text-xs tw-text-[#06b6d4] tw-mb-2 tw-uppercase">Drill Instructions</h3>
					<textarea
						class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-slate-700 tw-text-slate-200 tw-p-3 tw-font-sans tw-text-xs focus:tw-outline-none focus:tw-border-[#06b6d4] tw-min-h-[100px]"
						style="border-radius: 0px;"
						placeholder="Write specific instructions or conditions for this drill phase..."
					></textarea>
				</div>

				<div class="tw-flex tw-justify-end tw-gap-3 tw-mt-4">
					<button
						type="button"
						class="tw-bg-[#050811] tw-text-slate-300 tw-border tw-border-slate-700 tw-px-4 tw-py-2 tw-font-mono tw-text-xs tw-uppercase hover:tw-bg-slate-800 tw-transition-colors"
						style="border-radius: 0px;"
						onclick={onClose}
					>
						CANCEL
					</button>
					<button
						type="button"
						class="tw-bg-[#fbbf24] tw-text-black tw-font-mono tw-font-bold tw-text-xs tw-px-6 tw-py-2 tw-uppercase hover:tw-bg-amber-400 tw-transition-colors"
						style="border-radius: 0px;"
						onclick={onFinalizeDeploy}
					>
						FINALIZE DEPLOY
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
