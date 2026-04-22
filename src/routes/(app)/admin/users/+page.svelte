<script>
	/**
	 * Sprint 2.6 / 2.7 — Global User Command Center.
	 *
	 * Full-bleed Enterprise DataTable listing EVERY user on the platform.
	 * Server-side paginated + server-side email search (no client-side filtering
	 * of a full collection scan — see .cursorrules §2).
	 *
	 * Row actions:
	 *   • Login As       → impersonateUserFn → signInWithCustomToken.
	 *   • Purge User Data → double-confirmation modal → purgeUserDataFn.
	 */

	import { goto } from '$app/navigation';
	import { auth, db, functions } from '$lib/firebase.js';
	import {
		collection,
		getCountFromServer,
		getDocs,
		limit,
		orderBy,
		query,
		startAfter,
		where
	} from 'firebase/firestore';
	import { signInWithCustomToken } from 'firebase/auth';
	import { httpsCallable } from 'firebase/functions';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { impersonationStore } from '$lib/stores/impersonation.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import AddAdminModal from '$lib/components/admin/AddAdminModal.svelte';
	import EditAdminModal from '$lib/components/admin/EditAdminModal.svelte';
	import '$lib/styles/enterprise-console.css';

	const impersonateUserFn = httpsCallable(functions, 'impersonateUserFn');
	const purgeUserDataFn = httpsCallable(functions, 'purgeUserDataFn');

	const PAGE_SIZE = 50;

	// ── Types ────────────────────────────────────────────────────────────────
	/**
	 * @typedef {{
	 *   id: string,
	 *   email: string,
	 *   displayName: string,
	 *   playerName: string,
	 *   role: string,
	 *   clubId: string,
	 *   teamId: string,
	 *   lastActiveAt: number,
	 *   lastActiveSource: string,
	 *   photoURL: string,
	 * }} UserRow
	 */

	// ── State ────────────────────────────────────────────────────────────────
	/** @type {UserRow[]} */
	let rows = $state([]);
	let loading = $state(false);
	let err = $state('');

	let totalEstimate = $state(0);
	let totalLoaded = $state(false);

	let searchInput = $state('');
	/** The search term actually applied to the current query cycle. */
	let searchApplied = $state('');

	/** Stack of page-start cursors (email strings) for prev/next navigation. */
	/** @type {string[]} */
	let cursorStack = $state(['']);
	let pageIndex = $state(0);
	let hasNextPage = $state(false);

	// Club name lookup (small map — clubs collection is bounded).
	/** @type {Map<string, string>} */
	let clubNameMap = $state(new Map());

	// Action UI state
	let openMenuFor = $state('');

	let purgeTargetEmail = $state('');
	let purgeTargetName = $state('');
	let purgeStep = $state(0); // 0 closed, 1 confirm prompt, 2 final type-to-confirm
	let purgeTypedConfirmation = $state('');
	let purgeReason = $state('');
	let purgeBusy = $state(false);
	let purgeErr = $state('');

	let loginAsBusyFor = $state('');
	let flashOk = $state('');
	let flashErr = $state('');

	// Sprint 2.6.5 — Grant Global Admin moved here from System Settings.
	let showAddAdmin = $state(false);

	// Strike 1 — Edit Admin modal state.
	/** @type {UserRow | null} */
	let editingAdmin = $state(null);
	let showEditAdmin = $state(false);

	/** @param {UserRow} row */
	function openEditAdmin(row) {
		editingAdmin = row;
		showEditAdmin = true;
		openMenuFor = '';
	}

	function closeEditAdmin() {
		showEditAdmin = false;
		editingAdmin = null;
	}

	/** Reactivity mandate (P0): patch the local rows array so the table
	 *  shows the new values immediately without a refetch. */
	/** @param {UserRow} patch */
	function applyAdminPatchLocally(patch) {
		rows = rows.map((r) => (r.id === patch.id ? { ...r, ...patch } : r));
	}

	// ── Role display helpers ─────────────────────────────────────────────────
	const ROLE_LABELS = /** @type {const} */ ({
		super_admin: 'Global Admin',
		global_admin: 'Global Admin',
		director: 'Director',
		coach: 'Coach',
		registrar: 'Registrar',
		recruiter: 'Recruiter',
		parent: 'Parent',
		player: 'Player',
		guest: 'Guest'
	});

	/** @param {string} role */
	function roleLabel(role) {
		return ROLE_LABELS[/** @type {keyof typeof ROLE_LABELS} */ (role)] || (role || 'Unknown');
	}

	/** @param {string} role */
	function roleToneClass(role) {
		switch (role) {
			case 'super_admin':
			case 'global_admin': return 'gu-role--crimson';
			case 'director': return 'gu-role--indigo';
			case 'coach': return 'gu-role--amber';
			case 'registrar': return 'gu-role--teal';
			case 'recruiter': return 'gu-role--violet';
			case 'parent': return 'gu-role--sky';
			case 'player': return 'gu-role--emerald';
			default: return 'gu-role--slate';
		}
	}

	/** @param {string} name */
	function initials(name) {
		const s = (name || '').trim();
		if (!s) return '•';
		const parts = s.split(/\s+/).filter(Boolean);
		if (parts.length === 0) return '•';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}

	/** @param {number} ts */
	function formatLastActive(ts) {
		if (!ts || !Number.isFinite(ts)) return '—';
		const diffMs = Date.now() - ts;
		if (diffMs < 0) return 'Just now';
		const minute = 60 * 1000;
		const hour = 60 * minute;
		const day = 24 * hour;
		if (diffMs < minute) return 'Just now';
		if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
		if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
		if (diffMs < 30 * day) return `${Math.floor(diffMs / day)}d ago`;
		try {
			return new Date(ts).toLocaleDateString();
		} catch {
			return '—';
		}
	}

	/** @param {unknown} v */
	function toEpochMs(v) {
		if (v == null) return 0;
		if (typeof v === 'number' && Number.isFinite(v)) return v > 1e12 ? v : v * 1000;
		if (typeof v === 'string') {
			const n = Number(v);
			if (Number.isFinite(n) && n > 0) return n > 1e12 ? n : n * 1000;
			const parsed = Date.parse(v);
			return Number.isFinite(parsed) ? parsed : 0;
		}
		if (typeof v === 'object' && v !== null) {
			// Firestore Timestamp: toMillis() OR seconds/nanoseconds OR toDate()
			const o = /** @type {Record<string, unknown>} */ (v);
			if (typeof o.toMillis === 'function') {
				try {
					return /** @type {() => number} */ (o.toMillis)();
				} catch {
					/* fall through */
				}
			}
			if (typeof o.seconds === 'number') {
				return o.seconds * 1000 + (typeof o.nanoseconds === 'number' ? Math.floor(o.nanoseconds / 1e6) : 0);
			}
			if (typeof o.toDate === 'function') {
				try {
					const d = /** @type {() => Date} */ (o.toDate)();
					return d.getTime();
				} catch {
					/* fall through */
				}
			}
		}
		return 0;
	}

	// ── Club map (bounded fetch, authed-only) ────────────────────────────────
	async function loadClubNames() {
		try {
			const snap = await getDocs(collection(db, 'clubs'));
			const m = new Map();
			snap.forEach((d) => {
				const data = /** @type {Record<string, unknown>} */ (d.data() || {});
				const name = typeof data.name === 'string' ? data.name.trim() : '';
				m.set(d.id, name || d.id);
			});
			clubNameMap = m;
		} catch (e) {
			console.warn('[global-users] club name fetch failed', e);
			clubNameMap = new Map();
		}
	}

	// ── Firestore query assembly ─────────────────────────────────────────────
	/**
	 * Sprint 2.6.1 — canonical search-term normalizer.
	 *
	 * Firestore prefix search via `where(>=, <=)` is byte-wise case-sensitive.
	 * Stored emails are lower-cased at signup, so the search term MUST also
	 * be lower-cased before it ever touches a query — otherwise a user typing
	 * "Ewa" will get zero hits even when "ewa@example.com" exists.
	 *
	 * ORDER MATTERS FOR INTENT: lowercase first (handles pasted UPPERCASE with
	 * trailing spaces), then trim. Collapsing internal whitespace is not
	 * appropriate for an email prefix search — refuse to index it.
	 *
	 * @param {string} raw
	 * @returns {string}
	 */
	function normalizeEmailPrefix(raw) {
		return (typeof raw === 'string' ? raw : '').toLowerCase().trim();
	}

	/**
	 * Build the base query shared by count + page fetches.
	 * Every caller funnels through `normalizeEmailPrefix` so there is exactly
	 * one place where term casing can drift.
	 * @param {string} searchTerm
	 */
	function buildBaseQuery(searchTerm) {
		const col = collection(db, 'users');
		const term = normalizeEmailPrefix(searchTerm);
		if (term) {
			// Email range prefix search — NO client-side filtering.
			return query(
				col,
				where('email', '>=', term),
				where('email', '<=', term + '\uf8ff'),
				orderBy('email')
			);
		}
		return query(col, orderBy('email'));
	}

	/**
	 * @param {string} searchTerm
	 * @param {string} afterEmail Cursor (empty string for first page)
	 */
	function buildPageQuery(searchTerm, afterEmail) {
		const base = buildBaseQuery(searchTerm);
		if (afterEmail) {
			return query(base, startAfter(afterEmail), limit(PAGE_SIZE + 1));
		}
		return query(base, limit(PAGE_SIZE + 1));
	}

	/** @param {string} searchTerm */
	async function loadCount(searchTerm) {
		try {
			const snap = await getCountFromServer(buildBaseQuery(searchTerm));
			totalEstimate = snap.data().count;
		} catch (e) {
			console.warn('[global-users] count unavailable', e);
			totalEstimate = 0;
		} finally {
			totalLoaded = true;
		}
	}

	/**
	 * @param {string} searchTerm
	 * @param {string} afterEmail
	 */
	async function loadPage(searchTerm, afterEmail) {
		loading = true;
		err = '';
		try {
			const snap = await getDocs(buildPageQuery(searchTerm, afterEmail));
			/** @type {UserRow[]} */
			const next = [];
			snap.forEach((d) => {
				const raw = /** @type {Record<string, unknown>} */ (d.data() || {});
				const email = typeof raw.email === 'string' && raw.email ? raw.email : d.id;
				const displayName = typeof raw.displayName === 'string' ? raw.displayName.trim() : '';
				const playerName = typeof raw.playerName === 'string' ? raw.playerName.trim() : '';
				const role = typeof raw.role === 'string' ? raw.role : '';
				const clubId = typeof raw.clubId === 'string' ? raw.clubId.trim() : '';
				const teamId = typeof raw.teamId === 'string' ? raw.teamId.trim() : '';
				const photoURL = typeof raw.photoURL === 'string' ? raw.photoURL : '';

				// Resolve "last active" from any of several timestamp-like fields.
				const candidates = [
					{ k: 'lastActivityDate', v: toEpochMs(raw.lastActivityDate) },
					{ k: 'lastLoginAt', v: toEpochMs(raw.lastLoginAt) },
					{ k: 'updatedAt', v: toEpochMs(raw.updatedAt) },
					{ k: 'createdAt', v: toEpochMs(raw.createdAt) }
				];
				const picked = candidates.find((c) => c.v > 0) || { k: '', v: 0 };

				next.push({
					id: d.id,
					email,
					displayName,
					playerName,
					role,
					clubId,
					teamId,
					lastActiveAt: picked.v,
					lastActiveSource: picked.k,
					photoURL
				});
			});

			hasNextPage = next.length > PAGE_SIZE;
			rows = next.slice(0, PAGE_SIZE);
		} catch (e) {
			console.error('[global-users] page load failed', e);
			err = e instanceof Error ? e.message : 'Could not load users.';
			rows = [];
			hasNextPage = false;
		} finally {
			loading = false;
		}
	}

	// ── Initial + search-triggered fetches ───────────────────────────────────
	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated) return;
		if (authStore.role !== 'super_admin' && authStore.role !== 'global_admin') {
			err = 'You must be a super admin to view this page.';
			return;
		}

		let cancelled = false;
		(async () => {
			await loadClubNames();
			if (cancelled) return;
			await Promise.all([loadCount(''), loadPage('', '')]);
		})();

		return () => {
			cancelled = true;
		};
	});

	// ── Search (explicit submit; we do NOT auto-fire per keystroke to keep
	//     Firestore reads bounded). ──────────────────────────────────────────
	const runSearch = async () => {
		const term = normalizeEmailPrefix(searchInput);
		// Keep the input in sync with what we actually query against so the
		// user sees exactly the canonical prefix that is being searched.
		searchInput = term;
		searchApplied = term;
		cursorStack = [''];
		pageIndex = 0;
		await Promise.all([loadCount(term), loadPage(term, '')]);
	};

	const clearSearch = async () => {
		searchInput = '';
		searchApplied = '';
		cursorStack = [''];
		pageIndex = 0;
		await Promise.all([loadCount(''), loadPage('', '')]);
	};

	/** @param {KeyboardEvent} e */
	const onSearchKey = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			void runSearch();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			void clearSearch();
		}
	};

	// ── Pagination ───────────────────────────────────────────────────────────
	const goNext = async () => {
		if (!hasNextPage || rows.length === 0) return;
		const cursor = rows[rows.length - 1].email || rows[rows.length - 1].id;
		cursorStack = [...cursorStack, cursor];
		pageIndex = pageIndex + 1;
		await loadPage(searchApplied, cursor);
	};

	const goPrev = async () => {
		if (pageIndex <= 0) return;
		const next = cursorStack.slice(0, -1);
		cursorStack = next;
		pageIndex = pageIndex - 1;
		const cursor = next[next.length - 1] ?? '';
		await loadPage(searchApplied, cursor);
	};

	// ── Row menu ─────────────────────────────────────────────────────────────
	/** @param {string} userId */
	const toggleMenu = (userId) => {
		openMenuFor = openMenuFor === userId ? '' : userId;
	};

	$effect(() => {
		if (!openMenuFor) return;
		/** @param {MouseEvent} e */
		const onDocClick = (e) => {
			const target = /** @type {HTMLElement | null} */ (e.target);
			if (target && target.closest('[data-user-menu]')) return;
			openMenuFor = '';
		};
		document.addEventListener('click', onDocClick);
		return () => document.removeEventListener('click', onDocClick);
	});

	// ── Login As (impersonation) ─────────────────────────────────────────────
	/** @param {UserRow} row */
	const loginAs = async (row) => {
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
				'Every action you take will be attributed to this user. The session will be written to security_audit.'
		);
		if (!ok) return;

		loginAsBusyFor = row.id;
		try {
			const res = await impersonateUserFn({ targetEmail: row.email });
			const payload = /** @type {{ token?: string, targetUid?: string, targetEmail?: string, targetRole?: string, impersonatedBy?: string }} */ (
				res.data || {}
			);
			if (!payload.token) {
				throw new Error('Impersonation token missing from response.');
			}
			// Sprint 2.6.1 — banner state now derives from the Firebase ID
			// token's custom claims, which are carried by this custom token.
			// Sign in first, then force-refresh the token result so the
			// impersonationStore (claims-driven) resolves immediately and the
			// banner renders on the very first paint of the destination route.
			await signInWithCustomToken(auth, payload.token);
			await impersonationStore.touch();
			// Let the (app)/+layout.svelte waterfall route us to the correct dashboard.
			await goto('/', { replaceState: true });
		} catch (e) {
			console.error('[global-users] impersonation failed', e);
			flashErr = e instanceof Error ? e.message : 'Impersonation failed.';
		} finally {
			loginAsBusyFor = '';
		}
	};

	// ── GDPR Purge (double-confirmation) ─────────────────────────────────────
	/** @param {UserRow} row */
	const openPurge = (row) => {
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
				reason: purgeReason.trim().slice(0, 500)
			});
			// Mirror to client-side audit stream for redundancy (no-op if server already logged).
			await logSecurityEvent('PURGE_USER_DATA_CLIENT_ACK', purgeTargetEmail, purgeReason);
			flashOk = `${purgeTargetEmail} purged from the platform.`;
			closePurge();
			// Reload current page so the row disappears.
			const cursor = cursorStack[pageIndex] ?? '';
			await Promise.all([loadCount(searchApplied), loadPage(searchApplied, cursor)]);
		} catch (e) {
			console.error('[global-users] purge failed', e);
			purgeErr = e instanceof Error ? e.message : 'Purge failed.';
		} finally {
			purgeBusy = false;
		}
	};

	// ── Derived display ─────────────────────────────────────────────────────
	const rangeStart = $derived(pageIndex * PAGE_SIZE + (rows.length > 0 ? 1 : 0));
	const rangeEnd = $derived(pageIndex * PAGE_SIZE + rows.length);
	const totalLabel = $derived(totalLoaded ? `${totalEstimate.toLocaleString()}` : '…');
