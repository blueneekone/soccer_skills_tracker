<script lang="ts">
  let { show = $bindable(false), emailToPurge = '', onConfirm = undefined, step = 0, targetEmail = '', targetName = '', typedConfirmation = $bindable(''), reason = $bindable(''), busy = false, err = '', onClose = undefined, onAdvance = undefined } = $props();

  function close() {
    if (onClose) {
      onClose();
    } else {
      show = false;
    }
  }

  async function confirmPurge() {
    if (onConfirm) {
      await onConfirm(emailToPurge || targetEmail);
    }
    close();
  }
</script>

{#if show || step > 0}
<div class="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-black/90 tw-backdrop-blur-md tw-p-4">
    <div class="tw-relative tw-w-full tw-max-w-md tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-6 tw-shadow-2xl tw-min-w-0"
         style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
         
        <h3 class="tw-font-mono tw-text-xl tw-text-[#fbbf24] tw-mb-4">
            ⚠️ CONFIRM IDENTITY PURGE
        </h3>
        
        <p class="tw-font-sans tw-text-sm tw-text-slate-300 tw-whitespace-normal tw-break-words tw-mb-6">
            Warning: You are initiating a 24-hour cascading shredder process on the compliance vaults for <strong>{emailToPurge || targetEmail}</strong>. This action is legally irreversible.
        </p>
        
        <div class="tw-flex tw-flex-col sm:tw-flex-row tw-justify-end tw-gap-3">
            <button class="tw-px-4 tw-py-2 tw-bg-slate-800 hover:tw-bg-slate-700 tw-text-white tw-font-mono tw-text-sm"
                    onclick={close} disabled={busy}>
                Cancel
            </button>
            <button class="tw-px-4 tw-py-2 tw-bg-red-700 hover:tw-bg-red-600 tw-text-white tw-font-mono tw-text-sm"
                    onclick={onAdvance || confirmPurge} disabled={busy}>
                {busy ? 'Processing...' : 'Purge Profile'}
            </button>
        </div>
    </div>
</div>
{/if}
