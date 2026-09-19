import { browser } from '$app/environment';
import { db, functions } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import { TIER_DEFINITIONS } from '$lib/states/ArmoryEngine.svelte';
import { httpsCallable } from 'firebase/functions';
import {
	addDoc,
	collection,
	onSnapshot,
	query,
	serverTimestamp,
	where,
} from 'firebase/firestore';

export const DRILL_CATALOG = [
	{ id: 'sprint-30m', label: '30M SPRINT', statKey: 'PAC' },
	{ id: 'accel-test', label: 'ACCELERATION TEST', statKey: 'ACC' },
	{ id: 'shuttle-5-10-5', label: '5-10-5 SHUTTLE', statKey: 'AGI' },
	{ id: 'stamina-protocol', label: 'STAMINA PROTOCOL', statKey: 'STM' },
	{ id: 'broad-jump', label: 'STANDING BROAD JUMP', statKey: 'POW' },
	{ id: 'combine-composite', label: 'COMBINE COMPOSITE', statKey: 'VAN' },
];

export interface RosterPlayer {
	id: string;
	playerName?: string;
	position?: string;
	role?: string;
	teamId?: string;
	email?: string;
	lastActivityDate?: string | { toDate: () => Date };
	armory?: {
		totalXP?: number;
		stats?: { PAC?: string; ACC?: string; AGI?: string; STM?: string; POW?: string; VAN?: string };
	};
	_removing?: boolean;
}

export class CommandCenterEngine {
	teamId = $state<string | undefined>(undefined);
	roster = $state<RosterPlayer[]>([]);
	rosterLoading = $state(true);
	rosterError = $state<string | null>(null);

	selectedDrillId = $state('');
	targetMode = $state<'all' | 'position' | 'specific'>('all');
	targetPosition = $state('');
	selectedPlayerIds = $state<string[]>([]);
	missionDeadline = $state('');
	deployState = $state<'idle' | 'deploying' | 'success' | 'error'>('idle');

	confirmRemoveId = $state<string | null>(null);
	guardianByEmail = $state<Record<string, any>>({});

	positions = $derived(
		[...new Set(this.roster.map((p) => p.position || '').filter(Boolean))].sort()
	);

	missionTargetIds = $derived.by(() => {
		if (this.targetMode === 'all') return this.roster.map((p) => p.id);
		if (this.targetMode === 'position') {
			return this.roster
				.filter((p) => (p.position ?? '') === this.targetPosition)
				.map((p) => p.id);
		}
		return this.selectedPlayerIds;
	});

	canDeploy = $derived(
		this.selectedDrillId !== '' &&
			this.missionDeadline !== '' &&
			this.missionTargetIds.length > 0 &&
			this.deployState === 'idle'
	);

	constructor(teamId?: string) {
		this.teamId = teamId;

		$effect(() => {
			if (authStore.isLoading || !authStore.isAuthenticated) return;
			if (!browser) return;
			if (!db) return;
			const emails = this.roster
				.map((p) => (typeof p.email === 'string' && p.email ? p.email : p.id))
				.filter(Boolean);
			if (emails.length === 0) {
				this.guardianByEmail = {};
				return;
			}
			let cancelled = false;
			void (async () => {
				const { fetchGuardiansFromPlayerLookup } = await import(
					'$lib/household/fetchPlayerLookupGuardians.js'
				);
				const map = await fetchGuardiansFromPlayerLookup(db, emails);
				if (!cancelled) {
					this.guardianByEmail = Object.fromEntries(map);
				}
			})();
			return () => {
				cancelled = true;
			};
		});

		$effect(() => {
			if (authStore.isLoading || !authStore.isAuthenticated) return;
			if (!browser) return;
			if (!db) return;

			this.rosterLoading = true;
			this.rosterError = null;

			let constraints = [where('role', '==', 'player')];
			if (this.teamId) constraints = [...constraints, where('teamId', '==', this.teamId)];

			const q = query(collection(db, 'users'), ...constraints);

			const unsub = onSnapshot(
				q,
				(snap) => {
					this.roster = snap.docs.map((d) => ({
						id: d.id,
						...(d.data() as RosterPlayer),
					}));
					this.rosterLoading = false;
				},
				(err) => {
					console.warn('[CommandCenter] Roster listener error:', err);
					this.rosterError = err.message ?? 'Unknown Firestore error';
					this.rosterLoading = false;
				},
			);

			return unsub;
		});

		$effect(() => {
			if (this.deployState === 'idle') return;
			const t = setTimeout(() => {
				this.deployState = 'idle';
			}, 3000);
			return () => clearTimeout(t);
		});
	}

