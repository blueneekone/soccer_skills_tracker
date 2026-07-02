import { browser } from '$app/environment';
import { db } from '$lib/firebase.js';
import {
	collection,
	query,
	orderBy,
	limit,
	startAfter,
	getDocs,
	type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { authStore } from '$lib/stores/auth.svelte.js';
import { safeGetDate } from '$lib/utils/dates.js';

export type AuditRow = {
	id: string;
	timestamp: unknown;
	admin: unknown;
	action: unknown;
	target: unknown;
	details: unknown;
};

export class AdminAuditEngine {
	PAGE_SIZE = 100;
	logs = $state<AuditRow[]>([]);
	loading = $state(false);
	loadErr = $state('');
	totalLoaded = $state(0);
	lastDoc = $state<QueryDocumentSnapshot | null>(null);
	hasMore = $state(false);
	actionFilter = $state('');
	searchQuery = $state('');

	loadSeq = 0;
	auditHydrated = false;

	get filteredLogs() {
		let rows = this.logs;
		const needle = this.searchQuery.trim().toLowerCase();
		if (needle) {
			rows = rows.filter((l) => {
				const blob = [l.action, l.admin, l.target, l.details]
					.map((x) => String(x ?? '').toLowerCase())
					.join(' ');
				return blob.includes(needle);
			});
		}
		const q = this.actionFilter.trim().toUpperCase();
		if (q) rows = rows.filter((l) => String(l.action || '').toUpperCase().includes(q));
		return rows;
	}

	fetchAuditPage = async (append: boolean, cursor: QueryDocumentSnapshot | null) => {
		const base = collection(db, 'security_audit');
		if (append && cursor) {
			try {
				return await getDocs(
					query(base, orderBy('createdAt', 'desc'), startAfter(cursor), limit(this.PAGE_SIZE)),
				);
			} catch {
				return getDocs(
					query(base, orderBy('timestamp', 'desc'), startAfter(cursor), limit(this.PAGE_SIZE)),
				);
			}
		}

		try {
			return await getDocs(query(base, orderBy('createdAt', 'desc'), limit(this.PAGE_SIZE)));
		} catch {
			return getDocs(query(base, orderBy('timestamp', 'desc'), limit(this.PAGE_SIZE)));
		}
	}

	loadLogs = async (append = false) => {
		const seq = ++this.loadSeq;
		this.loading = true;
		this.loadErr = '';
		try {
			const snap = await this.fetchAuditPage(append, append ? this.lastDoc : null);
			if (seq !== this.loadSeq) return;

			const rows: AuditRow[] = [];
			snap.forEach((d) => {
				rows.push({ id: d.id, ...(d.data() as Omit<AuditRow, 'id'>) });
			});
			if (append) {
				this.logs = [...this.logs, ...rows];
			} else {
				this.logs = rows;
			}
			this.totalLoaded = this.logs.length;
			this.lastDoc = snap.docs[snap.docs.length - 1] ?? null;
			this.hasMore = snap.size === this.PAGE_SIZE;
		} catch (e) {
			if (seq !== this.loadSeq) return;
			this.loadErr = e instanceof Error ? e.message : 'Could not load audit log.';
		} finally {
			if (seq === this.loadSeq) this.loading = false;
		}
	}

	actionSeverityClass = (action: unknown) => {
		const a = String(action || '').toUpperCase();
		if (a.includes('DELETE') || a.includes('REVOKE')) return 'al-badge--danger';
		if (a.includes('GRANT') || a.includes('ASSIGN') || a.includes('CREATE')) return 'al-badge--success';
		if (a.includes('EDIT') || a.includes('UPDATE')) return 'al-badge--warn';
		return 'al-badge--neutral';
	}

	rowTimestamp = (log: AuditRow) => {
		return safeGetDate(log.timestamp ?? log).toLocaleString();
	}

	subscribe() {
		$effect.root(() => {
			$effect(() => {
				if (!browser) return;
				if (authStore.isLoading || !authStore.isAuthenticated) return;
				const role = authStore.role ?? '';
				if (role !== 'super_admin' && role !== 'global_admin') return;
				if (this.auditHydrated) return;

				this.auditHydrated = true;
				let cancelled = false;
				void this.loadLogs().finally(() => {
					if (cancelled) this.loadSeq += 1;
				});

				return () => {
					cancelled = true;
					this.loadSeq += 1;
				};
			});
			return () => {};
		});
	}
}
