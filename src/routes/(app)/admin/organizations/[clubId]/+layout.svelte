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
	setContext<AdminClubCtx>(ADMIN_CLUB_CTX_KEY, {
		get clubDoc()     { return clubDoc; },
		get clubId()      { return clubId; },
		get clubLoading() { return clubLoading; },
		get clubErr()     { return clubErr; },
		/** @param {Record<string, unknown> & { id: string }} updated */
		setClubDoc(updated) { clubDoc = updated; },
	});
</script>

<div
	class="tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-flex-1 tw-bg-[#0B0F19] tw-text-[#FAFAFA] tw-p-6 lg:tw-p-8 tw-box-border tw-overflow-y-auto"
	data-admin-shell="true"
>
	<!-- Breadcrumb navigation -->
	<nav class="tw-flex tw-items-center tw-gap-2 tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-mb-4" aria-label="Breadcrumb">
		<a class="tw-text-[#94A3B8] hover:tw-text-[#14b8a6] tw-flex tw-items-center tw-gap-1.5 tw-transition-colors" href="/admin/organizations">
			<Icon name={"org.building" as IconName} size={14} />
			Organizations
		</a>
		<Icon name={"nav.chevron-right" as IconName} size={12} class="tw-text-[#475569]" />
		{#if clubLoading}
			<span class="tw-text-[#64748b]">Loading…</span>
		{:else if clubErr}
			<span class="tw-text-[#ef4444]">{clubId}</span>
		{:else}
			<span class="tw-text-[#FAFAFA] tw-font-bold">{clubDoc?.name || clubId}</span>
		{/if}
	</nav>

	<!-- Sub-page navigation tabs -->
	<div class="tw-flex tw-items-center tw-justify-between tw-flex-wrap tw-gap-3 tw-border-b tw-border-[#334155] tw-pb-4 tw-mb-6">
		<nav class="tw-flex tw-gap-1 tw-bg-[#020617] tw-border tw-border-[#334155] tw-p-1" role="tablist" aria-label="Organization Views">
			<a
				class="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-text-xs tw-font-mono tw-font-bold tw-uppercase tw-tracking-wider tw-transition-colors {page.url.pathname === `/admin/organizations/${clubId}` ? 'tw-bg-[#0f172a] tw-text-[#14b8a6] tw-border-b-2 tw-border-[#14b8a6]' : 'tw-text-[#94A3B8] hover:tw-text-[#FAFAFA] hover:tw-bg-white/[0.04]'}"
				href="/admin/organizations/{clubId}"
				role="tab"
				aria-selected={page.url.pathname === `/admin/organizations/${clubId}`}
			>
				<Icon name={"status.info" as IconName} size={14} />
				Overview
			</a>
			<a
				class="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-text-xs tw-font-mono tw-font-bold tw-uppercase tw-tracking-wider tw-transition-colors {page.url.pathname.startsWith(`/admin/organizations/${clubId}/teams`) ? 'tw-bg-[#0f172a] tw-text-[#14b8a6] tw-border-b-2 tw-border-[#14b8a6]' : 'tw-text-[#94A3B8] hover:tw-text-[#FAFAFA] hover:tw-bg-white/[0.04]'}"
				href="/admin/organizations/{clubId}/teams"
				role="tab"
				aria-selected={page.url.pathname.startsWith(`/admin/organizations/${clubId}/teams`)}
			>
				<Icon name={"user.group" as IconName} size={14} />
				Teams
			</a>
			<a
				class="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-text-xs tw-font-mono tw-font-bold tw-uppercase tw-tracking-wider tw-transition-colors {page.url.pathname.startsWith(`/admin/organizations/${clubId}/users`) ? 'tw-bg-[#0f172a] tw-text-[#14b8a6] tw-border-b-2 tw-border-[#14b8a6]' : 'tw-text-[#94A3B8] hover:tw-text-[#FAFAFA] hover:tw-bg-white/[0.04]'}"
				href="/admin/organizations/{clubId}/users"
				role="tab"
				aria-selected={page.url.pathname.startsWith(`/admin/organizations/${clubId}/users`)}
			>
				<Icon name={"user.settings" as IconName} size={14} />
				Users
			</a>
			<a
				class="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-text-xs tw-font-mono tw-font-bold tw-uppercase tw-tracking-wider tw-transition-colors {page.url.pathname.startsWith(`/admin/organizations/${clubId}/marketing`) ? 'tw-bg-[#0f172a] tw-text-[#14b8a6] tw-border-b-2 tw-border-[#14b8a6]' : 'tw-text-[#94A3B8] hover:tw-text-[#FAFAFA] hover:tw-bg-white/[0.04]'}"
				href="/admin/organizations/{clubId}/marketing"
				role="tab"
				aria-selected={page.url.pathname.startsWith(`/admin/organizations/${clubId}/marketing`)}
			>
				<Icon name={"data.target" as IconName} size={14} />
				Marketing
			</a>
		</nav>
	</div>

	<!-- Child page slot -->
	{@render children()}
</div>
