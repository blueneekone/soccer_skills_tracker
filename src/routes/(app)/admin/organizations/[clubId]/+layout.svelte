<script lang="ts">
	import { page } from '$app/state';
	import { db } from '$lib/firebase.js';
	import { doc, getDoc } from 'firebase/firestore';
	import { setContext } from 'svelte';
	import '$lib/styles/enterprise-console.css';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { ADMIN_CLUB_CTX_KEY, type AdminClubCtx } from './adminClubCtx.js';

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
	setContext<AdminClubCtx>(ADMIN_CLUB_CTX_KEY, {
		get clubDoc()     { return clubDoc; },
		get clubId()      { return clubId; },
		get clubLoading() { return clubLoading; },
		get clubErr()     { return clubErr; },
		/** @param {Record<string, unknown> & { id: string }} updated */
		setClubDoc(updated) { clubDoc = updated; },
	});
</script>

<!-- Breadcrumb navigation sub-header -->
<nav class="tw-bg-[#020617] tw-py-4 tw-flex tw-items-center tw-gap-2 tw-border-b tw-border-[#334155]" aria-label="Breadcrumb">
	<a class="tw-text-[#D4D4D8] hover:tw-text-[#FAFAFA] tw-font-sans tw-text-sm tw-font-bold tw-flex tw-items-center tw-gap-2 tw-transition-colors" href="/admin/organizations">
		<Icon name={"org.building" as IconName} />
		Organizations
	</a>
	<Icon name={"nav.chevron-right" as IconName} class="tw-text-[#A1A1AA] tw-text-sm" />
	{#if clubLoading}
		<span class="tw-text-[#A1A1AA] tw-font-sans tw-text-sm">Loading…</span>
	{:else if clubErr}
		<span class="tw-text-[#ef4444] tw-font-sans tw-text-sm tw-font-bold">{clubId}</span>
	{:else}
		<span class="tw-text-[#FAFAFA] tw-font-sans tw-text-sm tw-font-bold">{clubDoc?.name || clubId}</span>
	{/if}
</nav>

<!-- Sub-page navigation tabs -->
<div class="tw-flex tw-items-center tw-gap-2 tw-py-4 tw-mb-6 tw-bg-[#020617]" role="tablist">
	<a
		class="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-rounded-lg tw-font-sans tw-text-sm tw-font-bold tw-transition-colors"
		class:tw-bg-[#1E293B]={page.url.pathname === `/admin/organizations/${clubId}`}
		class:tw-text-[#FAFAFA]={page.url.pathname === `/admin/organizations/${clubId}`}
		class:tw-text-[#D4D4D8]={page.url.pathname !== `/admin/organizations/${clubId}`}
		class:hover:tw-text-[#FAFAFA]={page.url.pathname !== `/admin/organizations/${clubId}`}
		href="/admin/organizations/{clubId}"
		role="tab"
		aria-selected={page.url.pathname === `/admin/organizations/${clubId}`}
	>
		<Icon name={"status.info" as IconName} />
		Overview
	</a>
	<a
		class="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-rounded-lg tw-font-sans tw-text-sm tw-font-bold tw-transition-colors"
		class:tw-bg-[#1E293B]={page.url.pathname.startsWith(`/admin/organizations/${clubId}/teams`)}
		class:tw-text-[#FAFAFA]={page.url.pathname.startsWith(`/admin/organizations/${clubId}/teams`)}
		class:tw-text-[#D4D4D8]={!page.url.pathname.startsWith(`/admin/organizations/${clubId}/teams`)}
		class:hover:tw-text-[#FAFAFA]={!page.url.pathname.startsWith(`/admin/organizations/${clubId}/teams`)}
		href="/admin/organizations/{clubId}/teams"
		role="tab"
		aria-selected={page.url.pathname.startsWith(`/admin/organizations/${clubId}/teams`)}
	>
		<Icon name={"user.group" as IconName} />
		Teams
	</a>

	<a
		class="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-rounded-lg tw-font-sans tw-text-sm tw-font-bold tw-transition-colors"
		class:tw-bg-[#1E293B]={page.url.pathname.startsWith(`/admin/organizations/${clubId}/users`)}
		class:tw-text-[#FAFAFA]={page.url.pathname.startsWith(`/admin/organizations/${clubId}/users`)}
		class:tw-text-[#D4D4D8]={!page.url.pathname.startsWith(`/admin/organizations/${clubId}/users`)}
		class:hover:tw-text-[#FAFAFA]={!page.url.pathname.startsWith(`/admin/organizations/${clubId}/users`)}
		href="/admin/organizations/{clubId}/users"
		role="tab"
		aria-selected={page.url.pathname.startsWith(`/admin/organizations/${clubId}/users`)}
	>
		<Icon name={"user.settings" as IconName} />
		Users
	</a>

	<a
		class="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-rounded-lg tw-font-sans tw-text-sm tw-font-bold tw-transition-colors"
		class:tw-bg-[#1E293B]={page.url.pathname.startsWith(`/admin/organizations/${clubId}/marketing`)}
		class:tw-text-[#FAFAFA]={page.url.pathname.startsWith(`/admin/organizations/${clubId}/marketing`)}
		class:tw-text-[#D4D4D8]={!page.url.pathname.startsWith(`/admin/organizations/${clubId}/marketing`)}
		class:hover:tw-text-[#FAFAFA]={!page.url.pathname.startsWith(`/admin/organizations/${clubId}/marketing`)}
		href="/admin/organizations/{clubId}/marketing"
		role="tab"
		aria-selected={page.url.pathname.startsWith(`/admin/organizations/${clubId}/marketing`)}
	>
		<Icon name={"data.target" as IconName} />
		Marketing
	</a>
</div>

<!-- Child page slot -->
{@render children()}
