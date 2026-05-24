<script lang="ts">
	import type { MemoryCapsuleDoc } from '$lib/types/trajectory.js';

	interface Props {
		capsule: MemoryCapsuleDoc;
		baselineDaysAgo: number;
		onDismiss: () => void;
		dossierMode?: boolean;
	}

	let { capsule, baselineDaysAgo, onDismiss, dossierMode = false }: Props = $props();

	let visible = $state(true);

	function dismiss() {
		visible = false;
		onDismiss();
	}
</script>

{#if visible}
	<!-- HUD root: pointer-events-none so it never blocks content beneath -->
	<div
		class="tw-pointer-events-none tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-end tw-justify-center tw-p-6"
		role="status"
		aria-live="polite"
		aria-label="Memory capsule notification"
	>
		<!-- Notification strip -->
		<div
			class="tw-pointer-events-none tw-relative tw-w-full tw-max-w-2xl tw-flex tw-items-stretch tw-overflow-hidden tw-rounded-2xl {dossierMode
				? 'pd-glass-panel'
				: 'tw-border tw-border-[#14b8a6]/20 tw-bg-[#020202]/90 tw-backdrop-blur-xl tw-shadow-[0_0_40px_rgba(20, 184, 166,0.12),0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)]'}"
			style="padding: clamp(0.75rem, 2vw, 1rem) clamp(0.75rem, 2vw, 1.25rem);"
		>
			<!-- Neon cyan left border accent -->
			<div
				class="tw-pointer-events-none tw-absolute tw-left-0 tw-inset-y-0 tw-w-[3px] tw-rounded-l-2xl {dossierMode
					? 'tw-bg-[var(--pd-accent-data,#14b8a6)]'
					: 'tw-bg-[#14b8a6] tw-shadow-[0_0_12px_rgba(20, 184, 166,0.8)]'}"
				aria-hidden="true"
			></div>

			<!-- Content -->
			<div
				class="tw-flex tw-flex-1 tw-items-center tw-gap-4 tw-min-w-0"
				style="padding-left: clamp(0.5rem, 1.5vw, 0.75rem);"
			>
				<!-- Icon / eyebrow -->
				<div class="tw-flex-shrink-0 tw-flex tw-flex-col tw-items-start tw-gap-1">
					<span
						class="tw-font-mono tw-tracking-widest tw-text-[#14b8a6] tw-uppercase tw-opacity-70"
						style="font-size: clamp(7px, 0.9vw, 9px);"
					>
						[ TIME-LAPSE ]
					</span>
					<span class="tw-text-[#14b8a6]" aria-hidden="true" style="font-size: 1.25rem;">◈</span>
				</div>

				<!-- Message -->
				<div class="tw-flex-1 tw-min-w-0">
					<p
						class="tw-font-mono tw-tracking-wide tw-text-white tw-uppercase tw-leading-snug"
						style="font-size: clamp(0.65rem, 1.2vw, 0.8rem);"
					>
						{baselineDaysAgo} DAYS AGO YOU WERE AT
						<span class="tw-text-white/50">LVL {capsule.baselineSnapshot.level}</span>
						— YOU'VE GROWN
						<span
							class="tw-text-[#14b8a6] tw-font-bold tw-tabular-nums tw-shadow-[0_0_8px_rgba(20, 184, 166,0.5)]"
						>
							+{capsule.deltaSummary.xpGained.toLocaleString()} XP
						</span>
					</p>
					<p
						class="tw-font-mono tw-tracking-widest tw-text-white/30 tw-uppercase tw-mt-1"
						style="font-size: clamp(7px, 0.8vw, 9px);"
					>
						CURRENT LEVEL {capsule.currentSnapshot.level} · STREAK {capsule.currentSnapshot.streakDays}D
					</p>
				</div>
			</div>

			<!-- Dismiss button — pointer-events-auto so it is clickable -->
			<div class="tw-flex-shrink-0 tw-flex tw-items-center tw-pointer-events-auto">
				<button
					type="button"
					onclick={dismiss}
					class="tw-ml-3 tw-flex tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-[#14b8a6]/20 tw-bg-[#14b8a6]/5 tw-text-white/50 tw-font-mono tw-tracking-widest tw-uppercase tw-transition-all tw-duration-200 hover:tw-border-[#14b8a6]/60 hover:tw-bg-[#14b8a6]/15 hover:tw-text-[#14b8a6] hover:tw-shadow-[0_0_12px_rgba(20, 184, 166,0.3)] focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-[#14b8a6]/50"
					style="font-size: clamp(7px, 0.9vw, 9px); padding: clamp(0.4rem, 1vw, 0.5rem) clamp(0.6rem, 1.5vw, 0.75rem);"
					aria-label="Dismiss memory capsule"
				>
					DISMISS ✕
				</button>
			</div>
		</div>
	</div>
{/if}
