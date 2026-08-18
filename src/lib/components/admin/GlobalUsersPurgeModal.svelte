<script lang="ts">
  interface Props {
    show?: boolean;
    emailToPurge: string;
    onConfirm: (email: string, reason?: string) => Promise<void> | void;
  }

  let { show = $bindable(false), emailToPurge, onConfirm }: Props = $props();

  let step = $state(1);
  let typedConfirmation = $state('');
  let reason = $state('');
  let busy = $state(false);
  let err = $state('');

  function close() {
    show = false;
    step = 1;
    typedConfirmation = '';
    reason = '';
    busy = false;
    err = '';
  }

  async function handleConfirm() {
    if (typedConfirmation !== emailToPurge) {
      err = 'Email does not match.';
      return;
    }
    if (!reason.trim()) {
      err = 'Reason is required.';
      return;
    }

    busy = true;
    err = '';
    try {
      if (onConfirm) {
        await onConfirm(emailToPurge, reason);
      }
      close();
    } catch (error: any) {
      err = error.message || 'An error occurred';
    } finally {
      busy = false;
    }
  }

  function nextStep() {
    step = 2;
  }
</script>

{#if show}
<!-- Outer Overlay: Fixed, full viewport lock with dark backdrop blur and high z-index -->
<div class="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-black/90 tw-backdrop-blur-md tw-p-4">
    
    <!-- Modal Card Box: Solid Slate background, Structural Grey borders, and Vanguard chamfered clip-path -->
    <div class="tw-relative tw-w-full tw-max-w-md tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-6 tw-shadow-2xl tw-min-w-0"
         style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
         
        <!-- Header: Monospace Action Gold / Amber warning typography -->
        <h3 class="tw-font-mono tw-text-xl tw-text-[#fbbf24] tw-mb-4">
            ⚠️ CONFIRM IDENTITY PURGE
        </h3>

        {#if err}
            <div class="tw-text-red-500 tw-text-xs tw-mb-4 tw-font-mono">{err}</div>
        {/if}
        
        {#if step === 1}
        <!-- Body: Non-transparent text content -->
        <p class="tw-font-sans tw-text-sm tw-text-slate-300 tw-whitespace-normal tw-break-words tw-mb-6">
            Warning: You are initiating a 24-hour cascading shredder process on the compliance vaults for <strong>{emailToPurge}</strong>. This action is legally irreversible.
        </p>
        
        <!-- Actions: Auto-scaling responsive buttons -->
        <div class="tw-flex tw-flex-col sm:tw-flex-row tw-justify-end tw-gap-3">
            <button class="tw-px-4 tw-py-2 tw-bg-slate-800 hover:tw-bg-slate-700 tw-text-white tw-font-mono tw-text-sm"
                    onclick={close} disabled={busy}>
                Cancel
            </button>
            <button class="tw-px-4 tw-py-2 tw-bg-red-700 hover:tw-bg-red-600 tw-text-white tw-font-mono tw-text-sm"
                    onclick={nextStep} disabled={busy}>
                Next
            </button>
        </div>
        {:else}
        <div class="tw-mb-4">
            <label class="tw-block tw-text-xs tw-text-slate-400 tw-mb-1 tw-font-mono">Type <strong>{emailToPurge}</strong> to confirm</label>
            <input type="text" class="tw-w-full tw-bg-slate-900 tw-border tw-border-slate-700 tw-text-white tw-px-3 tw-py-2 tw-text-sm tw-font-mono" bind:value={typedConfirmation} disabled={busy} />
        </div>

        <div class="tw-mb-6">
            <label class="tw-block tw-text-xs tw-text-slate-400 tw-mb-1 tw-font-mono">Reason for Purge</label>
            <textarea class="tw-w-full tw-bg-slate-900 tw-border tw-border-slate-700 tw-text-white tw-px-3 tw-py-2 tw-text-sm tw-font-sans" rows="3" bind:value={reason} disabled={busy}></textarea>
        </div>

        <div class="tw-flex tw-flex-col sm:tw-flex-row tw-justify-end tw-gap-3">
            <button class="tw-px-4 tw-py-2 tw-bg-slate-800 hover:tw-bg-slate-700 tw-text-white tw-font-mono tw-text-sm"
                    onclick={close} disabled={busy}>
                Cancel
            </button>
            <button class="tw-px-4 tw-py-2 tw-bg-red-700 hover:tw-bg-red-600 tw-text-white tw-font-mono tw-text-sm disabled:tw-opacity-50"
                    onclick={handleConfirm} disabled={busy || !typedConfirmation || !reason}>
                {busy ? 'Purging...' : 'Purge Profile'}
            </button>
        </div>
        {/if}
    </div>
</div>
{/if}
