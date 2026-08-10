<script lang="ts">
  import type { VpcEngine } from './VpcEngine.svelte.js';

  let { engine = $bindable() }: { engine: VpcEngine } = $props();

  async function handleVerify() {
    // Mocking the WebAuthn flow for UI demonstration purposes
    await engine.verify({
      attestationObjectB64: 'mock_attestation_b64',
      clientDataJSONB64: btoa(JSON.stringify({ type: 'webauthn.create', challenge: engine.challenge })),
      credentialIdB64: 'mock_credential_id'
    });
  }
</script>

<script module>
  import Icon from '$lib/components/ui/Icon.svelte';
  import type { IconName } from '$lib/icons/registry.js';
</script>

<div class="tw-border tw-border-slate-800 tw-rounded-[24px] tw-p-8 tw-bg-slate-900 tw-text-center tw-flex tw-flex-col tw-items-center tw-gap-6">
  <div class="tw-w-24 tw-h-24 tw-rounded-full tw-bg-slate-800 tw-flex tw-items-center tw-justify-center">
    <Icon name={"sys.lock" as IconName} class="tw-w-12 tw-h-12 tw-text-[#14b8a6]" />
  </div>

  <div>
    <h3 class="tw-text-white tw-font-bold tw-text-xl">Biometric Verification Required</h3>
    <p class="tw-text-slate-400 tw-mt-2">Use TouchID or FaceID to securely grant Verifiable Parental Consent.</p>
  </div>

  {#if engine.error}
    <div class="tw-text-red-400 tw-font-mono tw-text-sm">{engine.error}</div>
  {/if}

  {#if engine.isVerified}
    <div class="tw-text-[#14b8a6] tw-font-mono tw-text-sm tw-font-bold">VERIFICATION SUCCESSFUL</div>
  {:else}
    <button
      onclick={handleVerify}
      disabled={engine.mutating || !engine.challenge}
      class="tw-px-6 tw-py-3 tw-bg-[#0f172a] tw-text-white tw-border tw-border-[#334155] tw-rounded-[24px] hover:tw-bg-slate-800 disabled:tw-opacity-50 tw-transition-colors"
    >
      {engine.mutating ? 'VERIFYING...' : 'VERIFY IDENTITY'}
    </button>
  {/if}
</div>
