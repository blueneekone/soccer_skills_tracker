<script lang="ts">
	import { LiabilityWaiversEngine } from './LiabilityWaiversEngine.svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const engine = new LiabilityWaiversEngine();
	const todayDate = new Date().toISOString().split('T')[0];

	async function handleSubmit(e: Event) {
		e.preventDefault();
		await engine.submit();
		if (authStore.userProfile?.liabilityWaiverVerified) {
			goto('/player/intake');
		}
	}
</script>

<div class="waiver-container tw-max-w-md tw-mx-auto tw-p-6 tw-bg-black tw-border tw-border-[#1e293b] tw-text-white tw-mt-10">
	<h1 class="tw-text-xl tw-font-bold tw-mb-4 tw-text-[#14b8a6]">Liability & Media Waivers</h1>
	<p class="tw-text-sm tw-text-gray-400 tw-mb-6">Please complete this single-column document reader before continuing to player performance data.</p>

	<form onsubmit={handleSubmit} class="tw-space-y-4">
		<div class="tw-p-4 tw-bg-[#0f172a]/50 tw-border tw-border-[#1e293b] tw-rounded tw-text-xs tw-text-gray-400 tw-space-y-2">
			<p class="tw-font-bold tw-text-gray-200">Assumption of Risk & Liability Release</p>
			<p>I acknowledge the inherent risks associated with participating in club sports and release the organization from any liability.</p>
			<div class="tw-flex tw-justify-between tw-pt-2 tw-border-t tw-border-[#1e293b]">
				<span>Signature Date:</span>
				<span class="tw-font-mono tw-text-[#14b8a6]">{todayDate}</span>
			</div>
		</div>

		<div class="tw-flex tw-items-center tw-space-x-2 tw-mt-4">
			<input
				type="checkbox"
				id="toggle-fan-os"
				bind:checked={engine.optInFanOsLivestream}
				class="tw-rounded tw-bg-[#0f172a] tw-border-[#1e293b] tw-text-[#14b8a6]"
			/>
			<label for="toggle-fan-os" class="tw-text-sm tw-text-gray-300 tw-cursor-pointer">
				Opt-in to Fan OS Livestreaming (Optional)
			</label>
		</div>

		<div class="tw-flex tw-items-center tw-space-x-2 tw-mb-4">
			<input
				type="checkbox"
				id="toggle-player-os"
				bind:checked={engine.optInPlayerOsTrials}
				class="tw-rounded tw-bg-[#0f172a] tw-border-[#1e293b] tw-text-[#14b8a6]"
			/>
			<label for="toggle-player-os" class="tw-text-sm tw-text-gray-300 tw-cursor-pointer">
				Opt-in to Player OS Video Trials (Optional)
			</label>
		</div>

		<div>
			<label class="tw-block tw-text-sm tw-font-semibold tw-mb-1" for="signature">
				Electronic Signature (Full Legal Name) <span class="tw-text-red-500">*</span>
			</label>
			<input
				type="text"
				id="signature"
				bind:value={engine.signature}
				placeholder="Jane Doe"
				class="tw-w-full tw-p-2 tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded tw-text-white focus:tw-outline-none focus:tw-border-[#14b8a6]"
				required
			/>
		</div>

		{#if engine.error}
			<p class="tw-text-red-500 tw-text-xs tw-font-semibold">{engine.error}</p>
		{/if}

		<button
			type="submit"
			disabled={!engine.isValid || engine.isSubmitting}
			class="tw-w-full tw-p-3 tw-bg-[#14b8a6] hover:tw-bg-[#0d9488] disabled:tw-bg-gray-700 disabled:tw-cursor-not-allowed tw-text-black tw-font-bold tw-rounded tw-transition"
		>
			{engine.isSubmitting ? 'SUBMITTING...' : 'AUTHORIZE & AGREE'}
		</button>
	</form>
</div>
