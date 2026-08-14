<script lang="ts">
	import type VpcEngine from './VpcEngine.svelte.ts';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { engine }: { engine: VpcEngine } = $props();
</script>

<div class="tw-flex tw-flex-col tw-gap-4">
	<div class="tw-p-6 tw-bg-[#0F172A] tw-rounded-none tw-border tw-border-[#1E293B]">
		<div class="tw-flex tw-items-center tw-justify-between tw-mb-2">
			<h1 class="tw-text-xl tw-font-sans tw-font-bold tw-text-white tw-flex tw-items-center tw-gap-2">
				<Icon name={"status.shield-check" as IconName} size={20} class="tw-text-nuclear-yellow" />
				<span>Verifiable Parental Consent (VPC)</span>
			</h1>
			<span class="tw-text-[9px] tw-px-2 tw-py-0.5 tw-font-mono tw-border tw-border-nuclear-yellow/40 tw-bg-nuclear-yellow/10 tw-text-nuclear-yellow tw-font-bold tw-rounded-none">
				COPPA-GATE
			</span>
		</div>
		<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-mt-2">
			STATUS:
			{#if engine.success}
				<span class="tw-text-nuclear-yellow tw-font-bold tw-ml-1">VERIFIED (TIER-0 ACTIVE)</span>
			{:else}
				<span class="tw-text-amber-400 tw-font-bold tw-ml-1">PENDING HARDWARE ATTESTATION</span>
			{/if}
		</p>
	</div>

	<div class="tw-p-6 tw-bg-[#0B0F19] tw-rounded-none tw-border tw-border-[#1E293B]">
		<h3 class="tw-text-xs tw-font-mono tw-text-nuclear-yellow tw-uppercase tw-tracking-widest tw-mb-3 tw-flex tw-items-center tw-gap-1.5">
			<Icon name={"status.info" as IconName} size={14} />
			<span>E-Sign Legal Disclosure</span>
		</h3>
		<p class="tw-text-xs tw-font-mono tw-text-slate-400 tw-leading-relaxed">
			By completing the biometric authentication process below, you confirm that you are the parent or legal guardian of the minor athlete.
			Your consent is recorded securely with an immutable E-Sign signature, capturing your IP address, device signature, and exact timestamp.
			This data is stored securely in our compliance vault and cannot be altered or deleted.
		</p>
	</div>
</div>
