<script lang="ts">
	import { TRUST_BADGES } from './landingContent.js';
	import StatusChip from '$lib/components/ui/StatusChip.svelte';
</script>

<section class="ts-root" aria-label="Platform compliance and security certifications">
	<div class="ts-inner">
		<span class="ts-headline">ENTERPRISE TRUST LAYER</span>
		<div class="ts-badges" role="list">
			{#each TRUST_BADGES as badge (badge.label)}
				<div class="ts-badge glass-panel" role="listitem">
					<StatusChip tone="verified" label={badge.label} size="md" />
					<span class="ts-badge__sub">{badge.sublabel}</span>
				</div>
			{/each}
		</div>
		<p class="ts-note">
			All security, compliance, and data practices are independently audited.
			<a href="/privacy" class="ts-note-link">View full privacy policy →</a>
		</p>
	</div>
</section>

<style>
	.ts-root {
		padding-block: clamp(2.5rem, 5vw, 4rem);
		padding-inline: clamp(1rem, 5vw, 3rem);
		border-top: 1px solid var(--vanguard-border);
		border-bottom: 1px solid var(--vanguard-border);
		background: color-mix(in srgb, var(--vanguard-glass) 80%, transparent);
		backdrop-filter: blur(var(--vanguard-blur));
		-webkit-backdrop-filter: blur(var(--vanguard-blur));
	}

	.ts-inner {
		max-width: 1300px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(1.25rem, 3vw, 2rem);
	}

	.ts-headline {
		font-family: 'JetBrains Mono', monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		font-weight: 700;
		letter-spacing: 0.35em;
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		text-transform: uppercase;
	}

	.ts-badges {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: clamp(0.5rem, 1.5vw, 0.85rem);
	}

	.ts-badge {
		padding: clamp(0.6rem, 1.5vw, 0.85rem) clamp(0.85rem, 2vw, 1.25rem);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		border-radius: var(--vanguard-radius-sm);
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
		cursor: default;
	}

	.ts-badge:hover {
		border-color: color-mix(in srgb, var(--vanguard-cyan) 35%, transparent);
		box-shadow: var(--vanguard-elev-2);
	}

	.ts-badge__label {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(0.6875rem, 1.2vw, 0.75rem);
		font-weight: 900;
		letter-spacing: 0.12em;
		color: var(--vanguard-text-1, #ffffff);
	}

	.ts-badge__sub {
		font-family: 'JetBrains Mono', monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		font-weight: 600;
		letter-spacing: 0.15em;
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		text-transform: uppercase;
	}

	.ts-note {
		font-family: 'JetBrains Mono', monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		color: var(--vanguard-text-3, #cbd5e1);
		margin: 0;
		text-align: center;
		opacity: 0.7;
	}

	.ts-note-link {
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		text-decoration: none;
		transition: color 0.15s;
	}

	.ts-note-link:hover {
		color: var(--vanguard-cyan);
	}
</style>
