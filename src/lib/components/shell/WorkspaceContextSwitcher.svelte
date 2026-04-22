<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import { getContextFromHref } from '$lib/auth/loginRouting.js';
	import {
		buildWorkspaceMenu,
		getShellContextLabel,
	} from '$lib/shell/workspaceContextMenu.js';

	/**
	 * @typedef {'sidebar' | 'mobile'} SwitcherVariant
	 */
	let { variant = /** @type {SwitcherVariant} */ ('sidebar') } = $props();

	let open = $state(false);
	/** @type {HTMLDivElement | undefined} */
	let rootEl = $state();

	const pathname = $derived(page.url.pathname);
	const email = $derived((authStore.user?.email || '').toLowerCase());
	const role = $derived(authStore.role || 'guest');
	const profile = $derived(authStore.userProfile);

	const menuSections = $derived(
		buildWorkspaceMenu({
			role,
			profile,
			email,
			clubs: teamsStore.clubs,
			teams: teamsStore.teams,
		}),
	);

	const triggerLabel = $derived(
		getShellContextLabel(pathname, role, profile, teamsStore.clubs, teamsStore.teams, email, {
			activeClubId: workspaceContextStore.activeClubId,
			activeTeamId: workspaceContextStore.activeTeamId,
		}),
	);

	const flatCount = $derived(menuSections.reduce((n, s) => n + s.items.length, 0));

	function close() {
		open = false;
	}

	/**
	 * @param {{ id: string; label: string; href: string }} item
	 */
	function pick(item) {
		workspaceContextStore.resetScope();
		workspaceContextStore.setPivot(item.id);
		const ctx = getContextFromHref(item.href);
		if (ctx) workspaceContextStore.setActiveContext(ctx);
		// Stamp scoped IDs from the URL so the target page can read them on mount.
		const params = new URL(item.href, 'http://x').searchParams;
		const tid = params.get('teamId');
		if (tid) workspaceContextStore.setActiveTeamId(tid);
		const cid = params.get('clubId');
		if (cid) workspaceContextStore.setActiveClubId(cid);
		close();
		void goto(item.href);
	}

	function toggle() {
		open = !open;
	}

	$effect(() => {
		if (!browser || !open) return;
		function onDocClick(/** @type {MouseEvent} */ e) {
			if (!rootEl || !(e.target instanceof Node)) return;
			if (!rootEl.contains(e.target)) close();
		}
		function onKey(/** @type {KeyboardEvent} */ e) {
			if (e.key === 'Escape') close();
		}
		document.addEventListener('click', onDocClick, true);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onDocClick, true);
			document.removeEventListener('keydown', onKey);
		};
	});

	$effect(() => {
		if (!browser) return;
		pathname;
		close();
	});
</script>

<div
	class="ec-ws"
	class:ec-ws--mobile={variant === 'mobile'}
	bind:this={rootEl}
>
	<button
		type="button"
		class="ec-ws__trigger"
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label="Switch workspace"
		onclick={(e) => {
			e.stopPropagation();
			toggle();
		}}
	>
		<ClubLogoMark size={variant === 'mobile' ? 'sm' : 'md'} />
		<div class="ec-ws__text">
			<span class="ec-ws__title ec-ws__truncate">{triggerLabel.title}</span>
			<span class="ec-ws__sub ec-ws__truncate">{triggerLabel.sub}</span>
		</div>
		<i class="ph ph-caret-up-down ec-ws__caret" aria-hidden="true"></i>
	</button>

	{#if open && flatCount > 0}
		<div class="ec-ws__popover" role="menu" aria-label="Workspaces">
			{#each menuSections as section (section.title)}
				<p class="ec-ws__section-label">{section.title}</p>
				<ul class="ec-ws__list">
					{#each section.items as item (item.id)}
						<li>
							<button
								type="button"
								class="ec-ws__item"
								role="menuitem"
								onclick={() => pick(item)}
							>
								{item.label}
							</button>
						</li>
					{/each}
				</ul>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Do not set overflow on this root — it clips the absolutely positioned menu. */
	.ec-ws {
		position: relative;
		align-self: stretch;
		width: 100%;
		max-width: 100%;
		min-width: 0;
	}

	.ec-ws--mobile {
		flex: 1;
		min-width: 0;
	}

	/* w-full + box-border — keeps trigger inside sidebar rail.
	   Strike 2: removed `contain: paint` (was clipping the popover). Hover
	   bleed is prevented by `overflow: hidden` on the trigger itself, which
	   only affects its own background/pseudo-elements — the popover is a
	   sibling of the trigger, so it is unaffected and floats freely. */
	.ec-ws__trigger {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		max-width: 100%;
		min-width: 0;
		min-height: 56px;
		padding: 10px 12px 10px 14px;
		margin: 0;
		border: none;
		background: transparent;
		cursor: pointer;
		font: inherit;
		text-align: left;
		border-radius: 0;
		box-sizing: border-box;
		overflow: hidden;
	}

	.ec-ws__trigger > :global(:first-child) {
		flex-shrink: 0;
	}

	.ec-ws__trigger:hover,
	.ec-ws__trigger:focus,
	.ec-ws__trigger:focus-visible,
	.ec-ws__trigger:active {
		margin: 0;
		max-width: 100%;
	}

	.ec-ws__trigger:hover {
		background: rgba(0, 0, 0, 0.03);
	}

	:global(html.dark) .ec-ws__trigger:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.ec-ws--mobile .ec-ws__trigger {
		min-height: 44px;
		padding: 8px 10px;
	}

	.ec-ws__text {
		flex: 1 1 0%;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	/* truncate (Tailwind parity) */
	.ec-ws__truncate {
		display: block;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ec-ws__title {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--text-primary);
		line-height: 1.25;
	}

	.ec-ws__sub {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-secondary);
		line-height: 1.2;
	}

	.ec-ws__caret {
		flex-shrink: 0;
		flex-grow: 0;
		font-size: 14px;
		color: var(--text-secondary);
		opacity: 0.85;
	}

	/* Strike 2: popover floats OVER the main canvas. It is allowed to exceed
	   the sidebar rail width because it is absolutely positioned relative to
	   `.ec-ws` and sits at z-index 1000 — so it paints above the entire
	   console chrome (sidebar z-index 50, main canvas has no stacking). */
	.ec-ws__popover {
		position: absolute;
		left: 8px;
		right: auto;
		top: calc(100% + 6px);
		width: clamp(260px, 18rem, calc(100vw - 48px));
		z-index: 1000;
		background: #ffffff;
		border: 1px solid #e5e5e5;
		border-radius: 10px;
		box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
		padding: 8px 0;
		max-height: min(70vh, 420px);
		overflow-y: auto;
		overflow-x: hidden;
		box-sizing: border-box;
	}

	:global(html.dark) .ec-ws__popover {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.12);
		box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
	}

	.ec-ws--mobile .ec-ws__popover {
		left: 0;
		right: 0;
	}

	.ec-ws__section-label {
		margin: 8px 12px 4px;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
	}

	.ec-ws__section-label:first-child {
		margin-top: 0;
	}

	.ec-ws__list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.ec-ws__item {
		display: block;
		width: 100%;
		padding: 8px 14px;
		border: none;
		background: transparent;
		font: inherit;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-primary);
		text-align: left;
		cursor: pointer;
		line-height: 1.35;
	}

	.ec-ws__item:hover {
		background: #f4f4f5;
	}

	:global(html.dark) .ec-ws__item:hover {
		background: rgba(255, 255, 255, 0.06);
	}
</style>
