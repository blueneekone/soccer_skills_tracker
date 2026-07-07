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
import type { GlobalUserRow, GlobalUsersTab } from '$lib/types/adminUsers.js';

export class AdminUsersEngine {
	impersonateUserFn = httpsCallable(functions, 'impersonateUser');
	purgeUserDataFn = httpsCallable(functions, 'purgeUserDataFn');

	rows = $state<GlobalUserRow[]>([]);
	loading = $state(false);
	err = $state('');
	totalEstimate = $state(0);
	totalLoaded = $state(false);
	searchInput = $state('');
	searchApplied = $state('');
	cursorStack = $state<string[]>(['']);
	pageIndex = $state(0);
	hasNextPage = $state(false);
	activeTab = $state<GlobalUsersTab>('directors');
	clubNameMap = $state<Map<string, string>>(new Map());
	openMenuFor = $state('');
	
	purgeTargetEmail = $state('');
	purgeTargetName = $state('');
	purgeStep = $state(0);
	purgeTypedConfirmation = $state('');
	purgeReason = $state('');
	purgeBusy = $state(false);
	purgeErr = $state('');
	
	loginAsBusyFor = $state('');
	flashOk = $state('');
	flashErr = $state('');
	
	showAddAdmin = $state(false);
	editingAdmin = $state<GlobalUserRow | null>(null);
	
	deactivateTarget = $state<GlobalUserRow | null>(null);
	deactivateBusy = $state(false);
	deactivateErr = $state('');

	get rangeStart() {
		return this.pageIndex * GLOBAL_USERS_PAGE_SIZE + (this.rows.length > 0 ? 1 : 0);
	}
	get rangeEnd() {
		return this.pageIndex * GLOBAL_USERS_PAGE_SIZE + this.rows.length;
	}
	get totalLabel() {
		return this.totalLoaded ? `${this.totalEstimate.toLocaleString()}` : '…';
	}

	loadCount = async (searchTerm: string, tab: GlobalUsersTab) => {
		try {
			this.totalEstimate = await fetchUsersCount(db, searchTerm, tab);
		} catch (e) {
			console.warn('[global-users] count unavailable', e);
			this.totalEstimate = 0;
		} finally {
			this.totalLoaded = true;
		}
	}

	loadPage = async (searchTerm: string, afterEmail: string, tab: GlobalUsersTab) => {
		this.loading = true;
		this.err = '';
		try {
			const result = await fetchUsersPage(db, searchTerm, afterEmail, tab);
			this.hasNextPage = result.hasNextPage;
			this.rows = result.rows;
		} catch (e) {
			console.error('[global-users] page load failed', e);
			this.err = e instanceof Error ? e.message : 'Could not load users.';
			this.rows = [];
			this.hasNextPage = false;
		} finally {
			this.loading = false;
		}
	}

	runSearch = async () => {
		const term = normalizeEmailPrefix(this.searchInput);
		this.searchInput = term;
		this.searchApplied = term;
		this.cursorStack = [''];
		this.pageIndex = 0;
		await Promise.all([this.loadCount(term, this.activeTab), this.loadPage(term, '', this.activeTab)]);
	}

	clearSearch = async () => {
		this.searchInput = '';
		this.searchApplied = '';
		this.cursorStack = [''];
		this.pageIndex = 0;
		await Promise.all([this.loadCount('', this.activeTab), this.loadPage('', '', this.activeTab)]);
	}

