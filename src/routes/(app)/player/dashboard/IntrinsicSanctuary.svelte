<script lang="ts">
	import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	let funScore = $state(5);
	let effortScore = $state(5);
	let isSaving = $state(false);
	let saveSuccess = $state(false);
	let saveError = $state(false);

	async function handleSave() {
		if (isSaving) return;
		isSaving = true;
		saveSuccess = false;
		saveError = false;
		try {
			const playerUid = authStore.user?.uid ?? '';
			await addDoc(collection(db, 'intrinsic_journals', playerUid, 'entries'), {
				playerUid,
				clubId: /** @type {Record<string, unknown>} */ (authStore.userProfile)?.clubId ?? '',
				funScore,
				effortScore,
				recordedAt: serverTimestamp(),
			});
			saveSuccess = true;
			setTimeout(() => {
				saveSuccess = false;
			}, 3000);
		} catch (err) {
			console.error('[IntrinsicSanctuary] save error:', err);
			saveError = true;
			setTimeout(() => {
				saveError = false;
			}, 3000);
		} finally {
			isSaving = false;
		}
	}
</script>

<div
	class="tw-relative tw-flex tw-flex-col tw-gap-5 tw-backdrop-blur-[40px] tw-bg-[#040f16]/85 tw-border tw-border-[#9d00ff]/20 tw-rounded-xl tw-p-6"
>
	<!-- Privacy Badge Header -->
	<div class="tw-flex tw-flex-col tw-gap-1">
		<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#9d00ff]">
			[ 🔒 SECURE ENCLAVE — PRIVATE ENTRY ]
		</span>
		<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-white/30">
			[ COACHES / PARENTS CANNOT VIEW ]
		</span>
	</div>

	<div class="tw-w-full tw-h-px tw-bg-[#9d00ff]/10"></div>

	<!-- Question 1: Fun Score -->
	<div class="tw-flex tw-flex-col tw-gap-3">
		<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-white/60">
			HOW MUCH FUN DID YOU HAVE TODAY?
		</span>
		<div class="tw-flex tw-items-center tw-gap-4">
			<input
				type="range"
				min="1"
				max="10"
				bind:value={funScore}
				class="tw-flex-1 tw-accent-[#00f0ff] tw-cursor-pointer"
			/>
			<span
				class="tw-font-mono tw-text-xl tw-font-bold tw-text-[#00f0ff] tw-w-7 tw-text-right tw-tabular-nums tw-shrink-0"
			>
				{funScore}
			</span>
		</div>
		<div class="tw-flex tw-justify-between tw-px-0.5">
			<span class="tw-font-mono tw-text-[9px] tw-text-white/20">1</span>
			<span class="tw-font-mono tw-text-[9px] tw-text-white/20">10</span>
		</div>
	</div>

	<!-- Question 2: Effort Score -->
	<div class="tw-flex tw-flex-col tw-gap-3">
		<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-white/60">
			HOW HARD DID YOU TRY?
		</span>
		<div class="tw-flex tw-items-center tw-gap-4">
			<input
				type="range"
				min="1"
				max="10"
				bind:value={effortScore}
				class="tw-flex-1 tw-accent-[#00ff66] tw-cursor-pointer"
			/>
			<span
				class="tw-font-mono tw-text-xl tw-font-bold tw-text-[#00ff66] tw-w-7 tw-text-right tw-tabular-nums tw-shrink-0"
			>
				{effortScore}
			</span>
		</div>
		<div class="tw-flex tw-justify-between tw-px-0.5">
			<span class="tw-font-mono tw-text-[9px] tw-text-white/20">1</span>
			<span class="tw-font-mono tw-text-[9px] tw-text-white/20">10</span>
		</div>
	</div>

	<div class="tw-w-full tw-h-px tw-bg-[#9d00ff]/10"></div>

	<!-- Save Button -->
	<button
		onclick={handleSave}
		disabled={isSaving}
		class="tw-w-full tw-py-3 tw-px-4 tw-rounded-xl tw-border tw-border-[#9d00ff]/50 tw-bg-[#9d00ff]/10 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#9d00ff] tw-transition-all tw-duration-200 hover:tw-bg-[#9d00ff]/20 hover:tw-border-[#9d00ff]/80 hover:tw-shadow-[0_0_20px_rgba(157,0,255,0.3)] disabled:tw-opacity-40 disabled:tw-cursor-not-allowed"
	>
		{isSaving ? '[ SECURING... ]' : '[ LOG PRIVATE ENTRY ]'}
	</button>

	<!-- Flash: Success -->
	{#if saveSuccess}
		<div
			class="tw-flex tw-items-center tw-justify-center tw-py-2 tw-rounded-lg tw-border tw-border-[#9d00ff]/40 tw-bg-[#9d00ff]/10 tw-animate-pulse"
		>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#9d00ff]">
				[ ✓ ENTRY SECURED ]
			</span>
		</div>
	{/if}

	<!-- Flash: Error -->
	{#if saveError}
		<div
			class="tw-flex tw-items-center tw-justify-center tw-py-2 tw-rounded-lg tw-border tw-border-red-500/40 tw-bg-red-500/10"
		>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-red-400">
				[ ⚠ WRITE FAILED ]
			</span>
		</div>
	{/if}
</div>