	guardianLine(player: RosterPlayer) {
		const em = (typeof player.email === 'string' && player.email ? player.email : player.id).toLowerCase();
		const meta = this.guardianByEmail[em];
		if (!meta || meta.parentEmails.length === 0) return 'Unlinked';
		return meta.parentEmails.join(', ');
	}

	vpcLine(player: RosterPlayer) {
		const em = (typeof player.email === 'string' && player.email ? player.email : player.id).toLowerCase();
		const meta = this.guardianByEmail[em];
		const s = meta?.vpcStatus || '';
		if (s === 'verified') return 'Verified';
		if (s === 'pending_parent' || s === 'pending') return 'Pending';
		return '—';
	}

	tierForPlayer(player: RosterPlayer) {
		const xp = player.armory?.totalXP ?? 0;
		return (
			[...TIER_DEFINITIONS].reverse().find((t) => xp >= t.floor) ?? TIER_DEFINITIONS[0]
		);
	}

	formatLastActive(val: string | { toDate: () => Date } | undefined) {
		if (!val) return '—';
		let d;
		if (typeof val === 'string') {
			d = new Date(val.length === 10 ? val + 'T12:00:00Z' : val);
		} else if (typeof val === 'object' && typeof val.toDate === 'function') {
			d = val.toDate();
		} else {
			return '—';
		}
		if (isNaN(d.getTime())) return '—';
		const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
		if (diffDays < 0) return 'UPCOMING';
		if (diffDays === 0) return 'TODAY';
		if (diffDays === 1) return '1D AGO';
		if (diffDays < 30) return `${diffDays}D AGO`;
		if (diffDays < 365) return `${Math.floor(diffDays / 30)}MO AGO`;
		return `${Math.floor(diffDays / 365)}YR AGO`;
	}

	togglePlayer(id: string) {
		if (this.selectedPlayerIds.includes(id)) {
			this.selectedPlayerIds = this.selectedPlayerIds.filter((x) => x !== id);
		} else {
			this.selectedPlayerIds = [...this.selectedPlayerIds, id];
		}
	}

	handleRemoveClick(playerId: string) {
		if (this.confirmRemoveId === playerId) {
			this.confirmRemoveId = null;
			void this.executeRemove(playerId);
		} else {
			this.confirmRemoveId = playerId;
			setTimeout(() => {
				if (this.confirmRemoveId === playerId) this.confirmRemoveId = null;
			}, 3000);
		}
	}

	async executeRemove(playerId: string) {
		if (!db || !authStore.isAuthenticated) return;
		this.roster = this.roster.map((p) => (p.id === playerId ? { ...p, _removing: true } : p));

		try {
			const playerToRemove = this.roster.find((p) => p.id === playerId);
			if (!playerToRemove || !playerToRemove.playerName) {
				throw new Error('Player not found or name missing');
			}
			const secureRemovePlayer = httpsCallable(functions, 'secureRemovePlayer');
			await secureRemovePlayer({ teamId: this.teamId, playerName: playerToRemove.playerName.trim() });
			if (!this.teamId) {
				this.roster = this.roster.filter((p) => p.id !== playerId);
			}
		} catch (err) {
			console.warn('[CommandCenter] Remove player failed:', err);
			this.roster = this.roster.map((p) => (p.id === playerId ? { ...p, _removing: false } : p));
		}
	}

	async deployMission() {
		if (!db || !authStore.isAuthenticated) return;
		if (!this.canDeploy) return;
		const drill = DRILL_CATALOG.find((d) => d.id === this.selectedDrillId);
		if (!drill) return;

		this.deployState = 'deploying';

		try {
			await addDoc(collection(db, 'active_missions'), {
				drillId: drill.id,
				drillLabel: drill.label,
				drillStatKey: drill.statKey,
				coachId: authStore.user?.email ?? authStore.user?.uid ?? 'unknown',
				teamId: this.teamId ?? null,
				targetMode: this.targetMode,
				targetPlayerIds: this.missionTargetIds,
				deadline: new Date(this.missionDeadline),
				status: 'active',
				createdAt: serverTimestamp(),
			});

			this.deployState = 'success';
			this.selectedDrillId = '';
			this.targetMode = 'all';
			this.targetPosition = '';
			this.selectedPlayerIds = [];
			this.missionDeadline = '';
		} catch (err) {
			console.warn('[CommandCenter] Mission deploy failed:', err);
			this.deployState = 'error';
		}
	}
}
