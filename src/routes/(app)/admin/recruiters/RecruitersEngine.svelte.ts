import { db } from '$lib/firebase.js';
import {
	collection,
	doc,
	getDocs,
	orderBy,
	query,
	serverTimestamp,
	updateDoc
} from 'firebase/firestore';
import { authStore } from '$lib/stores/auth.svelte.js';
import { logSecurityEvent } from '$lib/utils/security.js';
import { toEpochMs } from '$lib/utils/timestamp.js';
import { loadRecruitersData, type RecruiterRow, type VerificationStatus } from '$lib/admin/recruitersLoad.js';
import { updateRecruiterVerification } from '$lib/admin/recruitersVerification.js';

export class RecruitersEngine {
	rows = $state<RecruiterRow[]>([]);
	loading = $state(true);
	err = $state('');

	statusFilter = $state<'' | VerificationStatus>('');
	searchInput = $state('');
	busyFor = $state('');
	rejectingFor = $state('');
	rejectReason = $state('');
	flashOk = $state('');
	flashErr = $state('');

	toasts = $state<{ id: number; text: string; tone: 'info' | 'ok' | 'warn' }[]>([]);
	toastSeq = 0;

	openMenuFor = $state('');

	get filteredRows() {
		const q = (this.searchInput || '').toLowerCase().trim();
		return this.rows.filter((r) => {
			if (this.statusFilter && r.verificationStatus !== this.statusFilter) return false;
			if (!q) return true;
			return (
				r.email.toLowerCase().includes(q) ||
				r.scoutName.toLowerCase().includes(q) ||
				r.agency.toLowerCase().includes(q)
			);
		});
	}

	get counts() {
		let pending = 0;
		let verified = 0;
		let rejected = 0;
		for (const r of this.rows) {
			if (r.verificationStatus === 'pending') pending += 1;
			else if (r.verificationStatus === 'verified') verified += 1;
			else if (r.verificationStatus === 'rejected') rejected += 1;
		}
		return { pending, verified, rejected, total: this.rows.length };
	}

	pushToast(text: string, tone: 'info' | 'ok' | 'warn' = 'info') {
		const id = ++this.toastSeq;
		this.toasts.push({ id, text, tone });
		setTimeout(() => {
			this.toasts = this.toasts.filter((t) => t.id !== id);
		}, 4200);
	}

	toggleMenu(rowId: string) {
		this.openMenuFor = this.openMenuFor === rowId ? '' : rowId;
	}

	closeMenu() {
		this.openMenuFor = '';
	}

	async loadRecruiters() {
		this.loading = true;
		this.err = '';
		try {
			this.rows = await loadRecruitersData();
		} catch (e) {
			console.error('[admin-recruiters] load failed', e);
			this.err = e instanceof Error ? e.message : 'Could not load recruiters.';
			this.rows = [];
		} finally {
			this.loading = false;
		}
	}

	async updateVerification(row: RecruiterRow, next: VerificationStatus, reason = '') {
		if (this.busyFor) return;
		this.busyFor = row.id;
		this.flashOk = '';
		this.flashErr = '';
		try {
			await updateRecruiterVerification(row, next, reason, authStore.user?.email || 'super_admin');

			const idx = this.rows.findIndex((r) => r.id === row.id);
			if (idx >= 0) {
				const nextRows = [...this.rows];
				nextRows[idx] = { ...nextRows[idx], verificationStatus: next };
				this.rows = nextRows;
			}
			this.flashOk =
				next === 'verified'
					? `${row.email} approved.`
					: next === 'rejected'
						? `${row.email} rejected.`
						: `${row.email} returned to pending.`;
		} catch (e) {
			console.error('[admin-recruiters] update failed', e);
			this.flashErr = e instanceof Error ? e.message : 'Update failed.';
		} finally {
			this.busyFor = '';
			this.rejectingFor = '';
			this.rejectReason = '';
		}
	}

	approve(row: RecruiterRow) {
		if (row.verificationStatus === 'verified') return;
		const ok = confirm(`Approve ${row.email} (${row.agency || 'no agency'}) as a verified recruiter?`);
		if (!ok) return;
		void this.updateVerification(row, 'verified');
	}

	openReject(row: RecruiterRow) {
		this.rejectingFor = row.id;
		this.rejectReason = '';
	}

	cancelReject() {
		this.rejectingFor = '';
		this.rejectReason = '';
	}

	confirmReject(row: RecruiterRow) {
		if (!this.rejectReason.trim()) {
			this.flashErr = 'A rejection reason is required for the audit trail.';
			return;
		}
		void this.updateVerification(row, 'rejected', this.rejectReason);
	}

	resetPending(row: RecruiterRow) {
		if (row.verificationStatus === 'pending') return;
		void this.updateVerification(row, 'pending');
	}

	async runBackgroundCheck(row: RecruiterRow) {
		this.closeMenu();
		if (row.vettingStatus === 'processing') {
			this.pushToast(`A Checkr run is already in flight for ${row.scoutName || row.email}.`, 'info');
			return;
		}

		// Optimistic local patch
		const idx = this.rows.findIndex((r) => r.id === row.id);
		if (idx >= 0) {
			const nextRows = [...this.rows];
			nextRows[idx] = { ...nextRows[idx], vettingStatus: 'processing' };
			this.rows = nextRows;
		}

		this.pushToast(`Background check dispatched for ${row.scoutName || row.email}. Checkr API integration arriving Sprint 2.9.`, 'info');

		try {
			await updateDoc(doc(db, 'recruiters', row.id), {
				vettingStatus: 'processing',
				vettingRequestedAt: serverTimestamp(),
				vettingRequestedBy: authStore.user?.email || 'super_admin'
			});
			await logSecurityEvent('RECRUITER_BG_CHECK_REQUESTED', row.email, 'Strike 2 — vetting status → processing');
		} catch (e) {
			console.warn('[admin-recruiters] background-check persistence failed', e);
			const rollbackIdx = this.rows.findIndex((r) => r.id === row.id);
			if (rollbackIdx >= 0) {
				const nextRows = [...this.rows];
				nextRows[rollbackIdx] = { ...nextRows[rollbackIdx], vettingStatus: row.vettingStatus };
				this.rows = nextRows;
			}
			this.pushToast('Could not persist vetting status — see console.', 'warn');
		}
	}

	subscribe() {
		$effect.root(() => {
			$effect(() => {
				if (authStore.isLoading || !authStore.isAuthenticated) return;
				if (authStore.role !== 'super_admin' && authStore.role !== 'global_admin') {
					this.err = 'You must be a super admin to view this page.';
					this.loading = false;
					return;
				}
				void this.loadRecruiters();
			});

			$effect(() => {
				if (typeof document === 'undefined') return;
				if (!this.openMenuFor) return;
				const onDocClick = (e: MouseEvent) => {
					const target = e.target as HTMLElement | null;
					if (target && target.closest && target.closest('.ar-menu-wrap')) return;
					this.openMenuFor = '';
				};
				const onKey = (e: KeyboardEvent) => {
					if (e.key === 'Escape') this.openMenuFor = '';
				};
				document.addEventListener('click', onDocClick);
				document.addEventListener('keydown', onKey);
				return () => {
					document.removeEventListener('click', onDocClick);
					document.removeEventListener('keydown', onKey);
				};
			});

			return () => {};
		});
	}
}
