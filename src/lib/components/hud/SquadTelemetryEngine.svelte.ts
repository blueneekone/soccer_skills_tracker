import { untrack } from 'svelte';
import { browser } from '$app/environment';
import { db, functions } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, where, orderBy, updateDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
import { linkedDocIdForPlayerName, usersCollectionKey, isFirestorePermissionError, restrictedUserSnapshotPlaceholder } from '$lib/utils/squadTelemetryUtils.js';

export const DISPATCH_INTEL = {
	title: 'DISPATCH PROTOCOL',
	instructions: [
		'1. Generate your 6-character code.',
		'2. Text this code to your team parents.',
		'3. Parents create an account, sign the COPPA waiver, and enter this code to instantly drop their player onto your roster.',
	],
};

export class SquadTelemetryEngine {
	teamId = $state('');
	teams = $state<any[]>([]);
	showLiveTelemetry = $state(true);

	activeMatchId = $state('');
	matchSessionTeamId = $state('');
	liveEvents = $state<any[]>([]);
	liveEventsError = $state('');

	playerStats = $state<any>({});
	players = $state<string[]>([]);
	jerseys = $state<any>({});
	nameToEmail = $state<any>({});
	linkedPlayers = $state(new Set<string>());
	loading = $state(false);
	addSaving = $state(false);
	removeBusy = $state(false);
	rosterLoadGen = 0;
	signalsLoadGen = 0;
	removingName = $state<string | null>(null);
	feedback = $state<any>(null);
	teamInviteCode = $state('');
	inviteBusy = $state(false);
	addName = $state('');
	addEmail = $state('');
	addJersey = $state('');
	vpcItems = $state<any[]>([]);
	vpcLoading = $state(true);
	vpcErr = $state('');
	busyVpcId = $state('');
	trialRows = $state<any[]>([]);
	evalRows = $state<any[]>([]);
	complianceByPlayer = $state<any>({});
	unsubLiveEvents: any = null;

