<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import { getContextFromHref } from '$lib/auth/loginRouting.js';
	import { buildWorkspaceMenu, getShellContextLabel } from '$lib/shell/workspaceContextMenu.js';
	import { db } from '$lib/firebase.js';
	import { doc, getDoc } from 'firebase/firestore';

	let { variant = 'sidebar' }: { variant?: 'sidebar' | 'mobile' } = $props();

	let open = $state(false);
	let rootEl: HTMLDivElement | undefined = $state();
	let sportLoadStatus: 'idle' | 'loading' | 'done' | 'error' = $state('idle');

	const pathname = $derived(page.url.pathname);
	const email = $derived((authStore.user?.email || '').toLowerCase());
	const role = $derived(authStore.role || 'guest');
	const profile = $derived(authStore.userProfile);

	const menuSections = $derived(
		buildWorkspaceMenu({ role, profile, email, clubs: teamsStore.clubs, teams: teamsStore.teams })
	);

	const triggerLabel = $derived(
		getShellContextLabel(pathname, role, profile, teamsStore.clubs, teamsStore.teams, email, {
			activeClubId: workspaceContextStore.activeClubId,
			activeTeamId: workspaceContextStore.activeTeamId,
		})
	);

	const flatCount = $derived(menuSections.reduce((n, s) => n + s.items.length, 0));

	// Build org-grouped sections from teamsStore.clubs.
	// Falls back to flat menu when no club has an orgId (backward compat).
	const orgGroups = $derived.by(() => {
		const clubs = teamsStore.clubs;
		if (!clubs.length) return [];

		const groups: Record<string, { orgId: string; orgName: string; clubs: typeof clubs }> = {};
		for (const club of clubs) {
			const oid = (club as any).orgId || '__standalone__';
			const oname =
				(club as any).orgName ||
				(oid === '__standalone__' ? 'STANDALONE DIVISIONS' : oid.toUpperCase());
			if (!groups[oid]) groups[oid] = { orgId: oid, orgName: oname, clubs: [] };
			groups[oid].clubs.push(club);
		}
		return Object.values(groups);
	});

	const hasOrgTopology = $derived(orgGroups.some((g) => g.orgId !== '__standalone__'));

	// Active sport accent color from the loaded sport config.
	const sportAccent = $derived.by(() => {
		const cfg = workspaceContextStore.activeSportConfig;
		if (!cfg) return '#14b8a6';
		const attrs = (cfg as any).attributes;
		if (Array.isArray(attrs) && attrs.length > 0) return attrs[0].hexColor || '#14b8a6';
		return '#14b8a6';
	});

	// Show popover when open AND there's something to display.
	const popoverVisible = $derived(open && (hasOrgTopology || flatCount > 0));

	function close() {
		open = false;
	}

	function toggle() {
		open = !open;
	}

	async function pick(item: { id: string; label: string; href: string }) {
		workspaceContextStore.resetScope();
		workspaceContextStore.setPivot(item.id);
		const ctx = getContextFromHref(item.href);
		if (ctx) workspaceContextStore.setActiveContext(ctx);

		const params = new URL(item.href, 'http://x').searchParams;
		const tid = params.get('teamId');
		if (tid) workspaceContextStore.setActiveTeamId(tid);
		const cid = params.get('clubId');
		if (cid) workspaceContextStore.setActiveClubId(cid);

		// Org-topology: stamp orgId and divisionId from the selected club.
		if (cid) {
			const selectedClub = teamsStore.clubs.find((c) => c.id === cid) as any;
			if (selectedClub?.orgId) {
				workspaceContextStore.setActiveOrgId(selectedClub.orgId);
			}
			workspaceContextStore.setActiveDivisionId(cid);

			const sportId = selectedClub?.sportId || 'soccer';
			workspaceContextStore.setActiveSportId(sportId);
			sportLoadStatus = 'loading';
			try {
				const snap = await getDoc(doc(db, 'sports_configs', sportId));
				if (snap.exists()) {
					workspaceContextStore.setActiveSportConfig(snap.data() as Record<string, unknown>);
				} else {
					workspaceContextStore.setActiveSportConfig(null);
				}
				sportLoadStatus = 'done';
			} catch {
				sportLoadStatus = 'error';
			}
		}

		close();
		void goto(item.href);
	}

	// Org-topology club pick: builds the item and delegates to pick().
	function handleClubPick(club: { id: string; name?: string }) {
		const cid = club.id;
		const name = (club as any).name || cid;
		pick({
			id: `ctx-director-${cid}`,
			label: `Director Â· ${name}`,
			href: `/director?clubId=${encodeURIComponent(cid)}&tab=home`,
		});
	}

	// Hot-swap CSS custom properties whenever sportAccent changes.
	$effect(() => {
		if (!browser) return;
		document.documentElement.style.setProperty('--vanguard-division-accent', sportAccent);
		const hex = sportAccent.replace('#', '');
		const r = parseInt(hex.slice(0, 2), 16);
		const g = parseInt(hex.slice(2, 4), 16);
		const b = parseInt(hex.slice(4, 6), 16);
		document.documentElement.style.setProperty(
			'--vanguard-division-accent-dim',
			`rgba(${r}, ${g}, ${b}, 0.18)`
		);
		document.documentElement.style.setProperty(
			'--vanguard-division-accent-glow',
			`rgba(${r}, ${g}, ${b}, 0.35)`
		);
	});

	// Click-outside + Escape to close.
	$effect(() => {
		if (!browser || !open) return;
		function onDocClick(e: MouseEvent) {
			if (!rootEl || !(e.target instanceof Node)) return;
			if (!rootEl.contains(e.target)) close();
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') close();
		}
		document.addEventListener('click', onDocClick, true);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onDocClick, true);
			document.removeEventListener('keydown', onKey);
		};
	});

	// Route change closes the popover.
	$effect(() => {
		if (!browser) return;
		pathname;
		close();
	});
