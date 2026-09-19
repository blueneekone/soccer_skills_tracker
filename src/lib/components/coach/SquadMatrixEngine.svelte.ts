import { untrack } from 'svelte';
import { browser } from '$app/environment';
import { authStore } from '$lib/stores/auth.svelte.js';
import { db, functions } from '$lib/firebase.js';
import { httpsCallable } from 'firebase/functions';
import {
	addDoc,
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	onSnapshot,
	query,
	where,
	orderBy,
	serverTimestamp,
} from 'firebase/firestore';
import Swal from 'sweetalert2';
import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
import { buildCoachRosterDisplayNames } from '$lib/coach/rosterDisplayDedupe.js';

export interface ReadinessPlayer {
	id: string;
	rosterKey: string;
	name: string;
	number: string;
	position: string;
	stamina: number;
	hr: number;
	vpc_approved: boolean;
	status: 'READY' | 'OFFLINE' | 'INJURY RISK';
}

export class SquadMatrixEngine {
	teamId = $state('');
	teams = $state<any[]>([]);
	showLiveTelemetry = $state(true);
	selectedPlayerId = $state('ALL');
	onSelectPlayer = $state<((statsId: string, name: string) => void) | undefined>(undefined);

	activeMatchId = $state('');
	matchSessionTeamId = $state('');
	quickModalPlayer = $state<any | null>(null);

	liveEvents = $state<Array<Record<string, unknown> & { id: string }>>([]);
	liveEventsError = $state('');

	playerStats = $state<Record<string, Record<string, unknown>>>({});
	players = $state<string[]>([]);
	jerseys = $state<Record<string, string>>({});
	nameToEmail = $state<Record<string, string>>({});
	linkedPlayers = $state<Set<string>>(new Set());
	loading = $state(false);
	rosterLoadGen = 0;
	signalsLoadGen = 0;

	feedback = $state<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
	teamInviteCode = $state('');

	vpcItems = $state<Array<Record<string, unknown> & { id: string }>>([]);
	vpcLoading = $state(true);
	trialRows = $state<Array<Record<string, unknown> & { id: string }>>([]);
	evalRows = $state<Array<Record<string, unknown> & { id: string }>>([]);
	complianceByPlayer = $state<Record<string, 'compliant' | 'unverified'>>({});

	currentTeam = $derived(this.teams.find((t) => t.id === this.teamId));

	vpcPendingNameKeys = $derived.by(() => {
		const keys = new Set<string>();
		for (const v of this.vpcItems) {
			const n = typeof v.playerName === 'string' ? v.playerName.trim().toLowerCase() : '';
			if (n) keys.add(n);
		}
		return keys;
	});

	readinessRoster = $derived.by(() => {
		const pending = this.vpcPendingNameKeys;
		return this.players.map((name) => {
			const sid = this.resolveStatsId(name, this.playerStats);
			const stats = this.playerStats[sid] ?? {};
			const rowLabel =
				typeof stats.playerName === 'string' && stats.playerName.trim()
					? stats.playerName.trim()
					: name;
			const isLinked = this.linkedPlayers.has(name) || this.linkedPlayers.has(rowLabel);
			const hasVpcPending = pending.has(name.toLowerCase()) || pending.has(rowLabel.toLowerCase());
			const vpcApproved = isLinked && !hasVpcPending;

			let status: 'READY' | 'OFFLINE' | 'INJURY RISK' = 'OFFLINE';
			if (isLinked) {
				const lookupSt = typeof stats.status === 'string' ? stats.status.trim().toUpperCase() : '';
				status = lookupSt === 'INJURED' || lookupSt === 'INJURY RISK' ? 'INJURY RISK' : 'READY';
			}

			const jersey = this.jerseys[name];
			const number = jersey != null && String(jersey).trim() ? String(jersey).trim() : '—';
			const position =
				typeof stats.position === 'string' && stats.position.trim()
					? stats.position.trim().toUpperCase().slice(0, 4)
					: '—';

			return { id: sid, rosterKey: name, name: rowLabel, number, position, stamina: isLinked ? 75 : 0, hr: 0, vpc_approved: vpcApproved, status };
		});
	});

	rmReady = $derived(this.readinessRoster.filter((p) => p.status === 'READY').length);
	rmConsent = $derived(this.readinessRoster.filter((p) => !p.vpc_approved).length);
	rmOffline = $derived(this.readinessRoster.filter((p) => p.status === 'OFFLINE').length);
	rmAtRisk = $derived(this.readinessRoster.filter((p) => p.status === 'INJURY RISK').length);
	squadUptimePct = $derived(
		this.readinessRoster.length === 0 ? 0 : Math.round((this.rmReady / this.readinessRoster.length) * 100)
	);
	readinessMatrixLabel = $derived(
		typeof this.currentTeam?.name === 'string' && this.currentTeam.name.trim()
			? this.currentTeam.name.trim().toUpperCase()
			: 'SQUAD'
	);

