import { authStore } from '$lib/stores/auth.svelte.js';
import { db } from '$lib/firebase.js';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { getClearanceStatusSubLabel } from '$lib/compliance/checkrCoachClearance.js';

export type CoachRow = {
	email: string;
	displayName?: string;
	role?: string;
	clubId?: string;
	clearance?: Record<string, unknown>;
};

type RowState = {
	verifying: boolean;
	simulating: boolean;
	ordering: boolean;
	error: string;
};

export class CoachClearanceEngine {
	clubIdProp = '';

	coaches = $state<CoachRow[]>([]);
	loading = $state(true);
	loadError = $state('');
	search = $state('');
	rowActions = $state<Record<string, RowState>>({});
	
	toastMsg = $state('');
	toastTimer: ReturnType<typeof setTimeout> | null = null;

	get effectiveClubId() {
		return this.clubIdProp?.trim() ||
			(typeof authStore.userProfile?.clubId === 'string' ? authStore.userProfile.clubId.trim() : '') ||
			(typeof authStore.tenantId === 'string' ? authStore.tenantId.trim() : '');
	}

	get filtered() {
		return this.coaches.filter((c) => {
			if (!this.search.trim()) return true;
			const s = this.search.toLowerCase();
			return c.email.toLowerCase().includes(s) || (c.displayName ?? '').toLowerCase().includes(s);
		});
	}

	get counts() {
		return {
			total: this.coaches.length,
			cleared: this.coaches.filter((c) => this.getStatus(c) === 'cleared').length,
			pending: this.coaches.filter((c) => ['pending', 'unsubmitted'].includes(this.getStatus(c))).length,
			flagged: this.coaches.filter((c) => this.getStatus(c) === 'flagged').length,
		};
	}

	showToast(msg: string) {
		this.toastMsg = msg;
		if (this.toastTimer) clearTimeout(this.toastTimer);
		this.toastTimer = setTimeout(() => {
			this.toastMsg = '';
		}, 6000);
	}

	initRowActions(rows: CoachRow[]) {
		const next = { ...this.rowActions };
		for (const coach of rows) {
			if (!next[coach.email]) {
				next[coach.email] = { verifying: false, simulating: false, ordering: false, error: '' };
			}
		}
		this.rowActions = next;
	}

	getStatus(coach: CoachRow) {
		const status = coach.clearance?.status as string | undefined;
		return status ?? 'pending';
	}

	getRowState(email: string) {
		return this.rowActions[email] ?? { verifying: false, simulating: false, ordering: false, error: '' };
	}

	ensureRowState(email: string) {
		if (!this.rowActions[email]) {
			this.rowActions[email] = { verifying: false, simulating: false, ordering: false, error: '' };
		}
		return this.rowActions[email]!;
	}

	needsScreeningOrder(coach: CoachRow) {
		const status = this.getStatus(coach);
		const cl = (coach.clearance ?? {}) as Record<string, unknown>;
		const invited = Boolean(cl.invitationId || cl.invitationUrl);
		return ['pending', 'unsubmitted'].includes(status) && !invited;
	}

	callableErrMsg(err: unknown) {
		if (err && typeof err === 'object') {
			if ('message' in err && typeof err.message === 'string' && err.message) {
				return err.message;
			}
			if ('details' in err && typeof err.details === 'string' && err.details) {
				return err.details;
			}
		}
		return 'Request failed.';
	}

	async orderScreening(coach: CoachRow) {
		const rs = this.ensureRowState(coach.email);
		rs.ordering = true;
		rs.error = '';
		try {
			const fns = getFunctions(getApp(), 'us-east1');
			const initiate = httpsCallable(fns, 'directorInitiateCoachClearance');
			const result = await initiate({ coachEmail: coach.email });
			const data = result.data as Record<string, unknown>;
			coach.clearance = {
				...(coach.clearance ?? {}),
				status: 'pending',
				source: 'checkr',
				invitationId: typeof data.invitationId === 'string' ? data.invitationId : 'ordered',
				invitationUrl: typeof data.invitationUrl === 'string' ? data.invitationUrl : null,
				lastVerified: { seconds: Math.floor(Date.now() / 1000) },
			};
		} catch (err) {
			rs.error = this.callableErrMsg(err);
		} finally {
			rs.ordering = false;
		}
	}

	async simulateClearance(coach: CoachRow) {
		const rs = this.ensureRowState(coach.email);
		rs.simulating = true;
		rs.error = '';
		try {
			const fns = getFunctions(getApp(), 'us-east1');
			const simulate = httpsCallable(fns, 'simulateClearance');
			await simulate({ email: coach.email });
			coach.clearance = {
				...(coach.clearance ?? {}),
				status: 'cleared',
				source: 'qa_simulate',
				lastVerified: { seconds: Math.floor(Date.now() / 1000) },
			};
			this.showToast('Coach must sign out and back in.');
		} catch (err) {
			rs.error = this.callableErrMsg(err);
		} finally {
			rs.simulating = false;
		}
	}

	async revokeCoach(coach: CoachRow) {
		const rs = this.ensureRowState(coach.email);
		rs.verifying = true;
		rs.error = '';
		try {
			const fns = getFunctions(getApp(), 'us-east1');
			const revoke = httpsCallable(fns, 'revokeCoachClearance');
			await revoke({ email: coach.email, reason: 'Director initiated revocation via Panopticon' });
			coach.clearance = { ...(coach.clearance ?? {}), status: 'flagged' };
		} catch (err) {
			rs.error = this.callableErrMsg(err);
		} finally {
			rs.verifying = false;
		}
	}

	subscribe() {
		$effect.root(() => {
			$effect(() => {
				if (authStore.isLoading) return;
				if (!authStore.isAuthenticated) {
					this.loading = false;
					this.coaches = [];
					return;
				}
				const clubId = this.effectiveClubId;
				if (!clubId && !['super_admin', 'global_admin'].includes(authStore.role ?? '')) {
					this.loading = false;
					return;
				}
				let q;
				if (['super_admin', 'global_admin'].includes(authStore.role ?? '')) {
					q = query(
						collection(db, 'users'),
						where('role', 'in', ['coach', 'recruiter']),
					);
				} else {
					q = query(
						collection(db, 'users'),
						where('role', 'in', ['coach', 'recruiter']),
						where('clubId', '==', clubId),
					);
				}
				this.loading = true;
				this.loadError = '';
				const unsub = onSnapshot(
					q,
					(snap) => {
						this.coaches = snap.docs.map((d) => {
							const data = (d.data() ?? {}) as Record<string, unknown>;
							return {
								email: d.id,
								...data,
							} as CoachRow;
						});
						this.initRowActions(this.coaches);
						this.loading = false;
					},
					(e) => {
						this.loadError = e.message ?? 'Failed to load coaches.';
						this.loading = false;
					},
				);
				return () => unsub();
			});
			return () => {};
		});
	}
}
