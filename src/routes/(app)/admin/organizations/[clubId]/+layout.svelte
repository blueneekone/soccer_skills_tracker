<script lang="ts">
	import { page } from '$app/state';
	import { db } from '$lib/firebase.js';
	import { doc, getDoc } from 'firebase/firestore';
	import { setContext } from 'svelte';
	import '$lib/styles/enterprise-console.css';

	/** @type {{ children: import('svelte').Snippet }} */
	let { children } = $props();

	// ── Club context ─────────────────────────────────────────────────────────────
	const clubId = $derived(page.params.clubId || '');

	/** @type {Record<string, unknown> & { id: string } | null} */
	let clubDoc = $state(null);
	let clubLoading = $state(false);
	let clubErr = $state('');

	$effect(() => {
		const id = clubId;
		if (!id) {
			clubDoc = null;
			clubErr = 'No club ID in URL.';
			return;
		}
		let cancelled = false;
		clubLoading = true;
		clubErr = '';
		void getDoc(doc(db, 'clubs', id))
			.then((snap) => {
				if (cancelled) return;
				if (snap.exists()) {
					clubDoc = { id: snap.id, .../** @type {Record<string,unknown>} */ (snap.data()) };
				} else {
					clubErr = `Organization "${id}" not found.`;
					clubDoc = null;
				}
			})
			.catch((e) => {
				if (cancelled) return;
				clubErr = e instanceof Error ? e.message : 'Could not load organization.';
			})
			.finally(() => {
				if (!cancelled) clubLoading = false;
			});
		return () => {
			cancelled = true;
		};
	});

	// Expose reactive club data to all child pages via Svelte context.
	// Getter properties ensure children always read the current $state value.
	setContext('adminClubCtx', {
		get clubDoc()     { return clubDoc; },
		get clubId()      { return clubId; },
		get clubLoading() { return clubLoading; },
		get clubErr()     { return clubErr; },
		/** @param {Record<string, unknown> & { id: string }} updated */
		setClubDoc(updated) { clubDoc = updated; },
	});
</script>

<!-- Breadcrumb navigation sub-header -->
<nav class="club-layout__breadcrumb" aria-label="Breadcrumb">
	<a class="club-layout__bc-link" href="/admin/organizations">
		<i class="ph ph-buildings" aria-hidden="true"></i>
		Organizations
	</a>
	<i class="ph ph-caret-right club-layout__bc-sep" aria-hidden="true"></i>
	{#if clubLoading}
		<span class="club-layout__bc-current club-layout__bc-current--loading">Loading…</span>
	{:else if clubErr}
		<span class="club-layout__bc-current club-layout__bc-current--err">{clubId}</span>
	{:else}
		<span class="club-layout__bc-current">{clubDoc?.name || clubId}</span>
	{/if}
</nav>

<!-- Sub-page navigation tabs -->
<div class="club-layout__subnav" role="tablist">
	<a
		class="club-layout__subnav-link"
		class:club-layout__subnav-link--active={page.url.pathname === `/admin/organizations/${clubId}`}
		href="/admin/organizations/{clubId}"
		role="tab"
		aria-selected={page.url.pathname === `/admin/organizations/${clubId}`}
	>
		<i class="ph ph-info" aria-hidden="true"></i>
		Overview
	</a>
	<a
		class="club-layout__subnav-link"
		class:club-layout__subnav-link--active={page.url.pathname.startsWith(`/admin/organizations/${clubId}/teams`)}
		href="/admin/organizations/{clubId}/teams"
		role="tab"
		aria-selected={page.url.pathname.startsWith(`/admin/organizations/${clubId}/teams`)}
	>
		<i class="ph ph-users-three" aria-hidden="true"></i>
		Teams
	</a>
</div>

<!-- Child page slot -->
{@render children()}

<style>
	/* ── Breadcrumb ──────────────────────────────────────────────── */
	.club-layout__breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 0 12px;
		flex-wrap: wrap;
	}

	.club-layout__bc-link {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--brand-primary, #d97706);
		text-decoration: none;
		transition: opacity 0.12s ease;
	}

	.club-layout__bc-link:hover {
		opacity: 0.78;
	}

	.club-layout__bc-sep {
		font-size: 0.9rem;
		color: var(--text-secondary);
		opacity: 0.55;
	}

	.club-layout__bc-current {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.club-layout__bc-current--loading {
		color: var(--text-secondary);
		font-weight: 400;
		font-style: italic;
	}

	.club-layout__bc-current--err {
		color: var(--danger-red, #b91c1c);
	}

	/* ── Sub-page nav tabs ───────────────────────────────────────── */
	.club-layout__subnav {
		display: flex;
		align-items: center;
		gap: 4px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
		margin-bottom: 20px;
		flex-wrap: wrap;
	}

	:global(html.dark) .club-layout__subnav {
		border-bottom-color: rgba(255, 255, 255, 0.08);
	}

	.club-layout__subnav-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-decoration: none;
		transition: background 0.12s ease, color 0.12s ease;
		border: 1px solid transparent;
	}

	.club-layout__subnav-link:hover {
		background: var(--surface-subtle, rgba(0, 0, 0, 0.04));
		color: var(--text-primary);
	}

	:global(html.dark) .club-layout__subnav-link:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.club-layout__subnav-link--active {
		background: rgba(245, 158, 11, 0.1);
		color: var(--brand-primary, #d97706);
		border-color: rgba(245, 158, 11, 0.3);
	}

	:global(html.dark) .club-layout__subnav-link--active {
		background: rgba(245, 158, 11, 0.12);
		color: #fbbf24;
		border-color: rgba(245, 158, 11, 0.35);
	}
</style>
