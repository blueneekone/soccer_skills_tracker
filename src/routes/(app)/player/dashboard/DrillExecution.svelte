<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { commitDrillCompletion, commitGritAward } from '$lib/services/writes.svelte';
	import { dopamineOnCommit } from '$lib/services/dopamine.svelte.js';

	interface Props {
		drillId: string;
		drillTitle: string;
		baseXp?: number;
		attributeId: string;
		complexityRank?: 1 | 2 | 3;
	}

	let {
		drillId,
		drillTitle,
		baseXp = 25,
		attributeId,
		complexityRank = 1 as 1 | 2 | 3,
	}: Props = $props();

	let isCompleting = $state(false);
	let gritMode = $state(false);
	let completionFlash = $state(false);
	let gritFlash = $state(false);
	let totalGritEarned = $state(0);
	/** Set to true when the server rejects a Grit award due to the daily cap. */
	let gritCapReached = $state(false);

	/**
	 * Resolve the active player UID, email key (= users/{} doc ID),
	 * and clubId once per call.  Cast through `Record<string,unknown>`
	 * because authStore.userProfile is typed loosely in the legacy
	 * auth store.
	 */
	function playerScope() {
		return {
			playerUid: authStore.user?.uid ?? '',
			userKey: (authStore.user?.email ?? '').toLowerCase(),
			clubId:
				/** @type {Record<string, unknown>} */ (authStore.userProfile)?.clubId?.toString() ?? '',
		};
	}

	async function handleComplete() {
		if (isCompleting) return;
		isCompleting = true;
		try {
			// Atomic batch: drill audit record + user XP increment + xpHistory entry.
			// Dopamine explosion fires only after the Firestore SDK confirms the write.
			await dopamineOnCommit(
				commitDrillCompletion({
					...playerScope(),
					drillId,
					drillTitle,
					attributeId,
					xpAwarded: baseXp,
					outcome: 'success',
				}),
				{ kind: 'drill' },
			);
			completionFlash = true;
			setTimeout(() => {
				completionFlash = false;
			}, 2000);
		} catch (err) {
			console.error('[DrillExecution] complete error:', err);
		} finally {
			isCompleting = false;
		}
	}

	async function handleGrit() {
		try {
			// Octalysis Core Drive 8 — reward the attempt, not the outcome.
			// Magenta dopamine explosion fires only after commit is verified.
			await dopamineOnCommit(
				commitGritAward({
					...playerScope(),
					drillId,
					complexityRank,
				}),
				{ kind: 'grit' },
			);
			totalGritEarned += 50;
			gritMode = true;
			gritFlash = true;
			setTimeout(() => {
				gritFlash = false;
				gritMode = false;
			}, 2000);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (msg === 'GRIT_DAILY_CAP') {
				gritCapReached = true;
			} else if (msg !== 'GRIT_NOT_ELIGIBLE') {
				console.error('[DrillExecution] grit error:', err);
			}
		}
	}

	const attributeLabel = $derived(attributeId.toUpperCase().replace(/_/g, ' '));
</script>

<div
	class="tw-relative tw-flex tw-flex-col tw-gap-5 tw-backdrop-blur-[40px] tw-bg-slate-950/90 tw-border tw-border-slate-700/60 tw-rounded-xl tw-p-6 tw-overflow-hidden"
>
	<!-- Grit Explosion Overlay -->
	{#if gritFlash}
		<div
			class="tw-absolute tw-inset-0 tw-z-20 tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-4 tw-bg-slate-900 tw-pointer-events-none tw-rounded-xl grit-pulse-overlay tw-border tw-border-slate-700/50"
		>
			<span
				class="tw-font-mono tw-text-xs tw-text-slate-300 tw-text-center tw-leading-relaxed tw-px-6 tw-tracking-wider"
			>
				"EVERY MASTER FAILED MORE TIMES<br />THAN THE BEGINNER EVEN TRIED."
			</span>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[var(--text-primary)]">
				TRAJECTORY SECURED.
			</span>
			<span class="tw-font-mono tw-text-2xl tw-text-slate-300 tw-font-bold tw-tracking-widest">
				+50 GRIT XP
			</span>
		</div>
	{/if}

	<!-- Header -->
	<div class="tw-flex tw-flex-col tw-gap-1.5">
		<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-teal-400/60">
			[ // DRILL EXECUTION TERMINAL ]
		</span>
		<span class="tw-font-mono tw-text-base tw-text-white tw-leading-snug">
			{drillTitle}
		</span>
	</div>

	<!-- Attribute Badge -->
	<div class="tw-inline-flex">
		<span
			class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-px-2.5 tw-py-1 tw-rounded tw-border tw-border-slate-700/70 tw-bg-slate-800/60 tw-text-teal-400"
		>
			{attributeLabel}
		</span>
	</div>

	<div class="tw-w-full tw-h-px tw-bg-slate-800/60"></div>

	<!-- Actions -->
	<div class="tw-flex tw-flex-col tw-gap-3">
		<!-- Complete Drill -->
		<button
			onclick={handleComplete}
			disabled={isCompleting}
			class="tw-w-full tw-py-4 tw-px-4 tw-rounded-xl tw-border tw-border-teal-500/50 tw-bg-slate-800/60 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-teal-400 tw-transition-all tw-duration-200 hover:tw-bg-slate-700/60  disabled:tw-opacity-40 disabled:tw-cursor-not-allowed"
		>
			{isCompleting ? '[ LOGGING... ]' : '[ COMPLETE DRILL ]'}
		</button>

		<!-- Log Grit — only shown for rank-3 (advanced) drills, and hidden once daily cap is reached -->
		{#if complexityRank === 3}
			{#if gritCapReached}
				<div class="tw-w-full tw-py-3 tw-px-4 tw-rounded-xl tw-border tw-border-slate-800 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[var(--text-muted)] tw-text-center">
					[ GRIT CAP REACHED · RESETS TOMORROW ]
				</div>
			{:else}
				<button
					onclick={handleGrit}
					class="tw-w-full tw-py-4 tw-px-4 tw-rounded-xl tw-border tw-border-slate-700 tw-bg-slate-900 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-slate-300 tw-transition-all tw-duration-200 hover:tw-bg-slate-800  "
				>
					[ FAILED ATTEMPT: LOG GRIT ]
				</button>
			{/if}
		{/if}
	</div>

	<!-- Completion Flash -->
	{#if completionFlash}
		<div
			class="tw-flex tw-items-center tw-justify-center tw-py-2 tw-rounded-lg tw-border tw-border-teal-500/40 tw-bg-slate-800/60 tw-animate-pulse tw-text-teal-400/60"
		>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-teal-400">
				[ ✓ +{baseXp} XP SECURED ]
			</span>
		</div>
	{/if}

	<!-- Session Grit Tracker -->
	<div class="tw-pt-2 tw-border-t tw-border-slate-900">
		<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[var(--text-secondary)]">
			[ SESSION GRIT: {totalGritEarned} XP ]
		</span>
	</div>
</div>

<style>
	@keyframes grit-pulse {
		0% {
			opacity: 0;
			transform: scale(0.95);
		}
		20% {
			opacity: 1;
			transform: scale(1.02);
		}
		80% {
			opacity: 1;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			transform: scale(0.98);
		}
	}

	.grit-pulse-overlay {
		animation: grit-pulse 2s ease-in-out forwards;
	}
</style>
