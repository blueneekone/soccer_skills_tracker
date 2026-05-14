<script lang="ts">
	/**
	 * AlertBanner.svelte — Full-width alert with mandatory icon + heading + body.
	 *
	 * Replaces ad-hoc banners across the app. Every banner carries:
	 *   leading icon + heading + body + optional CTA (3 redundant signals)
	 * for WCAG 2.2 AA compliance.
	 *
	 * Palette: muted accent tokens only — NO neon, NO box-shadow glow.
	 *
	 * USAGE
	 * ─────
	 *   <AlertBanner tone="warning" heading="System maintenance" body="Back at 3 AM." />
	 *   <AlertBanner tone="critical" heading="Access denied" body="Contact your admin.">
	 *     <svelte:fragment slot="cta">
	 *       <button>Retry</button>
	 *     </svelte:fragment>
	 *   </AlertBanner>
	 */

	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	type Tone = 'verified' | 'warning' | 'critical' | 'pending' | 'muted' | 'info';

	import type { Snippet } from 'svelte';

	interface Props {
		tone: Tone;
		heading: string;
		body?: string;
		icon?: IconName;
		/** Optional CTA rendered below the body text. */
		cta?: Snippet;
		/** Render a dismiss button that fires this callback. */
		onDismiss?: () => void;
		class?: string;
	}

	const {
		tone,
		heading,
		body,
		icon: iconOverride,
		cta,
		onDismiss,
		class: className = '',
	}: Props = $props();

	const TONE_ICON: Record<Tone, IconName> = {
		verified: 'status.shield-check',
		warning:  'status.warning',
		critical: 'status.error',
		pending:  'status.pending',
		muted:    'status.info',
		info:     'status.info',
	};

	/** Muted accent palette — no neon, no shadow glow. */
	const TONE_STYLE: Record<Tone, string> = {
		verified: '--ab-bg: rgba(20,184,166,0.08); --ab-border: rgba(20,184,166,0.25); --ab-text: #5eead4; --ab-heading: #99f6e4;',
		warning:  '--ab-bg: rgba(180,83,9,0.10);   --ab-border: rgba(180,83,9,0.3);    --ab-text: #fdba74; --ab-heading: #fed7aa;',
		critical: '--ab-bg: rgba(153,27,27,0.10);  --ab-border: rgba(153,27,27,0.3);   --ab-text: #fca5a5; --ab-heading: #fecaca;',
		pending:  '--ab-bg: rgba(100,116,139,0.08);--ab-border: rgba(100,116,139,0.25);--ab-text: #94a3b8; --ab-heading: #cbd5e1;',
		muted:    '--ab-bg: rgba(71,85,105,0.08);  --ab-border: rgba(71,85,105,0.2);   --ab-text: #64748b; --ab-heading: #94a3b8;',
		info:     '--ab-bg: rgba(56,189,248,0.08); --ab-border: rgba(56,189,248,0.25); --ab-text: #7dd3fc; --ab-heading: #bae6fd;',
	};

	const resolvedIcon = $derived(iconOverride ?? TONE_ICON[tone]);
	const bannerStyle = $derived(TONE_STYLE[tone]);
</script>

<div
	class="ab-root {className}"
	style={bannerStyle}
	role="alert"
	aria-live="polite"
>
	<Icon name={resolvedIcon} size={18} class="ab-icon" />

	<div class="ab-content">
		<p class="ab-heading">{heading}</p>
		{#if body}
			<p class="ab-body">{body}</p>
		{/if}
		{#if cta}
			{@render cta()}
		{/if}
	</div>

	{#if onDismiss}
		<button
			class="ab-dismiss"
			onclick={onDismiss}
			aria-label="Dismiss"
			type="button"
		>
			<Icon name="sys.close" size={14} />
		</button>
	{/if}
</div>

<style>
	.ab-root {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		width: 100%;
		padding: 12px 16px;
		border-radius: 8px;
		border: 1px solid var(--ab-border);
		background: var(--ab-bg);
		color: var(--ab-text);
		font-size: 13px;
		line-height: 1.5;
	}

	.ab-icon {
		flex-shrink: 0;
		margin-top: 1px;
		opacity: 0.9;
	}

	.ab-content {
		flex: 1;
		min-width: 0;
	}

	.ab-heading {
		margin: 0;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--ab-heading);
	}

	.ab-body {
		margin: 4px 0 0;
		font-size: 13px;
		opacity: 0.85;
	}

	.ab-dismiss {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--ab-text);
		cursor: pointer;
		opacity: 0.6;
		transition: opacity 0.15s, background 0.15s;
		padding: 0;
	}

	.ab-dismiss:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.07);
	}
</style>
