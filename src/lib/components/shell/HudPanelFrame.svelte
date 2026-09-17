<script lang="ts">
  /**
   * HudPanelFrame.svelte
   * Wraps content in a mechanical, Tech Noir segmented HUD frame.
   */
  let { children, color = 'var(--color-data-cyan)' } = $props();
</script>

<div class="hud-frame-container">
  <!-- Top Left Corner -->
  <svg class="hud-corner hud-tl" width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
    <path d="M 0 30 L 0 0 L 30 0" fill="none" stroke={color} stroke-width="1.5" />
    <path d="M 5 10 L 5 5 L 10 5" fill="none" stroke={color} stroke-width="1.5" opacity="0.5" />
  </svg>
  
  <!-- Top Right Corner -->
  <svg class="hud-corner hud-tr" width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
    <path d="M 0 0 L 30 0 L 30 30" fill="none" stroke={color} stroke-width="1.5" />
    <path d="M 25 10 L 25 5 L 20 5" fill="none" stroke={color} stroke-width="1.5" opacity="0.5" />
  </svg>

  <!-- Bottom Left Corner -->
  <svg class="hud-corner hud-bl" width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
    <path d="M 0 0 L 0 30 L 30 30" fill="none" stroke={color} stroke-width="1.5" />
    <path d="M 5 20 L 5 25 L 10 25" fill="none" stroke={color} stroke-width="1.5" opacity="0.5" />
  </svg>

  <!-- Bottom Right Corner -->
  <svg class="hud-corner hud-br" width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
    <path d="M 30 0 L 30 30 L 0 30" fill="none" stroke={color} stroke-width="1.5" />
    <path d="M 25 20 L 25 25 L 20 25" fill="none" stroke={color} stroke-width="1.5" opacity="0.5" />
  </svg>

  <!-- Crosshairs / Data Notches -->
  <div class="hud-notch top-notch" style="background-color: {color}"></div>
  <div class="hud-notch bottom-notch" style="background-color: {color}"></div>

  <div class="hud-content">
    {@render children()}
  </div>
</div>

<style>
  .hud-frame-container {
    position: relative;
    width: 100%;
    min-height: 50px;
    background: transparent;
  }
  .hud-corner {
    position: absolute;
    pointer-events: none;
    z-index: 10;
  }
  .hud-tl { top: 0; left: 0; }
  .hud-tr { top: 0; right: 0; }
  .hud-bl { bottom: 0; left: 0; }
  .hud-br { bottom: 0; right: 0; }

  .hud-notch {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 2px;
    z-index: 10;
  }
  .top-notch { top: 0; }
  .bottom-notch { bottom: 0; }

  .hud-content {
    position: relative;
    z-index: 1;
    padding: 1.5rem;
    height: 100%;
  }
</style>
