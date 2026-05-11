<script>
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

	/** @type {{ children?: import('svelte').Snippet }} */
	let { children } = $props();

	let interceptorActive = $state(true);
	let attested = $state(false);
	let isLogging = $state(false);

	async function handleAttest() {
		if (attested || isLogging) return;
		isLogging = true;
		attested = true;
		interceptorActive = false;
		try {
			await addDoc(collection(db, 'eq_attestations'), {
				clubId: authStore.userProfile?.clubId ?? '',
				parentUid: authStore.user?.uid ?? '',
				linkedPlayerId: authStore.userProfile?.linkedPlayerId ?? '',
				attestedAt: serverTimestamp(),
				protocol: 'car_ride_home_v1',
			});
		} catch (e) {
			console.error('[CarRideInterceptor] EQ attestation log failed:', e);
		} finally {
			isLogging = false;
		}
	}
</script>

<div class="tw-relative tw-w-full">
	{#if interceptorActive}
		<!-- Children rendered but visually masked behind the overlay -->
		<div class="tw-opacity-0 tw-pointer-events-none">
			{@render children?.()}
		</div>

		<!-- EQ Defense Overlay -->
		<div
			class="tw-absolute tw-inset-0 tw-z-50 tw-pointer-events-auto tw-backdrop-blur-[40px] tw-bg-[#020202]/95 tw-rounded-xl tw-border tw-border-[#ff0055]/30 tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-8 tw-gap-6"
		>
			<!-- Urgency badge -->
			<div
				class="tw-inline-flex tw-items-center tw-gap-2 tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#ff0055] tw-uppercase tw-border tw-border-[#ff0055]/50 tw-bg-[#ff0055]/10 tw-rounded tw-px-4 tw-py-2"
			>
				<span>⚠</span>
				<span>CAR RIDE HOME PROTOCOL — ACTIVE</span>
			</div>

			<!-- Divider -->
			<div class="tw-w-full tw-max-w-md tw-h-px tw-bg-[#ff0055]/15"></div>

			<!-- Mandate text block -->
			<div class="tw-flex tw-flex-col tw-gap-4 tw-text-center tw-max-w-md">
				<p class="tw-font-mono tw-text-[13px] tw-leading-relaxed tw-text-[#e0e0e0]">
					MANDATE: Protect player EQ. Do not critique tactical errors today.
				</p>
				<p class="tw-font-mono tw-text-[12px] tw-leading-relaxed tw-text-[#a0a0a0] tw-italic">
					"I love watching you play. How did it feel out there today?"
				</p>
			</div>

			<!-- Divider -->
			<div class="tw-w-full tw-max-w-md tw-h-px tw-bg-[#ff0055]/15"></div>

			<!-- EQ Compliance CTA -->
			<button
				onclick={handleAttest}
				disabled={isLogging}
				class="tw-w-full tw-max-w-md tw-font-mono tw-text-[10px] tw-tracking-widest tw-uppercase tw-border tw-border-[#ff0055] tw-text-[#ff0055] tw-bg-[#ff0055]/10 tw-rounded-lg tw-px-6 tw-py-4 tw-transition-all tw-duration-200
					{isLogging
					? 'tw-opacity-50 tw-cursor-not-allowed'
					: 'hover:tw-bg-[#ff0055]/20 hover:tw-shadow-[0_0_15px_rgba(255,0,85,0.4)]'}"
			>
				{#if isLogging}
					[ LOGGING ATTESTATION... ]
				{:else}
					[ ATTEST EQ COMPLIANCE &amp; UNLOCK METRICS ]
				{/if}
			</button>

			<!-- Protocol label -->
			<span
				class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#ff0055]/30 tw-uppercase"
			>
				PROTOCOL: CAR_RIDE_HOME_V1
			</span>
		</div>
	{:else}
		{@render children?.()}
	{/if}
</div>
