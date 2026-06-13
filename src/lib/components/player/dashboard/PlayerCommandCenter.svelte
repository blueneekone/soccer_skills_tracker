<script lang="ts">
	import { resolveAppPath } from '$lib/components/_shared/resolveAppPath.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { PLAYER_COMMAND_CENTER_LINKS } from '$lib/player/dashboard/playerCommandCenterLinks.js';

	let {
		open = $bindable(false),
		pendingCount = 0,
	}: {
		open?: boolean;
		pendingCount?: number;
	} = $props();

	function close() {
		open = false;
	}

	function onScrimClick(/** @type {MouseEvent} */ e) {
		if (e.target === e.currentTarget) close();
	}

	function onKeydown(/** @type {KeyboardEvent} */ e) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

{#if open}
	<div
		class="pcc-scrim"
		role="presentation"
		onclick={onScrimClick}
	>
		<aside
			id="player-command-center"
			class="pcc-drawer"
			role="dialog"
			aria-modal="true"
			aria-labelledby="pcc-drawer-title"
		>
			<header class="pcc-drawer__head">
				<div class="pcc-drawer__title-wrap">
					<Icon name="status.shield-half" size={18} class="pcc-drawer__icon" />
					<h2 id="pcc-drawer-title" class="pcc-drawer__title">Command Center</h2>
				</div>
				<button type="button" class="pcc-drawer__close" onclick={close} aria-label="Close Command Center">
					<Icon name="sys.close" size={16} />
				</button>
			</header>
			<p class="pcc-drawer__lede">
				Secondary actions and destinations — kept off the main HUD so your dashboard stays focused.
			</p>
			{#if pendingCount > 0}
				<p class="pcc-drawer__badge" role="status">
					{pendingCount} pending assignment{pendingCount === 1 ? '' : 's'}
				</p>
			{/if}
			<ul class="pcc-drawer__list">
				{#each PLAYER_COMMAND_CENTER_LINKS as link (link.href)}
					<li>
						<a
							href={resolveAppPath(link.href)}
							class="pcc-drawer__link"
							data-sveltekit-preload-data="hover"
							onclick={close}
						>
							<span class="pcc-drawer__link-icon" aria-hidden="true">
								<Icon name={link.icon} size={18} />
							</span>
							<span class="pcc-drawer__link-text">
								<span class="pcc-drawer__link-label">{link.label}</span>
								{#if link.description}
									<span class="pcc-drawer__link-desc">{link.description}</span>
								{/if}
							</span>
							<Icon name="nav.chevron-right" size={14} class="pcc-drawer__chev" />
						</a>
					</li>
				{/each}
			</ul>
		</aside>
	</div>
{/if}

<style>
	.pcc-scrim {
		position: fixed;
		inset: 0;
		z-index: 520;
		display: flex;
		justify-content: flex-end;
		pointer-events: auto;
		background: color-mix(in srgb, var(--color-dominant, #0f172a) 55%, transparent);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
	}

	.pcc-drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		width: min(100%, 22rem);
		max-height: 100dvh;
		margin: 0;
		padding: clamp(16px, 3vw, 24px);
		gap: var(--bento-gap-liquid, clamp(20px, 4vw, 32px));
		border-left: 1px solid color-mix(in srgb, var(--color-structural, #3b82f6) 25%, transparent);
		background: color-mix(in srgb, var(--color-dominant, #0f172a) 96%, #000);
		box-shadow: var(--shadow-liquid);
		overflow-y: auto;
	}

	.pcc-drawer__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--bento-gap-sm, 0.75rem);
	}

	.pcc-drawer__title-wrap {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.pcc-drawer__title {
		margin: 0;
		font-family: 'Geist', ui-sans-serif, system-ui, sans-serif;
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--vanguard-text-1, #f8fafc);
	}

	.pcc-drawer__icon {
		color: var(--color-accent, #fbbf24);
		flex-shrink: 0;
	}

	.pcc-drawer__close {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		border-radius: 12px;
		border: 1px solid color-mix(in srgb, var(--color-structural, #3b82f6) 30%, transparent);
		background: color-mix(in srgb, var(--color-dominant, #0f172a) 80%, transparent);
		color: #94a3b8;
		cursor: pointer;
	}

	.pcc-drawer__lede {
		margin: 0;
		font-size: 0.8rem;
		line-height: 1.45;
		color: #94a3b8;
	}

	.pcc-drawer__badge {
		margin: 0;
		padding: 0.35rem 0.65rem;
		border-radius: 999px;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.62rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-accent, #fbbf24);
		border: 1px solid color-mix(in srgb, var(--color-accent, #fbbf24) 35%, transparent);
		background: color-mix(in srgb, var(--color-accent, #fbbf24) 8%, transparent);
		width: fit-content;
	}

	.pcc-drawer__list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: clamp(8px, 2vw, 12px);
	}

	.pcc-drawer__link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 44px;
		padding: 0.65rem 0.75rem;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--color-structural, #3b82f6) 18%, transparent);
		background: color-mix(in srgb, var(--color-dominant, #0f172a) 88%, transparent);
		text-decoration: none;
		color: inherit;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
	}

	.pcc-drawer__link:hover {
		border-color: color-mix(in srgb, var(--color-structural, #3b82f6) 45%, transparent);
		background: color-mix(in srgb, var(--color-structural, #3b82f6) 12%, transparent);
	}

	.pcc-drawer__link-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 10px;
		background: color-mix(in srgb, var(--color-structural, #3b82f6) 14%, transparent);
		color: var(--color-structural, #3b82f6);
		flex-shrink: 0;
	}

	.pcc-drawer__link-text {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		min-width: 0;
		gap: 2px;
	}

	.pcc-drawer__link-label {
		font-size: 0.82rem;
		font-weight: 700;
		color: #f1f5f9;
	}

	.pcc-drawer__link-desc {
		font-size: 0.68rem;
		color: #64748b;
		line-height: 1.3;
	}

	.pcc-drawer__chev {
		flex-shrink: 0;
		color: #475569;
	}
</style>
