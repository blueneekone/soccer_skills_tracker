<script lang="ts">
	import '$lib/styles/coach-drill-library.css';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
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
	import { httpsCallable } from 'firebase/functions';
	import { auth, db, functions } from '$lib/firebase.js';
	import Modal from '$lib/components/Modal.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';
	import { workoutsStore, saveTeamScheduledEvent } from '$lib/stores/workouts.svelte.js';
	import { categoryToAttributeId } from '$lib/coach/teamDrillLibrary.js';
	import {
		recommendDrillToDirector,
		copyPlatformDrillToTeam,
		loadPlatformBasics,
	} from '$lib/coach/platformDrillLibrary.js';
	import { sportsConfigStore } from '$lib/stores/sportsConfigStore.svelte.js';
	import DrillDesignerTab from '$lib/components/coach/DrillDesignerTab.svelte';
	import FacilityScheduler from '$lib/components/coach/FacilityScheduler.svelte';

	import { loadTeamDrills } from '$lib/utils/drillLoaders.js';
	import { submitDrillAssignment } from '$lib/utils/drillAssignment.js';
	import type { DrillRow } from '$lib/utils/drillLoaders.js';
	// â”€â”€ Team context resolution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	const teamScope = new CoachTeamScope({ preferProfileTeam: true });
	$effect(() => {
		teamScope.syncSelectedTeam();
	});

	const role = $derived(teamScope.role);
	const myTeams = $derived(teamScope.myTeams);
	const currentTeam = $derived(teamScope.currentTeam);
	const myEmail = $derived(authStore.user?.email ?? '');

	/** @type {'library' | 'designer' | 'schedule'} */
	let pageView = $state('library');

	// Honor ?view= deep links (e.g. comms "Open training & schedule" CTA) â€” apply once.
	let _viewInit = false;
	$effect(() => {
		if (_viewInit) return;
		const v = page.url.searchParams.get('view');
		if (v === 'schedule' || v === 'designer' || v === 'library') pageView = v;
		_viewInit = true;
	});

	/** @type {'game' | 'practice'} */
	let scheduleEventKind = $state<'game' | 'practice'>('practice');
	let scheduleTitle = $state('');
	let scheduleStartLocal = $state('');
	let schedNotify1h = $state(false);
	let schedNotify30m = $state(true);
	let schedNotifyMorning = $state(false);
	/** Opt-in: fires a team_broadcasts entry via safeSportBroadcast after event save. Default OFF. */
	let schedAnnounce = $state(false);
	let scheduleSaveBusy = $state(false);
	let scheduleErr = $state('');
	let scheduleOk = $state('');

	/** @type {Array<Record<string, unknown>>} */
	const scheduleRows = $derived.by(() => {
		const w = workoutsStore.workouts;
		return w
			.filter(
				(/** @type {Record<string, unknown>} */ x) =>
					x.recordType === 'scheduled_event' || x.type === 'scheduled',
			)
			.sort(
				(/** @type {Record<string, unknown>} */ a, /** @type {Record<string, unknown>} */ b) => {
					const t = (/** @type {Record<string, unknown>} */ e) =>
						Number(e.startTimestamp) ||
						(typeof e.startTimeUnix === 'number' ? e.startTimeUnix * 1000 : 0);
					return t(a) - t(b);
				},
			);
	});

	const onWorkoutSaved = () => {
		if (teamScope.selectedTeamId) void workoutsStore.loadForTeam(teamScope.selectedTeamId);
	};

	async function submitScheduleEvent() {
		if (!teamScope.selectedTeamId || !scheduleStartLocal) {
			scheduleErr = 'Choose a start date and time.';
			return;
		}
		const start = new Date(scheduleStartLocal);
		if (Number.isNaN(start.getTime())) {
			scheduleErr = 'Invalid start time.';
			return;
		}
		scheduleSaveBusy = true;
		scheduleErr = '';
		scheduleOk = '';
		const keys = /** @type {string[]} */ ([]);
		if (schedNotify1h) {
			keys.push('h1');
		}
		if (schedNotify30m) {
			keys.push('m30');
		}
		if (schedNotifyMorning) {
			keys.push('morning');
		}
		try {
		await saveTeamScheduledEvent({
			teamId: teamScope.selectedTeamId,
			eventKind: scheduleEventKind,
			title: scheduleTitle,
			startAt: start,
			reminderKeys: keys,
			source: 'coach_form',
			announceToTeam: schedAnnounce
		});
			scheduleOk = 'Event saved with notification preferences.';
			await workoutsStore.loadForTeam(teamScope.selectedTeamId);
		} catch (e) {
			scheduleErr = e instanceof Error ? e.message : 'Could not save event.';
		} finally {
			scheduleSaveBusy = false;
		}
	}

	/**
	 * @param {Record<string, unknown> & {
	 *   startTimestamp?: number;
	 *   startTimeUnix?: number;
	 *   startTime?: { toDate?: () => Date };
	 * }} ev
	 */
	function formatScheduleStart(ev) {
		const ts = ev.startTimestamp;
		if (typeof ts === 'number' && ts > 0) {
			return new Date(ts).toLocaleString();
		}
		const t = ev.startTime;
		if (t && typeof t === 'object' && 'toDate' in t && typeof t.toDate === 'function') {
			try {
				return t.toDate().toLocaleString();
			} catch {
				/* ignore */
			}
		}
		const u = ev.startTimeUnix;
		if (typeof u === 'number' && u > 0) {
			return new Date(u * 1000).toLocaleString();
		}
		return 'â€”';
	}

	$effect(() => {
		if (!teamScope.selectedTeamId) return;
		void workoutsStore.loadForTeam(teamScope.selectedTeamId);
	});

	// Mission deploy tab removed (Epic 8). Intents deploy via The Forge (/coach/forge).

	// ── Drill library data loads ──────────────────────────────────────────
	/** @type {DrillRow[]} */
	let teamDrills = $state([]);
	/** @type {DrillRow[]} */
	let platformDrills = $state([]);
	let loadingPlatformDrills = $state(true);
	let copyPlatformBusy = $state(false);
	let copyPlatformMsg = $state('');
	const activeSportId = $derived(sportsConfigStore.currentSportConfig?.sportId ?? 'soccer');
	const activeSportLabel = $derived(
		sportsConfigStore.currentSportConfig?.displayName ?? activeSportId,
	);
	let loadingTeamDrills = $state(false);
	let loadError = $state('');
	let reloadCounter = $state(0);

	$effect(() => {
		if (!browser) return;
		const sportId = activeSportId;
		void reloadCounter;
		loadingPlatformDrills = true;
		let cancelled = false;
		void (async () => {
			try {
				const rows = await loadPlatformBasics(db, sportId);
				if (cancelled) return;
				platformDrills = rows.map((row) => ({
					id: row.id,
					title: row.title,
					category: row.category,
					metricType: row.metricType,
					videoUrl: row.videoUrl,
					description: row.description,
					durationMinutes: row.durationMinutes,
					baseXp: row.baseXp,
					sportId: row.sportId,
					source: /** @type {'platform'} */ ('platform'),
				}));
			} catch (e) {
				if (!cancelled) {
					loadError =
						e instanceof Error ? e.message : 'Could not load platform drill basics.';
				}
			} finally {
				if (!cancelled) loadingPlatformDrills = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		void reloadCounter;
		if (!browser || !teamScope.selectedTeamId) {
			teamDrills = [];
			return;
		}
		loadingTeamDrills = true;
		let cancelled = false;
		(async () => {
			try {
				const rows = await loadTeamDrills(teamScope.selectedTeamId);
				if (cancelled) return;
				teamDrills = rows;
			} catch (e) {
				if (!cancelled) {
					console.error('[drills] team load error', e);
					teamDrills = [];
				}
			} finally {
				if (!cancelled) loadingTeamDrills = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	// â”€â”€ Tab + search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	/** @type {'team' | 'platform'} */
	let activeTab = $state('team');
	let searchTerm = $state('');

	const visibleRows = $derived.by(() => {
		const rows = activeTab === 'team' ? teamDrills : platformDrills;
		const q = searchTerm.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((r) => {
			return (
				r.title.toLowerCase().includes(q) ||
				r.category.toLowerCase().includes(q) ||
				r.metricType.toLowerCase().includes(q)
			);
		});
	});

	// â”€â”€ Add Drill modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	let addOpen = $state(false);
	let formTitle = $state('');
	let formCategory = $state('Ball Mastery');
	let formMetricType = $state('reps');
	let formVideoUrl = $state('');
	let formDuration = $state(10);
	let addBusy = $state(false);
	let addErr = $state('');

	const DRILL_CATEGORIES = [
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
	const METRIC_TYPES = [
		{ value: 'reps', label: 'Reps (count)' },
		{ value: 'time', label: 'Time (seconds)' },
		{ value: 'distance', label: 'Distance (meters)' },
		{ value: 'score', label: 'Score (points)' },
	];

	function openAddDrill() {
		formTitle = '';
		formCategory = 'Ball Mastery';
		formMetricType = 'reps';
		formVideoUrl = '';
		formDuration = 10;
		addErr = '';
		addOpen = true;
	}

	async function submitAddDrill() {
		addErr = '';
		const title = formTitle.trim();
		if (!title) {
			addErr = 'Drill title is required.';
			return;
		}
		if (title.length > 200) {
			addErr = 'Title must be 200 characters or fewer.';
			return;
		}
		if (formVideoUrl && !/^https?:\/\//i.test(formVideoUrl.trim())) {
			addErr = 'Video URL must start with http:// or https://';
			return;
		}
		if (!teamScope.selectedTeamId) {
			addErr = 'Select a team before creating a drill.';
			return;
		}
		const uid = auth.currentUser?.uid;
		if (!uid) {
			addErr = 'Your session expired. Sign in again.';
			return;
		}
		addBusy = true;
		try {
			const duration = Number.isFinite(formDuration) ?
				Math.max(1, Math.min(240, Math.floor(formDuration))) :
				10;
			const description = `${formCategory} Â· metric: ${formMetricType}${formVideoUrl ? `\nVideo: ${formVideoUrl.trim()}` : ''}`;
			await addDoc(collection(db, 'teams', teamScope.selectedTeamId, 'drills'), {
				name: title,
				title,
				category: formCategory,
				focusArea: formCategory,
				attributeId: categoryToAttributeId(formCategory),
				metricType: formMetricType,
				videoUrl: formVideoUrl.trim(),
				description,
				durationMinutes: duration,
				scope: 'team',
				createdBy: uid,
				createdByEmail: myEmail,
				createdAt: serverTimestamp(),
			});
			addOpen = false;
			reloadCounter++;
		} catch (e) {
			addErr = e instanceof Error ? e.message : 'Could not save drill.';
		} finally {
			addBusy = false;
		}
	}

	// â”€â”€ Delete drill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	async function deleteDrill(row) {
		if (row.source !== 'team') return;
		const ok = confirm(`Delete drill "${row.title}"? This cannot be undone.`);
		if (!ok) return;
		try {
			await deleteDoc(doc(db, 'teams', teamScope.selectedTeamId, 'drills', row.id));
			reloadCounter++;
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Could not delete drill.');
		}
	}

	// â”€â”€ Assign Homework modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	let assignOpen = $state(false);
	/** @type {DrillRow | null} */
	let assignDrill = $state(null);
	let assignDue = $state('');
	let assignBusy = $state(false);
	let assignErr = $state('');
	let assignOk = $state('');
	/** @type {Array<{ email: string, playerName: string }>} */
	let roster = $state([]);
	let loadingRoster = $state(false);
	let selectedEmails = $state(/** @type {Set<string>} */ (new Set()));

	$effect(() => {
		if (!browser || !teamScope.selectedTeamId) return;
		if (!assignOpen) return;
		loadingRoster = true;
		let cancelled = false;
		(async () => {
			try {
				const snap = await getDocs(
					query(collection(db, 'users'), where('teamId', '==', teamScope.selectedTeamId)),
				);
				if (cancelled) return;
				const rows = [];
				snap.forEach((d) => {
					const x = d.data() || {};
					if (x.role !== 'player') return;
					rows.push({
						email: d.id,
						playerName:
							typeof x.playerName === 'string' && x.playerName.trim() ?
								x.playerName.trim() :
								d.id,
					});
				});
				rows.sort((a, b) => a.playerName.localeCompare(b.playerName));
				roster = rows;
			} catch (e) {
				console.error('[drills] roster load', e);
				roster = [];
			} finally {
				if (!cancelled) loadingRoster = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	async function copyPlatformToTeam(row) {
		if (row.source !== 'platform') return;
		if (!teamScope.selectedTeamId) {
			copyPlatformMsg = 'Select a team first.';
			return;
		}
		const uid = auth.currentUser?.uid;
		if (!uid) {
			copyPlatformMsg = 'Sign in to copy drills.';
			return;
		}
		copyPlatformBusy = true;
		copyPlatformMsg = '';
		try {
			await copyPlatformDrillToTeam(db, {
				teamId: teamScope.selectedTeamId,
				platformDrillId: row.id,
				createdByUid: uid,
				createdByEmail: myEmail,
			});
			copyPlatformMsg = `"${row.title}" copied to your team library. Customize it in Spatial designer or deploy via Intent Engine.`;
			reloadCounter++;
			activeTab = 'team';
		} catch (e) {
			copyPlatformMsg = e instanceof Error ? e.message : 'Could not copy drill.';
		} finally {
			copyPlatformBusy = false;
		}
	}

	async function recommendToDirector(row) {
		if (row.source !== 'team') return;
		const clubId = authStore.tenantId || '';
		if (!clubId) {
			copyPlatformMsg = 'No club linked to your account. Contact your director.';
			return;
		}
		const uid = auth.currentUser?.uid ?? '';
		const email = auth.currentUser?.email ?? '';
		copyPlatformBusy = true;
		copyPlatformMsg = '';
		try {
			await recommendDrillToDirector(db, {
				drillTitle: row.title,
				category: row.category,
				durationMinutes: row.durationMinutes,
				teamId: teamScope.selectedTeamId,
				coachUid: uid,
				coachEmail: email,
				clubId,
			});
			copyPlatformMsg = `"${row.title}" sent to your director's inbox for club library review.`;
		} catch (e) {
			copyPlatformMsg = e instanceof Error ? e.message : 'Could not send recommendation.';
		} finally {
			copyPlatformBusy = false;
		}
	}

	function toggleEmail(em) {
		const next = new Set(selectedEmails);
		if (next.has(em)) next.delete(em);
		else next.add(em);
		selectedEmails = next;
	}

	function toggleAllEmails() {
		if (selectedEmails.size === roster.length) {
			selectedEmails = new Set();
		} else {
			selectedEmails = new Set(roster.map((r) => r.email));
		}
	}

	const assignDisabled = $derived(
		!assignDrill || !assignDue || selectedEmails.size === 0 || assignBusy,
	);

	function openAssign(row) {
		assignDrill = row;
		assignOpen = true;
		assignErr = '';
		assignOk = '';
		selectedEmails = new Set();
		assignDue = '';
	}

	async function submitAssign() {
		if (assignDisabled || !assignDrill || !teamScope.selectedTeamId) return;
		assignBusy = true;
		assignErr = '';
		try {
			const count = await submitDrillAssignment(
				teamScope.selectedTeamId,
				assignDrill.id,
				assignDue,
				Array.from(selectedEmails) as string[]
			);
			assignOk = `Homework dispatched to ${count} player${count === 1 ? '' : 's'}.`;
			selectedEmails = new Set();
			assignDue = '';
		} catch (e) {
			assignErr = e instanceof Error ? e.message : 'Assignment failed.';
		} finally {
			assignBusy = false;
		}
	}
</script>

<svelte:head>
	<title>Coach Â· Field Station Â· SSTRACKER</title>
</svelte:head>

<!-- VS-3c â€” Coach drill library SIEM shell -->
<div class="coach-drill-lib tw-relative tw-min-h-screen tw-w-full tw-px-3 tw-py-6 sm:tw-px-5">
<section class="cdm-page">
	<header class="coach-drill-z4">
		<div>
			<h1 class="coach-drill-z4__title">Field operations</h1>
			<p class="coach-drill-z4__sub">
				Team â€º {currentTeam?.name || teamScope.selectedTeamId || 'â€”'}
			</p>
			<nav class="coach-drill-z4-nav" aria-label="Coach section">
				<a href="/coach/forge" class="coach-drill-z4-nav__btn coach-drill-z4-nav__btn--link" title="Deploy macro-goal intents â€” individualized drills per player">
					The Forge
				</a>
				<button
					type="button"
					class="coach-drill-z4-nav__btn"
					class:coach-drill-z4-nav__btn--active={pageView === 'library'}
					onclick={() => (pageView = 'library')}
				>
					Drill library
				</button>
				<button
					type="button"
					class="coach-drill-z4-nav__btn"
					class:coach-drill-z4-nav__btn--active={pageView === 'designer'}
					onclick={() => (pageView = 'designer')}
				>
					Spatial designer
				</button>
				<button
					type="button"
					class="coach-drill-z4-nav__btn"
					class:coach-drill-z4-nav__btn--active={pageView === 'schedule'}
					onclick={() => (pageView = 'schedule')}
				>
					Team schedule
				</button>
			</nav>
		</div>
		<div class="coach-drill-z4__actions">
			{#if myTeams.length > 1}
				<label class="coach-drill-z4__team">
					<span class="sr-only">Team</span>
					<select bind:value={teamScope.selectedTeamId}>
						{#each myTeams as t (t.id)}
							<option value={t.id}>{t.name || t.id}</option>
						{/each}
					</select>
				</label>
			{/if}
			{#if pageView === 'library'}
				<button type="button" class="coach-drill-z4-cta" onclick={openAddDrill}>
					<Icon name="status.circle-plus" />
					<span>NEW DRILL</span>
				</button>
			{/if}
		</div>
	</header>

	{#if pageView === 'designer'}
		<div class="cdm-designer" data-region="spatial-designer">
			<DrillDesignerTab
				teamId={teamScope.selectedTeamId}
				onDrillSaved={() => {
					reloadCounter++;
				}}
			/>
		</div>
	{:else if pageView === 'schedule'}
		<div class="cdm-grid cdm-grid--schedule" data-region="team-schedule">
			<div class="cdm-panel" aria-labelledby="cdm-sch-h">
				<div class="cdm-panel__head">
					<span class="cdm-eyebrow">Schedule</span>
					<h2 id="cdm-sch-h" class="cdm-h2">Game or practice</h2>
					<p class="cdm-muted" style="margin:0 0 1rem; font-size:0.8rem; max-width: 36rem">
						<code>reminderOffsets</code> is an array: minute values (e.g. 60, 30) and optionally the
						string <code>morning</code> for &ldquo;Morning of.&rdquo;
						<code>startTimestamp</code> is the event start in Unix milliseconds for dispatch
						timing.
					</p>
				</div>
				<div class="cdm-sch-form">
					<label class="cdm-field">
						<span class="cdm-eyebrow">Event type</span>
						<select class="cdm-select" bind:value={scheduleEventKind}>
							<option value="practice">Practice</option>
							<option value="game">Game</option>
						</select>
					</label>
					<label class="cdm-field">
						<span class="cdm-eyebrow">Title (optional)</span>
						<input
							class="cdm-select"
							type="text"
							placeholder="e.g. Scrimmage vs North"
							bind:value={scheduleTitle}
							maxlength="200"
						/>
					</label>
					<label class="cdm-field">
						<span class="cdm-eyebrow">Start</span>
						<input
							class="cdm-select"
							type="datetime-local"
							bind:value={scheduleStartLocal}
							required
						/>
					</label>
					<fieldset class="cdm-sch-triggers">
						<legend class="cdm-eyebrow" style="margin-bottom:0.5rem">Notification triggers</legend>
						<div class="cdm-sch-toggles">
							<label class="cdm-sch-ch">
								<input type="checkbox" bind:checked={schedNotify1h} />
								1 hour before
							</label>
							<label class="cdm-sch-ch">
								<input type="checkbox" bind:checked={schedNotify30m} />
								30 minutes before
							</label>
							<label class="cdm-sch-ch">
								<input type="checkbox" bind:checked={schedNotifyMorning} />
								Morning of
							</label>
							<label class="cdm-sch-ch cdm-sch-ch--announce" title="Sends a team broadcast message via the SafeSport comms bus">
								<input type="checkbox" bind:checked={schedAnnounce} />
								Announce to team
							</label>
						</div>
					</fieldset>
					{#if scheduleErr}
						<p class="cdm-err" role="alert">{scheduleErr}</p>
					{/if}
					{#if scheduleOk}
						<p class="cdm-ok" role="status">{scheduleOk}</p>
					{/if}
					<button
						type="button"
						class="cdm-deploy"
						disabled={!teamScope.selectedTeamId || !scheduleStartLocal || scheduleSaveBusy}
						onclick={() => void submitScheduleEvent()}
					>
						{#if scheduleSaveBusy}
							Savingâ€¦
						{:else}
							Save event
						{/if}
					</button>
				</div>
			</div>
			<aside class="cdm-panel cdm-panel--payload" aria-labelledby="cdm-sch-list">
				<div class="cdm-panel__head">
					<span class="cdm-eyebrow">Ingested</span>
					<h2 id="cdm-sch-list" class="cdm-h2">Scheduled for this team</h2>
				</div>
				{#if scheduleRows.length === 0}
					<p class="cdm-muted">No team events in <code>team_workouts</code> yet.</p>
				{:else}
					<ul class="cdm-sch-list">
						{#each scheduleRows as ev (ev.id)}
							<li class="cdm-sch-li">
								<div class="cdm-sch-li__top">
									<span class="cdm-sch-pill"
										>{String(ev.eventKind || ev.type || 'â€”')}</span
									>
									<time class="cdm-sch-time">{formatScheduleStart(/** @type {*} */ (ev))}</time>
								</div>
								<p class="cdm-sch-name">{String(ev.name || 'â€”')}</p>
								<p class="cdm-sch-meta">
									<span>reminderOffsets: {JSON.stringify(ev.reminderOffsets || [])}</span>
									<br />
									<span class="cdm-mono"
										>startTimestamp: {String(ev.startTimestamp != null ? ev.startTimestamp : 'â€”')}</span
									>
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</aside>
		</div>
		{#if teamScope.selectedTeamId}
			<section class="cdm-panel cdm-panel--facility" aria-labelledby="cdm-facility-h">
				<div class="cdm-panel__head">
					<span class="cdm-eyebrow">Field booking</span>
					<h2 id="cdm-facility-h" class="cdm-h2">Facility scheduler</h2>
					<p class="cdm-muted" style="margin:0; font-size:0.8rem; max-width: 36rem">
						Check pitch availability and book practice or fixture blocks without double-booking.
					</p>
				</div>
				<FacilityScheduler teamId={teamScope.selectedTeamId} />
			</section>
		{/if}
	{:else}
	<nav class="coach-drill-z4-tabs" aria-label="Drill library sections">
		<button
			type="button"
			class="coach-drill-z4-tab"
			class:coach-drill-z4-tab--active={activeTab === 'team'}
			onclick={() => (activeTab = 'team')}
		>
			Custom drills
			<span class="coach-drill-z4-tab__count">{teamDrills.length}</span>
		</button>
		<button
			type="button"
			class="coach-drill-z4-tab"
			class:coach-drill-z4-tab--active={activeTab === 'platform'}
			onclick={() => (activeTab = 'platform')}
		>
			Platform basics
			<span class="coach-drill-z4-tab__count">{platformDrills.length}</span>
			<span class="coach-drill-z4-tab__count">{activeSportLabel}</span>
		</button>
	</nav>

	<div class="coach-drill-z1-well">
		<div class="coach-drill-z1-toolbar">
			<label class="coach-drill-z1-search">
				<Icon name="action.search" />
				<input
					type="search"
					placeholder="Search by title, category, or metricâ€¦"
					bind:value={searchTerm}
				/>
			</label>
		</div>
		{#if activeTab === 'team'}
			<p class="coach-drill-z1-hint">
				Team drills are yours to edit and deploy via Intent Engine. Recommend a strong drill to your director with Share with director â€” they add it to the club library after review.
			</p>
		{:else}
			<p class="coach-drill-z1-hint">
				Starter drills for {activeSportLabel}. Copy to your team library, then customize in Spatial designer or deploy from Assignments.
			</p>
		{/if}
		{#if copyPlatformMsg}
			<p class="coach-drill-z1-hint coach-drill-z1-hint--status" role="status">{copyPlatformMsg}</p>
		{/if}
		{#if loadError}
			<div class="coach-drill-z1-alert" role="alert">{loadError}</div>
		{/if}

		<div class="coach-drill-z2-grid" aria-label="Drill library">
			{#if activeTab === 'team' && loadingTeamDrills}
				<p class="coach-drill-z2-empty">Loading custom drillsâ€¦</p>
			{:else if activeTab === 'platform' && loadingPlatformDrills}
				<p class="coach-drill-z2-empty">Loading platform basicsâ€¦</p>
			{:else if visibleRows.length === 0}
				<p class="coach-drill-z2-empty">
					{#if activeTab === 'team'}
						No team drills yet. Use New drill, Spatial designer, or copy from Platform basics.
					{:else}
						No platform basics for {activeSportLabel} yet.
					{/if}
				</p>
			{:else}
				{#each visibleRows as row (row.id)}
					<article class="coach-drill-z2-card">
						<h2 class="coach-drill-z2-card__title">{row.title}</h2>
						{#if row.description}
							<p class="coach-drill-z2-card__desc">{row.description}</p>
						{/if}
						<div class="coach-drill-z2-card__labels">
							<span class="coach-drill-z2-label">{row.category}</span>
							<span class="coach-drill-z2-label">{row.metricType}</span>
							{#if row.source === 'platform'}
								<span class="coach-drill-z2-label coach-drill-z2-label--warn">Template</span>
							{/if}
						</div>
						<ul class="coach-drill-z2-card__meta">
							<li>
								<dl>
									<dt>Base XP</dt>
									<dd>{row.baseXp}</dd>
								</dl>
							</li>
							<li>
								<dl>
									<dt>Duration</dt>
									<dd>{row.durationMinutes}m</dd>
								</dl>
							</li>
						</ul>
						{#if row.videoUrl}
							<a
								class="coach-drill-z2-card__link"
								href={row.videoUrl}
								target="_blank"
								rel="noopener noreferrer"
							>
								<Icon name="status.circle-play" />
								<span>Watch</span>
							</a>
						{/if}
						<div class="coach-drill-z2-card__actions">
							{#if row.source === 'platform'}
								<button
									type="button"
									class="coach-drill-z2-btn coach-drill-z2-btn--assign"
									disabled={copyPlatformBusy || !teamScope.selectedTeamId}
									onclick={() => void copyPlatformToTeam(row)}
								>
									<Icon name="action.copy" />
									<span>Copy to team</span>
								</button>
							{:else}
								<button
									type="button"
									class="coach-drill-z2-btn coach-drill-z2-btn--assign"
									onclick={() => openAssign(row)}
								>
									<span>Assign</span>
								</button>
								<button
									type="button"
									class="coach-drill-z2-btn"
									onclick={() => void recommendToDirector(row)}
								>
									<Icon name="comm.send" />
									<span>Share</span>
								</button>
								<button
									type="button"
									class="coach-drill-z2-btn coach-drill-z2-btn--danger"
									onclick={() => deleteDrill(row)}
									aria-label={`Delete drill ${row.title}`}
								>
									<Icon name="action.delete" />
									<span>Delete</span>
								</button>
							{/if}
						</div>
					</article>
				{/each}
			{/if}
		</div>
	</div>
	{/if}
</section>
</div>

<Modal bind:open={addOpen} maxWidth="520px">
	{#snippet titleSlot()}
		Add Custom Drill
	{/snippet}
	<form class="coach-drill-form" onsubmit={(e) => { e.preventDefault(); void submitAddDrill(); }}>
		<label class="coach-drill-form__field">
			<span class="coach-drill-form__label">Title</span>
			<input
				type="text"
				bind:value={formTitle}
				maxlength="200"
				required
				placeholder="e.g. 30-Touch Ladder Warmup"
			/>
		</label>

		<label class="coach-drill-form__field">
			<span class="coach-drill-form__label">Category</span>
			<select bind:value={formCategory}>
				{#each DRILL_CATEGORIES as c}
					<option value={c}>{c}</option>
				{/each}
			</select>
		</label>

		<label class="coach-drill-form__field">
			<span class="coach-drill-form__label">Metric Type</span>
			<select bind:value={formMetricType}>
				{#each METRIC_TYPES as m}
					<option value={m.value}>{m.label}</option>
				{/each}
			</select>
		</label>

		<label class="coach-drill-form__field">
			<span class="coach-drill-form__label">Duration (minutes)</span>
			<input type="number" min="1" max="240" bind:value={formDuration} />
		</label>

		<label class="coach-drill-form__field">
			<span class="coach-drill-form__label">Video URL (optional)</span>
			<input
				type="url"
				bind:value={formVideoUrl}
				placeholder="https://youtube.com/watch?v=â€¦"
			/>
		</label>

		{#if addErr}
			<p class="coach-drill-form__err" role="alert">{addErr}</p>
		{/if}

		<div class="coach-drill-form__actions">
			<button type="button" class="coach-drill-z2-btn" onclick={() => (addOpen = false)}>
				Cancel
			</button>
			<button
				type="submit"
				class="coach-drill-z4-cta"
				disabled={addBusy}
			>
				{addBusy ? 'Savingâ€¦' : 'Save Drill'}
			</button>
		</div>
	</form>
</Modal>

<Modal bind:open={assignOpen} maxWidth="560px">
	{#snippet titleSlot()}
		Assign Homework
	{/snippet}
	{#if assignDrill}
		<div class="coach-drill-form">
			<div class="coach-drill-assign__drill">
				<span class="coach-drill-form__label">Drill</span>
				<strong>{assignDrill.title}</strong>
				<span class="coach-drill-z1-hint">{assignDrill.category} Â· metric: {assignDrill.metricType}</span>
			</div>

			<label class="coach-drill-form__field">
				<span class="coach-drill-form__label">Due date &amp; time</span>
				<input type="datetime-local" bind:value={assignDue} required />
			</label>

			<div class="coach-drill-assign__roster">
				<div class="coach-drill-assign__roster-head">
					<span class="coach-drill-form__label">Roster</span>
					<button type="button" class="coach-drill-z2-btn" onclick={toggleAllEmails}>
						{selectedEmails.size === roster.length && roster.length > 0 ? 'Clear all' : 'Select all'}
					</button>
				</div>
				{#if loadingRoster}
					<p class="coach-drill-z1-hint">Loading rosterâ€¦</p>
				{:else if roster.length === 0}
					<p class="coach-drill-z1-hint">No player accounts on this team yet.</p>
				{:else}
					<ul class="coach-drill-assign__list">
						{#each roster as p (p.email)}
							<li>
								<label class="coach-drill-assign__row">
									<input
										type="checkbox"
										checked={selectedEmails.has(p.email)}
										onchange={() => toggleEmail(p.email)}
									/>
									<span class="coach-drill-assign__name">{p.playerName}</span>
									<span class="coach-drill-assign__email">{p.email}</span>
								</label>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			{#if assignErr}
				<p class="coach-drill-form__err" role="alert">{assignErr}</p>
			{/if}
			{#if assignOk}
				<p class="coach-drill-form__ok" role="status">{assignOk}</p>
			{/if}

			<div class="coach-drill-form__actions">
				<button
					type="button"
					class="coach-drill-z2-btn"
					onclick={() => (assignOpen = false)}
				>
					Close
				</button>
				<button
					type="button"
					class="coach-drill-z4-cta"
					disabled={assignDisabled}
					onclick={submitAssign}
				>
					{assignBusy ? 'Dispatchingâ€¦' : `Assign to ${selectedEmails.size || 0}`}
				</button>
			</div>
		</div>
	{/if}
</Modal>

<style>
	.cdm-page {
		--cdm-bg: #000000;
		--cdm-panel: #05050a;
		--cdm-line: rgba(255, 255, 255, 0.1);
		--cdm-cyber: #00d4ff;
		--cdm-toxic: #2dd4bf;
		--cdm-threat: #ff6b00;
		background: var(--cdm-bg);
	}

	.cdm-grid {
		display: grid;
		grid-template-columns: minmax(16rem, 1fr) minmax(0, 1.2fr) minmax(14rem, 0.9fr);
		gap: var(--bento-gap-md);
		align-items: start;
		min-width: 0;
	}

	@media (max-width: 69rem) {
		.cdm-grid {
			grid-template-columns: 1fr;
		}
	}

	.cdm-panel {
		border: 1px solid var(--cdm-line);
		background: var(--cdm-panel);
		padding: 1rem 1.1rem;
		min-width: 0;
	}

	.cdm-panel__head {
		margin-bottom: 0.75rem;
	}

	.cdm-h2 {
		margin: 0.2rem 0 0;
		font-size: 0.85rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #f4f4f5;
	}

	.cdm-eyebrow {
		display: block;
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.45);
	}

	.cdm-muted {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0.5rem 0 0;
	}

	.cdm-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Consolas, monospace;
	}


	.cdm-field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-bottom: 0.85rem;
	}

	.cdm-select {
		min-height: 2.5rem;
		padding: 0 0.6rem;
		border: 1px solid var(--cdm-line);
		background: #000;
		color: #fff;
		font-size: 0.8rem;
	}


	.cdm-err {
		margin: 0 0 0.5rem;
		font-size: 0.75rem;
		color: #fca5a5;
	}

	.cdm-ok {
		margin: 0 0 0.5rem;
		font-size: 0.75rem;
		color: #86efac;
	}

	.cdm-deploy {
		width: 100%;
		min-height: 3.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		cursor: pointer;
		border: 1px solid rgba(0, 212, 255, 0.45);
		background: #000;
		color: #fff;
		transition: box-shadow 0.2s, border-color 0.2s;
	}

	.cdm-deploy:hover:not(:disabled) {
		border-color: var(--cdm-toxic);
		box-shadow: 0 0 32px rgba(57, 255, 20, 0.35), 0 0 20px rgba(0, 212, 255, 0.25);
	}

	.cdm-deploy:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.cdm-grid--schedule {
		align-items: start;
	}

	.cdm-sch-triggers {
		border: 1px solid var(--cdm-line, rgba(255, 255, 255, 0.1));
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		margin: 0 0 0.5rem;
	}

	.cdm-sch-toggles {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.25rem;
	}

	.cdm-sch-ch {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.cdm-sch-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		max-height: min(50vh, 420px);
		overflow: auto;
	}

	.cdm-sch-li {
		border: 1px solid var(--cdm-line, rgba(255, 255, 255, 0.1));
		border-radius: 0.5rem;
		padding: 0.6rem 0.75rem;
		background: #000;
	}

	.cdm-sch-li__top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.cdm-sch-pill {
		font-size: 0.6rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		padding: 0.2rem 0.45rem;
		border: 1px solid rgba(0, 212, 255, 0.35);
		color: var(--cdm-cyber, #14b8a6);
	}

	.cdm-sch-time {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.cdm-sch-name {
		margin: 0 0 0.35rem;
		font-size: 0.8rem;
		font-weight: 700;
	}

	.cdm-sch-meta {
		margin: 0;
		font-size: 0.6rem;
		line-height: 1.4;
		color: rgba(255, 255, 255, 0.45);
		word-break: break-word;
	}
</style>
