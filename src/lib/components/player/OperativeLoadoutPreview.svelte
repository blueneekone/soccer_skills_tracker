<script>
	import { parseOperativeAvatar } from '$lib/avatars/operativeAvatar.js';
	import { parseOperativeLoadout } from '$lib/gamification/loadoutSchema.js';
	import { composeOperativePortrait } from '$lib/gamification/renderOperativeLoadout.js';

	/**
	 * Read-only dossier preview — portrait + equipped digital slots (border, badge).
	 * Equip UX ships in Sprint 3.1; no Firestore writes here.
	 *
	 * @type {{
	 *   operativeAvatar?: unknown;
	 *   operativeLoadout?: unknown;
	 *   ownedCosmetics?: string[];
	 *   size?: number;
	 *   class?: string;
	 * }}
	 */
	let {
		operativeAvatar = undefined,
		operativeLoadout = undefined,
		ownedCosmetics = undefined,
		size = 96,
		class: className = '',
	} = $props();

	const avatarConfig = $derived(parseOperativeAvatar(operativeAvatar));
	const loadoutConfig = $derived(parseOperativeLoadout(operativeLoadout));

	const layers = $derived.by(() =>
		composeOperativePortrait({
			operativeAvatar: avatarConfig ?? operativeAvatar,
			loadout: loadoutConfig ?? operativeLoadout,
			size,
			ownedIds: ownedCosmetics,
		}),
	);

	const equippedTitle = $derived.by(() => {
		const parsed = loadoutConfig;
		if (!parsed) return '';
		const titleId = parsed.equipped.title;
		return typeof titleId === 'string' && titleId ? titleId.replace(/^title_/, '').replace(/_/g, ' ') : '';
	});
</script>

<div
	class={`operative-loadout-preview player-dossier-root ${layers.frameClass} ${className}`.trim()}
	style={`--olp-size: ${size}px; width: ${size}px; height: ${size}px;`}
	role="img"
	aria-label={equippedTitle ? `Operative portrait with ${equippedTitle}` : 'Operative portrait preview'}
>
	<div class="olp-stack">
		<div class="olp-portrait" aria-hidden="true">
			{@html layers.portraitSvg}
		</div>
		{#if layers.borderSvg}
			<div class="olp-border" aria-hidden="true">
				{@html layers.borderSvg}
			</div>
		{/if}
		{#if layers.badgeSvg}
			<div class="olp-badge" aria-hidden="true">
				{@html layers.badgeSvg}
			</div>
		{/if}
	</div>
	{#if equippedTitle}
		<p class="olp-title pd-label pd-mono">{equippedTitle}</p>
	{/if}
</div>

<style>
	.operative-loadout-preview {
		position: relative;
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		color: var(--pd-text, #f4f4f5);
	}

	.olp-stack {
		position: relative;
		width: var(--olp-size, 96px);
		height: var(--olp-size, 96px);
	}

	.olp-portrait,
	.olp-border,
	.olp-badge {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.olp-portrait :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 9999px;
	}

	.olp-border :global(svg),
	.olp-badge :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}

	.olp-title {
		margin: 0;
		max-width: var(--olp-size, 96px);
		text-align: center;
		font-size: 0.55rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--pd-accent-action, #fbbf24);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.loadout-frame--neon .olp-stack {
		filter: drop-shadow(0 0 6px rgba(20, 184, 166, 0.35));
	}

	.loadout-frame--neon .olp-portrait :global(svg) {
		box-shadow: 0 0 0 1px rgba(20, 184, 166, 0.25);
	}

	.loadout-frame--holo .olp-stack {
		filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.28));
	}

	.olp-border :global(img),
	.olp-badge :global(img) {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		pointer-events: none;
	}
</style>
