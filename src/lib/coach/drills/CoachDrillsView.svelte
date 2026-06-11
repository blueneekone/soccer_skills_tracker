<script lang="ts">
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

	const secureAssignHomework = httpsCallable(functions, 'secureAssignHomework');

	// ── Team context resolution ──────────────────────────────────────────────
	const teamScope = new CoachTeamScope({ preferProfileTeam: true });
	$effect(() => {
		teamScope.syncSelectedTeam();
	});

	const role = $derived(teamScope.role);
	const myTeams = $derived(teamScope.myTeams);
	const currentTeam = $derived(teamScope.currentTeam);

	/** @type {'library' | 'designer' | 'schedule'} */
	let pageView = $state('library');

	// Honor ?view= deep links (e.g. comms "Open training & schedule" CTA) — apply once.
	let _viewInit = false;
	$effect(() => {
		if (_viewInit) return;
		const v = page.url.searchParams.get('view');
		if (v === 'schedule' || v === 'designer' || v === 'library') pageView = v;
		_viewInit = true;
	});

	/** @type {'game' | 'practice'} */
	let scheduleEventKind = $state('practice');
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
		return '—';
	}

	$effect(() => {
		if (!teamScope.selectedTeamId) return;
		void workoutsStore.loadForTeam(teamScope.selectedTeamId);
	});

	// Mission deploy tab removed (Epic 8). Intents deploy via The Forge (/coach/forge).

	// ── Drill library data loads ─────────────────────────────────────────────
	/** @typedef {{ id: string, title: string, category: string, metricType: string, videoUrl: string, description: string, durationMinutes: number, baseXp: number, source: 'team' | 'platform', sportId?: string, createdBy?: string }} DrillRow */

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
				const snap = await getDocs(
					collection(db, 'teams', teamScope.selectedTeamId, 'drills'),
				);
				if (cancelled) return;
				const rows = snap.docs.map((d) => {
					const x = d.data() || {};
					return {
						id: d.id,
						title:
							typeof x.name === 'string' && x.name.trim() ?
								x.name.trim() :
								typeof x.title === 'string' ?
									x.title :
									'Untitled Drill',
						category:
							typeof x.category === 'string' ?
								x.category :
								typeof x.focusArea === 'string' ?
									x.focusArea :
									'General',
						metricType: typeof x.metricType === 'string' ? x.metricType : 'reps',
						videoUrl: typeof x.videoUrl === 'string' ? x.videoUrl : '',
						description: typeof x.description === 'string' ? x.description : '',
						durationMinutes:
							typeof x.durationMinutes === 'number' ? x.durationMinutes : 10,
						baseXp:
							typeof x.base_xp === 'number' && !Number.isNaN(x.base_xp) ?
								Math.floor(x.base_xp) :
								10,
						source: /** @type {'team'} */ ('team'),
						createdBy: typeof x.createdBy === 'string' ? x.createdBy : '',
					};
				});
				rows.sort((a, b) => a.title.localeCompare(b.title));
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

	// ── Tab + search ─────────────────────────────────────────────────────────
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

	// ── Add Drill modal ──────────────────────────────────────────────────────
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
			const description = `${formCategory} · metric: ${formMetricType}${formVideoUrl ? `\nVideo: ${formVideoUrl.trim()}` : ''}`;
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

	// ── Delete drill ─────────────────────────────────────────────────────────
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

	// ── Assign Homework modal ────────────────────────────────────────────────
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

	async function submitAssign() {
		if (assignDisabled || !assignDrill || !teamScope.selectedTeamId) return;
		assignBusy = true;
		assignErr = '';
		try {
			const due = new Date(assignDue);
			if (Number.isNaN(due.getTime())) {
				assignErr = 'Pick a valid due date and time.';
				return;
			}
			const res = await secureAssignHomework({
				teamId: teamScope.selectedTeamId,
				drillId: assignDrill.id,
				dueDate: due.toISOString(),
				playerEmails: Array.from(selectedEmails),
			});
			const count =
				res && typeof res.data === 'object' && res.data && 'assignedCount' in res.data ?
					Number(res.data.assignedCount) :
					selectedEmails.size;
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
	<title>Coach · Field Station · SSTRACKER</title>
</svelte:head>

<!-- Vanguard Drills — bg-[#020202] void root with native page scroll, no overflow traps. -->
<div class="tw-relative tw-min-h-screen tw-w-full tw-bg-[#020202] tw-px-3 tw-py-6 tw-font-mono tw-text-slate-200 sm:tw-px-5">
<section class="drill-lib cdm-page">
	<header class="drill-lib__head">
		<div>
			<h1 class="drill-lib__title">Field operations</h1>
			<p class="drill-lib__sub">
				Team › {currentTeam?.name || teamScope.selectedTeamId || '—'}
			</p>
			<nav class="cdm-seg" aria-label="Coach section">
				<a
					href="/coach/forge"
					class="cdm-seg__btn cdm-seg__btn--intent"
					title="Deploy macro-goal intents — individualized drills per player"
				>
					The Forge
				</a>
				<button
					type="button"
					class="cdm-seg__btn"
					class:cdm-seg__btn--on={pageView === 'library'}
					onclick={() => (pageView = 'library')}
				>
					Drill library
				</button>
				<button
					type="button"
					class="cdm-seg__btn"
					class:cdm-seg__btn--on={pageView === 'designer'}
					onclick={() => (pageView = 'designer')}
				>
					Spatial designer
				</button>
				<button
					type="button"
					class="cdm-seg__btn"
					class:cdm-seg__btn--on={pageView === 'schedule'}
					onclick={() => (pageView = 'schedule')}
				>
					Team schedule
				</button>
			</nav>
		</div>
		<div class="drill-lib__head-actions">
			{#if myTeams.length > 1}
				<label class="drill-lib__team-picker">
					<span class="sr-only">Team</span>
					<select bind:value={teamScope.selectedTeamId}>
						{#each myTeams as t (t.id)}
							<option value={t.id}>{t.name || t.id}</option>
						{/each}
					</select>
				</label>
			{/if}
			{#if pageView === 'library'}
				<button type="button" class="drill-lib__btn drill-lib__btn--primary" onclick={openAddDrill}>
					<Icon name="status.circle-plus" />
					<span>Add Drill</span>
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
							Saving…
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
										>{String(ev.eventKind || ev.type || '—')}</span
									>
									<time class="cdm-sch-time">{formatScheduleStart(/** @type {*} */ (ev))}</time>
								</div>
								<p class="cdm-sch-name">{String(ev.name || '—')}</p>
								<p class="cdm-sch-meta">
									<span>reminderOffsets: {JSON.stringify(ev.reminderOffsets || [])}</span>
									<br />
									<span class="cdm-mono"
										>startTimestamp: {String(ev.startTimestamp != null ? ev.startTimestamp : '—')}</span
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
	<nav class="drill-lib__tabs" aria-label="Drill library sections">
		<button
			type="button"
			class="drill-lib__tab"
			class:is-active={activeTab === 'team'}
			onclick={() => (activeTab = 'team')}
		>
			Custom Drills
			<span class="drill-lib__tab-count">{teamDrills.length}</span>
		</button>
		<button
			type="button"
			class="drill-lib__tab"
			class:is-active={activeTab === 'platform'}
			onclick={() => (activeTab = 'platform')}
		>
			Platform basics
			<span class="drill-lib__tab-hint">{activeSportLabel}</span>
			<span class="drill-lib__tab-count">{platformDrills.length}</span>
		</button>
	</nav>

	<div class="drill-lib__toolbar">
		<label class="drill-lib__search">
			<Icon name="action.search" />
			<input
				type="search"
				placeholder="Search by title, category, or metric…"
				bind:value={searchTerm}
			/>
		</label>
		{#if activeTab === 'team'}
			<p class="drill-lib__hint">
				Team drills are yours to edit and deploy via Intent Engine. Recommend a strong drill to your director with <strong>Share with director</strong> — they add it to the club library after review.
			</p>
		{:else}
			<p class="drill-lib__hint">
				Starter drills for {activeSportLabel}. Copy to your team library, then customize in Spatial designer or deploy from Assignments. Platform basics are read-only templates — not assigned directly.
			</p>
		{/if}
		{#if copyPlatformMsg}
			<p class="drill-lib__hint drill-lib__hint--status" role="status">{copyPlatformMsg}</p>
		{/if}
	</div>

	{#if loadError}
		<div class="drill-lib__alert" role="alert">{loadError}</div>
	{/if}

	<div class="drill-lib__table-wrap">
		<table class="drill-lib__table" aria-label="Drill library table">
			<thead>
				<tr>
					<th scope="col">Title</th>
					<th scope="col">Category</th>
					<th scope="col">Metric</th>
					<th scope="col">Video</th>
					<th scope="col" class="drill-lib__num-col">Base XP</th>
					<th scope="col" class="drill-lib__actions-col"><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			<tbody>
				{#if activeTab === 'team' && loadingTeamDrills}
					<tr><td colspan="6" class="drill-lib__empty">Loading custom drills…</td></tr>
				{:else if activeTab === 'platform' && loadingPlatformDrills}
					<tr><td colspan="6" class="drill-lib__empty">Loading platform basics…</td></tr>
				{:else if visibleRows.length === 0}
					<tr>
						<td colspan="6" class="drill-lib__empty">
							{#if activeTab === 'team'}
								No team drills yet. Use <strong>Add Drill</strong>, <strong>Spatial designer</strong>, or copy from Platform basics.
							{:else}
								No platform basics for {activeSportLabel} yet. Your org admin can seed multi-sport starter drills.
							{/if}
						</td>
					</tr>
				{:else}
					{#each visibleRows as row (row.id)}
						<tr>
							<td class="drill-lib__title-cell">
								<span class="drill-lib__title-text">{row.title}</span>
								{#if row.description}
									<span class="drill-lib__desc">{row.description}</span>
								{/if}
							</td>
							<td>
								<span class="drill-lib__chip">{row.category}</span>
							</td>
							<td>
								<span class="drill-lib__chip drill-lib__chip--alt">{row.metricType}</span>
							</td>
							<td>
								{#if row.videoUrl}
									<a
										class="drill-lib__video-link"
										href={row.videoUrl}
										target="_blank"
										rel="noopener noreferrer"
									>
										<Icon name="status.circle-play" />
										<span>Watch</span>
									</a>
								{:else}
									<span class="drill-lib__muted">—</span>
								{/if}
							</td>
							<td class="drill-lib__num-col tabular-num">{row.baseXp}</td>
							<td class="drill-lib__actions-col">
								{#if row.source === 'platform'}
									<button
										type="button"
										class="drill-lib__btn drill-lib__btn--ghost"
										disabled={copyPlatformBusy || !teamScope.selectedTeamId}
										onclick={() => void copyPlatformToTeam(row)}
									>
										<Icon name="action.copy" />
										<span>Copy to team</span>
									</button>
								{:else}
									<button
										type="button"
										class="drill-lib__btn drill-lib__btn--ghost"
										onclick={() => void recommendToDirector(row)}
									>
										<Icon name="comm.send" />
										<span>Share with director</span>
									</button>
									<button
										type="button"
										class="drill-lib__btn drill-lib__btn--ghost drill-lib__btn--danger"
										onclick={() => deleteDrill(row)}
										aria-label={`Delete drill ${row.title}`}
									>
										<Icon name="action.delete" />
										<span>Delete</span>
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
	{/if}
</section>
</div>

<Modal bind:open={addOpen} title="Add Custom Drill" maxWidth="520px">
	<form class="dl-form" onsubmit={(e) => { e.preventDefault(); void submitAddDrill(); }}>
		<label class="dl-field">
			<span class="dl-field__label">Title</span>
			<input
				type="text"
				bind:value={formTitle}
				maxlength="200"
				required
				placeholder="e.g. 30-Touch Ladder Warmup"
			/>
		</label>

		<label class="dl-field">
			<span class="dl-field__label">Category</span>
			<select bind:value={formCategory}>
				{#each DRILL_CATEGORIES as c}
					<option value={c}>{c}</option>
				{/each}
			</select>
		</label>

		<label class="dl-field">
			<span class="dl-field__label">Metric Type</span>
			<select bind:value={formMetricType}>
				{#each METRIC_TYPES as m}
					<option value={m.value}>{m.label}</option>
				{/each}
			</select>
		</label>

		<label class="dl-field">
			<span class="dl-field__label">Duration (minutes)</span>
			<input type="number" min="1" max="240" bind:value={formDuration} />
		</label>

		<label class="dl-field">
			<span class="dl-field__label">Video URL (optional)</span>
			<input
				type="url"
				bind:value={formVideoUrl}
				placeholder="https://youtube.com/watch?v=…"
			/>
		</label>

		{#if addErr}
			<p class="dl-form__err" role="alert">{addErr}</p>
		{/if}

		<div class="dl-form__actions">
			<button type="button" class="drill-lib__btn drill-lib__btn--ghost" onclick={() => (addOpen = false)}>
				Cancel
			</button>
			<button
				type="submit"
				class="drill-lib__btn drill-lib__btn--primary"
				disabled={addBusy}
			>
				{addBusy ? 'Saving…' : 'Save Drill'}
			</button>
		</div>
	</form>
</Modal>

<Modal bind:open={assignOpen} title="Assign Homework" maxWidth="560px">
	{#if assignDrill}
		<div class="dl-assign">
			<div class="dl-assign__drill">
				<span class="dl-assign__label">Drill</span>
				<strong>{assignDrill.title}</strong>
				<span class="dl-assign__meta">{assignDrill.category} · metric: {assignDrill.metricType}</span>
			</div>

			<label class="dl-field">
				<span class="dl-field__label">Due date &amp; time</span>
				<input type="datetime-local" bind:value={assignDue} required />
			</label>

			<div class="dl-assign__roster">
				<div class="dl-assign__roster-head">
					<span class="dl-field__label">Roster</span>
					<button type="button" class="drill-lib__btn drill-lib__btn--ghost" onclick={toggleAllEmails}>
						{selectedEmails.size === roster.length && roster.length > 0 ? 'Clear all' : 'Select all'}
					</button>
				</div>
				{#if loadingRoster}
					<p class="drill-lib__hint">Loading roster…</p>
				{:else if roster.length === 0}
					<p class="drill-lib__hint">No player accounts on this team yet.</p>
				{:else}
					<ul class="dl-assign__list">
						{#each roster as p (p.email)}
							<li>
								<label class="dl-assign__row">
									<input
										type="checkbox"
										checked={selectedEmails.has(p.email)}
										onchange={() => toggleEmail(p.email)}
									/>
									<span class="dl-assign__name">{p.playerName}</span>
									<span class="dl-assign__email">{p.email}</span>
								</label>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			{#if assignErr}
				<p class="dl-form__err" role="alert">{assignErr}</p>
			{/if}
			{#if assignOk}
				<p class="dl-form__ok" role="status">{assignOk}</p>
			{/if}

			<div class="dl-form__actions">
				<button
					type="button"
					class="drill-lib__btn drill-lib__btn--ghost"
					onclick={() => (assignOpen = false)}
				>
					Close
				</button>
				<button
					type="button"
					class="drill-lib__btn drill-lib__btn--primary"
					disabled={assignDisabled}
					onclick={submitAssign}
				>
					{assignBusy ? 'Dispatching…' : `Assign to ${selectedEmails.size || 0}`}
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

	.drill-lib {
		display: flex;
		flex-direction: column;
		gap: var(--bento-gap-md);
		padding: var(--bento-pad) var(--bento-pad) 48px;
		color: var(--text-primary, #fafafa);
	}

	.cdm-seg {
		display: inline-flex;
		gap: 4px;
		margin-top: 12px;
		padding: 4px;
		border: 1px solid var(--cdm-line);
		background: var(--cdm-panel);
	}

	.cdm-seg__btn {
		padding: 6px 14px;
		font-size: 0.65rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		border: 0;
		background: transparent;
		color: rgba(255, 255, 255, 0.45);
		cursor: pointer;
	}

	.cdm-seg__btn--on {
		background: #000;
		color: var(--cdm-cyber);
		box-shadow: 0 0 14px rgba(0, 212, 255, 0.2);
	}

	.cdm-seg__btn--intent {
		color: #a855f7;
		border: 1px solid rgba(168, 85, 247, 0.3);
		text-decoration: none;
		display: inline-flex;
		align-items: center;
	}

	.cdm-seg__btn--intent:hover {
		background: rgba(168, 85, 247, 0.1);
		box-shadow: 0 0 14px rgba(168, 85, 247, 0.2);
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

	.cdm-cyber {
		color: var(--cdm-cyber);
	}

	.cdm-orange {
		color: var(--cdm-threat);
	}

	.cdm-toggle {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
		margin-bottom: 1rem;
	}

	.cdm-toggle__btn {
		padding: 0.5rem 0.4rem;
		font-size: 0.6rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		border: 1px solid var(--cdm-line);
		background: #000;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
	}

	.cdm-toggle__btn--on {
		border-color: var(--cdm-cyber);
		color: #fff;
		box-shadow: 0 0 16px rgba(0, 212, 255, 0.15);
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

	.cdm-roster {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 280px;
		overflow: auto;
		border: 1px solid var(--cdm-line);
	}

	.cdm-roster__row {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 0.5rem 0.65rem;
		border-bottom: 1px solid var(--cdm-line);
		font-size: 0.72rem;
	}

	.cdm-roster__row:last-child {
		border-bottom: 0;
	}

	.cdm-roster__em {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.35);
	}

	.cdm-gauge {
		margin-bottom: 1rem;
	}

	.cdm-gauge__head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 0.35rem;
	}

	.cdm-range {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 0.4rem;
		background: #000;
		border: 1px solid var(--cdm-line);
	}

	.cdm-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 14px;
		height: 14px;
		background: #000;
		border: 2px solid var(--cdm-cyber);
		box-shadow: 0 0 8px var(--cdm-cyber);
	}

	.cdm-range--rpe::-webkit-slider-thumb {
		border-color: var(--cdm-threat);
		box-shadow: 0 0 8px var(--cdm-threat);
	}

	.cdm-bounty {
		padding: 1rem;
		border: 1px solid rgba(57, 255, 20, 0.25);
		background: #000;
		margin-bottom: 0.75rem;
	}

	.cdm-bounty__val {
		margin: 0.3rem 0 0;
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--cdm-toxic);
		text-shadow: 0 0 20px rgba(57, 255, 20, 0.35);
	}

	.cdm-hint {
		margin: 0 0 1rem;
		font-size: 0.65rem;
		line-height: 1.45;
		color: rgba(255, 255, 255, 0.4);
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

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.tabular-num {
		font-variant-numeric: tabular-nums;
	}

	.drill-lib__head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.drill-lib__title {
		margin: 0 0 4px;
		font-size: clamp(1.4rem, 3.2vw, 1.75rem);
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.drill-lib__sub {
		margin: 0;
		font-size: 0.85rem;
		color: #a1a1aa;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 700;
	}

	.drill-lib__head-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		align-items: center;
	}

	.drill-lib__team-picker select {
		height: 40px;
		padding: 0 12px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: #18181b;
		color: #fafafa;
		font-size: 13.5px;
		min-width: 200px;
	}

	.drill-lib__btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 40px;
		padding: 0 16px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: #18181b;
		color: #fafafa;
		font-weight: 700;
		font-size: 13.5px;
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease, transform 0.05s ease;
	}

	.drill-lib__btn:hover {
		background: #27272a;
	}

	.drill-lib__btn:active {
		transform: translateY(1px);
	}

	.drill-lib__btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.drill-lib__btn--primary {
		background: linear-gradient(135deg, #6366f1, #4f46e5);
		border-color: transparent;
		color: #fff;
	}

	.drill-lib__btn--primary:hover {
		background: linear-gradient(135deg, #6366f1, #4338ca);
	}

	.drill-lib__btn--ghost {
		background: transparent;
		border-color: rgba(255, 255, 255, 0.14);
	}

	.drill-lib__btn--danger {
		color: #fca5a5;
		border-color: rgba(248, 113, 113, 0.35);
	}

	.drill-lib__btn--danger:hover {
		background: rgba(248, 113, 113, 0.12);
	}

	.drill-lib__tabs {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px;
		border-radius: 12px;
		background: #18181b;
		border: 1px solid rgba(255, 255, 255, 0.06);
		align-self: flex-start;
	}

	.drill-lib__tab {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 34px;
		padding: 0 14px;
		border-radius: 8px;
		background: transparent;
		border: 0;
		color: #d4d4d8;
		font-weight: 700;
		font-size: 13px;
		cursor: pointer;
	}

	.drill-lib__tab.is-active {
		background: #27272a;
		color: #fafafa;
	}

	.drill-lib__tab-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 22px;
		height: 20px;
		padding: 0 6px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		font-size: 11px;
		font-weight: 800;
	}

	.drill-lib__toolbar {
		display: flex;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
	}

	.drill-lib__search {
		position: relative;
		flex: 1 1 280px;
		max-width: 420px;
	}

	.drill-lib__search :global(svg) {
		position: absolute;
		top: 50%;
		left: 12px;
		transform: translateY(-50%);
		color: #a1a1aa;
		width: 16px;
		height: 16px;
		pointer-events: none;
	}

	.drill-lib__search input {
		width: 100%;
		height: 40px;
		padding: 0 14px 0 2.5rem;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: #18181b;
		color: #fafafa;
		font-size: 13.5px;
		line-height: 1;
	}

	.drill-lib__hint {
		margin: 0;
		font-size: 12.5px;
		color: #a1a1aa;
		line-height: 1.5;
		max-width: 560px;
	}

	.drill-lib__alert {
		padding: 12px 14px;
		border-radius: 10px;
		background: rgba(248, 113, 113, 0.1);
		border: 1px solid rgba(248, 113, 113, 0.35);
		color: #fecaca;
		font-size: 13px;
	}

	.drill-lib__table-wrap {
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 14px;
		overflow: hidden;
		background: #09090b;
	}

	.drill-lib__table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
	}

	.drill-lib__table thead th {
		text-align: left;
		padding: 12px 16px;
		font-size: 11.5px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #a1a1aa;
		background: #18181b;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.drill-lib__table tbody td {
		padding: 14px 16px;
		border-top: 1px solid rgba(255, 255, 255, 0.04);
		vertical-align: middle;
		font-size: 13.5px;
		color: #fafafa;
	}

	.drill-lib__table tbody tr:first-child td {
		border-top: 0;
	}

	.drill-lib__table tbody tr:hover td {
		background: rgba(255, 255, 255, 0.02);
	}

	.drill-lib__title-cell {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 200px;
	}

	.drill-lib__title-text {
		font-weight: 700;
	}

	.drill-lib__desc {
		font-size: 12px;
		color: #a1a1aa;
		white-space: pre-wrap;
	}

	.drill-lib__chip {
		display: inline-block;
		padding: 4px 10px;
		border-radius: 999px;
		background: rgba(99, 102, 241, 0.14);
		color: #c7d2fe;
		font-size: 11.5px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.drill-lib__chip--alt {
		background: rgba(16, 185, 129, 0.14);
		color: #6ee7b7;
	}

	.drill-lib__video-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: #93c5fd;
		font-weight: 700;
		font-size: 13px;
		text-decoration: none;
	}

	.drill-lib__video-link:hover {
		text-decoration: underline;
	}

	.drill-lib__muted {
		color: #52525b;
	}

	.drill-lib__num-col {
		text-align: right;
		width: 110px;
	}

	.drill-lib__actions-col {
		width: 140px;
		text-align: right;
	}

	.drill-lib__empty {
		padding: 28px 16px;
		text-align: center;
		color: #a1a1aa;
		font-size: 13.5px;
	}

	/* Modal form styles */
	.dl-form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.dl-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.dl-field__label {
		font-size: 12px;
		font-weight: 700;
		color: #a1a1aa;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.dl-field input,
	.dl-field select {
		height: 40px;
		padding: 0 12px;
		border-radius: 10px;
		border: 1px solid rgba(0, 0, 0, 0.12);
		background: #fff;
		color: #18181b;
		font-size: 14px;
	}

	:global(html.dark) .dl-field input,
	:global(html.dark) .dl-field select {
		background: #18181b;
		color: #fafafa;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.dl-form__actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 6px;
	}

	.dl-form__err {
		margin: 0;
		padding: 10px 12px;
		border-radius: 8px;
		background: rgba(248, 113, 113, 0.12);
		color: #b91c1c;
		font-size: 13px;
	}

	.dl-form__ok {
		margin: 0;
		padding: 10px 12px;
		border-radius: 8px;
		background: rgba(34, 197, 94, 0.12);
		color: #15803d;
		font-size: 13px;
	}

	/* Assign modal */
	.dl-assign {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.dl-assign__drill {
		padding: 12px 14px;
		border-radius: 10px;
		background: rgba(99, 102, 241, 0.08);
		border: 1px solid rgba(99, 102, 241, 0.2);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.dl-assign__label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #6366f1;
		font-weight: 800;
	}

	.dl-assign__meta {
		font-size: 12.5px;
		color: #a1a1aa;
	}

	.dl-assign__roster-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}

	.dl-assign__list {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 10px;
	}

	:global(html.dark) .dl-assign__list {
		border-color: rgba(255, 255, 255, 0.08);
	}

	.dl-assign__row {
		display: grid;
		grid-template-columns: 24px 1fr auto;
		gap: 10px;
		align-items: center;
		padding: 10px 12px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		cursor: pointer;
	}

	:global(html.dark) .dl-assign__row {
		border-bottom-color: rgba(255, 255, 255, 0.06);
	}

	.dl-assign__list li:last-child .dl-assign__row {
		border-bottom: 0;
	}

	.dl-assign__name {
		font-weight: 700;
		font-size: 13.5px;
	}

	.dl-assign__email {
		font-size: 12px;
		color: #a1a1aa;
	}
</style>
