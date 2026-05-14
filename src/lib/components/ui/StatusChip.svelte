<script lang="ts">
	/**
	 * StatusChip.svelte — The only legal way to render a status pill.
	 *
	 * Every chip MUST carry: icon + text + tone-color (3 redundant signals)
	 * to satisfy WCAG 2.2 AA (≥ 4.5:1 contrast on muted backgrounds).
	 *
	 * Tone palette: muted accent tokens only — NO neon glows, NO box-shadow glow.
	 *
	 * USAGE
	 * ─────
	 *   <StatusChip tone="verified" label="VPC · VERIFIED" />
	 *   <StatusChip tone="warning" label="Incomplete" icon="status.warning" />
	 *   <StatusChip tone="pending" label="In Review" size="md" />
	 */

	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	type Tone = 'verified' | 'warning' | 'critical' | 'pending' | 'muted';
	type Size = 'sm' | 'md';

	interface Props {
		tone: Tone;
		/** Required — no color-only chips. */
		label: string;
		/** Override the default icon for this tone. */
		icon?: IconName;
		size?: Size;
		class?: string;
	}

	const {
		tone,
		label,
		icon: iconOverride,
		size = 'sm',
		class: className = '',
	}: Props = $props();

	/** Default icon per tone. */
	const TONE_ICON: Record<Tone, IconName> = {
		verified: 'status.verified',
		warning:  'status.warning',
		critical: 'status.error',
		pending:  'status.pending',
		muted:    'status.info',
	};

	const resolvedIcon = $derived(iconOverride ?? TONE_ICON[tone]);

	/**
	 * Muted accent palette — no neon, no shadow glow.
	 * bg, border, text are in RGBA so they layer correctly on dark surfaces.
	 */
	const TONE_STYLE: Record<Tone, string> = {
		verified: '--chip-bg: rgba(20,184,166,0.12); --chip-border: rgba(20,184,166,0.35); --chip-text: #5eead4;',
		warning:  '--chip-bg: rgba(180,83,9,0.14);   --chip-border: rgba(180,83,9,0.4);    --chip-text: #fb923c;',
		critical: '--chip-bg: rgba(153,27,27,0.14);  --chip-border: rgba(153,27,27,0.4);   --chip-text: #fca5a5;',
		pending:  '--chip-bg: rgba(100,116,139,0.12);--chip-border: rgba(100,116,139,0.35);--chip-text: #94a3b8;',
		muted:    '--chip-bg: rgba(71,85,105,0.10);  --chip-border: rgba(71,85,105,0.3);   --chip-text: #64748b;',
	};

	const chipStyle = $derived(TONE_STYLE[tone]);
	const iconSize = $derived(size === 'md' ? 14 : 12);
</script>

<span
	class="sc-root sc-root--{size} {className}"
	style={chipStyle}
	role="status"
	aria-label={label}
>
	<Icon name={resolvedIcon} size={iconSize} class="sc-icon" />
	<span class="sc-label">{label}</span>
</span>

<style>
	.sc-root {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		border-radius: 5px;
		background: var(--chip-bg);
		border: 1px solid var(--chip-border);
		color: var(--chip-text);
		font-family: 'Geist Mono', 'Fira Code', ui-monospace, monospace;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		line-height: 1;
		white-space: nowrap;
	}

	.sc-root--sm {
		padding: 3px 8px;
		font-size: 10px;
	}

	.sc-root--md {
		padding: 5px 10px;
		font-size: 11px;
	}

	/* Icon inherits currentColor from .sc-root */
	.sc-icon {
		flex-shrink: 0;
		opacity: 0.9;
	}

	.sc-label {
		font-weight: 500;
	}
</style>