	constructor(initTeamId: string, initTeams: any[]) {
		this.teamId = initTeamId;
		this.teams = initTeams;

		$effect.root(() => {
			$effect(() => {
				if (!browser) return;
				const tid = this.teamId;
				if (!tid) {
					this.activeMatchId = '';
					this.matchSessionTeamId = '';
					return;
				}
				if (tid !== this.matchSessionTeamId) {
					this.matchSessionTeamId = tid;
					this.activeMatchId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `m_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
				}
			});

			$effect(() => {
				const tid = this.teamId;
				const mid = this.activeMatchId;
				untrack(() => {
					if (!browser || !tid || !mid) {
						this.liveEvents = [];
						this.liveEventsError = '';
						return;
					}
					if (this.unsubLiveEvents) {
						this.unsubLiveEvents();
						this.unsubLiveEvents = null;
					}
					if (!db || !authStore.isAuthenticated) return;
					this.liveEventsError = '';
					const q = query(collection(db, 'teams', tid, 'telemetry_events'), where('matchId', '==', mid), orderBy('timestamp', 'desc'), limit(100));
					this.unsubLiveEvents = onSnapshot(q, (snap) => {
						this.liveEvents = [];
						snap.forEach((d) => { this.liveEvents = [...this.liveEvents, { id: d.id, ...d.data() }]; });
					}, (e) => {
						console.error('[SquadTelemetry] telemetry_events', e);
						this.liveEventsError = 'Live feed unavailable — deploy Firestore index for telemetry_events (matchId + timestamp).';
					});
				});
				return () => {
					if (this.unsubLiveEvents) {
						this.unsubLiveEvents();
						this.unsubLiveEvents = null;
					}
				};
			});

			$effect(() => {
				const tid = this.teamId;
				untrack(() => {
					if (browser && tid) {
						this.fetchData(tid);
						this.fetchVpcItems(tid);
						this.fetchSignals(tid);
					}
				});
			});
		});
	}

	setTeamId(id: string) { this.teamId = id; }
	setTeams(t: any[]) { this.teams = t; }

	async fetchVpcItems(tid: string) {
		if (!db || !authStore.isAuthenticated) return;
		this.vpcLoading = true;
		this.vpcErr = '';
		try {
			const q = query(collection(db, 'team_vpc_items'), where('teamId', '==', tid));
			const snap = await getDocs(q);
			const items: any[] = [];
			snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
			this.vpcItems = items;
		} catch (e) {
			console.error('VPC err', e);
			this.vpcErr = 'Could not load compliance items.';
		} finally {
			this.vpcLoading = false;
		}
	}

	async vpcAct(id: string, d: string) {
		if (!id || this.busyVpcId) return;
		this.busyVpcId = id;
		try {
			const verifyVideoTrial = httpsCallable(functions, 'verifyVideoTrial');
			await verifyVideoTrial({ scoreId: id, decision: d });
		} catch (e) {
			console.error(e);
		} finally {
			this.busyVpcId = '';
		}
	}

	async toggleVpcItem(id: string, currentVal: boolean) {
		if (!db || !authStore.isAuthenticated) return;
		if (this.busyVpcId) return;
		this.busyVpcId = id;
		try {
			const ref = doc(db, 'team_vpc_items', id);
			await updateDoc(ref, { isResolved: !currentVal });
			const ix = this.vpcItems.findIndex((x) => x.id === id);
			if (ix >= 0) {
				const arr = [...this.vpcItems];
				arr[ix] = { ...arr[ix], isResolved: !currentVal };
				this.vpcItems = arr;
			}
		} catch (e) {
			console.error(e);
			Swal.fire('VPC Error', 'Unable to update status', 'error');
		} finally {
			this.busyVpcId = '';
		}
	}

	async fetchSignals(tid: string) {
		if (!db || !authStore.isAuthenticated) return;
		const gen = ++this.signalsLoadGen;
		try {
			const tSnap = await getDocs(query(collection(db, 'trials'), where('teamId', '==', tid)));
			const eSnap = await getDocs(query(collection(db, 'evaluations'), where('teamId', '==', tid)));
			if (gen !== this.signalsLoadGen) return;

			const tRows: any[] = [];
			tSnap.forEach((d) => tRows.push({ id: d.id, ...d.data() }));
			tRows.sort((a, b) => {
				const msA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
				const msB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
				return msB - msA;
			});

			const eRows: any[] = [];
			eSnap.forEach((d) => eRows.push({ id: d.id, ...d.data() }));
			eRows.sort((a, b) => {
				const msA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
				const msB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
				return msB - msA;
			});

			this.trialRows = tRows;
			this.evalRows = eRows;
		} catch (e) {
			console.error('Signals error', e);
		}
	}

	async fetchData(tid: string) {
		if (!db || !authStore.isAuthenticated) return;
		const gen = ++this.rosterLoadGen;
		this.loading = true;
		this.feedback = null;
		this.teamInviteCode = '';
		this.complianceByPlayer = {};
		this.linkedPlayers = new Set();
		this.playerStats = {};
		try {
			const tr = doc(db, 'teams', tid);
			const ts = await getDoc(tr);
			if (gen !== this.rosterLoadGen) return;

			if (!ts.exists()) {
				this.players = [];
				this.jerseys = {};
				this.nameToEmail = {};
				this.loading = false;
				return;
			}
			const tdat = ts.data() as any;
			this.players = tdat.players || [];
			this.jerseys = tdat.jerseys || {};
			this.nameToEmail = tdat.nameToEmail || {};
			this.teamInviteCode = tdat.inviteCode || '';

			if (this.players.length === 0) {
				this.loading = false;
				return;
			}

			const statsObj: any = {};
			const compliance: any = {};
			const links = new Set<string>();

			for (const p of this.players) {
				const emKey = linkedDocIdForPlayerName(this.nameToEmail, p);
				if (!emKey) {
					statsObj[p] = { playerName: p, status: 'NO_INTEL', playerLevel: 0, playerXp: 0 };
					compliance[p] = 'unverified';
					continue;
				}

				links.add(p);
				const uKey = usersCollectionKey(emKey);
				let uDoc: any;
				try {
					uDoc = await getDoc(doc(db, 'users', uKey));
				} catch (ue) {
					if (isFirestorePermissionError(ue)) {
						uDoc = restrictedUserSnapshotPlaceholder(uKey);
					} else {
						console.error('Error fetching linked user:', ue);
						statsObj[p] = { playerName: p, status: 'NO_INTEL', playerLevel: 0, playerXp: 0 };
						compliance[p] = 'unverified';
						continue;
					}
				}

				if (gen !== this.rosterLoadGen) return;

				if (uDoc.exists()) {
					statsObj[p] = uDoc.data();
					const copp = statsObj[p].coppaCompliance || '';
					compliance[p] = copp === 'exempt' || copp === 'verified' ? 'compliant' : 'unverified';
				} else {
					statsObj[p] = { playerName: p, status: 'LINK_ORPHAN', playerLevel: 0, playerXp: 0 };
					compliance[p] = 'unverified';
				}
			}

			if (gen !== this.rosterLoadGen) return;
			this.playerStats = statsObj;
			this.complianceByPlayer = compliance;
			this.linkedPlayers = links;
		} catch (e) {
			console.error(e);
			this.feedback = { type: 'error', text: 'Error extracting telemetry.' };
		} finally {
			if (gen === this.rosterLoadGen) this.loading = false;
		}
	}

	async handleAdd() {
		if (!this.addName.trim()) return;
		const n = this.addName.trim();
		const e = this.addEmail.trim();
		const j = this.addJersey.trim();
		this.addSaving = true;
		this.feedback = null;
		try {
			const secureAddPlayer = httpsCallable(functions, 'secureAddPlayer');
			await secureAddPlayer({ teamId: this.teamId, playerName: n, email: e, jersey: j });
			this.addName = '';
			this.addEmail = '';
			this.addJersey = '';
			this.feedback = { type: 'success', text: `Operative ${n} injected.` };
			this.fetchData(this.teamId);
		} catch (err: any) {
			console.error(err);
			this.feedback = { type: 'error', text: err.message || 'Injection failed.' };
		} finally {
			this.addSaving = false;
		}
	}

	async handleRemove(pname: string) {
		this.removingName = pname;
		this.removeBusy = true;
		this.feedback = null;
		try {
			const secureRemovePlayer = httpsCallable(functions, 'secureRemovePlayer');
			await secureRemovePlayer({ teamId: this.teamId, playerName: pname });
			this.feedback = { type: 'success', text: `Operative ${pname} extracted.` };
			this.fetchData(this.teamId);
		} catch (err: any) {
			console.error(err);
			this.feedback = { type: 'error', text: err.message || 'Extraction failed.' };
		} finally {
			this.removingName = null;
			this.removeBusy = false;
		}
	}

	async saveJersey(pname: string, newJ: string) {
		try {
			const secureUpdateJersey = httpsCallable(functions, 'secureUpdateJersey');
			await secureUpdateJersey({ teamId: this.teamId, playerName: pname, jersey: newJ });
		} catch (err) {
			console.error(err);
			Swal.fire('Error', 'Callsign update failed.', 'error');
			if (this.jerseys[pname] !== newJ) {
				const old = this.jerseys[pname] || '';
				this.jerseys = { ...this.jerseys, [pname]: old };
			}
		}
	}

	async generateInviteCode() {
		this.inviteBusy = true;
		this.feedback = null;
		try {
			const genTeamInvite = httpsCallable(functions, 'genTeamInvite');
			const res = await genTeamInvite({ teamId: this.teamId });
			this.teamInviteCode = (res.data as any).code;
			this.feedback = { type: 'success', text: 'Dispatch code synthesized.' };
		} catch (err: any) {
			console.error(err);
			this.feedback = { type: 'error', text: err.message || 'Dispatch generation failed.' };
		} finally {
			this.inviteBusy = false;
		}
	}

	async fireApproval(docId: string, type: string) {
		try {
			const verifyVideoTrial = httpsCallable(functions, 'verifyVideoTrial');
			await verifyVideoTrial({ trialId: docId });
			Swal.fire('Verified', 'Trial log accepted into telemetry', 'success');
			this.fetchSignals(this.teamId);
		} catch (err) {
			console.error(err);
			Swal.fire('Error', 'Verification locked', 'error');
		}
	}

	openDrawer(pname: string) {
		const emKey = linkedDocIdForPlayerName(this.nameToEmail, pname);
		if (emKey) {
			const uKey = usersCollectionKey(emKey);
			enterprisePlayerDrawer.openDrawer(uKey);
		} else {
			Swal.fire({
				title: 'GHOST OPERATIVE',
				text: `${pname} is unlinked. Need secure dispatch.`,
				icon: 'info',
				background: '#0f172a',
				color: '#e2e8f0',
				confirmButtonColor: '#3b82f6',
			});
		}
	}

	resolveStatsId(name: string, ps: any) {
		if (!ps) ps = this.playerStats;
		if (ps[name]) return name;
		const id = Object.keys(ps).find((k) => (ps[k]?.playerName) === name);
		return id || name;
	}

	get currentTeam() { return this.teams.find((t) => t.id === this.teamId); }
	get signalCount() { return this.vpcItems.length + this.trialRows.length; }

	get vpcPendingNameKeys() {
		const keys = new Set();
		for (const x of this.vpcItems) {
			if (x.playerName) keys.add(String(x.playerName).toLowerCase().trim());
		}
		return keys;
	}

	get readinessRoster() {
		return this.players.map((p) => {
			let statObj = this.playerStats[p] || {};
			if (statObj.playerName !== p && this.playerStats[this.resolveStatsId(p, this.playerStats)]) {
				statObj = this.playerStats[this.resolveStatsId(p, this.playerStats)] || {};
			}

			let l = Number(statObj.playerLevel) || 1;
			if (l < 1) l = 1;
			const pNameLower = p.toLowerCase().trim();
			const hasVpc = this.vpcPendingNameKeys.has(pNameLower);

			let cState = this.complianceByPlayer[p] || 'unverified';
			let s = 'READY';
			let isOffline = false;

			if (!this.linkedPlayers.has(p) && !this.linkedPlayers.has(statObj.playerName)) {
				s = 'OFFLINE';
				isOffline = true;
			} else if (cState === 'unverified') {
				s = 'CONSENT PENDING';
			}

			return {
				id: p,
				name: p,
				level: l,
				stamina: 100, // mock
				status: s,
				vpc_approved: cState === 'compliant',
				vpc_pending: hasVpc,
				offline: isOffline,
				injured: false, // mock
				rosterKey: p,
				position: statObj.position || 'OP',
				number: this.jerseys[p] || '0',
			};
		});
	}

	get rmReady() { return this.readinessRoster.filter((p) => p.status === 'READY').length; }
	get rmConsent() { return this.readinessRoster.filter((p) => !p.vpc_approved).length; }
	get rmOffline() { return this.readinessRoster.filter((p) => p.status === 'OFFLINE').length; }
	get rmAtRisk() { return this.readinessRoster.filter((p) => p.status === 'INJURY RISK').length; }

	get squadUptimePct() {
		if (this.readinessRoster.length === 0) return 0;
		return Math.round((this.rmReady / this.readinessRoster.length) * 100);
	}

	get readinessMatrixLabel() {
		if (this.squadUptimePct >= 80) return 'OPERATIONAL';
		if (this.squadUptimePct >= 50) return 'DEGRADED';
		return 'CRITICAL';
	}
}

export const displayNamesCache = (() => { return {}; });
