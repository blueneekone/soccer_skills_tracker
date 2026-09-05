<script lang="ts">
  import type { StakeholderCard } from './landingContent.js';

  let { card, gridLg }: { card: StakeholderCard; gridLg?: { col: string; row: string } } = $props();

  let hovered = $state(false);
</script>

<article
  class="sc-root vanguard-card tw-border-slate-800 {card.roleClass}"
  class:sc-root--hovered={hovered}
  aria-labelledby="sc-{card.id}-title"
  style={gridLg ? `--gcol: ${gridLg.col}; --grow: ${gridLg.row}` : undefined}
  onmouseenter={() => (hovered = true)}
  onmouseleave={() => (hovered = false)}
>
  <div class="sc-role-badge">
    <span class="sc-badge-dot"></span>
    {card.role}
  </div>
  <h3 class="sc-headline" id="sc-{card.id}-title">{card.headline}</h3>
  <p class="sc-body">{card.body}</p>
  <ul class="sc-features" aria-label="Key capabilities">
    {#each card.features as feature (feature)}
      <li class="sc-feature">
        <span class="sc-feature-dot" aria-hidden="true"></span>
        {feature}
      </li>
    {/each}
  </ul>
  <div class="sc-accent-label">{card.accentLabel}</div>
</article>

<style>
  .sc-root {
    display: flex;
    flex-direction: column;
    gap: clamp(0.75rem, 1.5vw, 1.1rem);
    padding: var(--bento-pad, clamp(1.25rem, 3vw, 1.75rem));
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(51, 65, 85, 0.6);
    backdrop-filter: blur(12px);
    transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    overflow: hidden;
    grid-column: var(--gcol, auto);
    grid-row: var(--grow, auto);
  }

  @media (max-width: 63.99rem) {
    .sc-root {
      grid-column: 1 / -1;
      grid-row: auto;
    }
  }

  .sc-root::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(
      ellipse at top left,
      color-mix(in srgb, var(--sc-accent) 12%, transparent),
      transparent 65%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .sc-root--hovered {
    border-color: var(--sc-accent);
    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.6), 0 0 25px color-mix(in srgb, var(--sc-accent) 25%, transparent);
    transform: translateY(-2px);
  }

  .sc-root--hovered::before {
    opacity: 1;
  }

  /* Per-role accent colors */
  :global(.stakeholder-card--directors) {
    --sc-accent: #6366f1;
  }

  :global(.stakeholder-card--coaches) {
    --sc-accent: #14b8a6;
  }

  :global(.stakeholder-card--athletes) {
    --sc-accent: #06b6d4;
  }

  :global(.stakeholder-card--parents) {
    --sc-accent: #10b981;
  }

  .sc-role-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
    font-weight: 700;
    letter-spacing: 0.25em;
    color: var(--sc-accent);
    margin-bottom: 0.25rem;
  }

  .sc-badge-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--sc-accent);
    box-shadow: 0 0 6px var(--sc-accent);
    animation: badge-pulse 2s ease-in-out infinite;
  }

  .sc-headline {
    font-family: 'Geist Sans', var(--font-display, sans-serif);
    font-size: clamp(1.05rem, 2vw, 1.25rem);
    font-weight: 700;
    color: #ffffff;
    margin: 0;
    line-height: 1.3;
  }

  .sc-body {
    font-family: 'Switzer', var(--font-sans, sans-serif);
    font-size: clamp(0.875rem, 1.2vw, 0.9375rem);
    font-weight: 400;
    color: #94a3b8;
    line-height: 1.7;
    margin: 0;
    flex: 1;
  }

  .sc-features {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .sc-feature {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
    color: var(--vanguard-text-3, #cbd5e1);
  }

  .sc-feature-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--sc-accent);
    flex-shrink: 0;
    opacity: 0.7;
  }

  .sc-accent-label {
    margin-top: auto;
    padding-top: 0.75rem;
    border-top: 1px solid color-mix(in srgb, var(--sc-accent) 20%, transparent);
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
    font-weight: 700;
    letter-spacing: 0.2em;
    color: color-mix(in srgb, var(--sc-accent) 75%, white);
  }

  @keyframes badge-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
</style>
