import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db, functions } from '$lib/firebase.js';
import { httpsCallable } from 'firebase/functions';


type LocalCandidateUser = { email: string; role: string; label: string; isMinor?: boolean };

export class NewMessageEngine {
	clubId: string;
	teamId: string;
	myEmail: string;
	myRole: string;
	onChannelCreated: (id: string) => void;

	candidates = $state<LocalCandidateUser[]>([]);
	loadErr = $state('');
	loading = $state(false);
	selected = $state(new Set<string>());
	search = $state('');
	groupName = $state('');
	creating = $state(false);
	createErr = $state('');

	constructor(
		clubId: string,
		teamId: string,
		myEmail: string,
		myRole: string,
		onChannelCreated: (id: string) => void
	) {
		this.clubId = clubId;
		this.teamId = teamId;
		this.myEmail = myEmail;
		this.myRole = myRole;
		this.onChannelCreated = onChannelCreated;
	}

	get myKey() {
		return (this.myEmail || '').toLowerCase();
	}

	get isStaffShadow() {
		return ['coach', 'director', 'super_admin', 'global_admin'].includes(this.myRole);
	}

	get filtered() {
		const q = this.search.trim().toLowerCase();
		if (!q) return this.candidates;
		return this.candidates.filter(
			(c) =>
				c.email.toLowerCase().includes(q) ||
				c.label.toLowerCase().includes(q) ||
				c.role.toLowerCase().includes(q)
		);
	}

	get selectedList() {
		const map = new Map(this.candidates.map((c) => [c.email, c]));
		return [...this.selected].map((e) => map.get(e)).filter(Boolean) as LocalCandidateUser[];
	}

	get plan() {
		const memberSet = new Set<string>();
		if (this.myKey) memberSet.add(this.myKey);
		for (const e of this.selected) memberSet.add(e.toLowerCase());
		const memberIds = [...memberSet].sort();

		let type = 'group';
		if (memberIds.length === 2) {
			const peer = memberIds.find((m) => m !== this.myKey) || '';
			const peerUser = this.candidates.find((c) => c.email === peer);
			if (peerUser?.role !== 'player') type = 'dm';
		}

		const defaultName =
			type === 'dm'
				? (() => {
						const peer = memberIds.find((m) => m !== this.myKey) || '';
						const peerUser = this.candidates.find((c) => c.email === peer);
						return peerUser?.label || peer || 'Direct message';
					})()
				: (() => {
						const gn = this.groupName.trim();
						if (gn) return gn.slice(0, 200);
						const others = memberIds.filter((m) => m !== this.myKey);
						const labels = others.map((m) => {
							const u = this.candidates.find((c) => c.email === m);
							return u?.label || m;
						});
						return labels.slice(0, 5).join(', ') || 'Group chat';
					})();

		return { memberIds, type, defaultName };
	}

	get showGroupName() {
		return this.plan.type === 'group';
	}

	async loadCandidates() {
		if (!this.clubId || !db) return;
		this.loading = true;
		this.loadErr = '';
		try {
			const byEmail = new Map<string, LocalCandidateUser>();
			const pushDoc = (d: any) => {
				const email = d.id.toLowerCase();
				if (!email || email === this.myKey) return;
				const data = d.data();
				const role = typeof data.role === 'string' ? data.role : 'player';
				const label =
					(typeof data.playerName === 'string' && data.playerName.trim()) ||
					(typeof data.displayName === 'string' && data.displayName.trim()) ||
					email.split('@')[0];
				const isMinor = data.isMinor === true;
				byEmail.set(email, { email, role, label, isMinor });
			};

			if (this.isStaffShadow) {
				if (!db) return;
				const uq = query(collection(db, 'users'), where('clubId', '==', this.clubId), limit(400));
				const snap = await getDocs(uq);
				snap.forEach(pushDoc);
			}

			if (this.teamId && this.isStaffShadow) {
				if (!db) return;
				const tq = query(collection(db, 'users'), where('teamId', '==', this.teamId), limit(400));
				const ts = await getDocs(tq);
				ts.forEach(pushDoc);
			}

			this.candidates = Array.from(byEmail.values()).sort((a, b) =>
				a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
			);
		} catch (e) {
			console.error('[NewMessageEngine] loadCandidates', e);
			this.loadErr = e instanceof Error ? e.message : 'Could not load people.';
			this.candidates = [];
		} finally {
			this.loading = false;
		}
	}

	toggle(email: string) {
		const c = this.candidates.find((x) => x.email === email);
		const next = new Set(this.selected);
		const k = email.toLowerCase();
		if (next.has(k)) next.delete(k);
		else next.add(k);
		this.selected = next;
	}

	removeChip(email: string) {
		const next = new Set(this.selected);
		next.delete(email.toLowerCase());
		this.selected = next;
	}

	reset() {
		this.search = '';
		this.groupName = '';
		this.createErr = '';
		this.selected = new Set();
	}

	async startChat(onClose: () => void) {
		if (!this.clubId || !this.teamId || this.creating) return;
		if (this.selected.size === 0) {
			this.createErr = 'Select at least one person.';
			return;
		}

		this.creating = true;
		this.createErr = '';

		try {
			const { memberIds, type, defaultName } = this.plan;
			const name = type === 'group' && this.groupName.trim() ? this.groupName.trim().slice(0, 200) : defaultName;

			const createCommsChannel = httpsCallable(functions, 'createCommsChannel');
			const res = await createCommsChannel({
				clubId: this.clubId,
				teamId: this.teamId,
				name,
				type,
				memberIds,
			});

			const data = res.data as { id: string };
			if (data && data.id) {
				this.onChannelCreated(data.id);
				onClose();
			} else {
				throw new Error('Failed to create channel.');
			}
		} catch (e) {
			console.error('[NewMessageEngine] create', e);
			this.createErr = e instanceof Error ? e.message : String(e);
		} finally {
			this.creating = false;
		}
	}
}
