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

  // Defensive lifecycle logging using untrack to isolate execution
  $effect(() => {
    function handleMistakeEvent() {
      isMistakeActive = true;
    }
    window.addEventListener('simulate-out-of-bounds-drag', handleMistakeEvent);
    window.addEventListener('sstracker-route-mistake', handleMistakeEvent);

    if (isMistakeActive) {
      untrack(() => {
        console.log("🧠 [SSTracker EQ Compliance] Encouragement banner active. Rendering 'Practice makes progress'.");
        showToast = true;
      });
    } else {
      untrack(() => {
        showToast = false;
      });
    }

    return () => {
      window.removeEventListener('simulate-out-of-bounds-drag', handleMistakeEvent);
      window.removeEventListener('sstracker-route-mistake', handleMistakeEvent);
    };
  });

  // Action dispatcher (under 80 lines)
  function handleReset() {
    isRippling = true;
    setTimeout(() => {
      onReset();
      isMistakeActive = false;
      showToast = false;
      isRippling = false;
    }, 150);
  }
</script>

{#if isMistakeActive}
  <!-- Strict 90-degree Atompunk reset button -->
  <div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-50 tw-pointer-events-none" transition:fade={{ duration: 150 }}>
    <button
      type="button"
      onclick={handleReset}
      class="tw-pointer-events-auto tw-bg-[#0f172a] tw-border tw-border-[#fbbf24] tw-text-[#fbbf24] tw-px-6 tw-py-3 tw-font-mono tw-text-sm tw-font-bold tw-tracking-widest hover:tw-bg-[#fbbf24]/20 tw-transition-colors tw-shadow-[0_0_20px_rgba(251,191,36,0.3)]"
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
    <div class="tw-bg-[#0a0a0a] tw-border tw-border-[#334155] tw-px-5 tw-py-2.5 tw-text-xs tw-text-[#94a3b8] tw-tracking-wider tw-rounded-none tw-shadow-lg tw-font-sans">
      🛡️ <span class="tw-text-[#06b6d4]">Practice makes progress</span>
    </div>
  </div>
{/if}