</script>

<div class="gu-root">
	<!-- Strike 1 — Page Actions header: title + sub left, primary CTAs on the
	     top-right. The Add Admin button is now pinned to Page Actions and
	     sits completely separate from the DataTable search row below. -->
	<header class="gu-head">
		<div class="gu-head__left">
			<h1 class="gu-title">Global Users</h1>
			<p class="gu-sub">
				Every account across every tenant. Email-prefix search is server-side; no client
				enumeration of the full collection.
			</p>
		</div>

		<div class="gu-page-actions" role="group" aria-label="Page actions">
			<button
				type="button"
				class="gu-add-admin-btn"
				onclick={() => (showAddAdmin = true)}
				aria-haspopup="dialog"
			>
				<i class="ph ph-user-plus" aria-hidden="true"></i>
				Add Admin
			</button>
		</div>
	</header>

	<!-- Strike 1 — DataTable toolbar owns the search input exclusively. -->
	<div class="gu-toolbar">
		<div class="gu-search" role="search">
			<i class="ph ph-magnifying-glass" aria-hidden="true"></i>
			<input
				type="search"
				bind:value={searchInput}
				onkeydown={onSearchKey}
				placeholder="Search by email prefix (press Enter)"
				aria-label="Search users by email"
				autocomplete="off"
				spellcheck="false"
			/>
			{#if searchApplied}
				<button
					type="button"
					class="gu-search__clear"
					onclick={clearSearch}
					aria-label="Clear search"
					title="Clear search"
				>
					<i class="ph ph-x" aria-hidden="true"></i>
				</button>
			{/if}
			<button
				type="button"
				class="gu-search__submit"
				onclick={runSearch}
				disabled={loading}
				aria-label="Run search"
			>
				Search
			</button>
		</div>
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
			applyAdminPatchLocally(patch);
			flashOk = `Saved changes for ${patch.email || patch.id}.`;
		}}
	/>

	<!-- Flash messages -->
	{#if flashErr}
		<p class="gu-flash gu-flash--err" role="alert">{flashErr}</p>
	{/if}
	{#if flashOk}
		<p class="gu-flash gu-flash--ok" role="status">{flashOk}</p>
	{/if}
	{#if err}
		<p class="gu-flash gu-flash--err" role="alert">{err}</p>
	{/if}

	<!-- Summary strip -->
	<div class="gu-summary">
		<span class="gu-summary__item">
			<span class="gu-summary__k">Total users</span>
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

	<!-- DataTable -->
	<div class="gu-table-wrap" role="region" aria-label="Global users table" tabindex="-1">
		<table class="gu-table">
			<thead>
				<tr>
					<th class="gu-th gu-th--avatar" aria-label="Avatar"></th>
					<th class="gu-th">Name / Email</th>
					<th class="gu-th">Global Role</th>
					<th class="gu-th">Associated Club</th>
					<th class="gu-th">Last Active</th>
					<th class="gu-th gu-th--right">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#if loading && rows.length === 0}
					<tr>
						<td colspan="6" class="gu-td-empty">Loading users…</td>
					</tr>
				{:else if rows.length === 0}
					<tr>
						<td colspan="6" class="gu-td-empty">
							{searchApplied ? 'No users match the search.' : 'No users found.'}
						</td>
					</tr>
				{:else}
					{#each rows as row (row.id)}
						<tr class="gu-tr">
							<td class="gu-td gu-td--avatar">
								{#if row.photoURL}
									<img
										src={row.photoURL}
										alt=""
										class="gu-avatar gu-avatar--img"
										loading="lazy"
										referrerpolicy="no-referrer"
									/>
								{:else}
									<span class="gu-avatar" aria-hidden="true">
										{initials(row.displayName || row.playerName || row.email)}
									</span>
								{/if}
							</td>
							<td class="gu-td">
								<div class="gu-name">
									<span class="gu-name__primary">
										{row.displayName || row.playerName || row.email}
									</span>
									<span class="gu-name__email">{row.email}</span>
								</div>
							</td>
							<td class="gu-td">
								<span class="gu-role {roleToneClass(row.role)}">
									{roleLabel(row.role)}
								</span>
							</td>
							<td class="gu-td">
								{#if row.clubId}
									<span class="gu-club">
										<i class="ph ph-buildings" aria-hidden="true"></i>
										<span>{clubNameMap.get(row.clubId) || row.clubId}</span>
									</span>
								{:else}
									<span class="gu-muted">—</span>
								{/if}
							</td>
							<td class="gu-td">
								<span class="gu-muted" title={row.lastActiveSource || ''}>
									{formatLastActive(row.lastActiveAt)}
								</span>
							</td>
							<td class="gu-td gu-td--right">
								<div class="gu-actions" data-user-menu>
									<button
										type="button"
										class="gu-icon-btn"
										onclick={() => toggleMenu(row.id)}
										aria-label="Actions for {row.email}"
										aria-haspopup="menu"
										aria-expanded={openMenuFor === row.id}
										disabled={loginAsBusyFor === row.id}
									>
										{#if loginAsBusyFor === row.id}
											<i class="ph ph-spinner" aria-hidden="true"></i>
										{:else}
											<i class="ph ph-dots-three" aria-hidden="true"></i>
										{/if}
									</button>

									{#if openMenuFor === row.id}
										<div class="gu-menu" role="menu" data-user-menu>
											<!-- Strike 1 — Edit Admin entry point. Visible for any user;
											     mutates users/{id} and patches local $state immediately. -->
											<button
												type="button"
												class="gu-menu__item"
												role="menuitem"
												onclick={() => openEditAdmin(row)}
											>
												<i class="ph ph-pencil-simple" aria-hidden="true"></i>
												<span>Edit {row.role === 'global_admin' || row.role === 'super_admin' ? 'Admin' : 'User'}</span>
											</button>

											<div class="gu-menu__sep" aria-hidden="true"></div>

											<button
												type="button"
												class="gu-menu__item"
												role="menuitem"
												onclick={() => loginAs(row)}
												disabled={row.role === 'super_admin' || row.role === 'global_admin'}
											>
												<i class="ph ph-user-switch" aria-hidden="true"></i>
												<span>Login As</span>
												{#if row.role === 'super_admin' || row.role === 'global_admin'}
													<span class="gu-menu__hint">global admin</span>
												{/if}
											</button>

											<div class="gu-menu__sep" aria-hidden="true"></div>

											<button
												type="button"
												class="gu-menu__item gu-menu__item--danger"
												role="menuitem"
												onclick={() => openPurge(row)}
												disabled={row.role === 'super_admin' || row.role === 'global_admin'}
											>
												<i class="ph ph-trash" aria-hidden="true"></i>
												<span>Purge User Data (GDPR)</span>
											</button>
										</div>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	<footer class="gu-foot">
		<div class="gu-foot__info">Page {pageIndex + 1}</div>
		<div class="gu-foot__ctrls">
			<button
				type="button"
				class="gu-btn gu-btn--ghost"
				onclick={goPrev}
				disabled={loading || pageIndex === 0}
			>
				<i class="ph ph-caret-left" aria-hidden="true"></i>
				<span>Prev</span>
			</button>
			<button
				type="button"
				class="gu-btn gu-btn--ghost"
				onclick={goNext}
				disabled={loading || !hasNextPage}
			>
				<span>Next</span>
				<i class="ph ph-caret-right" aria-hidden="true"></i>
			</button>
		</div>
	</footer>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════
     GDPR Purge — double confirmation modal
     ═══════════════════════════════════════════════════════════════════════ -->
{#if purgeStep > 0}
	<div
		class="gu-modal-bg"
		role="presentation"
		onclick={closePurge}
		onkeydown={(e) => {
			if (e.key === 'Escape') closePurge();
		}}
	>
		<div
			class="gu-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="gu-purge-title"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<header class="gu-modal__head">
				<div class="gu-modal__icon gu-modal__icon--danger" aria-hidden="true">
					<i class="ph-bold ph-shield-warning"></i>
				</div>
				<div>
					<h2 id="gu-purge-title" class="gu-modal__title">
						{purgeStep === 1 ? 'Purge User Data' : 'Final Confirmation'}
					</h2>
					<p class="gu-modal__sub">
						GDPR Article 17 — Right to Erasure.
					</p>
				</div>
			</header>

			{#if purgeStep === 1}
				<div class="gu-modal__body">
					<p class="gu-modal__p">
						You are about to <strong>permanently delete</strong> all Firestore records
						and the Firebase Auth entry for:
					</p>
					<div class="gu-modal__target">
						<div class="gu-modal__target-name">{purgeTargetName}</div>
						<div class="gu-modal__target-email">{purgeTargetEmail}</div>
					</div>
					<p class="gu-modal__p gu-modal__p--muted">
						This action cannot be undone. The audit trail will be retained under
						<code class="gu-modal__code">security_audit</code>.
					</p>
					<label class="gu-modal__label" for="gu-purge-reason">
						Reason (optional — audited)
					</label>
					<textarea
						id="gu-purge-reason"
						class="gu-modal__input gu-modal__textarea"
						bind:value={purgeReason}
						placeholder="e.g. GDPR Article 17 request — ticket #12345"
						rows="2"
						maxlength="500"
					></textarea>
					{#if purgeErr}
						<p class="gu-flash gu-flash--err">{purgeErr}</p>
					{/if}
				</div>
				<footer class="gu-modal__foot">
					<button type="button" class="gu-btn gu-btn--ghost" onclick={closePurge}>
						Cancel
					</button>
					<button
						type="button"
						class="gu-btn gu-btn--danger"
						onclick={advancePurge}
					>
						Continue
					</button>
				</footer>
			{:else}
				<div class="gu-modal__body">
					<p class="gu-modal__p">
						To confirm, type the target email address <strong>exactly</strong>:
					</p>
					<div class="gu-modal__target gu-modal__target--center">
						<div class="gu-modal__target-email">{purgeTargetEmail}</div>
					</div>
					<label class="gu-modal__label" for="gu-purge-typed">Typed confirmation</label>
					<input
						id="gu-purge-typed"
						type="text"
						class="gu-modal__input"
						bind:value={purgeTypedConfirmation}
						autocomplete="off"
						spellcheck="false"
						placeholder={purgeTargetEmail}
					/>
					{#if purgeErr}
						<p class="gu-flash gu-flash--err">{purgeErr}</p>
					{/if}
				</div>
				<footer class="gu-modal__foot">
					<button
						type="button"
						class="gu-btn gu-btn--ghost"
						onclick={closePurge}
						disabled={purgeBusy}
					>
						Cancel
					</button>
					<button
						type="button"
						class="gu-btn gu-btn--danger"
						onclick={confirmPurge}
						disabled={purgeBusy ||
							purgeTypedConfirmation.trim().toLowerCase() !==
								purgeTargetEmail.toLowerCase()}
					>
						{purgeBusy ? 'Purging…' : 'Permanently Purge'}
					</button>
				</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* ── Layout root (full-bleed) ───────────────────────────────────── */
	.gu-root {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 20px 24px 28px;
		max-width: 100%;
		width: 100%;
		box-sizing: border-box;
	}

	/* ── Header ─────────────────────────────────────────────────────── */
	.gu-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 16px;
		flex-wrap: wrap;
	}

	.gu-head__left { min-width: 240px; }

	.gu-title {
		margin: 0 0 4px;
		font-size: 1.125rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--text-primary);
	}

	.gu-sub {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--text-secondary);
		max-width: 540px;
	}

	:global(html.dark) .gu-sub { color: #d4d4d8; }

	/* Strike 1 — Page Actions slot: primary CTAs pinned top-right, away from
	   the DataTable search row. */
	.gu-page-actions {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		flex: 0 0 auto;
		justify-content: flex-end;
	}

	/* Strike 1 — Dedicated toolbar row above the table. Owns search exclusively. */
	.gu-toolbar {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.gu-search {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px 6px 12px;
		border-radius: 8px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #fff);
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
	}

	:global(html.dark) .gu-search {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.1);
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	.gu-search > i {
		color: #71717a;
		font-size: 1rem;
		flex-shrink: 0;
	}

	:global(html.dark) .gu-search > i { color: #a1a1aa; }

	.gu-search input {
		flex: 1 1 auto;
		min-width: 180px;
		height: 28px;
		appearance: none;
		border: none;
		outline: none;
		background: transparent;
		font: inherit;
		font-size: 0.8125rem;
		color: var(--text-primary);
	}

	:global(html.dark) .gu-search input { color: #fafafa; }

	.gu-search input::placeholder { color: #71717a; }
	:global(html.dark) .gu-search input::placeholder { color: #a1a1aa; }

	.gu-search__clear {
		appearance: none;
		border: none;
		background: transparent;
		color: #71717a;
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		line-height: 0;
	}

	.gu-search__clear:hover { color: var(--text-primary); background: rgba(0, 0, 0, 0.04); }

	:global(html.dark) .gu-search__clear { color: #a1a1aa; }
	:global(html.dark) .gu-search__clear:hover { background: rgba(255, 255, 255, 0.06); color: #fafafa; }

	.gu-search__submit {
		appearance: none;
		padding: 4px 12px;
		border-radius: 6px;
		border: none;
		background: var(--brand-primary, #f59e0b);
		color: #0f172a;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		letter-spacing: 0.02em;
	}

	.gu-search__submit:hover:not(:disabled) { filter: brightness(1.05); }
	.gu-search__submit:disabled { opacity: 0.6; cursor: not-allowed; }

	/* Sprint 2.6.5 — Grant Global Admin entry (moved from System Settings).
	   Strike 1 — button now lives inside `.gu-page-actions`, so left-margin
	   coupling is removed. */
	.gu-add-admin-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 38px;
		padding: 0 16px;
		border-radius: 8px;
		border: 1px solid #4338ca;
		background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
		color: #ffffff;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 6px 16px -6px rgba(79, 70, 229, 0.5);
		transition: filter 0.12s ease, transform 0.12s ease;
	}

	.gu-add-admin-btn:hover {
		filter: brightness(1.06);
		transform: translateY(-1px);
	}

	:global(html.dark) .gu-add-admin-btn {
		box-shadow: 0 6px 22px -6px rgba(124, 58, 237, 0.6);
	}

	/* ── Flash ──────────────────────────────────────────────────────── */
	.gu-flash {
		margin: 0;
		padding: 9px 14px;
		border-radius: 8px;
		font-size: 0.8125rem;
		font-weight: 600;
		line-height: 1.45;
	}

	.gu-flash--ok {
		background: rgba(4, 120, 87, 0.1);
		color: #047857;
		border: 1px solid rgba(4, 120, 87, 0.3);
	}

	.gu-flash--err {
		background: rgba(185, 28, 28, 0.08);
		color: #991b1b;
		border: 1px solid rgba(185, 28, 28, 0.3);
	}

	:global(html.dark) .gu-flash--ok {
		color: #a7f3d0;
		background: rgba(52, 211, 153, 0.08);
		border-color: rgba(52, 211, 153, 0.35);
	}

	:global(html.dark) .gu-flash--err {
		color: #fecaca;
		background: rgba(127, 29, 29, 0.2);
		border-color: rgba(248, 113, 113, 0.3);
	}

	/* ── Summary ────────────────────────────────────────────────────── */
	.gu-summary {
		display: flex;
		align-items: center;
		gap: 18px;
		padding: 10px 14px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 8px;
		background: var(--surface-subtle, #fafafa);
		font-size: 0.75rem;
		flex-wrap: wrap;
	}

	:global(html.dark) .gu-summary {
		background: rgba(255, 255, 255, 0.025);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.gu-summary__item { display: flex; align-items: center; gap: 6px; }
	.gu-summary__item--end { margin-left: auto; }

	.gu-summary__k {
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		font-size: 0.6875rem;
		color: #52525b;
	}

	:global(html.dark) .gu-summary__k { color: #a1a1aa; }

	.gu-summary__v {
		font-weight: 700;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	:global(html.dark) .gu-summary__v { color: #fafafa; }

	.gu-summary__v--mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-weight: 600;
	}

	/* ── Table ──────────────────────────────────────────────────────── */
	.gu-table-wrap {
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 8px;
		background: var(--glass-bg, #ffffff);
		overflow-x: auto;
	}

	:global(html.dark) .gu-table-wrap {
		background: #0c0c0f;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.gu-table {
		width: 100%;
		min-width: 960px;
		border-collapse: collapse;
		font-size: 0.8125rem;
		font-variant-numeric: tabular-nums;
	}

	.gu-th {
		position: sticky;
		top: 0;
		z-index: 1;
		text-align: left;
		padding: 8px 14px;
		font-size: 0.6875rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #52525b;
		background: #fafafa;
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
		white-space: nowrap;
	}

	:global(html.dark) .gu-th {
		color: #d4d4d8;
		background: #141417;
		border-bottom-color: rgba(255, 255, 255, 0.08);
	}

	.gu-th--right { text-align: right; }
	.gu-th--avatar { width: 42px; }

	.gu-tr {
		border-bottom: 1px solid var(--border-subtle, #f1f1f1);
		transition: background 0.06s ease;
	}

	.gu-tr:last-child { border-bottom: none; }
	.gu-tr:hover { background: rgba(0, 0, 0, 0.018); }

	:global(html.dark) .gu-tr { border-bottom-color: rgba(255, 255, 255, 0.05); }
	:global(html.dark) .gu-tr:hover { background: rgba(255, 255, 255, 0.025); }

	.gu-td {
		padding: 9px 14px;
		color: var(--text-primary);
		vertical-align: middle;
	}

	:global(html.dark) .gu-td { color: #fafafa; }

	.gu-td-empty {
		padding: 24px 14px;
		text-align: center;
		color: #71717a;
		font-size: 0.8125rem;
	}

	:global(html.dark) .gu-td-empty { color: #a1a1aa; }

	.gu-td--avatar { padding: 9px 6px 9px 14px; width: 42px; }
	.gu-td--right { text-align: right; }

	/* ── Avatar ─────────────────────────────────────────────────────── */
	.gu-avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
		color: #0c0a09;
		font-size: 0.6875rem;
		font-weight: 800;
		letter-spacing: 0.02em;
		flex-shrink: 0;
		overflow: hidden;
	}

	.gu-avatar--img {
		background: none;
		object-fit: cover;
	}

	/* ── Name / email cell ──────────────────────────────────────────── */
	.gu-name {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.gu-name__primary {
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.005em;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 280px;
	}

	:global(html.dark) .gu-name__primary { color: #fafafa; }

	.gu-name__email {
		font-size: 0.75rem;
		color: #52525b;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 280px;
	}

	:global(html.dark) .gu-name__email { color: #a1a1aa; }

	/* ── Role badge ─────────────────────────────────────────────────── */
	.gu-role {
		display: inline-block;
		padding: 2px 9px;
		border-radius: 999px;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		border: 1px solid transparent;
	}

	.gu-role--crimson {
		background: rgba(220, 38, 38, 0.1);
		color: #b91c1c;
		border-color: rgba(220, 38, 38, 0.3);
	}

	.gu-role--indigo {
		background: rgba(99, 102, 241, 0.1);
		color: #4338ca;
		border-color: rgba(99, 102, 241, 0.3);
	}

	.gu-role--amber {
		background: rgba(245, 158, 11, 0.1);
		color: #b45309;
		border-color: rgba(245, 158, 11, 0.35);
	}

	.gu-role--teal {
		background: rgba(20, 184, 166, 0.1);
		color: #0f766e;
		border-color: rgba(20, 184, 166, 0.3);
	}

	.gu-role--violet {
		background: rgba(139, 92, 246, 0.1);
		color: #6d28d9;
		border-color: rgba(139, 92, 246, 0.3);
	}

	.gu-role--sky {
		background: rgba(14, 165, 233, 0.1);
		color: #0369a1;
		border-color: rgba(14, 165, 233, 0.3);
	}

	.gu-role--emerald {
		background: rgba(16, 185, 129, 0.1);
		color: #047857;
		border-color: rgba(16, 185, 129, 0.3);
	}

	.gu-role--slate {
		background: rgba(100, 116, 139, 0.1);
		color: #475569;
		border-color: rgba(100, 116, 139, 0.3);
	}

	:global(html.dark) .gu-role--crimson { color: #fca5a5; }
	:global(html.dark) .gu-role--indigo { color: #a5b4fc; }
	:global(html.dark) .gu-role--amber { color: #fcd34d; }
	:global(html.dark) .gu-role--teal { color: #5eead4; }
	:global(html.dark) .gu-role--violet { color: #c4b5fd; }
	:global(html.dark) .gu-role--sky { color: #7dd3fc; }
	:global(html.dark) .gu-role--emerald { color: #6ee7b7; }
	:global(html.dark) .gu-role--slate { color: #d4d4d8; }

	/* ── Club cell ──────────────────────────────────────────────────── */
	.gu-club {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.8125rem;
		color: var(--text-primary);
	}

	.gu-club i { color: #71717a; font-size: 0.9375rem; }

	:global(html.dark) .gu-club { color: #fafafa; }
	:global(html.dark) .gu-club i { color: #a1a1aa; }

	.gu-muted {
		color: #71717a;
		font-size: 0.8125rem;
	}

	:global(html.dark) .gu-muted { color: #a1a1aa; }

	/* ── Row actions ────────────────────────────────────────────────── */
	.gu-actions {
		position: relative;
		display: inline-block;
	}

	.gu-icon-btn {
		appearance: none;
		width: 28px;
		height: 28px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		border: 1px solid transparent;
		background: transparent;
		color: #52525b;
		cursor: pointer;
		transition: background 0.1s ease, border-color 0.1s ease;
	}

	.gu-icon-btn:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.05);
		border-color: var(--border-subtle, #e5e5e5);
	}

	.gu-icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	:global(html.dark) .gu-icon-btn { color: #d4d4d8; }
	:global(html.dark) .gu-icon-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.12);
	}

	.gu-menu {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		z-index: 10;
		min-width: 220px;
		padding: 4px;
		border-radius: 8px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: #ffffff;
		box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.04);
		text-align: left;
	}

	:global(html.dark) .gu-menu {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.12);
		box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6);
	}

	.gu-menu__item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 10px;
		border: none;
		background: transparent;
		color: var(--text-primary);
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 500;
		text-align: left;
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.08s ease;
	}

	.gu-menu__item i { color: #52525b; font-size: 1rem; }

	.gu-menu__item:hover:not(:disabled) { background: rgba(0, 0, 0, 0.05); }

	.gu-menu__item:disabled { opacity: 0.45; cursor: not-allowed; }

	:global(html.dark) .gu-menu__item { color: #fafafa; }
	:global(html.dark) .gu-menu__item i { color: #d4d4d8; }
	:global(html.dark) .gu-menu__item:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.06);
	}

	.gu-menu__item--danger { color: #b91c1c; }
	.gu-menu__item--danger i { color: #b91c1c; }

	:global(html.dark) .gu-menu__item--danger { color: #fca5a5; }
	:global(html.dark) .gu-menu__item--danger i { color: #fca5a5; }

	.gu-menu__hint {
		margin-left: auto;
		font-size: 0.625rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #71717a;
	}

	:global(html.dark) .gu-menu__hint { color: #a1a1aa; }

	.gu-menu__sep {
		height: 1px;
		margin: 4px 0;
		background: var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .gu-menu__sep { background: rgba(255, 255, 255, 0.08); }

	/* ── Footer / pagination ────────────────────────────────────────── */
	.gu-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.gu-foot__info { font-size: 0.75rem; color: #52525b; }
	:global(html.dark) .gu-foot__info { color: #a1a1aa; }

	.gu-foot__ctrls { display: flex; gap: 8px; }

	.gu-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 32px;
		padding: 0 12px;
		border-radius: 6px;
		border: 1px solid transparent;
		background: transparent;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.1s ease, border-color 0.1s ease;
	}

	.gu-btn--ghost {
		color: var(--text-primary);
		border-color: var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #ffffff);
	}

	.gu-btn--ghost:hover:not(:disabled) {
		background: var(--surface-subtle, #fafafa);
	}

	:global(html.dark) .gu-btn--ghost {
		color: #fafafa;
		border-color: rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.02);
	}

	:global(html.dark) .gu-btn--ghost:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.05);
	}

	.gu-btn--danger {
		background: #dc2626;
		color: #ffffff;
		border-color: transparent;
	}

	.gu-btn--danger:hover:not(:disabled) { background: #b91c1c; }

	.gu-btn:disabled { opacity: 0.55; cursor: not-allowed; }

	/* ── Modal ──────────────────────────────────────────────────────── */
	.gu-modal-bg {
		position: fixed;
		inset: 0;
		z-index: 9998;
		display: grid;
		place-items: center;
		padding: 24px;
		background: rgba(9, 9, 11, 0.55);
		backdrop-filter: blur(2px);
	}

	.gu-modal {
		width: 100%;
		max-width: 480px;
		padding: 24px;
		border-radius: 12px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: #ffffff;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
	}

	:global(html.dark) .gu-modal {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.gu-modal__head {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		margin-bottom: 16px;
	}

	.gu-modal__icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		display: grid;
		place-items: center;
		font-size: 20px;
		flex-shrink: 0;
	}

	.gu-modal__icon--danger {
		background: rgba(220, 38, 38, 0.12);
		color: #dc2626;
		border: 1px solid rgba(220, 38, 38, 0.35);
	}

	.gu-modal__title {
		margin: 0 0 2px;
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	:global(html.dark) .gu-modal__title { color: #fafafa; }

	.gu-modal__sub {
		margin: 0;
		font-size: 0.75rem;
		color: #52525b;
		letter-spacing: 0.02em;
	}

	:global(html.dark) .gu-modal__sub { color: #a1a1aa; }

	.gu-modal__body {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 18px;
	}

	.gu-modal__p {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.55;
		color: var(--text-primary);
	}

	:global(html.dark) .gu-modal__p { color: #fafafa; }

	.gu-modal__p--muted { color: #52525b; font-size: 0.8125rem; }
	:global(html.dark) .gu-modal__p--muted { color: #d4d4d8; }

	.gu-modal__target {
		padding: 12px 14px;
		border-radius: 8px;
		background: rgba(220, 38, 38, 0.05);
		border: 1px solid rgba(220, 38, 38, 0.25);
	}

	:global(html.dark) .gu-modal__target {
		background: rgba(127, 29, 29, 0.2);
		border-color: rgba(248, 113, 113, 0.3);
	}

	.gu-modal__target--center { text-align: center; }

	.gu-modal__target-name {
		font-weight: 700;
		font-size: 0.9375rem;
		color: var(--text-primary);
	}

	:global(html.dark) .gu-modal__target-name { color: #fafafa; }

	.gu-modal__target-email {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.8125rem;
		color: #b91c1c;
	}

	:global(html.dark) .gu-modal__target-email { color: #fca5a5; }

	.gu-modal__label {
		display: block;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #52525b;
	}

	:global(html.dark) .gu-modal__label { color: #d4d4d8; }

	.gu-modal__input {
		width: 100%;
		padding: 8px 12px;
		border-radius: 7px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #fff);
		font: inherit;
		font-size: 0.875rem;
		color: var(--text-primary);
		box-sizing: border-box;
		outline: none;
	}

	.gu-modal__input:focus { border-color: var(--brand-primary, #f59e0b); }

	:global(html.dark) .gu-modal__input {
		background: #09090b;
		border-color: rgba(255, 255, 255, 0.1);
		color: #fafafa;
	}

	.gu-modal__textarea { font-family: inherit; resize: vertical; min-height: 56px; }

	.gu-modal__code {
		padding: 1px 5px;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.05);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.75rem;
	}

	:global(html.dark) .gu-modal__code {
		background: rgba(255, 255, 255, 0.08);
		color: #fafafa;
	}

	.gu-modal__foot {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}

	@media (max-width: 640px) {
		.gu-root { padding: 16px; }
		.gu-head { flex-direction: column; align-items: stretch; }
		.gu-page-actions { justify-content: stretch; }
		.gu-page-actions .gu-add-admin-btn { width: 100%; justify-content: center; }
		.gu-toolbar { flex-direction: column; align-items: stretch; }
		.gu-search { width: 100%; }
		.gu-name__primary,
		.gu-name__email { max-width: 180px; }
	}
</style>
