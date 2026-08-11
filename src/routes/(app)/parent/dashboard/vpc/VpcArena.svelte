<script lang="ts">
	import type VpcEngine from './VpcEngine.svelte.ts';

	let { engine }: { engine: VpcEngine } = $props();
</script>

<div class="tw-p-6 tw-bg-[#1e293b] tw-border tw-border-[#334155]" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
	<h2 class="tw-text-xl tw-font-sans tw-text-white tw-mb-4">Biometric Registration</h2>

	<p class="tw-text-sm tw-font-sans tw-text-[#94a3b8] tw-mb-6">
		To complete Verifiable Parental Consent (VPC), please register your device's biometric authenticator (FaceID / TouchID).
	</p>

	{#if engine.error}
		<div class="tw-p-4 tw-mb-4 tw-bg-red-500/10 tw-border tw-border-red-500/20" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
			<p class="tw-text-sm tw-text-red-400 tw-font-mono">{engine.error}</p>
		</div>
	{/if}

	{#if engine.success}
		<div class="tw-p-4 tw-bg-[#2dd4bf]/10 tw-border tw-border-[#2dd4bf]/20" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
			<p class="tw-text-sm tw-text-[#2dd4bf] tw-font-mono">✓ Biometric VPC Registration Complete</p>
		</div>
	{:else}
		<button
			onclick={() => engine.register()}
			disabled={engine.loading || !engine.isReady}
			class="tw-w-full tw-py-3 tw-px-6 tw-bg-transparent tw-border tw-border-[#2dd4bf] tw-text-[#2dd4bf] hover:tw-bg-[#2dd4bf]/10 disabled:tw-opacity-50 disabled:tw-cursor-not-allowed tw-transition-colors tw-font-sans tw-font-medium"
			style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);"
		>
			{#if engine.loading}
				Processing...
			{:else}
				Authenticate with Device
			{/if}
		</button>
	{/if}
</div>
