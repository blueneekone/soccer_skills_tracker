<script lang="ts">
	import { TRUST_BADGES } from './landingContent.js';
	import StatusChip from '$lib/components/ui/StatusChip.svelte';
</script>

<section class="ts-root" aria-label="Platform compliance and security certifications">
	<div class="ts-inner">
		<span class="ts-headline">COMPLIANCE & TRUST</span>
		<div class="ts-badges" role="list">
			{#each TRUST_BADGES as badge (badge.label)}
				<div class="ts-badge vanguard-card tw-border-slate-800" role="listitem">
					<StatusChip tone="verified" label={badge.label} size="md" />
					<span class="ts-badge__sub">{badge.sublabel}</span>
				</div>
			{/each}
		</div>
		<div class="ts-note-wrap">
			<span class="ts-note-text">
				All security, compliance, and data practices are independently audited.
			</span>
			<a href="/privacy" class="ts-privacy-btn">
				<span>VIEW FULL PRIVACY POLICY</span>
				<span class="ts-btn-arrow" aria-hidden="true">→</span>
			</a>
		</div>
	</div>
</section>

<style>
	.ts-root {
		padding-block: clamp(2rem, 4vw, 3rem);
		padding-inline: clamp(1rem, 5vw, 3rem);
		border-top: 1px solid rgba(51, 65, 85, 0.4);
		border-bottom: 1px solid rgba(51, 65, 85, 0.4);
		background: #020617;
	}

	.ts-inner {
		max-width: 1300px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(1rem, 2.5vw, 1.75rem);
	}

	.ts-headline {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		font-weight: 700;
		letter-spacing: 0.3em;
		color: #14b8a6;
		text-transform: uppercase;
	}

	.ts-badges {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		width: 100%;
		max-width: 1100px;
	}

	@media (min-width: 640px) {
		.ts-badges {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (min-width: 1024px) {
		.ts-badges {
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}
	}

	.ts-badge {
		padding: 0.85rem 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		border-radius: 8px;
		background: rgba(15, 23, 42, 0.65);
		border: 1px solid rgba(51, 65, 85, 0.6);
		backdrop-filter: blur(8px);
		transition: all 0.2s ease;
		cursor: default;
		height: 100%;
	}

	.ts-badge:hover {
		border-color: #14b8a6;
		background: rgba(20, 184, 166, 0.08);
		transform: translateY(-2px);
		box-shadow: 0 4px 15px rgba(20, 184, 166, 0.15);
	}

	.ts-badge__label {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: clamp(0.6875rem, 1.2vw, 0.75rem);
		font-weight: 900;
		letter-spacing: 0.12em;
		color: var(--vanguard-text-1, #ffffff);
	}

	.ts-badge__sub {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: var(--vanguard-text-eyebrow-size, 0.6875rem);
		font-weight: 600;
		letter-spacing: 0.15em;
		color: var(--vanguard-text-eyebrow, #a5b4fc);
		text-transform: uppercase;
		text-align: center;
	}

	.ts-note-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin-top: 0.75rem;
	}

	.ts-note-text {
		font-family: 'Switzer', var(--font-sans, sans-serif);
		font-size: 0.8125rem;
		color: #94a3b8;
		text-align: center;
	}

	.ts-privacy-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.4rem 0.85rem;
		border-radius: 6px;
		background: rgba(15, 23, 42, 0.85);
		border: 1px solid rgba(51, 65, 85, 0.8);
		color: #14b8a6;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-decoration: none;
		transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
	}

	.ts-privacy-btn:hover {
		background: rgba(20, 184, 166, 0.12);
		border-color: #14b8a6;
		color: #ffffff;
		box-shadow: 0 0 12px rgba(20, 184, 166, 0.25);
		transform: translateY(-1px);
	}

	.ts-btn-arrow {
		font-weight: 900;
		transition: transform 180ms ease;
	}

	.ts-privacy-btn:hover .ts-btn-arrow {
		transform: translateX(3px);
	}
</style>
