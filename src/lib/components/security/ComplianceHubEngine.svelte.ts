import { authStore } from '$lib/stores/auth.svelte.js';
import { httpsCallable } from 'firebase/functions';
import { functions } from '$lib/firebase.js';

export interface ComplianceRow {
	email: string;
	displayName: string;
	role: string;
	teamId: string | null;
	clearanceStatus: string;
	clearanceRef: string | null;
	expiresAt: number | null;
	updatedAt: number | null;
	source: string | null;
	isManualOverride: boolean;
}

export class ComplianceHubEngine {
	loadState = $state<'idle' | 'loading' | 'error'>('idle');
	errorMsg = $state('');
	roster = $state<ComplianceRow[]>([]);

	overrideOpen = $state(false);
	overrideEmail = $state('');
	overrideDocRef = $state('');
	overrideExpiry = $state('');
	overrideBusy = $state(false);
	overrideError = $state('');
	overrideSuccess = $state('');

	revokeOpen = $state(false);
	revokeEmail = $state('');
	revokeReason = $state('');
	revokeBusy = $state(false);

	searchQuery = $state('');
	filterStatus = $state('all');

	canAccess = $derived(
		authStore.isDirector || authStore.isRegistrar || authStore.isAdmin
	);
	canOverride = $derived(authStore.isDirector || authStore.isAdmin);

	filteredRoster = $derived.by(() => {
		let rows = this.roster;
		if (this.filterStatus !== 'all') rows = rows.filter((r) => r.clearanceStatus === this.filterStatus);
		if (this.searchQuery.trim()) {
			const q = this.searchQuery.toLowerCase();
			rows = rows.filter(
				(r) => r.email.toLowerCase().includes(q) || r.displayName.toLowerCase().includes(q),
			);
		}
		return rows;
	});

	stats = $derived.by(() => ({
		total: this.roster.length,
		cleared: this.roster.filter((r) => r.clearanceStatus === 'cleared').length,
		pending: this.roster.filter((r) => r.clearanceStatus === 'pending').length,
		flagged: this.roster.filter((r) => r.clearanceStatus === 'flagged').length,
	}));

	constructor() {
		$effect(() => {
			if (this.canAccess) void this.loadRoster();
		});
	}

	async loadRoster() {
		if (!authStore.isAuthenticated) return;
		if (!this.canAccess) return;
		this.loadState = 'loading';
		this.errorMsg = '';
		try {
			const getComplianceRosterFn = httpsCallable(functions, 'getComplianceRoster');
			const result = await getComplianceRosterFn({});
			const data = result.data as { roster: ComplianceRow[] };
			this.roster = data.roster ?? [];
			this.loadState = 'idle';
		} catch (err) {
			this.errorMsg = err instanceof Error ? err.message : 'Failed to load compliance roster.';
			this.loadState = 'error';
		}
	}

	openOverride(email: string) {
		this.overrideEmail = email;
		this.overrideDocRef = '';
		this.overrideExpiry = '';
		this.overrideError = '';
		this.overrideSuccess = '';
		this.overrideOpen = true;
	}

	async submitOverride() {
		if (!authStore.isAuthenticated) return;
		if (!this.overrideEmail) return;
		this.overrideBusy = true;
		this.overrideError = '';
		try {
			const requestManualOverrideFn = httpsCallable(functions, 'requestManualOverride');
			await requestManualOverrideFn({
				targetEmail: this.overrideEmail,
				documentRef: this.overrideDocRef || null,
				expiresAt: this.overrideExpiry || null,
			});
			this.overrideSuccess = `Clearance granted for ${this.overrideEmail}`;
			await this.loadRoster();
			setTimeout(() => {
				this.overrideOpen = false;
				this.overrideSuccess = '';
			}, 2000);
		} catch (err) {
			this.overrideError = err instanceof Error ? err.message : 'Override failed.';
		} finally {
			this.overrideBusy = false;
		}
	}

	openRevoke(email: string) {
		this.revokeEmail = email;
		this.revokeReason = '';
		this.revokeOpen = true;
	}

	async submitRevoke() {
		if (!authStore.isAuthenticated) return;
		if (!this.revokeEmail) return;
		this.revokeBusy = true;
		try {
			const revokeCoachClearanceFn = httpsCallable(functions, 'revokeCoachClearance');
			await revokeCoachClearanceFn({ targetEmail: this.revokeEmail, reason: this.revokeReason });
			await this.loadRoster();
		} finally {
			this.revokeBusy = false;
			this.revokeOpen = false;
		}
	}

	formatExpiry(ms: number | null) {
		if (!ms) return '—';
		const d = new Date(ms);
		return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	statusClass(status: string) {
		if (status === 'cleared') return 'ch-badge ch-badge--cleared';
		if (status === 'flagged') return 'ch-badge ch-badge--flagged';
		return 'ch-badge ch-badge--pending';
	}
}
