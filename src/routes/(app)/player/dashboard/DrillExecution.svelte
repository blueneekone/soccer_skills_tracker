<script>
	import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	/** @type {{ drillId: string, drillTitle: string, baseXp?: number, attributeId: string }} */
	let { drillId, drillTitle, baseXp = 25, attributeId } = $props();

	let isCompleting = $state(false);
	let gritMode = $state(false);
	let completionFlash = $state(false);
	let gritFlash = $state(false);
	let totalGritEarned = $state(0);

	async function handleComplete() {
		if (isCompleting) return;
		isCompleting = true;
		try {
			await addDoc(collection(db, 'drill_completions'), {
				playerUid: authStore.user?.uid ?? '',
				clubId: /** @type {Record<string, unknown>} */ (authStore.userProfile)?.clubId ?? '',
				drillId,
				attributeId,
				xpAwarded: baseXp,
				outcome: 'success',
				loggedAt: serverTimestamp(),
			});
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
			await addDoc(collection(db, 'grit_awards'), {
				playerUid: authStore.user?.uid ?? '',
				clubId: /** @type {Record<string, unknown>} */ (authStore.userProfile)?.clubId ?? '',
				drillId,
				xpAwarded: 50,
				type: 'failed_attempt_grit',
				loggedAt: serverTimestamp(),
			});
			totalGritEarned += 50;
			gritMode = true;
			gritFlash = true;
			setTimeout(() => {
				gritFlash = false;
				gritMode = false;
			}, 2000);
		} catch (err) {
			console.error('[DrillExecution] grit error:', err);
		}
	}

	const attributeLabel = $derived(attributeId.toUpperCase().replace(/_/g, ' '));
</script>

<div
	class="tw-relative tw-flex tw-flex-col tw-gap-5 tw-backdrop-blur-[40px] tw-bg-[#040f16]/85 tw-border tw-border-[#00f0ff]/20 tw-rounded-xl tw-p-6 tw-overflow-hidden"
>
	<!-- Grit Explosion Overlay -->
	{#if gritFlash}
		<div
			class="tw-absolute tw-inset-0 tw-z-20 tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-4 tw-bg-[#9d00ff]/10 tw-pointer-events-none tw-rounded-xl grit-pulse-overlay tw-border tw-border-[#9d00ff]/30"
		>
			<span
				class="tw-font-mono tw-text-xs tw-text-[#9d00ff] tw-text-center tw-leading-relaxed tw-px-6 tw-tracking-wider"
			>
				"EVERY MASTER FAILED MORE TIMES<br />THAN THE BEGINNER EVEN TRIED."
			</span>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#9d00ff]/80">
				TRAJECTORY SECURED.
			</span>
			<span class="tw-font-mono tw-text-2xl tw-text-[#9d00ff] tw-font-bold tw-tracking-widest">
				+50 GRIT XP
			</span>
		</div>
	{/if}

	<!-- Header -->
	<div class="tw-flex tw-flex-col tw-gap-1.5">
		<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/60">
			[ // DRILL EXECUTION TERMINAL ]
		</span>
		<span class="tw-font-mono tw-text-base tw-text-white tw-leading-snug">
			{drillTitle}
		</span>
	</div>

	<!-- Attribute Badge -->
	<div class="tw-inline-flex">
		<span
			class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-px-2.5 tw-py-1 tw-rounded tw-border tw-border-[#00f0ff]/30 tw-bg-[#00f0ff]/10 tw-text-[#00f0ff]"
		>
			{attributeLabel}
		</span>
	</div>

	<div class="tw-w-full tw-h-px tw-bg-[#00f0ff]/10"></div>

	<!-- Actions -->
	<div class="tw-flex tw-flex-col tw-gap-3">
		<!-- Complete Drill -->
		<button
			onclick={handleComplete}
			disabled={isCompleting}
			class="tw-w-full tw-py-4 tw-px-4 tw-rounded-xl tw-border tw-border-[#00f0ff]/50 tw-bg-[#00f0ff]/10 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff] tw-transition-all tw-duration-200 hover:tw-bg-[#00f0ff]/20 hover:tw-shadow-[0_0_25px_rgba(0,240,255,0.4)] disabled:tw-opacity-40 disabled:tw-cursor-not-allowed"
		>
			{isCompleting ? '[ LOGGING... ]' : '[ COMPLETE DRILL ]'}
		</button>

		<!-- Log Grit -->
		<button
			onclick={handleGrit}
			class="tw-w-full tw-py-4 tw-px-4 tw-rounded-xl tw-border tw-border-[#9d00ff] tw-bg-[#9d00ff]/10 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#9d00ff] tw-transition-all tw-duration-200 hover:tw-bg-[#9d00ff]/20 tw-shadow-[0_0_15px_rgba(157,0,255,0.4)] hover:tw-shadow-[0_0_25px_rgba(157,0,255,0.6)]"
		>
			[ FAILED ATTEMPT: LOG GRIT ]
		</button>
	</div>

	<!-- Completion Flash -->
	{#if completionFlash}
		<div
			class="tw-flex tw-items-center tw-justify-center tw-py-2 tw-rounded-lg tw-border tw-border-[#00f0ff]/40 tw-bg-[#00f0ff]/10 tw-animate-pulse"
		>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]">
				[ ✓ +{baseXp} XP SECURED ]
			</span>
		</div>
	{/if}

	<!-- Session Grit Tracker -->
	<div class="tw-pt-2 tw-border-t tw-border-[#9d00ff]/10">
		<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#9d00ff]/50">
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
