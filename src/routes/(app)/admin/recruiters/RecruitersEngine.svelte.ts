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

export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'past_due' | 'cancelled';
export type VettingStatus = 'pending' | 'processing' | 'cleared' | 'flagged';

export interface RecruiterRow {
	id: string;
	email: string;
	scoutName: string;
	agency: string;
	affiliationType: string;
	phone: string;
	region: string;
	verificationStatus: VerificationStatus;
	vettingStatus: VettingStatus;
	subscriptionStatus: SubscriptionStatus;
	subscriptionTier: string;
	lastActiveAt: number;
	createdAt: number;
	notes: string;
}

function coerceVetting(raw: unknown): VettingStatus {
	const v = typeof raw === 'string' ? raw.toLowerCase() : '';
	if (v === 'processing' || v === 'cleared' || v === 'flagged') return v as VettingStatus;
	return 'pending';
}

function coerceVerification(raw: unknown): VerificationStatus {
	const v = (typeof raw === 'string' ? raw : '').toLowerCase();
	if (v === 'verified' || v === 'rejected') return v as VerificationStatus;
	return 'pending';
}

function coerceSubscription(raw: unknown): SubscriptionStatus {
	const v = (typeof raw === 'string' ? raw : '').toLowerCase();
	if (v === 'trial' || v === 'active' || v === 'past_due' || v === 'cancelled') return v as SubscriptionStatus;
	return 'none';
}

function toEpochMs(v: unknown): number {
	if (v == null) return 0;
	if (typeof v === 'number' && Number.isFinite(v)) return v > 1e12 ? v : v * 1000;
	if (typeof v === 'string') {
		const n = Number(v);
		if (Number.isFinite(n) && n > 0) return n > 1e12 ? n : n * 1000;
		const parsed = Date.parse(v);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	if (typeof v === 'object' && v !== null) {
		const o = v as Record<string, unknown>;
		if (typeof o.toMillis === 'function') {
			try {
				return (o.toMillis as () => number)();
			} catch {
				/* fall through */
			}
		}
		if (typeof o.seconds === 'number') {
			return o.seconds * 1000 + (typeof o.nanoseconds === 'number' ? Math.floor(o.nanoseconds / 1e6) : 0);
		}
		if (typeof o.toDate === 'function') {
			try {
				return (o.toDate as () => Date)().getTime();
			} catch {
				/* fall through */
			}
		}
	}
	return 0;
}

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
			const snap = await getDocs(query(collection(db, 'recruiters'), orderBy('email')));
			const next: RecruiterRow[] = [];
			snap.forEach((d) => {
				const raw = (d.data() || {}) as Record<string, unknown>;
				const email = typeof raw.email === 'string' && raw.email ? raw.email : d.id;
				next.push({
					id: d.id,
					email,
					scoutName: typeof raw.scoutName === 'string' ? raw.scoutName.trim() : '',
					agency: typeof raw.agency === 'string' ? raw.agency.trim() : '',
					affiliationType: typeof raw.affiliationType === 'string' ? raw.affiliationType.trim() : '',
					phone: typeof raw.phone === 'string' ? raw.phone.trim() : '',
					region: typeof raw.region === 'string' ? raw.region.trim() : '',
					verificationStatus: coerceVerification(raw.verificationStatus),
					vettingStatus: coerceVetting(raw.vettingStatus),
					subscriptionStatus: coerceSubscription(raw.subscriptionStatus),
					subscriptionTier: typeof raw.subscriptionTier === 'string' ? raw.subscriptionTier.trim() : '',
					lastActiveAt: toEpochMs(raw.lastActiveAt ?? raw.lastLoginAt ?? raw.updatedAt),
					createdAt: toEpochMs(raw.createdAt),
					notes: typeof raw.notes === 'string' ? raw.notes : ''
				});
			});
			this.rows = next;
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
			const ref = doc(db, 'recruiters', row.id);
			const patch: Record<string, unknown> = {
				verificationStatus: next,
				verificationUpdatedAt: serverTimestamp(),
				verificationUpdatedBy: authStore.user?.email || 'super_admin'
			};
			if (next === 'rejected') {
				patch.rejectionReason = reason.trim().slice(0, 500);
			} else {
				patch.rejectionReason = '';
			}
			await updateDoc(ref, patch);

			await logSecurityEvent(
				next === 'verified'
					? 'RECRUITER_APPROVE'
					: next === 'rejected'
						? 'RECRUITER_REJECT'
						: 'RECRUITER_RESET',
				row.email,
				reason
			);

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
