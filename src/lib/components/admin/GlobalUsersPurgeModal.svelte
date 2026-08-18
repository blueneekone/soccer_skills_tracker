<script lang="ts">
  let { show = $bindable(), emailToPurge, onConfirm } = $props();

  function close() {
    show = false;
  }

  async function confirmPurge() {
    if (onConfirm) {
      await onConfirm(emailToPurge);
    }
    close();
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
        
        <!-- Body: Non-transparent text content -->
        <p class="tw-font-sans tw-text-sm tw-text-slate-300 tw-whitespace-normal tw-break-words tw-mb-6">
            Warning: You are initiating a 24-hour cascading shredder process on the compliance vaults for <strong>{emailToPurge}</strong>. This action is legally irreversible.
        </p>
        
        <!-- Actions: Auto-scaling responsive buttons -->
        <div class="tw-flex tw-flex-col sm:tw-flex-row tw-justify-end tw-gap-3">
            <button class="tw-px-4 tw-py-2 tw-bg-slate-800 hover:tw-bg-slate-700 tw-text-white tw-font-mono tw-text-sm"
                    onclick={close}>
                Cancel
            </button>
            <button class="tw-px-4 tw-py-2 tw-bg-red-700 hover:tw-bg-red-600 tw-text-white tw-font-mono tw-text-sm"
                    onclick={confirmPurge}>
                Purge Profile
            </button>
        </div>
    </div>
</div>
{/if}