	onSearchKey = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			void this.runSearch();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			void this.clearSearch();
		}
	}

	goNext = async () => {
		if (!this.hasNextPage || this.rows.length === 0) return;
		const cursor = this.rows[this.rows.length - 1]!.email || this.rows[this.rows.length - 1]!.id;
		this.cursorStack = [...this.cursorStack, cursor];
		this.pageIndex = this.pageIndex + 1;
		await this.loadPage(this.searchApplied, cursor, this.activeTab);
	}

	goPrev = async () => {
		if (this.pageIndex <= 0) return;
		const next = this.cursorStack.slice(0, -1);
		this.cursorStack = next;
		this.pageIndex = this.pageIndex - 1;
		const cursor = next[next.length - 1] ?? '';
		await this.loadPage(this.searchApplied, cursor, this.activeTab);
	}

	toggleMenu = (userId: string) => {
		this.openMenuFor = this.openMenuFor === userId ? '' : userId;
	}

	openEditAdmin = (row: GlobalUserRow) => {
		this.editingAdmin = row;
		this.openMenuFor = '';
	}

	closeEditAdmin = () => {
		this.editingAdmin = null;
	}

	loginAs = async (row: GlobalUserRow) => {
		this.openMenuFor = '';
		this.flashOk = '';
		this.flashErr = '';
		if (row.role === 'super_admin' || row.role === 'global_admin') {
			this.flashErr = 'Cannot impersonate another global admin.';
			return;
		}
		if (row.email === (authStore.user?.email || '').toLowerCase()) {
			this.flashErr = 'Cannot impersonate your own account.';
			return;
		}
		const ok = confirm(
			`Begin impersonation session as ${row.email}?\n\n` +
				'Every action will be attributed to this user until you sign out. Server-side audit rows land in security_audit.',
		);
		if (!ok) return;

		const actorEmail = authStore.user?.email || 'unknown';
		this.loginAsBusyFor = row.id;
		try {
			const res = await this.impersonateUserFn({ targetUid: row.id || row.uid, targetEmail: row.email });
			const payload = (res.data || {}) as { customToken?: string };
			if (!payload.customToken) throw new Error('Impersonation token missing from response.');
			await signInWithCustomToken(auth, payload.customToken);
			await impersonationStore.touch();
			await logSecurityEvent(
				'IMPERSONATE_USER',
				row.email,
				`Platform admin ${actorEmail} assumed session as ${row.email} (${row.role})`,
			);
			await goto('/dashboard', { replaceState: true });
		} catch (e) {
			console.error('[global-users] impersonation failed', e);
			this.flashErr = e instanceof Error ? e.message : 'Impersonation failed.';
		} finally {
			this.loginAsBusyFor = '';
		}
	}

	openPurge = (row: GlobalUserRow) => {
		this.openMenuFor = '';
		this.purgeTargetEmail = row.email;
		this.purgeTargetName = row.displayName || row.playerName || row.email;
		this.purgeStep = 1;
		this.purgeTypedConfirmation = '';
		this.purgeReason = '';
		this.purgeErr = '';
	}

	closePurge = () => {
		if (this.purgeBusy) return;
		this.purgeStep = 0;
		this.purgeTargetEmail = '';
		this.purgeTargetName = '';
		this.purgeTypedConfirmation = '';
		this.purgeReason = '';
		this.purgeErr = '';
	}

	advancePurge = () => {
		this.purgeErr = '';
		this.purgeStep = 2;
	}

	confirmPurge = async () => {
		if (this.purgeBusy) return;
		if (this.purgeTypedConfirmation.trim().toLowerCase() !== this.purgeTargetEmail.toLowerCase()) {
			this.purgeErr = 'Typed confirmation does not match the target email.';
			return;
		}
		this.purgeBusy = true;
		this.purgeErr = '';
		try {
			await this.purgeUserDataFn({
				targetEmail: this.purgeTargetEmail,
				reason: this.purgeReason.trim().slice(0, 500),
			});
			await logSecurityEvent('PURGE_USER_DATA_CLIENT_ACK', this.purgeTargetEmail, this.purgeReason);
			this.flashOk = `${this.purgeTargetEmail} purged from the platform.`;
			this.closePurge();
			const cursor = this.cursorStack[this.pageIndex] ?? '';
			await Promise.all([this.loadCount(this.searchApplied, this.activeTab), this.loadPage(this.searchApplied, cursor, this.activeTab)]);
		} catch (e) {
			console.error('[global-users] purge failed', e);
			this.purgeErr = e instanceof Error ? e.message : 'Purge failed.';
		} finally {
			this.purgeBusy = false;
		}
	}

	isRevokeTargetSelf = (row: GlobalUserRow) => {
		const myUid = authStore.user?.uid;
		if (myUid && row.uid && row.uid === myUid) return true;
		const me = (authStore.user?.email || '').toLowerCase();
		return Boolean(me) && row.email.toLowerCase() === me;
	}

	canDeactivateUser = (row: GlobalUserRow) => {
		if (this.isRevokeTargetSelf(row)) return false;
		if (row.role === 'super_admin' || row.role === 'global_admin') return false;
		if (isAccountSuspendedProfile({ ...row, status: row.status })) return false;
		return true;
	}

	openDeactivate = (row: GlobalUserRow) => {
		this.openMenuFor = '';
		this.deactivateErr = '';
		this.deactivateTarget = row;
	}

	closeDeactivate = () => {
		if (this.deactivateBusy) return;
		this.deactivateTarget = null;
		this.deactivateErr = '';
	}

	handleRevokeAccess = async () => {
		if (!this.deactivateTarget || this.deactivateBusy) return;
		const row = this.deactivateTarget;
		if (this.isRevokeTargetSelf(row)) {
			this.deactivateErr = 'You cannot suspend your own account.';
			return;
		}
		const key = row.email.toLowerCase();
		this.deactivateBusy = true;
		this.deactivateErr = '';
		this.flashErr = '';
		try {
			await updateDoc(doc(db, 'users', key), {
				status: USER_ACCOUNT_STATUS.suspended,
				roles: [],
				role: 'guest',
			});
			await logSecurityEvent('SUSPEND_USER', key, 'Enterprise deactivation from Global Users');
			this.rows = suspendUserRowLocally(this.rows, key);
			this.flashOk = `Access revoked for ${row.email} — account suspended.`;
			this.deactivateTarget = null;
			this.deactivateErr = '';
		} catch (e) {
			console.error('[global-users] suspend failed', e);
			this.deactivateErr = e instanceof Error ? e.message : 'Could not suspend account.';
		} finally {
			this.deactivateBusy = false;
		}
	}

	subscribe() {
		$effect.root(() => {
			$effect(() => {
				if (authStore.isLoading || !authStore.isAuthenticated) return;
				if (authStore.role !== 'super_admin' && authStore.role !== 'global_admin') {
					this.err = 'You must be a super admin to view this page.';
					return;
				}

				const segment = this.activeTab;
				const term = this.searchApplied;
				let cancelled = false;

				(async () => {
					try {
						this.clubNameMap = await loadClubNameMap(db);
					} catch {
						this.clubNameMap = new Map();
					}
					if (cancelled) return;
					this.cursorStack = [''];
					this.pageIndex = 0;
					await Promise.all([this.loadCount(term, segment), this.loadPage(term, '', segment)]);
				})();

				return () => {
					cancelled = true;
				};
			});

			$effect(() => {
				if (!this.openMenuFor) return;
				const onDocClick = (e: MouseEvent) => {
					const target = e.target as HTMLElement | null;
					if (target && target.closest('[data-user-menu]')) return;
					this.openMenuFor = '';
				};
				document.addEventListener('click', onDocClick);
				return () => document.removeEventListener('click', onDocClick);
			});

			$effect(() => {
				if (this.purgeStep <= 0) return;
				lockBody();
				return () => unlockBody();
			});

			$effect(() => {
				if (!this.deactivateTarget) return;
				lockBody();
				return () => unlockBody();
			});

			return () => {};
		});
	}
}
