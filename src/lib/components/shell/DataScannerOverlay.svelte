<script lang="ts">
  /**
   * DataScannerOverlay.svelte
   * Absolute positioned scanning radar line for high-priority panels.
   */
  let { color = 'var(--color-data-cyan)', duration = '3s' } = $props();
</script>

<div class="scanner-container">
  <div class="scanner-line" style="--scan-color: {color}; --scan-duration: {duration}"></div>
</div>

<style>
  .scanner-container {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 5; /* Sit above background but below text if possible */
    border-radius: inherit;
  }

  .scanner-line {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 20%;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      color-mix(in srgb, var(--scan-color) 20%, transparent) 90%,
      var(--scan-color) 100%
    );
    opacity: 0.5;
    animation: scan var(--scan-duration) linear infinite;
  }

  @keyframes scan {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(500%); }
  }
</style>
