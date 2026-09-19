import { browser } from '$app/environment';
import { page } from '$app/state';
import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	getDocs,
	query,
	serverTimestamp,
	where,
} from 'firebase/firestore';
import { auth, db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';
import { workoutsStore, saveTeamScheduledEvent } from '$lib/stores/workouts.svelte.js';
import { categoryToAttributeId } from '$lib/coach/teamDrillLibrary.js';
import {
	recommendDrillToDirector,
	copyPlatformDrillToTeam,
	loadPlatformBasics,
} from '$lib/coach/platformDrillLibrary.js';
import { sportsConfigStore } from '$lib/services/sportsConfigs.svelte.js';
import { loadTeamDrills } from '$lib/utils/drillLoaders.js';
import { submitDrillAssignment } from '$lib/utils/drillAssignment.js';
import type { DrillRow } from '$lib/utils/drillLoaders.js';

export class CoachDrillsViewEngine {
	teamScope = new CoachTeamScope({ preferProfileTeam: true });
	pageView = $state<'library' | 'designer' | 'schedule'>('library');
	_viewInit = false;

	scheduleEventKind = $state<'game' | 'practice'>('practice');
	scheduleTitle = $state('');
	scheduleStartLocal = $state('');
	schedNotify1h = $state(false);
	schedNotify30m = $state(true);
	schedNotifyMorning = $state(false);
	schedAnnounce = $state(false);
	scheduleSaveBusy = $state(false);
	scheduleErr = $state('');
	scheduleOk = $state('');

	teamDrills = $state<DrillRow[]>([]);
	platformDrills = $state<DrillRow[]>([]);
	loadingPlatformDrills = $state(true);
	copyPlatformBusy = $state(false);
	copyPlatformMsg = $state('');
	loadingTeamDrills = $state(false);
	loadError = $state('');
	reloadCounter = $state(0);

	activeTab = $state<'team' | 'platform'>('team');
	searchTerm = $state('');

	addOpen = $state(false);
	formTitle = $state('');
	formCategory = $state('Ball Mastery');
	formMetricType = $state('reps');
	formVideoUrl = $state('');
	formDuration = $state(10);
	addBusy = $state(false);
	addErr = $state('');

	assignOpen = $state(false);
	assignDrill = $state<DrillRow | null>(null);
	assignDue = $state('');
	assignBusy = $state(false);
	assignErr = $state('');
	assignOk = $state('');
	roster = $state<Array<{ email: string; playerName: string }>>([]);
	loadingRoster = $state(false);
	selectedEmails = $state<Set<string>>(new Set());

	DRILL_CATEGORIES = [
		'Ball Mastery',
		'Finishing',
		'Passing',
		'Dribbling',
		'Defending',
		'Conditioning',
		'Set Pieces',
		'Goalkeeping',
		'Tactics',
	];

	METRIC_TYPES = [
		{ value: 'reps', label: 'Reps (count)' },
		{ value: 'time', label: 'Time (seconds)' },
		{ value: 'distance', label: 'Distance (meters)' },
		{ value: 'score', label: 'Score (points)' },
	];

	role = $derived(this.teamScope.role);
	myTeams = $derived(this.teamScope.myTeams);
	currentTeam = $derived(this.teamScope.currentTeam);
	myEmail = $derived(authStore.user?.email ?? '');
	activeSportId = $derived(sportsConfigStore.currentSportConfig?.sportId ?? 'soccer');
	activeSportLabel = $derived(
		sportsConfigStore.currentSportConfig?.displayName ?? this.activeSportId,
	);

	scheduleRows = $derived.by(() => {
		const w = workoutsStore.workouts;
		return w
			.filter(
				(x: Record<string, unknown>) =>
					x.recordType === 'scheduled_event' || x.type === 'scheduled',
			)
			.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
				const t = (e: Record<string, unknown>) =>
					Number(e.startTimestamp) ||
					(typeof e.startTimeUnix === 'number' ? e.startTimeUnix * 1000 : 0);
				return t(a) - t(b);
			});
	});

	visibleRows = $derived.by(() => {
		const rows = this.activeTab === 'team' ? this.teamDrills : this.platformDrills;
		const q = this.searchTerm.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((r) => {
			return (
				r.title.toLowerCase().includes(q) ||
				r.category.toLowerCase().includes(q) ||
				r.metricType.toLowerCase().includes(q)
			);
		});
	});

	assignDisabled = $derived(
		!this.assignDrill || !this.assignDue || this.selectedEmails.size === 0 || this.assignBusy,
	);

	constructor() {
		$effect(() => {
			this.teamScope.syncSelectedTeam();
		});

		$effect(() => {
			if (this._viewInit) return;
			const v = page.url.searchParams.get('view') || page.url.searchParams.get('tab');
			if (v === 'schedule' || v === 'designer' || v === 'library') this.pageView = v as any;
			this._viewInit = true;
		});

		$effect(() => {
			if (!this.teamScope.selectedTeamId) return;
			if (!db || !authStore.isAuthenticated) return;
			void workoutsStore.loadForTeam(this.teamScope.selectedTeamId);
		});

		$effect(() => {
			if (!browser) return;
			if (!db || !authStore.isAuthenticated) return;
			const sportId = this.activeSportId;
			void this.reloadCounter;
			this.loadingPlatformDrills = true;
			let cancelled = false;
			void (async () => {
				try {
					const rows = await loadPlatformBasics(db, sportId);
					if (cancelled) return;
					this.platformDrills = rows.map((row) => ({
						id: row.id,
						title: row.title,
						category: row.category,
						metricType: row.metricType,
						videoUrl: row.videoUrl,
						description: row.description,
						durationMinutes: row.durationMinutes,
						baseXp: row.baseXp,
						sportId: row.sportId,
						source: 'platform' as const,
					}));
				} catch (e) {
					if (!cancelled) {
						this.loadError =
							e instanceof Error ? e.message : 'Could not load platform drill basics.';
					}
				} finally {
					if (!cancelled) this.loadingPlatformDrills = false;
				}
			})();
			return () => {
				cancelled = true;
			};
		});

		$effect(() => {
			void this.reloadCounter;
			if (!browser || !this.teamScope.selectedTeamId) {
				this.teamDrills = [];
				return;
			}
			if (!db || !authStore.isAuthenticated) return;
			this.loadingTeamDrills = true;
			let cancelled = false;
			(async () => {
				try {
					const rows = await loadTeamDrills(this.teamScope.selectedTeamId);
					if (cancelled) return;
					this.teamDrills = rows;
				} catch (e) {
					if (!cancelled) {
						console.error('[drills] team load error', e);
						this.teamDrills = [];
					}
				} finally {
					if (!cancelled) this.loadingTeamDrills = false;
				}
			})();
			return () => {
				cancelled = true;
			};
		});

		$effect(() => {
			if (!browser || !this.teamScope.selectedTeamId) return;
			if (!this.assignOpen) return;
			if (!db || !authStore.isAuthenticated) return;
			this.loadingRoster = true;
			let cancelled = false;
			(async () => {
				try {
					const snap = await getDocs(
						query(collection(db, 'users'), where('teamId', '==', this.teamScope.selectedTeamId)),
					);
					if (cancelled) return;
					let rows: Array<{ email: string; playerName: string }> = [];
					snap.forEach((d) => {
						const x = d.data() || {};
						if (x.role !== 'player') return;
						rows = [
							...rows,
							{
								email: d.id,
								playerName:
									typeof x.playerName === 'string' && x.playerName.trim()
										? x.playerName.trim()
										: d.id,
							},
						];
					});
					rows.sort((a, b) => a.playerName.localeCompare(b.playerName));
					this.roster = rows;
				} catch (e) {
					console.error('[drills] roster load', e);
					this.roster = [];
				} finally {
					if (!cancelled) this.loadingRoster = false;
				}
			})();
			return () => {
				cancelled = true;
			};
		});
	}

	async submitScheduleEvent() {
		if (!db || !authStore.isAuthenticated) return;
		if (!this.teamScope.selectedTeamId || !this.scheduleStartLocal) {
			this.scheduleErr = 'Choose a start date and time.';
			return;
		}
		const start = new Date(this.scheduleStartLocal);
		if (Number.isNaN(start.getTime())) {
			this.scheduleErr = 'Invalid start time.';
			return;
		}
		this.scheduleSaveBusy = true;
		this.scheduleErr = '';
		this.scheduleOk = '';
		let keys: string[] = [];
		if (this.schedNotify1h) keys = [...keys, 'h1'];
		if (this.schedNotify30m) keys = [...keys, 'm30'];
		if (this.schedNotifyMorning) keys = [...keys, 'morning'];
		try {
			await saveTeamScheduledEvent({
				teamId: this.teamScope.selectedTeamId,
				eventKind: this.scheduleEventKind,
				title: this.scheduleTitle,
				startAt: start,
				reminderKeys: keys,
				source: 'coach_form',
				announceToTeam: this.schedAnnounce,
			});
			this.scheduleOk = 'Event saved with notification preferences.';
			await workoutsStore.loadForTeam(this.teamScope.selectedTeamId);
		} catch (e) {
			this.scheduleErr = e instanceof Error ? e.message : 'Could not save event.';
		} finally {
			this.scheduleSaveBusy = false;
		}
	}

	formatScheduleStart(ev: Record<string, unknown> & { startTimestamp?: number; startTimeUnix?: number; startTime?: { toDate?: () => Date } }) {
		const ts = ev.startTimestamp;
		if (typeof ts === 'number' && ts > 0) return new Date(ts).toLocaleString();
		const t = ev.startTime;
		if (t && typeof t === 'object' && 'toDate' in t && typeof t.toDate === 'function') {
			try {
				return t.toDate().toLocaleString();
			} catch {
				/* ignore */
			}
		}
		const u = ev.startTimeUnix;
		if (typeof u === 'number' && u > 0) return new Date(u * 1000).toLocaleString();
		return '—';
	}

	openAddDrill() {
		this.formTitle = '';
		this.formCategory = 'Ball Mastery';
		this.formMetricType = 'reps';
		this.formVideoUrl = '';
		this.formDuration = 10;
		this.addErr = '';
		this.addOpen = true;
	}

	async submitAddDrill() {
		if (!db || !authStore.isAuthenticated) return;
		this.addErr = '';
		const title = this.formTitle.trim();
		if (!title) {
			this.addErr = 'Drill title is required.';
			return;
		}
		if (title.length > 200) {
			this.addErr = 'Title must be 200 characters or fewer.';
			return;
		}
		if (this.formVideoUrl && !/^https?:\/\//i.test(this.formVideoUrl.trim())) {
			this.addErr = 'Video URL must start with http:// or https://';
			return;
		}
		if (!this.teamScope.selectedTeamId) {
			this.addErr = 'Select a team before creating a drill.';
			return;
		}
		const uid = auth.currentUser?.uid;
		if (!uid) {
			this.addErr = 'Your session expired. Sign in again.';
			return;
		}
		this.addBusy = true;
		try {
			const duration = Number.isFinite(this.formDuration)
				? Math.max(1, Math.min(240, Math.floor(this.formDuration)))
				: 10;
			const description = `${this.formCategory} · metric: ${this.formMetricType}${
				this.formVideoUrl ? `\nVideo: ${this.formVideoUrl.trim()}` : ''
			}`;
			await addDoc(collection(db, 'teams', this.teamScope.selectedTeamId, 'drills'), {
				name: title,
				title,
				category: this.formCategory,
				focusArea: this.formCategory,
				attributeId: categoryToAttributeId(this.formCategory),
				metricType: this.formMetricType,
				videoUrl: this.formVideoUrl.trim(),
				description,
				durationMinutes: duration,
				scope: 'team',
				createdBy: uid,
				createdByEmail: this.myEmail,
				createdAt: serverTimestamp(),
			});
			this.addOpen = false;
			this.reloadCounter++;
		} catch (e) {
			this.addErr = e instanceof Error ? e.message : 'Could not save drill.';
		} finally {
			this.addBusy = false;
		}
	}

	async deleteDrill(row: DrillRow) {
		if (!db || !authStore.isAuthenticated) return;
		if (row.source !== 'team') return;
		const ok = confirm(`Delete drill "${row.title}"? This cannot be undone.`);
		if (!ok) return;
		try {
			await deleteDoc(doc(db, 'teams', this.teamScope.selectedTeamId, 'drills', row.id));
			this.reloadCounter++;
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Could not delete drill.');
		}
	}

	async copyPlatformToTeam(row: DrillRow) {
		if (!db || !authStore.isAuthenticated) return;
		if (row.source !== 'platform') return;
		if (!this.teamScope.selectedTeamId) {
			this.copyPlatformMsg = 'Select a team first.';
			return;
		}
		const uid = auth.currentUser?.uid;
		if (!uid) {
			this.copyPlatformMsg = 'Sign in to copy drills.';
			return;
		}
		this.copyPlatformBusy = true;
		this.copyPlatformMsg = '';
		try {
			await copyPlatformDrillToTeam(db, {
				teamId: this.teamScope.selectedTeamId,
				platformDrillId: row.id,
				createdByUid: uid,
				createdByEmail: this.myEmail,
			});
			this.copyPlatformMsg = `"${row.title}" copied to your team library. Customize it in War Room or deploy via Intent Engine.`;
			this.reloadCounter++;
			this.activeTab = 'team';
		} catch (e) {
			this.copyPlatformMsg = e instanceof Error ? e.message : 'Could not copy drill.';
		} finally {
			this.copyPlatformBusy = false;
		}
	}

	async recommendToDirector(row: DrillRow) {
		if (!db || !authStore.isAuthenticated) return;
		if (row.source !== 'team') return;
		const clubId = authStore.tenantId || '';
		if (!clubId) {
			this.copyPlatformMsg = 'No club linked to your account. Contact your director.';
			return;
		}
		const uid = auth.currentUser?.uid ?? '';
		const email = auth.currentUser?.email ?? '';
		this.copyPlatformBusy = true;
		this.copyPlatformMsg = '';
		try {
			await recommendDrillToDirector(db, {
				drillTitle: row.title,
				category: row.category,
				durationMinutes: row.durationMinutes,
				teamId: this.teamScope.selectedTeamId,
				coachUid: uid,
				coachEmail: email,
				clubId,
			});
			this.copyPlatformMsg = `"${row.title}" sent to your director's inbox for club library review.`;
		} catch (e) {
			this.copyPlatformMsg = e instanceof Error ? e.message : 'Could not send recommendation.';
		} finally {
			this.copyPlatformBusy = false;
		}
	}

	toggleEmail(em: string) {
		const next = new Set(this.selectedEmails);
		if (next.has(em)) next.delete(em);
		else next.add(em);
		this.selectedEmails = next;
	}

	toggleAllEmails() {
		if (this.selectedEmails.size === this.roster.length) {
			this.selectedEmails = new Set();
		} else {
			this.selectedEmails = new Set(this.roster.map((r) => r.email));
		}
	}

	openAssign(row: DrillRow) {
		this.assignDrill = row;
		this.assignOpen = true;
		this.assignErr = '';
		this.assignOk = '';
		this.selectedEmails = new Set();
		this.assignDue = '';
	}

	async submitAssign() {
		if (!db || !authStore.isAuthenticated) return;
		if (this.assignDisabled || !this.assignDrill || !this.teamScope.selectedTeamId) return;
		this.assignBusy = true;
		this.assignErr = '';
		try {
			const count = await submitDrillAssignment(
				this.teamScope.selectedTeamId,
				this.assignDrill.id,
				this.assignDue,
				Array.from(this.selectedEmails)
			);
			this.assignOk = `Homework dispatched to ${count} player${count === 1 ? '' : 's'}.`;
			this.selectedEmails = new Set();
			this.assignDue = '';
		} catch (e) {
			this.assignErr = e instanceof Error ? e.message : 'Assignment failed.';
		} finally {
			this.assignBusy = false;
		}
	}
}