</script>

<div class="ec-ws" class:ec-ws--mobile={variant === 'mobile'} bind:this={rootEl}>
	<!-- â”€â”€â”€ TRIGGER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
	<button
		type="button"
		class="ec-ws__trigger"
		class:ec-ws__trigger--sport-active={!!workspaceContextStore.activeSportConfig}
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

		<div class="ec-ws__caret-wrap" aria-hidden="true">
			{#if sportLoadStatus === 'loading'}
				<span class="ec-ws__sport-ping"></span>
			{:else if workspaceContextStore.activeSportConfig}
				<span class="ec-ws__sport-dot" style:background={sportAccent}></span>
			{/if}
			<Icon name="nav.sort" size={14} class="ec-ws__caret" />
		</div>
	</button>

	<!-- â”€â”€â”€ POPOVER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
	{#if popoverVisible}
		<div class="ec-ws__popover" role="menu" aria-label="Workspace Selector">
			<!-- Header -->
			<div class="ec-ws__pop-header">
				<span class="ec-ws__pop-label">DIVISION SELECTOR</span>
				{#if workspaceContextStore.activeOrgId}
					<span class="ec-ws__org-tag" title={workspaceContextStore.activeOrgId}>
						{workspaceContextStore.activeOrgId.slice(0, 16).toUpperCase()}
					</span>
				{/if}
			</div>

			<!-- Body -->
			<div class="ec-ws__pop-body">
				{#if hasOrgTopology}
					<!-- Org-grouped topology view -->
					{#each orgGroups as group (group.orgId)}
						<div class="ec-ws__org-header">
							<span class="ec-ws__org-accent-bar" aria-hidden="true"></span>
							<span class="ec-ws__org-name">{group.orgName}</span>
						</div>

						{#each group.clubs as club (club.id)}
							{@const isActive = workspaceContextStore.activeClubId === club.id}
							{@const cSportId = (club as any).sportId || 'soccer'}
							{@const cSportColor = (club as any).sportColor || '#6b7280'}
							<button
								type="button"
								class="ec-ws__club-row"
								class:ec-ws__club-row--active={isActive}
								role="menuitem"
								aria-current={isActive ? 'true' : undefined}
								onclick={() => handleClubPick(club)}
							>
								<span
									class="ec-ws__sport-indicator"
									style:background={cSportColor}
									aria-hidden="true"
								></span>
								<span class="ec-ws__club-name ec-ws__truncate">{club.name ?? club.id}</span>
								<span class="ec-ws__sport-pill">
									{cSportId === 'soccer'
										? 'âš½'
										: cSportId === 'basketball'
											? 'ðŸ€'
											: cSportId === 'lacrosse'
												? 'ðŸ¥'
												: 'ðŸŽ½'}
									{cSportId.toUpperCase()}
								</span>
							</button>
						{/each}
					{/each}
				{:else}
					<!-- Standard flat view (backward compat) -->
					{#each menuSections as section (section.title)}
						<p class="ec-ws__section-label">{section.title}</p>
						<ul class="ec-ws__list">
							{#each section.items as item (item.id)}
								<li role="none">
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
				{/if}
			</div>

			<!-- Footer: always shown when popover open -->
			<div class="ec-ws__footer">
				<span class="ec-ws__footer-label">
					SPORT SCHEMA: {workspaceContextStore.activeSportId.toUpperCase()}
				</span>
				{#if workspaceContextStore.activeSportConfig}
					{@const attrs = (workspaceContextStore.activeSportConfig as any).attributes}
					{#if Array.isArray(attrs) && attrs.length > 0}
						<div class="ec-ws__attr-dots" aria-hidden="true">
							{#each attrs as attr, i (i)}
								<span
									class="ec-ws__attr-dot"
									style:background={attr.hexColor || '#14b8a6'}
									title={attr.label || ''}
								></span>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	/* Do not set overflow on the root â€” it clips the absolutely-positioned menu. */
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

	/* â”€â”€â”€ TRIGGER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
		border-left: 2px solid transparent;
		background: transparent;
		cursor: pointer;
		font: inherit;
		text-align: left;
		border-radius: 0;
		box-sizing: border-box;
		overflow: hidden;
		transition:
			border-left-color 0.25s ease,
			background 0.15s ease;
	}

	.ec-ws__trigger > :global(:first-child) {
		flex-shrink: 0;
	}

	.ec-ws__trigger:hover {
		background: rgba(20, 184, 166, 0.04);
	}

	.ec-ws__trigger:focus-visible {
		outline: 1px solid rgba(20, 184, 166, 0.45);
		outline-offset: -2px;
	}

	/* Sport config loaded â†’ left accent rail lights up with the division color. */
	.ec-ws__trigger--sport-active {
		border-left-color: var(--vanguard-division-accent, #14b8a6);
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

	.ec-ws__caret-wrap {
		display: flex;
		align-items: center;
		gap: 5px;
		flex-shrink: 0;
	}

	.ec-ws__caret {
		font-size: 14px;
		color: var(--text-secondary);
		opacity: 0.85;
	}

	/* 4px sport accent dot beside the caret when a sport config is active. */
	.ec-ws__sport-dot {
		display: inline-block;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	/* Pulsing dot while sport config is loading. */
	.ec-ws__sport-ping {
		display: inline-block;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #14b8a6;
		flex-shrink: 0;
		animation: ec-ws-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
	}

	@keyframes ec-ws-ping {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.25;
			transform: scale(0.65);
		}
	}

	/* â”€â”€â”€ POPOVER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

	.ec-ws__popover {
		position: absolute;
		left: 8px;
		right: auto;
		top: calc(100% + 6px);
		min-width: 280px;
		max-width: min(320px, calc(100vw - 32px));
		z-index: 1000;
		background: rgba(1, 4, 9, 0.97);
		backdrop-filter: blur(var(--vanguard-blur-lg)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur-lg)) saturate(180%);
		border: 1px solid var(--vanguard-border);
		border-radius: var(--vanguard-radius-md);
		box-shadow: var(--vanguard-elev-3);
		box-sizing: border-box;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		max-height: min(70vh, 480px);
	}

	.ec-ws--mobile .ec-ws__popover {
		left: 0;
		right: 0;
	}

	/* Popover header row */
	.ec-ws__pop-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 10px 14px 8px;
		border-bottom: 1px solid rgba(20, 184, 166, 0.08);
		flex-shrink: 0;
	}

	.ec-ws__pop-label {
		font-family: ui-monospace, 'SFMono-Regular', 'Menlo', monospace;
		font-size: 9px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: rgba(20, 184, 166, 0.4);
	}

	.ec-ws__org-tag {
		font-family: ui-monospace, 'SFMono-Regular', 'Menlo', monospace;
		font-size: 8px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--vanguard-division-accent, #14b8a6);
		background: var(--vanguard-division-accent-dim, rgba(20, 184, 166, 0.08));
		border: 1px solid rgba(20, 184, 166, 0.22);
		border-radius: 4px;
		padding: 2px 6px;
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Scrollable body */
	.ec-ws__pop-body {
		flex: 1 1 0%;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 6px 0;
		scrollbar-width: thin;
		scrollbar-color: rgba(20, 184, 166, 0.2) transparent;
	}

	/* â”€â”€â”€ ORG-GROUPED TOPOLOGY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

	.ec-ws__org-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px 4px 14px;
		margin-top: 4px;
	}

	.ec-ws__org-header:first-child {
		margin-top: 0;
	}

	.ec-ws__org-accent-bar {
		display: inline-block;
		width: 2px;
		height: 12px;
		background: rgba(20, 184, 166, 0.4);
		border-radius: 1px;
		flex-shrink: 0;
	}

	.ec-ws__org-name {
		font-family: ui-monospace, 'SFMono-Regular', 'Menlo', monospace;
		font-size: 9px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: rgba(20, 184, 166, 0.3);
	}

	.ec-ws__club-row {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		min-height: 40px;
		padding: 8px 12px;
		border: none;
		border-left: 2px solid transparent;
		background: transparent;
		cursor: pointer;
		font: inherit;
		text-align: left;
		box-sizing: border-box;
		transition:
			background 0.12s ease,
			border-left-color 0.15s ease;
	}

	.ec-ws__club-row:hover {
		background: rgba(20, 184, 166, 0.05);
	}

	.ec-ws__club-row--active {
		border-left-color: var(--vanguard-division-accent, #14b8a6);
		background: var(--vanguard-division-accent-dim, rgba(20, 184, 166, 0.08));
	}

	.ec-ws__club-row--active:hover {
		background: var(--vanguard-division-accent-dim, rgba(20, 184, 166, 0.08));
	}

	/* 8px sport color circle */
	.ec-ws__sport-indicator {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.ec-ws__club-name {
		flex: 1 1 0%;
		min-width: 0;
		font-family: ui-monospace, 'SFMono-Regular', 'Menlo', monospace;
		font-size: 12px;
		font-weight: 500;
		color: rgba(226, 232, 240, 0.85);
	}

	.ec-ws__sport-pill {
		font-family: ui-monospace, 'SFMono-Regular', 'Menlo', monospace;
		font-size: 8px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--vanguard-division-accent, #14b8a6);
		border: 1px solid rgba(20, 184, 166, 0.3);
		border-radius: 4px;
		padding: 1px 5px;
		flex-shrink: 0;
		white-space: nowrap;
	}

	/* â”€â”€â”€ FLAT / LEGACY MENU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

	.ec-ws__section-label {
		margin: 8px 12px 4px;
		font-size: 9px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		font-family: ui-monospace, 'SFMono-Regular', 'Menlo', monospace;
		color: rgba(20, 184, 166, 0.4);
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
		font-family: ui-monospace, 'SFMono-Regular', 'Menlo', monospace;
		font-size: 12px;
		font-weight: 500;
		color: rgba(226, 232, 240, 0.85);
		text-align: left;
		cursor: pointer;
		line-height: 1.35;
		transition: background 0.12s ease;
	}

	.ec-ws__item:hover {
		background: rgba(20, 184, 166, 0.05);
	}

	/* â”€â”€â”€ FOOTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

	.ec-ws__footer {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		padding: 10px 14px;
		background: rgba(0, 0, 0, 0.4);
		border-top: 1px solid rgba(20, 184, 166, 0.1);
		flex-shrink: 0;
	}

	.ec-ws__footer-label {
		font-family: ui-monospace, 'SFMono-Regular', 'Menlo', monospace;
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: rgba(20, 184, 166, 0.4);
		flex-shrink: 0;
	}

	.ec-ws__attr-dots {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	/* 8Ã—8 attribute color circles */
	.ec-ws__attr-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow: 0 0 4px currentColor;
	}
</style>
