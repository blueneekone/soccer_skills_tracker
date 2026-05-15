<script lang="ts">
  type PayloadKey =
    | 'svg_sole_taps'
    | 'svg_inside_outside_cut'
    | 'svg_speed_ladder'
    | 'svg_shoulder_check';

  type TierKey = 'beginner' | 'intermediate' | 'advanced';

  interface Props {
    payload: PayloadKey;
    title: string;
    tier: TierKey;
  }

  let { payload, title, tier }: Props = $props();

  const tierColor = $derived(
    tier === 'beginner' ? '#14b8a6' : tier === 'intermediate' ? '#ffcc00' : '#ff0055'
  );
</script>

<div
  class="tw-w-full tw-aspect-video tw-relative tw-overflow-hidden tw-rounded-xl tw-bg-[#020202] tw-border tw-border-[#14b8a6]/30"
>
  <svg viewBox="0 0 400 250" class="tw-w-full tw-h-full" xmlns="http://www.w3.org/2000/svg">
    <!-- Obsidian field base -->
    <rect width="400" height="250" fill="#020202" />

    <!-- Neon cyan boundary (4px inset) -->
    <rect
      x="4"
      y="4"
      width="392"
      height="242"
      fill="none"
      stroke="#14b8a6"
      stroke-opacity="0.25"
      stroke-width="1"
    />

    <!-- Centre circle -->
    <circle
      cx="200"
      cy="125"
      r="40"
      fill="none"
      stroke="#14b8a6"
      stroke-opacity="0.15"
      stroke-width="1"
    />

    <!-- Centre spot -->
    <circle cx="200" cy="125" r="3" fill="#14b8a6" fill-opacity="0.4" />

    {#if payload === 'svg_sole_taps'}
      <!-- Left foot -->
      <circle
        cx="175"
        cy="145"
        r="12"
        fill="none"
        stroke="#14b8a6"
        stroke-opacity="0.5"
        stroke-width="1.5"
      />
      <!-- Right foot -->
      <circle
        cx="225"
        cy="145"
        r="12"
        fill="none"
        stroke="#14b8a6"
        stroke-opacity="0.5"
        stroke-width="1.5"
      />
      <!-- Dashed connector between feet -->
      <line
        x1="163"
        y1="145"
        x2="237"
        y2="145"
        stroke="#14b8a6"
        stroke-opacity="0.25"
        stroke-width="1"
        stroke-dasharray="4,3"
      />
      <!-- Animated ball: cx driven by CSS animation -->
      <circle
        class="ball-sole-tap"
        cx="175"
        cy="145"
        r="8"
        fill="#14b8a6"
        fill-opacity="0.9"
        style="filter:drop-shadow(0 0 8px #14b8a6)"
      />
    {:else if payload === 'svg_inside_outside_cut'}
      <!-- Dashed path trace -->
      <polyline
        points="130,200 200,150 270,200"
        fill="none"
        stroke="#14b8a6"
        stroke-opacity="0.2"
        stroke-width="1"
        stroke-dasharray="4,4"
      />
      <!-- Vertex indicator — start -->
      <polygon points="127,197 134,200 127,203" fill="#14b8a6" fill-opacity="0.5" />
      <!-- Vertex indicator — apex -->
      <polygon points="197,147 200,154 203,147" fill="#14b8a6" fill-opacity="0.65" />
      <!-- Vertex indicator — end -->
      <polygon points="267,197 274,200 267,203" fill="#14b8a6" fill-opacity="0.4" />
      <!-- Animated ball: cx/cy driven by CSS animation -->
      <circle
        class="ball-zigzag"
        cx="130"
        cy="200"
        r="8"
        fill="#14b8a6"
        fill-opacity="0.9"
        style="filter:drop-shadow(0 0 8px #14b8a6)"
      />
    {:else if payload === 'svg_speed_ladder'}
      <!-- Five horizontal rungs -->
      <line x1="120" y1="80"  x2="280" y2="80"  stroke="#00ff66" stroke-opacity="0.5" stroke-width="1.5" />
      <line x1="120" y1="100" x2="280" y2="100" stroke="#00ff66" stroke-opacity="0.5" stroke-width="1.5" />
      <line x1="120" y1="120" x2="280" y2="120" stroke="#00ff66" stroke-opacity="0.5" stroke-width="1.5" />
      <line x1="120" y1="140" x2="280" y2="140" stroke="#00ff66" stroke-opacity="0.5" stroke-width="1.5" />
      <line x1="120" y1="160" x2="280" y2="160" stroke="#00ff66" stroke-opacity="0.5" stroke-width="1.5" />
      <!-- Side rails -->
      <line x1="120" y1="80"  x2="120" y2="160" stroke="#00ff66" stroke-opacity="0.3" stroke-width="1" />
      <line x1="280" y1="80"  x2="280" y2="160" stroke="#00ff66" stroke-opacity="0.3" stroke-width="1" />
      <!-- Left foot dot: moves down through rungs -->
      <circle
        class="ladder-dot-a"
        cx="155"
        cy="80"
        r="6"
        fill="#14b8a6"
        fill-opacity="0.9"
        style="filter:drop-shadow(0 0 8px #14b8a6)"
      />
      <!-- Right foot dot: moves up through rungs (offset phase) -->
      <circle
        class="ladder-dot-b"
        cx="200"
        cy="160"
        r="6"
        fill="#00ff66"
        fill-opacity="0.9"
        style="filter:drop-shadow(0 0 8px #00ff66)"
      />
    {:else if payload === 'svg_shoulder_check'}
      <!-- Player torso ring -->
      <circle
        cx="200"
        cy="180"
        r="14"
        fill="none"
        stroke="#14b8a6"
        stroke-opacity="0.6"
        stroke-width="1.5"
      />
      <!-- Player head ring -->
      <circle
        cx="200"
        cy="166"
        r="6"
        fill="none"
        stroke="#14b8a6"
        stroke-opacity="0.4"
        stroke-width="1"
      />
      <!-- Left scanning arc -->
      <path
        d="M 188,174 A 36,36 0 0 0 162,152"
        fill="none"
        stroke="#14b8a6"
        stroke-width="1.5"
        class="scan-arc-left"
      />
      <!-- Right scanning arc -->
      <path
        d="M 212,174 A 36,36 0 0 1 238,152"
        fill="none"
        stroke="#14b8a6"
        stroke-width="1.5"
        class="scan-arc-right"
      />
      <!-- Pulsing eye-glyph dot above head -->
      <circle
        class="eye-pulse"
        cx="200"
        cy="157"
        r="4"
        fill="#14b8a6"
        style="filter:drop-shadow(0 0 8px #14b8a6)"
      />
    {/if}
  </svg>

  <!-- HUD overlay — pointer-events-none -->
  <div
    class="tw-absolute tw-inset-0 tw-pointer-events-none tw-p-3 tw-flex tw-flex-col tw-justify-between"
  >
    <!-- Top row: label + tier badge -->
    <div class="tw-flex tw-justify-between tw-items-start">
      <span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/60"
        >[ TACTICAL BOARD ]</span
      >
      <span
        class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-font-bold tw-px-2 tw-py-0.5 tw-rounded"
        style="color:{tierColor}; border: 1px solid {tierColor}40"
      >{tier.toUpperCase()}</span>
    </div>

    <!-- Bottom: drill title -->
    <div>
      <span class="tw-font-mono tw-text-xs tw-text-white/70">{title}</span>
    </div>
  </div>
</div>

<style>
  /* ── Sole Taps ─────────────────────────────────────────────────────────── */
  @keyframes sole-tap {
    0%,  45%  { cx: 175; }
    50%, 95%  { cx: 225; }
    100%      { cx: 175; }
  }

  .ball-sole-tap {
    animation: sole-tap 2s ease-in-out infinite;
  }

  /* ── Inside / Outside Cut ──────────────────────────────────────────────── */
  @keyframes zigzag {
    0%   { cx: 130; cy: 200; }
    50%  { cx: 200; cy: 150; }
    100% { cx: 270; cy: 200; }
  }

  .ball-zigzag {
    animation: zigzag 2s ease-in-out infinite;
  }

  /* ── Speed Ladder ──────────────────────────────────────────────────────── */
  @keyframes ladder-step-a {
    0%   { cy: 80;  }
    25%  { cy: 120; }
    50%  { cy: 160; }
    75%  { cy: 120; }
    100% { cy: 80;  }
  }

  @keyframes ladder-step-b {
    0%   { cy: 160; }
    25%  { cy: 120; }
    50%  { cy: 80;  }
    75%  { cy: 120; }
    100% { cy: 160; }
  }

  .ladder-dot-a {
    animation: ladder-step-a 2s ease-in-out infinite;
  }

  .ladder-dot-b {
    animation: ladder-step-b 2s ease-in-out infinite;
  }

  /* ── Shoulder Check ────────────────────────────────────────────────────── */
  @keyframes eye-pulse {
    0%, 100% { opacity: 0.2; }
    50%      { opacity: 1;   }
  }

  @keyframes scan-left {
    0%, 50%, 100% { opacity: 0.15; }
    25%           { opacity: 0.75; }
  }

  @keyframes scan-right {
    0%, 50%, 100% { opacity: 0.15; }
    75%           { opacity: 0.75; }
  }

  .eye-pulse {
    animation: eye-pulse 2s ease-in-out infinite;
  }

  .scan-arc-left {
    animation: scan-left 2s ease-in-out infinite;
  }

  .scan-arc-right {
    animation: scan-right 2s ease-in-out infinite;
  }
</style>
