<script lang="ts">
  import { httpsCallable } from 'firebase/functions';
  import { getFunctions } from 'firebase/functions';
  import { Embeds } from '@checkr/web-sdk';
  import { ShieldCheck, Loader2 } from 'lucide-svelte';

  let hasAttested = $state(false);
  let isFetching = $state(false);
  let sessionToken = $state<string | null>(null);
  let checkrEnv = $state<'production' | 'staging' | null>(null);
  let errorMsg = $state<string | null>(null);
  
  // A DOM reference for the Checkr SDK to mount into
  let checkrContainer: HTMLDivElement | null = $state(null);
  
  async function initiateClearance() {
    if (!hasAttested) {
      alert('You must provide attestation to proceed.');
      return;
    }
    
    isFetching = true;
    errorMsg = null;
    try {
      const fns = getFunctions(undefined, 'us-east1');
      const generateCheckrEmbedToken = httpsCallable(fns, 'generateCheckrEmbedToken');
      
      const res = await generateCheckrEmbedToken({});
      const data = res.data as { embedToken: string | null, alphaMode: boolean, checkrEnv: 'production' | 'staging', orgVaultCleared?: boolean };
      
      if (data.orgVaultCleared) {
        errorMsg = 'Your clearance has already been propagated securely via the Organization Vault.';
        return;
      }
      
      if (data.alphaMode) {
        errorMsg = 'Alpha mode: No live CHECKR_API_KEY available. Mock integration enabled.';
        return;
      }
      
      if (data.embedToken) {
        sessionToken = data.embedToken;
        checkrEnv = data.checkrEnv;
      }
    } catch (e) {
      console.error('Checkr token generation failed', e);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = e as any;
      errorMsg = err.message || 'Failed to initialize the background check process.';
    } finally {
      isFetching = false;
    }
  }

  $effect(() => {
    if (sessionToken && checkrEnv && checkrContainer) {
      try {
        const client = new Embeds.NewInvitation({
          sessionToken,
          environment: checkrEnv
        });
        client.render('#checkr-container');
      } catch (err) {
        console.error('Checkr SDK Error:', err);
        errorMsg = 'Failed to load the background check interface.';
      }
    }
  });
</script>

<div class="tw-max-w-4xl tw-mx-auto tw-p-8 tw-text-[#D4D4D8]">
  <h1 class="tw-text-2xl tw-font-bold tw-text-[#FAFAFA] tw-mb-8 tw-flex tw-items-center tw-gap-3">
    <ShieldCheck strokeWidth={1.5} class="tw-w-8 tw-h-8 tw-text-blue-500" />
    Coach Background Clearance
  </h1>

  <div class="tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-rounded-xl tw-p-6 tw-mb-8">
    {#if !sessionToken && !errorMsg}
      <h2 class="tw-text-lg tw-font-bold tw-text-[#FAFAFA] tw-mb-4">Compliance Attestation</h2>
      <p class="tw-text-[#A1A1AA] tw-mb-6 tw-leading-relaxed">
        As a coach, you are required to complete a background check before accessing any sensitive minor PII. This process is securely managed via Checkr. No sensitive background data (such as SSNs) is stored on our servers.
      </p>

      <label class="tw-flex tw-items-start tw-gap-3 tw-mb-8 tw-cursor-pointer">
        <input 
          type="checkbox" 
          bind:checked={hasAttested}
          class="tw-mt-1 tw-w-5 tw-h-5 tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-rounded"
        />
        <span class="tw-text-[#D4D4D8]">
          I attest that I am authorized to undergo a background check and agree to securely submit my information for clearance.
        </span>
      </label>

      <button 
        class="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-w-full tw-bg-[#FAFAFA] tw-text-[#0f172a] tw-font-bold tw-py-3 tw-rounded-md tw-hover:bg-[#D4D4D8] tw-transition-colors disabled:opacity-50"
        onclick={initiateClearance}
        disabled={isFetching || !hasAttested}
      >
        {#if isFetching}
          <Loader2 strokeWidth={1.5} class="tw-w-5 tw-h-5 tw-animate-spin" />
          <span>Initializing Secure Session...</span>
        {:else}
          <span>Begin Background Check</span>
        {/if}
      </button>
    {/if}

    {#if errorMsg}
      <div class="tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-rounded-md tw-p-4 tw-mb-4 tw-text-[#D4D4D8]">
        <p class="tw-font-bold tw-text-[#FAFAFA] tw-mb-2">System Message</p>
        <p>{errorMsg}</p>
      </div>
    {/if}

    <!-- The DOM element where Checkr SDK will mount itself -->
    <div id="checkr-container" bind:this={checkrContainer} class="tw-w-full tw-min-h-[400px] {sessionToken ? 'tw-block' : 'tw-hidden'}"></div>
  </div>
</div>
