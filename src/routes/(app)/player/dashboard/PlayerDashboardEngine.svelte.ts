import { browser } from '$app/environment';
import { db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import { playerEngine } from '$lib/stores/playerEngine.svelte.js';
import { sportsConfigStore } from '$lib/services/sportsConfigs.svelte.js';
import { ArmoryEngine } from '$lib/states/ArmoryEngine.svelte.js';
import { TrajectoryEngine } from '$lib/states/TrajectoryEngine.svelte.js';
import { deriveVanguardPrism } from '$lib/utils/vanguard-prism.js';
import { getCurrentRank, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
import { hasVanguardTelemetry, type VanguardAxisId } from '$lib/player/dashboard/vanguardProtocol.js';
import {
	mapScheduleDoc,
	pickNextScheduleEvent,
	resolveHqStatusBadges,
	resolveNextEventLabel,
	type HqScheduleEventLike,
} from '$lib/player/dashboard/hqWorldContext.js';
import { getCompletedAlbumSetChipLabels } from '$lib/gamification/albumSetBonuses.js';
import { resolveOperativeCardMetadata } from '$lib/gamification/cardCollectibleMetadata.js';
import { parseOperativePortrait } from '$lib/avatars/portraitV2Schema.js';
import { readRepairOperativeAvatar, queuePortraitReadRepairWrite } from '$lib/avatars/portraitReadRepair.js';
import { fetchClubDisplayName } from '$lib/player/fetchClubDisplayName.js';
import { doc, getDoc, getDocs, onSnapshot, updateDoc, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { untrack } from 'svelte';

export class PlayerDashboardEngine {
	armory = new ArmoryEngine();
	trajectoryEngine = new TrajectoryEngine();

	selectedVanguardAxis = $state<VanguardAxisId | null>(null);
	statsRaw = $state<Record<string, unknown> | null>(null);
	teamSportFromDoc = $state<string | null>(null);
	teamAssignmentLabel = $state('');
	clubDisplayName = $state('');
	coachBountyCount = $state(0);
	heroQuestId = $state<string | null>(null);
	nextScheduleEvent = $state<HqScheduleEventLike | null>(null);
	showInitModal = $state(false);

	displayOperativeAvatar = $state<unknown>(undefined);
	lastPortraitRepairSig = '';

	matchData = $state<any>(null);
	isEmbargoed = $state(false);
	attestationSigned = $state(false);
	countdown = $state('15:00');

	// Defensive guards for unsubscribe
	statsUnsub: (() => void) | null = null;
	scheduleUnsub: (() => void) | null = null;

	activePlayer = $derived(
		(authStore.userProfile as Record<string, unknown> | null) ?? null
	);

	profileXp = $derived(Math.max(0, Math.floor(Number(this.activePlayer?.totalXp ?? this.activePlayer?.xp) || 0)));
	totalXpHud = $derived(
		playerEngine.hydrated ? Math.max(playerEngine.totalXp, this.profileXp) : this.profileXp
	);
	rankProgress = $derived(getCurrentRank(this.totalXpHud));
	osLevel = $derived(getLevelProgressFromTotalXp(this.totalXpHud).level);
	email = $derived((authStore.user?.email || '').toLowerCase());
	uid = $derived(authStore.user?.uid || '');

	streak = $derived(Number(this.activePlayer?.currentStreak) || 0);
	longestStreak = $derived(Number(this.activePlayer?.longestStreak) || this.streak);

	attrRadarValues = $derived(
		deriveVanguardPrism(
			this.statsRaw && typeof this.statsRaw === 'object' ? this.statsRaw : null,
			((this.activePlayer as Record<string, any> | null)?.armory?.stats as any) ?? {}
		)
	);

	telemetryReady = $derived(hasVanguardTelemetry(this.attrRadarValues));
	lastTrainingUtc = $derived(
		this.statsRaw && typeof this.statsRaw.last_training_utc === 'string'
			? this.statsRaw.last_training_utc
			: null
	);

	callsign = $derived(
		(this.activePlayer?.playerName && String(this.activePlayer.playerName).trim()) ||
		this.email.split('@')[0] ||
		'—'
	);

	operativeAvatarForHud = $derived(
		this.displayOperativeAvatar ?? this.activePlayer?.operativeAvatar
	);

	hasArmoryProfile = $derived(
		parseOperativePortrait(this.operativeAvatarForHud) !== null
	);

	nextEventLabel = $derived(resolveNextEventLabel(this.nextScheduleEvent));
	ownedSeasonOneCardIds = $derived(
		Array.isArray(this.activePlayer?.ownedSeasonOneCards)
			? (this.activePlayer.ownedSeasonOneCards as string[]).filter((id) => typeof id === 'string')
			: []
	);

	hqCardMetadata = $derived(
		resolveOperativeCardMetadata({
			operativeLoadout: this.activePlayer?.operativeLoadout as any,
			ownedSeasonOneCards: this.ownedSeasonOneCardIds,
			totalXp: this.totalXpHud,
			rankName: this.rankProgress.rank,
			emailKey: this.email,
		})
	);

	completedAlbumSetChips = $derived(
		getCompletedAlbumSetChipLabels(this.ownedSeasonOneCardIds)
	);

	hqStatusBadges = $derived(
		resolveHqStatusBadges({
			profileIncomplete: !this.hasArmoryProfile,
			streak: this.streak,
			lastTrainingUtc: this.lastTrainingUtc,
			coachBountyCount: this.coachBountyCount,
			heroQuestId: this.heroQuestId,
			suppressProfileIncompleteBadge: !this.hasArmoryProfile,
			completedAlbumSetChips: this.completedAlbumSetChips,
		})
	);

	signAttestation() {
		this.attestationSigned = true;
	}

	subscribe() {
		$effect.root(() => {
			$effect(() => {
				if (!browser || authStore.isLoading) return;
				if (this.email) this.trajectoryEngine.connect(this.email);
			});

			$effect(() => {
				if (!browser || authStore.isLoading) return;
				if (this.uid && this.email) this.armory.loadPlayerData(this.uid, this.email);
			});

			$effect(() => {
				if (!browser) return;
				const u = authStore.user;
				if (authStore.role === 'player' && u?.uid) {
					playerEngine.attach(u.uid);
					return () => playerEngine.detach();
				}
				playerEngine.detach();
			});

			$effect(() => {
				this.initPortraitRepair();
			});

			$effect(() => {
				this.initPlayerStats();
			});

			$effect(() => {
				this.initTeamData();
			});

			$effect(() => {
				this.initScheduleData();
			});

			$effect(() => {
				untrack(() => {
					setTimeout(() => {
						this.matchData = {
							opponent: 'Metro City Elite',
							result: 'L 1-2',
							date: new Date().toISOString(),
							rpe: 8,
							successRate: 84
						};
						this.isEmbargoed = true;
					}, 1000);
				});
			});

			return () => {
				this.destroy();
			};
		});
	}

	initPortraitRepair() {
		if (!browser || authStore.isLoading) return;
		if (!this.email) {
			this.lastPortraitRepairSig = '';
			this.displayOperativeAvatar = undefined;
			return;
		}

		const oa = this.activePlayer?.operativeAvatar;
		const opp = this.activePlayer?.ownedPortraitParts;
		const ageBand =
			typeof this.activePlayer?.ageBand === 'string'
				? this.activePlayer.ageBand
				: typeof authStore.userProfile?.ageBand === 'string'
				? authStore.userProfile.ageBand
				: '';
		const oaNorm = oa && typeof oa === 'object' ? JSON.stringify(oa) : '';
		const oppNorm = Array.isArray(opp) ? JSON.stringify([...opp].sort()) : '';
		const sig = `${this.email}:${ageBand}:${oaNorm}:${oppNorm}`;

		if (sig === this.lastPortraitRepairSig) return;
		this.lastPortraitRepairSig = sig;

		const { operativeAvatar, ownedPortraitParts, didMigrate } = readRepairOperativeAvatar(
			this.activePlayer?.operativeAvatar,
			this.activePlayer?.ownedPortraitParts as any,
			{ ageBand: ageBand || undefined }
		);
		this.displayOperativeAvatar = operativeAvatar;
		if (didMigrate) {
			void queuePortraitReadRepairWrite(this.email, { operativeAvatar, ownedPortraitParts });
		}
	}

	initPlayerStats() {
		if (!browser || !this.uid) {
			this.statsRaw = null;
			return;
		}
		const isMock =
			typeof window !== 'undefined' &&
			(window.localStorage.getItem('auth_state') !== null ||
				(import.meta.env && import.meta.env.VITE_E2E_BYPASS_AUTH));
		if (isMock) {
			this.statsRaw = { pac: 85, acc: 80, pow: 90, comp: 88, stm: 82, agi: 86 };
			return;
		}
		if (!db || !authStore.isAuthenticated) return;
		const ref = doc(db, 'player_stats', this.uid);
		this.statsUnsub = onSnapshot(
			ref,
			(snap) => {
				if (!snap.exists()) {
					this.statsRaw = null;
					return;
				}
				this.statsRaw = snap.data();
			},
			(e) => {
				console.error('[player dashboard] player_stats error:', e);
				this.statsRaw = null;
			}
		);
	}

	initTeamData() {
		if (!browser || !db || !authStore.isAuthenticated) return;
		const tid = this.activePlayer?.teamId as string | undefined;
		if (!tid || tid === 'admin') {
			this.teamAssignmentLabel = '';
			this.teamSportFromDoc = null;
			return;
		}

		void getDoc(doc(db, 'teams', tid)).then((snap) => {
			if (snap.exists()) {
				const d = snap.data();
				this.teamAssignmentLabel =
					typeof d.teamName === 'string' && d.teamName.trim()
						? d.teamName.trim()
						: typeof d.name === 'string' && d.name.trim()
						? d.name.trim()
						: tid;
				const sp = d.sport;
				this.teamSportFromDoc =
					typeof sp === 'string' && sp.trim() ? sp.trim().toLowerCase() : null;
			} else {
				this.teamAssignmentLabel = tid;
				this.teamSportFromDoc = null;
			}
		}).catch((e) => {
			console.error('[player dashboard] team label fetch error:', e);
		});

		void fetchClubDisplayName(db, this.activePlayer).then((name) => {
			this.clubDisplayName = name;
		});
	}

	initScheduleData() {
		if (!browser || !db || !authStore.isAuthenticated) return;
		const isMock =
			typeof window !== 'undefined' &&
			(window.localStorage.getItem('auth_state') !== null ||
				(import.meta.env && import.meta.env.VITE_E2E_BYPASS_AUTH));
		if (isMock) return;

		const tid =
			typeof this.activePlayer?.teamId === 'string' ? (this.activePlayer.teamId as string).trim() : '';
		if (!tid || tid === 'admin') {
			this.nextScheduleEvent = null;
			return;
		}

		const now = new Date();
		const scheduleQ = query(
			collection(db, 'team_workouts'),
			where('teamId', '==', tid),
			where('startTimestamp', '>=', now.getTime()),
			orderBy('startTimestamp', 'asc'),
			limit(5)
		);

		this.scheduleUnsub = onSnapshot(
			scheduleQ,
			(snap) => {
				const scheduledDocs = snap.docs.filter(
					(d) => d.data().recordType === 'scheduled_event'
				);
				if (scheduledDocs.length > 0) {
					this.nextScheduleEvent = mapScheduleDoc(scheduledDocs[0].id, scheduledDocs[0].data());
					return;
				}
				void this.loadLegacyScheduleFallback(tid, now);
			},
			() => {
				void this.loadLegacyScheduleFallback(tid, now);
			}
		);
	}

	async loadLegacyScheduleFallback(tid: string, now: Date) {
		if (!db || !authStore.isAuthenticated) return;
		try {
			const fallbackQ = query(collection(db, 'team_workouts'), where('teamId', '==', tid));
			const snap = await getDocs(fallbackQ);
			const events = snap.docs
				.filter((d) => d.data().recordType === 'scheduled_event')
				.map((d) => mapScheduleDoc(d.id, d.data()));
			this.nextScheduleEvent = pickNextScheduleEvent(events, now);
		} catch {
			this.nextScheduleEvent = null;
		}
	}

	destroy() {
		if (this.statsUnsub) {
			this.statsUnsub();
			this.statsUnsub = null;
		}
		if (this.scheduleUnsub) {
			this.scheduleUnsub();
			this.scheduleUnsub = null;
		}
		this.trajectoryEngine.destroy();
	}
}
