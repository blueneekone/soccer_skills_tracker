<script lang="ts">
	/**
	 * Icon.svelte — Universal icon wrapper enforcing 1.5px stroke weight.
	 *
	 * USAGE
	 * ─────
	 *   <Icon name="status.verified" />
	 *   <Icon name="nav.sign-out" size={20} class="tw-text-teal-400" />
	 *   <Icon name="status.warning" decorative={false} label="Warning" />
	 *
	 * RULES
	 * ─────
	 * - Always use this component — never raw <i class="ph ph-*"> or inline <svg>.
	 * - Color via tw-text-* only; stroke inherits currentColor automatically.
	 * - `decorative` defaults to true (aria-hidden). Set false + label for icons
	 *   that carry meaning without adjacent text.
	 */

	import { REGISTRY, type IconName } from '$lib/icons/registry.js';

	interface Props {
		name: IconName;
		size?: number;
		strokeWidth?: number;
		class?: string;
		decorative?: boolean;
		label?: string;
	}

	const {
		name,
		size = 16,
		strokeWidth = 1.5,
		class: className = '',
		decorative = true,
		label,
	}: Props = $props();

	const IconComponent = $derived(REGISTRY[name]);
	const ariaLabel = $derived(!decorative && label ? label : undefined);
	const role = $derived(!decorative && label ? 'img' : undefined);
	const ariaHidden = $derived(decorative ? true : undefined);
</script>

<IconComponent
	{size}
	stroke-width={strokeWidth}
	class={className}
	aria-hidden={ariaHidden}
	aria-label={ariaLabel}
	{role}
/>
