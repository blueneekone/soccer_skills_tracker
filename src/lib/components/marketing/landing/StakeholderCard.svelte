<script lang="ts">
  import type { StakeholderCard } from './landingContent.js';

  let { card }: { card: StakeholderCard } = $props();

  let hovered = $state(false);
</script>

<article
  class="sc-root glass-panel {card.roleClass}"
  class:sc-root--hovered={hovered}
  aria-labelledby="sc-{card.id}-title"
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
    gap: clamp(0.65rem, 1.5vw, 1rem);
    padding: var(--bento-pad);
    border-radius: var(--radius-premium);
    transition: border-color 0.25s, box-shadow 0.25s, transform 0.2s;
    position: relative;
    overflow: hidden;
  }

  .sc-root::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(
      ellipse at top left,
      color-mix(in srgb, var(--sc-accent) 8%, transparent),
      transparent 60%
    );
    opacity: 0;
    transition: opacity 0.3s;
  }

  .sc-root--hovered {
    transform: translateY(-4px);
    box-shadow: var(--vanguard-elev-3);
    border-color: color-mix(in srgb, var(--sc-accent) 35%, transparent);
  }

  .sc-root--hovered::before {
    opacity: 1;
  }

  /* Per-role accent colors */
  :global(.stakeholder-card--directors) {
    --sc-accent: #6366f1;
  }

  :global(.stakeholder-card--coaches) {
    --sc-accent: #8b5cf6;
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
    font-family: 'JetBrains Mono', monospace;
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
    font-family: 'JetBrains Mono', monospace;
    font-size: clamp(0.8rem, 1.8vw, 1rem);
    font-weight: 800;
    color: white;
    margin: 0;
    line-height: 1.35;
  }

  .sc-body {
    font-family: 'JetBrains Mono', monospace;
    font-size: clamp(0.875rem, 1.2vw, 0.9375rem);
    color: var(--vanguard-text-2, #e2e8f0);
    line-height: 1.8;
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
    font-family: 'JetBrains Mono', monospace;
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
    font-family: 'JetBrains Mono', monospace;
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