	constructor(props: {
		teamId?: string;
		teams?: any[];
		showLiveTelemetry?: boolean;
		selectedPlayerId?: string;
		onSelectPlayer?: (statsId: string, name: string) => void;
	}) {
		if (props.teamId) this.teamId = props.teamId;
		if (props.teams) this.teams = props.teams;
		if (props.showLiveTelemetry !== undefined) this.showLiveTelemetry = props.showLiveTelemetry;
		if (props.selectedPlayerId) this.selectedPlayerId = props.selectedPlayerId;
		if (props.onSelectPlayer) this.onSelectPlayer = props.onSelectPlayer;

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
				this.activeMatchId =
					typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
						? crypto.randomUUID()
						: `m_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
			}
		});

		$effect(() => {
			if (authStore.isLoading || !authStore.isAuthenticated) return;
			const tid = this.teamId;
			const mid = this.activeMatchId;
			let unsub: (() => void) | undefined;
			untrack(() => {
				if (!browser || !tid || !mid || !db) {
					this.liveEvents = [];
					return;
				}
				const q = query(
					collection(db, 'teams', tid, 'telemetry_events'),
					where('matchId', '==', mid),
					orderBy('timestamp', 'desc'),
					limit(100)
				);
				unsub = onSnapshot(q, (snap) => {
					let evs: Array<Record<string, unknown> & { id: string }> = [];
					snap.forEach((d) => { evs = [...evs, { id: d.id, ...d.data() }]; });
					this.liveEvents = evs;
				});
			});
			return () => { if (unsub) unsub(); };
		});

		$effect(() => {
			if (authStore.isLoading || !authStore.isAuthenticated) return;
			const currentTeamId = this.teamId;
			untrack(() => {
				if (!currentTeamId) {
					this.loading = false;
					this.players = [];
					return;
				}
				void this.loadRoster(currentTeamId);
			});
		});

		$effect(() => {
			if (authStore.isLoading || !authStore.isAuthenticated) return;
			const currentTeamId = this.teamId;
			let unsub: (() => void) | undefined;
			untrack(() => {
				if (!browser || !currentTeamId || !db) {
					this.vpcItems = [];
					this.vpcLoading = false;
					return;
				}
				this.vpcLoading = true;
				const q = query(
					collection(db, 'trial_scores'),
					where('teamId', '==', currentTeamId),
					where('status', '==', 'pending_verification'),
					orderBy('submittedAt', 'desc')
				);
				unsub = onSnapshot(q, (s) => {
					let items: Array<Record<string, unknown> & { id: string }> = [];
					s.forEach((d) => { items = [...items, { id: d.id, ...d.data() }]; });
					this.vpcItems = items;
					this.vpcLoading = false;
				});
			});
			return () => { if (unsub) unsub(); };
		});
	}

	linkedDocIdForPlayerName(em: Record<string, string>, name: string) {
		if (em[name] != null) return em[name];
		if (typeof name === 'string') {
			const t = name.trim();
			if (t !== name && em[t] != null) return em[t];
		}
		return undefined;
	}

	async loadRoster(overrideTeamId?: string) {
		if (!db || !authStore.isAuthenticated) return;
		const tid = typeof overrideTeamId === 'string' && overrideTeamId ? overrideTeamId : this.teamId;
		if (!tid) {
			this.loading = false;
			return;
		}
		const myGen = ++this.rosterLoadGen;
		this.loading = true;
		try {
			const settled = await Promise.allSettled([
				getDocs(query(collection(db, 'player_stats'), where('teamId', '==', tid))),
				getDoc(doc(db, 'rosters', tid)),
				getDocs(query(collection(db, 'player_lookup'), where('teamId', '==', tid))),
				getDoc(doc(db, 'teams', tid)),
				getDocs(query(collection(db, 'users'), where('teamId', '==', tid))),
			]);

			let statsSnap = settled[0].status === 'fulfilled' ? settled[0].value : null;
			let rosterSnap = settled[1].status === 'fulfilled' ? settled[1].value : null;
			let linkSnap = settled[2].status === 'fulfilled' ? settled[2].value : null;
			let teamSnap = settled[3].status === 'fulfilled' ? settled[3].value : null;
			let usersSnap = settled[4].status === 'fulfilled' ? settled[4].value : null;

			if (teamSnap?.exists()) {
				const ic = teamSnap.data()?.inviteCode;
				this.teamInviteCode = typeof ic === 'string' && ic.trim() ? ic.trim() : '';
			} else {
				this.teamInviteCode = '';
			}

			this.playerStats = {};
			if (statsSnap) {
				statsSnap.forEach((d) => { this.playerStats[d.id] = d.data(); });
			}

			const rosterNames = Array.isArray(rosterSnap?.data()?.players) ? rosterSnap.data().players : [];
			this.jerseys =
				rosterSnap?.exists() && typeof rosterSnap.data()?.jerseys === 'object' && rosterSnap.data().jerseys
					? (rosterSnap.data().jerseys as Record<string, string>)
					: {};

			this.linkedPlayers = new Set();
			const em: Record<string, string> = {};
			if (linkSnap) {
				linkSnap.forEach((d) => {
					const data = d.data();
					if (typeof data.playerName === 'string' && data.playerName.trim()) {
						this.linkedPlayers.add(data.playerName);
						em[data.playerName.trim()] = d.id;
					}
				});
			}
			this.nameToEmail = em;

			const userDocs = usersSnap ? usersSnap.docs.map((d) => ({ id: d.id, data: d.data() })) : [];
			const nextPlayers = buildCoachRosterDisplayNames({
				userDocs,
				rosterNames,
				statsKeys: Object.keys(this.playerStats),
				statsByKey: this.playerStats,
				linkedNameToEmail: em,
			});
			this.players = nextPlayers;

			const nextCompliance: Record<string, 'compliant' | 'unverified'> = {};
			for (const name of nextPlayers) {
				const linkId = this.linkedDocIdForPlayerName(em, name);
				nextCompliance[name] = linkId != null ? 'compliant' : 'unverified';
			}
			this.complianceByPlayer = nextCompliance;
		} catch (e) {
			console.error('[SquadTelemetry] roster', e);
			this.feedback = { type: 'error', text: 'Roster load failed.' };
		} finally {
			if (myGen === this.rosterLoadGen) this.loading = false;
		}
	}

	resolveStatsId(name: string, ps: Record<string, Record<string, unknown>>) {
		if (ps[name]) return name;
		const id = Object.keys(ps).find((k) => ps[k]?.playerName === name);
		return id || name;
	}

	openDrawer(p: string) {
		const statsId = this.resolveStatsId(p, this.playerStats);
		const em = this.nameToEmail[p] || null;
		this.onSelectPlayer?.(statsId || p, p);
		enterprisePlayerDrawer.open(
			{
				id: `${this.teamId}_${p}`,
				displayName: p,
				teamId: this.teamId,
				teamLabel: this.currentTeam?.name || this.teamId,
				statsDocId: statsId,
				playerEmail: em,
				jersey: this.jerseys[p] != null && String(this.jerseys[p]).trim() ? String(this.jerseys[p]) : null,
				ageGroup: null,
				position: null,
				status: 'active',
				lastActiveLabel: '—',
				source: 'coach',
			},
			{
				editProfile: () => void this.editPlayerProfile(p),
				removeFromRoster: () => void this.initiateDropRequest(p),
			}
		);
	}

	async editPlayerProfile(name: string) {
		if (!db || !authStore.isAuthenticated || !this.teamId || !name) return;
		const curJersey = this.jerseys[name] != null && String(this.jerseys[name]).trim() ? String(this.jerseys[name]).trim() : '';
		const normalizedName = name.replace(/\s+/g, ' ');
		const result = await Swal.fire({
			title: 'Update jersey number',
			input: 'text',
			inputLabel: 'Jersey number',
			inputValue: curJersey,
			showCancelButton: true,
			confirmButtonText: 'Save',
			cancelButtonText: 'Cancel',
			background: '#05050a',
			color: '#fafafa',
		});
		if (!result.isConfirmed) return;
		enterprisePlayerDrawer.close();
		try {
			const secureUpdateJersey = httpsCallable(functions, 'secureUpdateJersey');
			await secureUpdateJersey({
				teamId: this.teamId,
				playerName: normalizedName,
				jersey: String(result.value ?? '').trim(),
			});
			await this.loadRoster();
			this.feedback = { type: 'success', text: 'Jersey updated.' };
		} catch (err: any) {
			this.feedback = { type: 'error', text: err?.message || 'Update failed.' };
		}
	}

	async initiateDropRequest(name: string) {
		if (!db || !authStore.isAuthenticated) return;
		enterprisePlayerDrawer.close();
		const result = await Swal.fire({
			title: 'Official Drop Request',
			html: '<p style="text-align:left;color:rgba(250,250,250,0.88);margin:0 0 14px;font-size:0.9rem;">Dropping a player requires Director approval. Provide your required drop note below.</p>',
			input: 'textarea',
			showCancelButton: true,
			confirmButtonText: 'Submit request',
			background: '#05050a',
			color: '#fafafa',
		});
		if (!result.isConfirmed || result.value == null) return;
		const reason = String(result.value).trim();
		try {
			await addDoc(collection(db, 'roster_drop_requests'), {
				teamId: this.teamId,
				playerName: name,
				reason,
				status: 'pending',
				requestedAt: serverTimestamp(),
			});
			await Swal.fire({ icon: 'success', title: 'Drop request sent to Director.', background: '#05050a', color: '#fafafa' });
		} catch {
			this.feedback = { type: 'error', text: 'Could not submit drop request.' };
		}
	}

	handleCardClick(p: { name: string; rosterKey: string }) {
		this.quickModalPlayer = p;
	}

	isPlayerSelected(p: { name: string; rosterKey: string }) {
		if (!this.selectedPlayerId || this.selectedPlayerId === 'ALL') return false;
		const target = this.selectedPlayerId.trim().toLowerCase();
		const pName = p.name.toLowerCase();
		const rKey = p.rosterKey.toLowerCase();
		return target === pName || target === rKey || target.includes(pName) || pName.includes(target);
	}
}
