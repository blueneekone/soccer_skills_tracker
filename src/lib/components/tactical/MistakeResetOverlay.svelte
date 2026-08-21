<!-- MistakeResetOverlay.svelte -->
<!-- ============================================================================= -->
<!-- SSTRACKER EQ COMPLIANCE MISTAKE RESET OVERLAY -->
<!-- Implements our professional sports psychology "Practice makes progress" -->
<!-- encouragement cue and custom 90-degree Atompunk [ RESET DRILL ] trigger. -->
<!-- All rendering transitions are optimized to avoid DOM repaint cascades. -->
<!-- ============================================================================= -->

<script lang="ts">
  import { fade, slide } from 'svelte/transition';
  import { untrack } from 'svelte';

  // Svelte 5 Runes for properties binding and actions dispatcher
  let { 
    isMistakeActive = $bindable(false), 
    onReset 
  } = $props<{
    isMistakeActive: boolean;
    onReset: () => void;
  }>();

  let showToast = $state(false);
  let isRippling = $state(false);
  let toastTimer: ReturnType<typeof setTimeout>;

  // Defensive lifecycle logging using untrack to isolate execution
  $effect(() => {
    if (isMistakeActive) {
      untrack(() => {
        console.log("🧠 [SSTracker EQ Compliance] Encouragement banner active. Rendering 'Practice makes progress'.");
        showToast = true;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          showToast = false;
        }, 2500);
      });
    } else {
      untrack(() => {
        showToast = false;
        clearTimeout(toastTimer);
      });
    }
  });

  // Action dispatcher (under 80 lines)
  function handleReset() {
    isRippling = true;
    setTimeout(() => {
      onReset();
      isMistakeActive = false;
      isRippling = false;
    }, 300);
  }
</script>

{#if isMistakeActive}
  <!-- The 90-degree Atompunk square reset button centered on screen -->
  <div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-50 tw-pointer-events-none" transition:fade={{ duration: 150 }}>
    <button
      type="button"
      onclick={handleReset}
      class="tw-pointer-events-auto tw-relative tw-px-6 tw-py-4 tw-bg-[#0a0a0a] tw-border-2 tw-border-[#fbbf24] tw-text-[#fbbf24] tw-font-mono tw-text-sm tw-font-bold tw-rounded-none hover:tw-bg-[#fbbf24] hover:tw-text-[#0a0a0a] tw-transition-colors tw-shadow-2xl"
      style="border-radius: 0px;"
    >
      [ RESET DRILL ]
    </button>
  </div>
{/if}

<!-- Encouragement Toast sliding out from bottom right -->
{#if showToast}
  <div 
    class="tw-absolute tw-bottom-4 tw-right-4 tw-z-50 tw-overflow-hidden"
    transition:slide={{ duration: 300, axis: 'y' }}
  >
    <div class="tw-bg-[#0a0a0a] tw-border tw-border-[#334155] tw-px-5 tw-py-2.5 tw-text-xs tw-text-[#94a3b8] tw-tracking-wider tw-rounded-none tw-shadow-lg tw-font-mono">
      🛡️ <span class="tw-text-[#06b6d4]">Practice makes progress</span>
    </div>
  </div>
{/if}
