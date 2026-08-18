<script lang="ts">
  interface Props {
    show?: boolean;
    step?: number;
    targetEmail: string;
    targetName?: string;
    typedConfirmation?: string;
    reason?: string;
    busy?: boolean;
    err?: string;
    onClose?: () => void;
    onCancel?: () => void;
    onAdvance?: () => void;
    onConfirm: () => Promise<void> | void;
  }

  let {
    show = $bindable(false),
    step = 1,
    targetEmail,
    targetName = "",
    typedConfirmation = $bindable(""),
    reason = $bindable(""),
    busy = false,
    err = "",
    onClose,
    onCancel,
    onAdvance,
    onConfirm,
  }: Props = $props();

  function close() {
    if (onClose) onClose();
    else if (onCancel) onCancel();
    else show = false;
  }
</script>

{#if show}
<div class="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-black/90 tw-backdrop-blur-md tw-p-4">
    <div class="tw-relative tw-w-full tw-max-w-md tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-6 tw-shadow-2xl tw-min-w-0"
         style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
         
        <h3 class="tw-font-mono tw-text-xl tw-text-[#fbbf24] tw-mb-4">
            ⚠️ CONFIRM IDENTITY PURGE
        </h3>
        
        <p class="tw-font-sans tw-text-sm tw-text-slate-300 tw-whitespace-normal tw-break-words tw-mb-6">
            Warning: You are initiating a 24-hour cascading shredder process on the compliance vaults for <strong>{targetEmail}</strong>. This action is legally irreversible.
        </p>
        
        {#if step === 2}
          <div class="tw-mb-4">
            <label class="tw-block tw-text-sm tw-text-slate-300 tw-mb-1" for="confirm_text">Type {targetEmail} to confirm:</label>
            <input id="confirm_text" type="text" class="tw-w-full tw-p-2 tw-bg-slate-800 tw-border tw-border-slate-700 tw-text-white tw-font-mono" bind:value={typedConfirmation} />
          </div>
          <div class="tw-mb-4">
            <label class="tw-block tw-text-sm tw-text-slate-300 tw-mb-1" for="reason_text">Reason for purge:</label>
            <input id="reason_text" type="text" class="tw-w-full tw-p-2 tw-bg-slate-800 tw-border tw-border-slate-700 tw-text-white tw-font-sans" bind:value={reason} />
          </div>
        {/if}

        {#if err}
            <div class="tw-text-red-500 tw-text-sm tw-mb-4">{err}</div>
        {/if}

        <div class="tw-flex tw-flex-col sm:tw-flex-row tw-justify-end tw-gap-3">
            <button class="tw-px-4 tw-py-2 tw-bg-slate-800 hover:tw-bg-slate-700 tw-text-white tw-font-mono tw-text-sm"
                    disabled={busy} onclick={close}>
                Cancel
            </button>
            {#if step === 1}
              <button class="tw-px-4 tw-py-2 tw-bg-red-700 hover:tw-bg-red-600 tw-text-white tw-font-mono tw-text-sm"
                      disabled={busy} onclick={onAdvance}>
                  Continue
              </button>
            {:else}
              <button class="tw-px-4 tw-py-2 tw-bg-red-700 hover:tw-bg-red-600 tw-text-white tw-font-mono tw-text-sm"
                      disabled={busy || (step === 2 && typedConfirmation !== targetEmail)} onclick={onConfirm}>
                  {#if busy}
                    Purging...
                  {:else}
                    Purge Profile
                  {/if}
              </button>
            {/if}
        </div>
    </div>
</div>
{/if}
