
import { browser } from '$app/environment';
import {
	collection,
	query,
	where,
	orderBy,
	limit,
	startAfter,
	getDocs,
	doc,
	setDoc,
	deleteDoc,
	getDoc,
	addDoc,
	serverTimestamp,
	type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import Swal from 'sweetalert2';
import { tierAccent, tierBg, eligColor, buildSparkline } from '$lib/utils/recruiterPortalUtils.js';
import { untrack } from 'svelte';

export class RecruiterPortalEngine {
	feedLoading = $state(true);
	feedItems = $state<any[]>([]);
	feedError = $state('');
	lastVisible = $state<DocumentSnapshot | null>(null);
	hasMore = $state(true);

	filterPos = $state('');
	filterTier = $state('');
	filterGpa = $state<number | null>(null);
	filterVan = $state<number | null>(null);

	watchlistLoading = $state(true);
	watchlist = $state<any[]>([]);
	watchlistError = $state('');

	detailOpen = $state(false);
	detailLoading = $state(false);
	detailEmail = $state<string | null>(null);
	detailPlayer = $state<any>(null);
	snapshots = $state<any[]>([]);
	snapshotsLoading = $state(false);

	handshakeStatus = $state<'none' | 'pending' | 'approved' | 'rejected'>('none');
	handshakeBusy = $state(false);
	
	
	activeTab = $state<'feed' | 'watchlist'>('feed');
	searchQuery = $state('');

	get filteredPlayers() {
		let res = this.feedItems;
		if (this.searchQuery) {
			const q = this.searchQuery.toLowerCase();
			res = res.filter((p) => String(p.name || '').toLowerCase().includes(q));
		}
		return res;
	}

	get filteredWatchlist() {
		return this.watchlist;
	}

	constructor() {
		$effect.root(() => {
			$effect(() => {
				untrack(async () => {
					await this.loadWatchlist();
					await this.loadFeed(true);
				});
			});
		});
	}

	async loadFeed(reset: boolean = false): Promise<void> {
		if (!db || !authStore.isAuthenticated) return;
		if (reset) {
			this.feedItems = [];
			this.lastVisible = null;
			this.hasMore = true;
			this.feedLoading = true;
		} else {
			if (!this.hasMore || this.feedLoading) return;
			this.feedLoading = true;
		}

		try {
			const colRef = collection(db, 'users');
			let constraints: any[] = [where('role', '==', 'player')];

			if (this.filterPos) constraints.push(where('primaryPosition', '==', this.filterPos));
			if (this.filterTier) constraints.push(where('playerTier', '==', this.filterTier));
			if (this.filterGpa) constraints.push(where('academicGpa', '>=', this.filterGpa));
			if (this.filterVan) constraints.push(where('playerXp', '>=', this.filterVan));

			constraints.push(orderBy('playerXp', 'desc'));
			constraints.push(limit(15));
			if (this.lastVisible) constraints.push(startAfter(this.lastVisible));

			const q = query(colRef, ...constraints);
			const snap = await getDocs(q);

			if (snap.empty) {
				this.hasMore = false;
			} else {
				this.lastVisible = snap.docs[snap.docs.length - 1];
				const newRows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
				this.feedItems = reset ? newRows : [...this.feedItems, ...newRows];
				if (snap.docs.length < 15) this.hasMore = false;
			}
		} catch (err) {
			console.error('Load Feed error:', err);
			this.feedError = 'Nexus sync failed. Ensure indices are deployed.';
		} finally {
			this.feedLoading = false;
		}
	}

	async loadWatchlist(): Promise<void> {
		if (!db || !authStore.isAuthenticated) return;
		const myEm = authStore.user?.email;
		if (!myEm) return;

		try {
			const snap = await getDocs(
				query(
					collection(db, 'recruiter_watchlist', myEm, 'bookmarks'),
					orderBy('bookmarkedAt', 'desc')
				)
			);
			this.watchlist = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
		} catch (err) {
			console.error('Watchlist load error:', err);
		} finally {
			this.watchlistLoading = false;
		}
	}

	async toggleWatchlist(player: any): Promise<void> {
		const emailId = player.id;
		if (!db || !authStore.isAuthenticated) return;
		const myEm = authStore.user?.email;
		if (!myEm) return;

		const ref = doc(db, 'recruiter_watchlist', myEm, 'bookmarks', emailId);
		const onList = this.watchlist.some(x => x.id === emailId);
		try {
			if (onList) {
				await deleteDoc(ref);
				this.watchlist = this.watchlist.filter((e) => e.id !== emailId);
			} else {
				await setDoc(ref, { bookmarkedAt: serverTimestamp() });
				this.watchlist = [player, ...this.watchlist];
			}
		} catch (err) {
			console.error('Toggle error:', err);
		}
	}

	async openDetail(row: any): Promise<void> {
		this.detailOpen = true;
		this.detailLoading = true;
		this.detailEmail = row.id;
		this.detailPlayer = row;
		this.snapshots = [];
		this.handshakeStatus = 'none';

		try {
			await this.loadSnapshots(row.id);
			await this.checkHandshake(row.id);
		} finally {
			this.detailLoading = false;
		}
	}

	
	handleKeydown = (ev: KeyboardEvent): void => {
		if (ev.key === 'Escape' && this.detailOpen) this.closeDetail();
	}

	closeDetail(): void {
		this.detailOpen = false;
		this.detailEmail = null;
		this.detailPlayer = null;
		this.snapshots = [];
		this.handshakeStatus = 'none';
	}

	async loadSnapshots(emailId: string): Promise<void> {
		if (!db || !authStore.isAuthenticated) return;
		this.snapshotsLoading = true;
		try {
			const q = query(
				collection(db, 'stat_history', emailId, 'snapshots'),
				orderBy('timestamp', 'asc'),
				limit(12)
			);
			const snap = await getDocs(q);
			this.snapshots = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
		} catch (err) {
			console.error('Snapshots fetch error:', err);
		} finally {
			this.snapshotsLoading = false;
		}
	}

	async checkHandshake(targetEmail: string): Promise<void> {
		if (!db || !authStore.isAuthenticated) return;
		const myEm = authStore.user?.email;
		if (!myEm) return;

		try {
			const q = query(
				collection(db, 'recruiter_handshakes'),
				where('recruiterEmail', '==', myEm),
				where('targetEmail', '==', targetEmail)
			);
			const snap = await getDocs(q);
			if (!snap.empty) {
				this.handshakeStatus = snap.docs[0].data().status || 'pending';
			} else {
				this.handshakeStatus = 'none';
			}
		} catch (err) {
			console.error('Handshake fetch error:', err);
		}
	}

	async requestHandshake(): Promise<void> {
		if (!db || !authStore.isAuthenticated || !this.detailEmail) return;
		const myEm = authStore.user?.email;
		if (!myEm) {
			Swal.fire('Auth Error', 'You must be logged in.', 'error');
			return;
		}
		this.handshakeBusy = true;
		try {
			await addDoc(collection(db, 'recruiter_handshakes'), {
				recruiterEmail: myEm,
				targetEmail: this.detailEmail,
				status: 'pending',
				requestedAt: serverTimestamp(),
			});
			this.handshakeStatus = 'pending';
			Swal.fire('Handshake Sent', 'Awaiting clearance from Parent / Director.', 'success');
		} catch (err) {
			console.error('Handshake send error:', err);
			Swal.fire('Error', 'Failed to request PII handshake.', 'error');
		} finally {
			this.handshakeBusy = false;
		}
	}

	getStatSeries(key: string): number[] {
		return this.snapshots.map((s) => {
			const v = s.stats?.[key];
			return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
		});
	}
}
