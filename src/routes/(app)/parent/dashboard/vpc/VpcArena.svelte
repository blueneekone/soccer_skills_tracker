<script lang="ts">
	import type VpcEngine from './VpcEngine.svelte.ts';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { engine }: { engine: VpcEngine } = $props();
</script>

<div class="tw-p-6 tw-bg-[#0F172A] tw-rounded-[24px] tw-border tw-border-[#1E293B]">
	<h2 class="tw-text-lg tw-font-bold tw-text-white tw-mb-3 tw-flex tw-items-center tw-gap-2">
		<Icon name={"sys.fingerprint" as IconName} size={20} class="tw-text-amber-500" />
		<span>Biometric Registration (VPC)</span>
	</h2>

	<p class="tw-text-sm tw-font-sans tw-text-slate-300 tw-mb-6">
		To complete Verifiable Parental Consent (VPC), please register your device's biometric authenticator (FaceID / TouchID / Windows Hello).
	</p>

	{#if engine.error}
		<div class="tw-p-4 tw-mb-4 tw-rounded-xl tw-bg-red-950/30 tw-border tw-border-red-500/30 tw-flex tw-items-center tw-gap-2">
			<Icon name={"status.error" as IconName} size={16} class="tw-text-red-400" />
			<p class="tw-text-sm tw-text-red-300 tw-font-mono">{engine.error}</p>
		</div>
	{/if}

	{#if engine.success}
		<div class="tw-p-4 tw-rounded-xl tw-bg-emerald-950/30 tw-border tw-border-emerald-500/30 tw-flex tw-items-center tw-gap-2">
			<Icon name={"status.seal-check" as IconName} size={18} class="tw-text-amber-500" />
			<p class="tw-text-sm tw-text-amber-500 tw-font-mono tw-font-bold">Biometric VPC Registration Complete</p>
		</div>
	{:else}
		<button
			onclick={() => engine.register()}
			disabled={engine.loading || !engine.isReady}
			class="tw-w-full tw-py-3.5 tw-px-6 tw-rounded-xl tw-bg-amber-500 tw-text-black tw-font-mono tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase hover:tw-bg-amber-400 disabled:tw-opacity-50 disabled:tw-cursor-not-allowed tw-transition-all tw-flex tw-items-center tw-justify-center tw-gap-2"
		>
			<Icon name={"sys.fingerprint" as IconName} size={18} />
			<span>
				{#if engine.loading}
					Processing Biometric Auth…
				{:else}
					Authenticate with Device Biometrics
				{/if}
			</span>
		</button>
	{/if}
</div>
