<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { db } from '$lib/firebase.js';
	import { doc, getDoc } from 'firebase/firestore';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import { getContextFromHref } from '$lib/auth/loginRouting.js';

	/** @type {{ open: boolean }} */
	let { open = $bindable(false) } = $props();

	// ── Static jump actions — always shown when query is empty ───────────────────
	/** @typedef {{ type: string, label: string, sub: string, icon: string, href: string, id?: string, isContextSwitch?: boolean }} CmdItem */

	/** @type {CmdItem[]} */
	const JUMP_ACTIONS = [
		{ type: 'action', label: 'Go to Overview',       sub: '/admin/overview',       icon: 'data.chart-line',   href: '/admin/overview' },
		{ type: 'action', label: 'Go to Organizations',   sub: '/admin/organizations',  icon: 'org.building',      href: '/admin/organizations' },
		{ type: 'action', label: 'Go to Audit Log',       sub: '/admin/audit-log',      icon: 'status.shield-check', href: '/admin/audit-log' },
		{ type: 'action', label: 'Go to System Settings', sub: '/admin/system-settings',icon: 'sys.settings-adv', href: '/admin/system-settings' },
	];

	// ── Query + search state ─────────────────────────────────────────────────────
	let query = $state('');
	let selectedIdx = $state(0);

	// ── Zero-Trust Data Hydration ────────────────────────────────────────────────
	// Global fetches are strictly forbidden. The command palette now relies entirely
	// on the localized, authorized teamsStore state.

	// ── Reset state on close / focus input on open ───────────────────────────────
	/** @type {HTMLInputElement | null} */
	let inputEl = $state(null);
	/** @type {HTMLElement | null} */
	let listEl = $state(null);

	$effect(() => {
		if (open) {
			if (browser) requestAnimationFrame(() => inputEl?.focus());
		} else {
			query = '';
			selectedIdx = 0;
		}
	});

	// ── Computed results — filtered from cache ───────────────────────────────────
	const results = $derived.by(() => {
		const q = query.trim().toLowerCase();

		/** @type {CmdItem[]} */
		const matched = [];

		if (!q) {
			matched.push(...JUMP_ACTIONS);
			
			// Show user's active divisions/clubs when query is empty as well
			for (const cl of teamsStore.clubs) {
				matched.push({
					type: 'my-club',
					id: cl.id,
					label: cl.name || cl.id,
					sub: 'Switch Workspace Context',
					icon: 'org.building',
					href: `/admin/organizations/${encodeURIComponent(cl.id)}`,
					isContextSwitch: true
				});
			}
			return matched;
		}

		// Jump actions that match
		for (const a of JUMP_ACTIONS) {
			if (a.label.toLowerCase().includes(q) || a.sub.toLowerCase().includes(q)) {
				matched.push(a);
			}
		}

		// User's Teams/Clubs
		for (const cl of teamsStore.clubs) {
			const name = (cl.name || '').toLowerCase();
			const id = (cl.id || '').toLowerCase();
			if (name.includes(q) || id.includes(q)) {
				matched.push({
					type: 'my-club',
					id: cl.id,
					label: cl.name || cl.id,
					sub: 'Switch Workspace Context',
					icon: 'org.building',
					href: `/admin/organizations/${encodeURIComponent(cl.id)}`,
					isContextSwitch: true
				});
			}
		}

		// Global directory fetch removed due to Zero-Trust constraints.

		return matched;
	});

	// ── Reset selectedIdx when results change ────────────────────────────────────
	$effect(() => {
		void results;
		selectedIdx = 0;
	});

	// ── Scroll selected item into view ───────────────────────────────────────────
	$effect(() => {
		if (!browser || !listEl) return;
		const item = listEl.querySelector(`[data-idx="${selectedIdx}"]`);
		if (item) item.scrollIntoView({ block: 'nearest' });
	});

	// ── Keyboard handler ─────────────────────────────────────────────────────────
	/** @param {KeyboardEvent} e */
	function onKeyDown(e) {
		const len = results.length;
		if (e.key === 'Escape') {
			e.preventDefault();
			open = false;
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIdx = len > 0 ? (selectedIdx + 1) % len : 0;
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIdx = len > 0 ? (selectedIdx - 1 + len) % len : 0;
			return;
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			activateItem(results[selectedIdx]);
			return;
		}
	}

	/** @param {CmdItem | undefined} item */
	async function activateItem(item) {
		if (!item?.href) return;
		
		if (item.isContextSwitch && item.id) {
			workspaceContextStore.resetScope();
			const pivotId = `ctx-director-${item.id}`;
			workspaceContextStore.setPivot(pivotId);
			const ctx = getContextFromHref(item.href);
			if (ctx) workspaceContextStore.setActiveContext(ctx);

			// Strict Path-Based Routing - query params are forbidden for clubId
			workspaceContextStore.setActiveClubId(item.id);

			if (item.id) {
				const selectedClub = teamsStore.clubs.find((c) => c.id === item.id);
				if (selectedClub && 'orgId' in selectedClub) {
					workspaceContextStore.setActiveOrgId(selectedClub.orgId as string);
				}
				workspaceContextStore.setActiveDivisionId(item.id);

				const sportId = selectedClub && 'sportId' in selectedClub ? selectedClub.sportId as string : 'soccer';
				workspaceContextStore.setActiveSportId(sportId);
				try {
					const snap = await getDoc(doc(db, 'sports_configs', sportId));
					if (snap.exists()) {
						workspaceContextStore.setActiveSportConfig(snap.data() as Record<string, unknown>);
					} else {
						workspaceContextStore.setActiveSportConfig(null);
					}
				} catch {
					console.error('[CommandPalette] failed to load sport config');
				}
			}
		}
		
		untrack(() => {
			goto(item.href);
		});
		open = false;
	}

	/** @param {MouseEvent} e */
	function onBackdropClick(e) {
		if (e.target === e.currentTarget) open = false;
	}

	// ── Section label helper ─────────────────────────────────────────────────────
	/** @param {CmdItem} item @param {number} idx */
	function sectionLabel(item, idx) {
		if (idx === 0) {
			if (item.type === 'action') return 'Navigation';
			if (item.type === 'my-club') return 'My Workspaces';
			if (item.type === 'org')    return 'Global Organizations';
			if (item.type === 'user')   return 'Global Users';
		}
		const prev = results[idx - 1];
		if (prev && prev.type !== item.type) {
			if (item.type === 'action') return 'Navigation';
			if (item.type === 'my-club') return 'My Workspaces';
			if (item.type === 'org')  return 'Global Organizations';
			if (item.type === 'user') return 'Global Users';
		}
		return null;
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="cp-backdrop" onclick={onBackdropClick} role="dialog" aria-modal="true" aria-label="Command palette" tabindex="-1">
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div class="cp-panel" onkeydown={onKeyDown} role="presentation">

			<!-- ── Search input ─────────────────────────────────────────────── -->
			<div class="cp-search">
				<Icon name="action.search" size={18} class="cp-search__icon" />
				<input
					bind:this={inputEl}
					bind:value={query}
					type="text"
					class="cp-search__input"
					placeholder="Search organizations, users, or jump to…"
					autocomplete="off"
					spellcheck="false"
					aria-label="Command palette search"
					aria-autocomplete="list"
					aria-controls="cp-results"
					aria-activedescendant={results.length > 0 ? `cp-item-${selectedIdx}` : undefined}
				/>
				<kbd class="cp-search__esc">esc</kbd>
			</div>

			<!-- ── Results list ─────────────────────────────────────────────── -->
			<ul
				id="cp-results"
				class="cp-results"
				bind:this={listEl}
				role="listbox"
				aria-label="Search results"
			>
				{#if results.length === 0}
					<li class="cp-empty">
						<Icon name="action.search" size={18} />
						No results for "<strong>{query}</strong>"
					</li>
				{:else}
					{#each results as item, idx (idx)}
						{@const section = sectionLabel(item, idx)}
						{#if section}
							<li class="cp-section-label" role="presentation">{section}</li>
						{/if}
						<li
							id="cp-item-{idx}"
							data-idx={idx}
							class="cp-item"
							class:cp-item--selected={idx === selectedIdx}
							role="option"
							aria-selected={idx === selectedIdx}
							onmouseenter={() => (selectedIdx = idx)}
							onclick={() => activateItem(item)}
						>
						<span class="cp-item__icon-wrap cp-item__icon-wrap--{item.type}">
							<Icon name={item.icon as IconName} size={16} />
						</span>
							<span class="cp-item__body">
								<span class="cp-item__label">{item.label}</span>
								<span class="cp-item__sub">{item.sub}</span>
							</span>
							{#if idx === selectedIdx}
								<kbd class="cp-item__enter-hint">↵</kbd>
							{/if}
						</li>
					{/each}
				{/if}
			</ul>

			<!-- ── Footer ───────────────────────────────────────────────────── -->
			<div class="cp-footer">
				<span class="cp-footer__hint"><kbd>↑↓</kbd> navigate</span>
				<span class="cp-footer__hint"><kbd>↵</kbd> select</span>
				<span class="cp-footer__hint"><kbd>esc</kbd> close</span>
			</div>

		</div>
	</div>
{/if}

<style>
	/* ── Backdrop ────────────────────────────────────────────────────── */
	.cp-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: clamp(60px, 8vh, 120px);
		background: rgba(9, 9, 11, 0.55);
		-webkit-backdrop-filter: blur(6px);
		backdrop-filter: blur(6px);
		animation: cp-fade-in 0.12s ease;
	}

	@keyframes cp-fade-in {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	/* ── Panel ───────────────────────────────────────────────────────── */
	.cp-panel {
		width: min(560px, calc(100vw - 32px));
		max-height: min(560px, calc(100vh - 120px));
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.92);
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 16px;
		box-shadow:
			0 32px 64px -12px rgba(0, 0, 0, 0.35),
			0 0 0 1px rgba(0, 0, 0, 0.05),
			inset 0 1px 0 rgba(255, 255, 255, 0.9);
		overflow: hidden;
		-webkit-backdrop-filter: blur(16px) saturate(1.8);
		backdrop-filter: blur(16px) saturate(1.8);
		animation: cp-slide-in 0.16s cubic-bezier(0.4, 0, 0.2, 1);
	}

	:global(html.dark) .cp-panel {
		background: linear-gradient(180deg, rgba(22, 22, 26, 0.97) 0%, rgba(14, 14, 16, 0.96) 100%);
		border-color: rgba(255, 255, 255, 0.1);
		border-top: 2px solid rgba(20, 184, 166, 0.38);
		box-shadow:
			0 0 48px rgba(20, 184, 166, 0.07),
			0 32px 64px -12px rgba(0, 0, 0, 0.72),
			0 0 0 1px rgba(255, 255, 255, 0.06);
	}

	@keyframes cp-slide-in {
		from { transform: scale(0.97) translateY(-8px); opacity: 0; }
		to   { transform: scale(1)    translateY(0);    opacity: 1; }
	}

	/* ── Search row ──────────────────────────────────────────────────── */
	.cp-search {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 16px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.08);
		flex-shrink: 0;
	}

	:global(html.dark) .cp-search {
		border-bottom-color: rgba(255, 255, 255, 0.07);
	}

	.cp-search__icon {
		flex-shrink: 0;
		color: #52525b;
	}

	:global(html.dark) .cp-search__icon {
		color: #a1a1aa;
	}

	.cp-search__input {
		flex: 1 1 auto;
		min-width: 0;
		border: none;
		outline: none;
		background: transparent;
		font: inherit;
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--text-primary, #0f172a);
		caret-color: var(--brand-primary, #f59e0b);
	}

	:global(html.dark) .cp-search__input {
		color: #f4f4f5;
	}

	.cp-search__input::placeholder {
		color: #52525b;
		font-weight: 400;
	}

	:global(html.dark) .cp-search__input::placeholder {
		color: #a1a1aa;
	}

	.cp-search__esc {
		flex-shrink: 0;
		font-size: 0.65rem;
		font-family: ui-monospace, monospace;
		font-weight: 700;
		padding: 3px 6px;
		border-radius: 5px;
		border: 1px solid rgba(0, 0, 0, 0.12);
		background: rgba(0, 0, 0, 0.04);
		color: #52525b;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	:global(html.dark) .cp-search__esc {
		border-color: rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
		color: #d4d4d8;
	}

	/* Loading spinner (CSS-only) */
	.cp-search__spinner {
		flex-shrink: 0;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-top-color: var(--brand-primary, #f59e0b);
		animation: cp-spin 0.7s linear infinite;
	}

	@keyframes cp-spin {
		to { transform: rotate(360deg); }
	}

	/* ── Results ─────────────────────────────────────────────────────── */
	.cp-results {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		list-style: none;
		margin: 0;
		padding: 6px 0;
	}

	.cp-section-label {
		padding: 8px 16px 4px;
		font-size: 0.65rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: #52525b;
		pointer-events: none;
	}

	:global(html.dark) .cp-section-label {
		color: #a1a1aa;
	}

	.cp-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 14px;
		cursor: pointer;
		transition: background 0.08s ease;
		border-radius: 0;
		margin: 1px 6px;
		border-radius: 8px;
	}

	.cp-item:hover,
	.cp-item--selected {
		background: rgba(245, 158, 11, 0.08);
	}

	:global(html.dark) .cp-item:hover,
	:global(html.dark) .cp-item--selected {
		background: linear-gradient(
			90deg,
			rgba(20, 184, 166, 0.12) 0%,
			rgba(245, 158, 11, 0.08) 100%
		);
		box-shadow: inset 3px 0 0 rgba(20, 184, 166, 0.65);
	}

	/* Icon wrapper with type-specific accent */
	.cp-item__icon-wrap {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
	}

	.cp-item__icon-wrap--action {
		background: rgba(99, 102, 241, 0.1);
		color: #6366f1;
	}

	.cp-item__icon-wrap--org {
		background: rgba(245, 158, 11, 0.1);
		color: #d97706;
	}

	.cp-item__icon-wrap--my-club {
		background: rgba(20, 184, 166, 0.1);
		color: #0d9488;
	}

	.cp-item__icon-wrap--user {
		background: rgba(22, 163, 74, 0.1);
		color: #16a34a;
	}

	:global(html.dark) .cp-item__icon-wrap--action { background: rgba(99,102,241,0.15); color: #a5b4fc; }
	:global(html.dark) .cp-item__icon-wrap--org    { background: rgba(245,158,11,0.12); color: #fbbf24; }
	:global(html.dark) .cp-item__icon-wrap--my-club{ background: rgba(20,184,166,0.15); color: #2dd4bf; }
	:global(html.dark) .cp-item__icon-wrap--user   { background: rgba(22,163,74,0.12);  color: #86efac; }

	.cp-item__body {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.cp-item__label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #0f172a);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	:global(html.dark) .cp-item__label {
		color: #f4f4f5;
	}

	.cp-item__sub {
		font-size: 0.72rem;
		color: #52525b;
		font-family: ui-monospace, monospace;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	:global(html.dark) .cp-item__sub {
		color: #d4d4d8;
	}

	.cp-item__enter-hint {
		flex-shrink: 0;
		font-size: 0.65rem;
		font-family: ui-monospace, monospace;
		font-weight: 700;
		padding: 3px 6px;
		border-radius: 5px;
		border: 1px solid rgba(0, 0, 0, 0.1);
		background: rgba(0, 0, 0, 0.04);
		color: #52525b;
	}

	:global(html.dark) .cp-item__enter-hint {
		border-color: rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
		color: #a1a1aa;
	}

	.cp-empty {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 20px 16px;
		font-size: 0.875rem;
		color: #52525b;
	}

	:global(html.dark) .cp-empty {
		color: #a1a1aa;
	}

	/* ── Footer ──────────────────────────────────────────────────────── */
	.cp-footer {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 8px 16px;
		border-top: 1px solid rgba(0, 0, 0, 0.07);
		background: rgba(0, 0, 0, 0.02);
		flex-shrink: 0;
		flex-wrap: wrap;
	}

	:global(html.dark) .cp-footer {
		border-top-color: rgba(255, 255, 255, 0.06);
		background: rgba(255, 255, 255, 0.02);
	}

	.cp-footer__hint {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 0.68rem;
		color: #52525b;
	}

	:global(html.dark) .cp-footer__hint {
		color: #a1a1aa;
	}

	.cp-footer__hint kbd {
		font-family: ui-monospace, monospace;
		font-size: 0.65rem;
		font-weight: 700;
		padding: 2px 5px;
		border-radius: 4px;
		border: 1px solid rgba(0, 0, 0, 0.12);
		background: rgba(0, 0, 0, 0.04);
		color: #3f3f46;
	}

	:global(html.dark) .cp-footer__hint kbd {
		border-color: rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
		color: #d4d4d8;
	}

	.cp-footer__count {
		margin-left: auto;
		font-size: 0.68rem;
		color: #71717a;
		font-family: ui-monospace, monospace;
	}

	:global(html.dark) .cp-footer__count {
		color: #a1a1aa;
	}
</style>
