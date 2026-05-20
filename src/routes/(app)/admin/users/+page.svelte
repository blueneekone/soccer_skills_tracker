<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth, db, functions } from '$lib/firebase.js';
	import { doc, updateDoc } from 'firebase/firestore';
	import { signInWithCustomToken } from 'firebase/auth';
	import { httpsCallable } from 'firebase/functions';
	import { isAccountSuspendedProfile, USER_ACCOUNT_STATUS } from '$lib/auth/roles.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { impersonationStore } from '$lib/stores/impersonation.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import { lockBody, unlockBody } from '$lib/utils/modalLock.js';
	import {
		GLOBAL_USERS_PAGE_SIZE,
		normalizeEmailPrefix,
		patchUserRowLocally,
		suspendUserRowLocally,
	} from '$lib/admin/globalUsersDisplay.js';
	import { fetchUsersCount, fetchUsersPage, loadClubNameMap } from '$lib/admin/globalUsersData.js';
	import AddAdminModal from '$lib/components/admin/AddAdminModal.svelte';
	import EditAdminModal from '$lib/components/admin/EditAdminModal.svelte';
	import GlobalUsersDataTable from '$lib/components/admin/GlobalUsersDataTable.svelte';
	import GlobalUsersDeactivateModal from '$lib/components/admin/GlobalUsersDeactivateModal.svelte';
	import GlobalUsersPurgeModal from '$lib/components/admin/GlobalUsersPurgeModal.svelte';
	import GlobalUsersRbacTabs from '$lib/components/admin/GlobalUsersRbacTabs.svelte';
	import GlobalUsersToolbar from '$lib/components/admin/GlobalUsersToolbar.svelte';
	import '$lib/styles/enterprise-console.css';
	import '$lib/styles/global-users.css';
	import type { GlobalUserRow, GlobalUsersTab } from '$lib/types/adminUsers.js';

	const impersonateUserFn = httpsCallable(functions, 'impersonateUserFn');
	const purgeUserDataFn = httpsCallable(functions, 'purgeUserDataFn');

	let rows = $state<GlobalUserRow[]>([]);
	let loading = $state(false);
	let err = $state('');
	let totalEstimate = $state(0);
	let totalLoaded = $state(false);
	let searchInput = $state('');
	let searchApplied = $state('');
	let cursorStack = $state<string[]>(['']);
	let pageIndex = $state(0);
	let hasNextPage = $state(false);
	let activeTab = $state<GlobalUsersTab>('directors');
	let clubNameMap = $state<Map<string, string>>(new Map());
	let openMenuFor = $state('');
	let purgeTargetEmail = $state('');
	let purgeTargetName = $state('');
	let purgeStep = $state(0);
	let purgeTypedConfirmation = $state('');
	let purgeReason = $state('');
	let purgeBusy = $state(false);
	let purgeErr = $state('');
	let loginAsBusyFor = $state('');
	let flashOk = $state('');
	let flashErr = $state('');
	let showAddAdmin = $state(false);
	let editingAdmin = $state<GlobalUserRow | null>(null);
	let showEditAdmin = $state(false);
	let deactivateTarget = $state<GlobalUserRow | null>(null);
	let deactivateBusy = $state(false);
	let deactivateErr = $state('');

	async function loadCount(searchTerm: string, tab: GlobalUsersTab) {
		try {
			totalEstimate = await fetchUsersCount(db, searchTerm, tab);
		} catch (e) {
			console.warn('[global-users] count unavailable', e);
			totalEstimate = 0;
		} finally {
			totalLoaded = true;
		}
	}

	async function loadPage(searchTerm: string, afterEmail: string, tab: GlobalUsersTab) {
		loading = true;
		err = '';
		try {
			const result = await fetchUsersPage(db, searchTerm, afterEmail, tab);
			hasNextPage = result.hasNextPage;
			rows = result.rows;
		} catch (e) {
			console.error('[global-users] page load failed', e);
			err = e instanceof Error ? e.message : 'Could not load users.';
			rows = [];
			hasNextPage = false;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated) return;
		if (authStore.role !== 'super_admin' && authStore.role !== 'global_admin') {
			err = 'You must be a super admin to view this page.';
			return;
		}

		const segment = activeTab;
		const term = searchApplied;
		let cancelled = false;

		(async () => {
			try {
				clubNameMap = await loadClubNameMap(db);
			} catch {
				clubNameMap = new Map();
			}
			if (cancelled) return;
			cursorStack = [''];
			pageIndex = 0;
			await Promise.all([loadCount(term, segment), loadPage(term, '', segment)]);
		})();

		return () => {
			cancelled = true;
		};
	});

	const runSearch = async () => {
		const term = normalizeEmailPrefix(searchInput);
		searchInput = term;
		searchApplied = term;
		cursorStack = [''];
		pageIndex = 0;
		await Promise.all([loadCount(term, activeTab), loadPage(term, '', activeTab)]);
	};

	const clearSearch = async () => {
		searchInput = '';
		searchApplied = '';
		cursorStack = [''];
		pageIndex = 0;
		await Promise.all([loadCount('', activeTab), loadPage('', '', activeTab)]);
	};

	const onSearchKey = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			void runSearch();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			void clearSearch();
		}
	};

	const goNext = async () => {
		if (!hasNextPage || rows.length === 0) return;
		const cursor = rows[rows.length - 1]!.email || rows[rows.length - 1]!.id;
		cursorStack = [...cursorStack, cursor];
		pageIndex = pageIndex + 1;
		await loadPage(searchApplied, cursor, activeTab);
	};

	const goPrev = async () => {
		if (pageIndex <= 0) return;
		const next = cursorStack.slice(0, -1);
		cursorStack = next;
		pageIndex = pageIndex - 1;
		const cursor = next[next.length - 1] ?? '';
		await loadPage(searchApplied, cursor, activeTab);
	};

	const toggleMenu = (userId: string) => {
		openMenuFor = openMenuFor === userId ? '' : userId;
	};

	$effect(() => {
		if (!openMenuFor) return;
		const onDocClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement | null;
			if (target && target.closest('[data-user-menu]')) return;
			openMenuFor = '';
		};
		document.addEventListener('click', onDocClick);
		return () => document.removeEventListener('click', onDocClick);
	});

	function openEditAdmin(row: GlobalUserRow) {
		editingAdmin = row;
		showEditAdmin = true;
		openMenuFor = '';
	}

	function closeEditAdmin() {
		showEditAdmin = false;
		editingAdmin = null;
	}

	const loginAs = async (row: GlobalUserRow) => {
		openMenuFor = '';
		flashOk = '';
		flashErr = '';
		if (row.role === 'super_admin' || row.role === 'global_admin') {
			flashErr = 'Cannot impersonate another global admin.';
			return;
		}
		if (row.email === (authStore.user?.email || '').toLowerCase()) {
			flashErr = 'Cannot impersonate your own account.';
			return;
		}
		const ok = confirm(
			`Begin impersonation session as ${row.email}?\n\n` +
				'Every action will be attributed to this user until you sign out. Server-side audit rows land in security_audit.',
		);
		if (!ok) return;

		const actorEmail = authStore.user?.email || 'unknown';
		loginAsBusyFor = row.id;
		try {
			const res = await impersonateUserFn({ targetEmail: row.email });
			const payload = (res.data || {}) as { token?: string };
			if (!payload.token) throw new Error('Impersonation token missing from response.');
			await signInWithCustomToken(auth, payload.token);
			await impersonationStore.touch();
			await logSecurityEvent(
				'IMPERSONATE_USER',
				row.email,
				`Platform admin ${actorEmail} assumed session as ${row.email} (${row.role})`,
			);
			await goto('/', { replaceState: true });
		} catch (e) {
			console.error('[global-users] impersonation failed', e);
			flashErr = e instanceof Error ? e.message : 'Impersonation failed.';
		} finally {
			loginAsBusyFor = '';
		}
	};

	const openPurge = (row: GlobalUserRow) => {
		openMenuFor = '';
		purgeTargetEmail = row.email;
		purgeTargetName = row.displayName || row.playerName || row.email;
		purgeStep = 1;
		purgeTypedConfirmation = '';
		purgeReason = '';
		purgeErr = '';
	};

	const closePurge = () => {
		if (purgeBusy) return;
		purgeStep = 0;
		purgeTargetEmail = '';
		purgeTargetName = '';
		purgeTypedConfirmation = '';
		purgeReason = '';
		purgeErr = '';
	};

	const advancePurge = () => {
		purgeErr = '';
		purgeStep = 2;
	};

	const confirmPurge = async () => {
		if (purgeBusy) return;
		if (purgeTypedConfirmation.trim().toLowerCase() !== purgeTargetEmail.toLowerCase()) {
			purgeErr = 'Typed confirmation does not match the target email.';
			return;
		}
		purgeBusy = true;
		purgeErr = '';
		try {
			await purgeUserDataFn({
				targetEmail: purgeTargetEmail,
				reason: purgeReason.trim().slice(0, 500),
			});
			await logSecurityEvent('PURGE_USER_DATA_CLIENT_ACK', purgeTargetEmail, purgeReason);
			flashOk = `${purgeTargetEmail} purged from the platform.`;
			closePurge();
			const cursor = cursorStack[pageIndex] ?? '';
			await Promise.all([loadCount(searchApplied, activeTab), loadPage(searchApplied, cursor, activeTab)]);
		} catch (e) {
			console.error('[global-users] purge failed', e);
			purgeErr = e instanceof Error ? e.message : 'Purge failed.';
		} finally {
			purgeBusy = false;
		}
	};

	const rangeStart = $derived(pageIndex * GLOBAL_USERS_PAGE_SIZE + (rows.length > 0 ? 1 : 0));
	const rangeEnd = $derived(pageIndex * GLOBAL_USERS_PAGE_SIZE + rows.length);
	const totalLabel = $derived(totalLoaded ? `${totalEstimate.toLocaleString()}` : '…');

	$effect(() => {
		if (purgeStep <= 0) return;
		lockBody();
		return () => unlockBody();
	});

	$effect(() => {
		if (!deactivateTarget) return;
		lockBody();
		return () => unlockBody();
	});

	function isRevokeTargetSelf(row: GlobalUserRow) {
		const myUid = authStore.user?.uid;
		if (myUid && row.uid && row.uid === myUid) return true;
		const me = (authStore.user?.email || '').toLowerCase();
		return Boolean(me) && row.email.toLowerCase() === me;
	}

	function canDeactivateUser(row: GlobalUserRow) {
		if (isRevokeTargetSelf(row)) return false;
		if (row.role === 'super_admin' || row.role === 'global_admin') return false;
		if (isAccountSuspendedProfile({ ...row, status: row.status })) return false;
		return true;
	}

	function openDeactivate(row: GlobalUserRow) {
		openMenuFor = '';
		deactivateErr = '';
		deactivateTarget = row;
	}

	function closeDeactivate() {
		if (deactivateBusy) return;
		deactivateTarget = null;
		deactivateErr = '';
	}

	async function handleRevokeAccess() {
		if (!deactivateTarget || deactivateBusy) return;
		const row = deactivateTarget;
		if (isRevokeTargetSelf(row)) {
			deactivateErr = 'You cannot suspend your own account.';
			return;
		}
		const key = row.email.toLowerCase();
		deactivateBusy = true;
		deactivateErr = '';
		flashErr = '';
		try {
			await updateDoc(doc(db, 'users', key), {
				status: USER_ACCOUNT_STATUS.suspended,
				roles: [],
				role: 'guest',
			});
			await logSecurityEvent('SUSPEND_USER', key, 'Enterprise deactivation from Global Users');
			rows = suspendUserRowLocally(rows, key);
			flashOk = `Access revoked for ${row.email} — account suspended.`;
			deactivateTarget = null;
			deactivateErr = '';
		} catch (e) {
			console.error('[global-users] suspend failed', e);
			deactivateErr = e instanceof Error ? e.message : 'Could not suspend account.';
		} finally {
			deactivateBusy = false;
		}
	}
