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
  <!-- The 90-degree Atompunk physical reset button (SVG 3D Bevel) centered on screen -->
  <div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-50 tw-pointer-events-none" transition:fade={{ duration: 150 }}>
    <button
      type="button"
      onclick={handleReset}
      class="tw-pointer-events-auto tw-relative tw-w-24 tw-h-24 tw-rounded-full tw-focus:outline-none"
    >
      <svg viewBox="0 0 100 100" class="tw-w-full tw-h-full tw-drop-shadow-lg">
        <!-- Base Drop Shadow / Bevel -->
        <circle cx="50" cy="52" r="45" fill="#b45309" />
        <!-- Main Button Surface -->
        <circle cx="50" cy="50" r="45" fill="#fbbf24" class="hover:tw-fill-[#f59e0b] tw-transition-colors" />
        <!-- Inner Bevel Highlight -->
        <circle cx="50" cy="50" r="40" fill="none" stroke="#fcd34d" stroke-width="2" opacity="0.5" />
        <!-- Icon / Text -->
        <path d="M 35 50 A 15 15 0 1 1 65 50 A 15 15 0 0 1 35 50" fill="none" stroke="#0a0a0a" stroke-width="4" stroke-dasharray="70 20" stroke-linecap="round" />
        <polygon points="60,45 70,50 60,55" fill="#0a0a0a" />
      </svg>
      {#if isRippling}
        <div class="tw-absolute tw-inset-0 tw-rounded-full tw-bg-white tw-animate-ping tw-opacity-75"></div>
      {/if}
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
