<!--
  SportSoccerBallIcon — Vanguard custom registry glyph for association football.

  Mirrors lucide-svelte icon props so Icon.svelte can render it uniformly.
  Default stroke width 1.5 matches Nexus Command Icon wrapper contract (not Lucide’s 2px default).
-->
<script lang="ts">
	type Props = {
		size?: number;
		strokeWidth?: number;
		class?: string;
		'aria-hidden'?: boolean | string | undefined;
		'aria-label'?: string | undefined;
		role?: string | undefined;
	};

	let {
		size = 24,
		strokeWidth = 1.5,
		class: className = '',
		'aria-hidden': ariaHidden,
		'aria-label': ariaLabel,
		role,
	}: Props = $props();

	/** Central pentagon — panel cue that reads as a soccer ball (vs. volleyball’s curved meridians). */
	const pentagon =
		'M12 6.5 L7.72 9.61 L9.36 14.64 L14.64 14.64 L16.28 9.61 Z';
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	class={['lucide lucide-soccer-ball', className].filter(Boolean).join(' ')}
	aria-hidden={ariaHidden}
	aria-label={ariaLabel}
	{role}
>
	<circle cx="12" cy="12" r="10" />
	<path d={pentagon} />
</svg>