</script>

<div class="gu-root">
	<GlobalUsersToolbar
		bind:searchInput
		{searchApplied}
		{loading}
		{rangeStart}
		{rangeEnd}
		{totalLabel}
		onSearchInput={(value) => (searchInput = value)}
		{onSearchKey}
		onRunSearch={runSearch}
		onClearSearch={clearSearch}
		onAddAdmin={() => (showAddAdmin = true)}
	/>

	{#if flashErr}
		<p class="gu-flash gu-flash--err" role="alert">{flashErr}</p>
	{/if}
	{#if flashOk}
		<p class="gu-flash gu-flash--ok" role="status">{flashOk}</p>
	{/if}
	{#if err}
		<p class="gu-flash gu-flash--err" role="alert">{err}</p>
	{/if}

	<div class="gu-summary">
		<span class="gu-summary__item">
			<span class="gu-summary__k">Segment total</span>
			<span class="gu-summary__v">{totalLabel}</span>
		</span>
		{#if searchApplied}
			<span class="gu-summary__item">
				<span class="gu-summary__k">Search</span>
				<span class="gu-summary__v gu-summary__v--mono">email ≥ "{searchApplied}"</span>
			</span>
		{/if}
		<span class="gu-summary__item gu-summary__item--end">
			<span class="gu-summary__k">Showing</span>
			<span class="gu-summary__v">
				{rows.length > 0 ? `${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()}` : '0'}
			</span>
		</span>
	</div>

	<GlobalUsersRbacTabs activeTab={activeTab} onTabChange={(tab) => (activeTab = tab)} />

	<GlobalUsersDataTable
		{rows}
		{loading}
		{activeTab}
		{searchApplied}
		{clubNameMap}
		{openMenuFor}
		{loginAsBusyFor}
		{pageIndex}
		{hasNextPage}
		{canDeactivateUser}
		onToggleMenu={toggleMenu}
		onEditAdmin={openEditAdmin}
		onLoginAs={loginAs}
		onDeactivate={openDeactivate}
		onPurge={openPurge}
		onPrevPage={goPrev}
		onNextPage={goNext}
	/>
</div>

<AddAdminModal
	bind:open={showAddAdmin}
	onClose={() => (showAddAdmin = false)}
	onGranted={(em) => {
		flashOk = `${em} granted admin access.`;
		showAddAdmin = false;
	}}
/>

<EditAdminModal
	bind:open={showEditAdmin}
	admin={editingAdmin}
	onClose={closeEditAdmin}
	onSaved={(patch) => {
		rows = patchUserRowLocally(rows, patch as GlobalUserRow);
		flashOk = `Saved changes for ${patch.email || patch.id}.`;
	}}
/>

{#if deactivateTarget}
	<GlobalUsersDeactivateModal
		target={deactivateTarget}
		busy={deactivateBusy}
		err={deactivateErr}
		isSelf={isRevokeTargetSelf(deactivateTarget)}
		onClose={closeDeactivate}
		onConfirm={() => void handleRevokeAccess()}
	/>
{/if}

{#if purgeStep > 0}
	<GlobalUsersPurgeModal
		step={purgeStep}
		targetEmail={purgeTargetEmail}
		targetName={purgeTargetName}
		bind:typedConfirmation={purgeTypedConfirmation}
		bind:reason={purgeReason}
		busy={purgeBusy}
		err={purgeErr}
		onClose={closePurge}
		onAdvance={advancePurge}
		onConfirm={confirmPurge}
	/>
{/if}
