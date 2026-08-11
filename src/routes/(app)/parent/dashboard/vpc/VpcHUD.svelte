<script lang="ts">
	import type VpcEngine from './VpcEngine.svelte.ts';

	let { engine }: { engine: VpcEngine } = $props();
</script>

<div class="tw-flex tw-flex-col tw-gap-4">
	<div class="tw-p-6 tw-bg-[#1e293b] tw-rounded-none" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px); tw-border tw-border-[#334155]">
		<h1 class="tw-text-2xl tw-font-sans tw-text-white tw-mb-2">Verifiable Parental Consent (VPC)</h1>
		<p class="tw-font-mono tw-text-sm tw-text-[#94a3b8]">
			STATUS:
			{#if engine.success}
				<span class="tw-text-[#2dd4bf]">VERIFIED</span>
			{:else}
				<span class="tw-text-[#f59e0b]">PENDING</span>
			{/if}
		</p>
	</div>

	<div class="tw-p-6 tw-bg-[#0f172a] tw-rounded-none" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px); tw-border tw-border-[#334155]">
		<h3 class="tw-text-sm tw-font-sans tw-text-[#94a3b8] tw-uppercase tw-mb-3">E-Sign Legal Disclosure</h3>
		<p class="tw-text-xs tw-font-mono tw-text-[#64748b] tw-leading-relaxed">
			By completing the biometric authentication process below, you confirm that you are the parent or legal guardian of the minor athlete.
			Your consent is recorded securely with an immutable E-Sign signature, capturing your IP address, device signature, and exact timestamp.
			This data is stored securely in our compliance vault and cannot be altered or deleted.
		</p>
	</div>
</div>
