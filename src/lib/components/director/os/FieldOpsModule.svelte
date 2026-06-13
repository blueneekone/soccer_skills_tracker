<script lang="ts">
	import { browser } from '$app/environment';
	import { getContext } from 'svelte';
	import { db, functions } from '$lib/firebase.js';
	import { collection, query, where, onSnapshot } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import { isSubscriptionReadOnly } from '$lib/auth/billing.js';
	import { saveTeamScheduledEvent } from '$lib/stores/workouts.svelte.js';
	/** Epic 17 — static vault + facility drawer (logistics map, address, routing URL). */
	import FacilityMapVault from '$lib/components/field-ops/FacilityMapVault.svelte';
	import DeploymentCalendar from '$lib/components/director/os/DeploymentCalendar.svelte';
	import TryoutsProgramsPanel from '$lib/components/director/os/TryoutsProgramsPanel.svelte';
	import { syncFacilityToLegacyField } from '$lib/director/fieldOps/syncFacilityToLegacyField.js';

	let { clubId: clubIdProp = '' } = $props();

	/**
	 * Prefer parent prop; else mirror director tenant resolution (switcher → profile →
	 * license JWT claim → first club). Avoids "No club scope" while teams hydrate.
	 */
	const resolvedClubId = $derived.by(() => {
		const fromProp =
			typeof clubIdProp === 'string' ? clubIdProp.trim() : '';
		if (fromProp) return fromProp;

		const activeCtx =
			typeof workspaceContextStore.activeClubId === 'string' ?
				workspaceContextStore.activeClubId.trim() :
				'';
		if (
			activeCtx &&
			teamsStore.loaded &&
			teamsStore.clubs.some((c) => c.id === activeCtx)
		) {
			return activeCtx;
		}

		const prof = authStore.userProfile;
		const rawProfileId =
			typeof prof?.clubId === 'string' ? prof.clubId.trim() : '';
		if (rawProfileId && rawProfileId !== 'admin') return rawProfileId;

		const lic =
			typeof licenseEntitlementStore.clubIdResolved === 'string' ?
				licenseEntitlementStore.clubIdResolved.trim() :
				'';
		if (lic) return lic;

		if (teamsStore.loaded && teamsStore.clubs.length > 0) {
			return teamsStore.clubs[0].id;
		}

		return '';
	});

	const isReadOnly = $derived(
		isSubscriptionReadOnly(
			authStore.role,
			licenseEntitlementStore.clubIdResolved,
			licenseEntitlementStore.entitlement,
			{
				clubInfinite: licenseEntitlementStore.isInfiniteClub,
				billingModel: licenseEntitlementStore.billingModel
			}
		)
	);

	/** @type {() => void} */
	const openReadOnlyUpgrade = getContext('openReadOnlyUpgrade') || (() => {});

	/** Epic 5.4 — weather status for director advisory banners. */
	let weatherFacilityStatuses = $state(
		/** @type {Array<{ id: string; status?: string; lockReason?: string }>} */ ([]),
	);

	const weatherLockedFacilities = $derived(
		weatherFacilityStatuses.filter((f) => f.status === 'locked'),
	);
	const weatherAdvisoryFacilities = $derived(
		weatherFacilityStatuses.filter((f) => f.status === 'advisory'),
	);

	$effect(() => {
		if (!browser || !resolvedClubId) {
			weatherFacilityStatuses = [];
			return;
		}
		const wq = query(
			collection(db, 'field_weather_status'),
			where('clubId', '==', resolvedClubId),
		);
		return onSnapshot(wq, (snap) => {
			weatherFacilityStatuses = snap.docs.map((d) => ({
				id: d.id,
				...(d.data() || {}),
			}));
		});
	});

	const directorUpsertField = httpsCallable(functions, 'directorUpsertField');
	const secureBookField = httpsCallable(functions, 'secureBookField');

	/** Minutes from midnight; 6:00–22:00 = 32 half-hour slots */
	const DAY_START_MIN = 6 * 60;
	const DAY_END_MIN = 22 * 60;
	const SLOT_MIN = 30;
	const NUM_SLOTS = (DAY_END_MIN - DAY_START_MIN) / SLOT_MIN;

	let fields = $state(/** @type {Array<{ id: string; name: string; location?: string; status?: string }>} */ ([]));
	/** Facilities from the map vault — synced into `fields` when missing. */
	let mapFacilities = $state(/** @type {Array<{ id: string; name: string; address?: string; status?: string }>} */ ([]));
	const syncedFacilityIds = new Set<string>();
	let fieldId = $state('');
	let scheduleDate = $state(
		typeof Intl !== 'undefined' ?
			new Date().toISOString().slice(0, 10) :
			'2026-01-01'
	);
	let schedules = $state(
		/** @type {Array<{ id: string; teamId: string; startTime: Date; endTime: Date; activityType: string }>} */ (
			[]
		)
	);
	let newFieldName = $state('');
	let newFieldLocation = $state('');
	let savingField = $state(false);
	let bookingTeamId = $state('');
	let activityType = $state('Practice');
	let startTimeInput = $state('18:00');
	let endTimeInput = $state('19:00');
	/** Notification trigger toggles (persisted to `team_workouts` for reminder dispatch) */
	let notify1h = $state(false);
	let notify30m = $state(true);
	let notifyMorning = $state(false);
	/** Opt-in: fires a team_broadcasts entry via safeSportBroadcast after event save. Default OFF. */
	let announceToTeam = $state(false);
	let booking = $state(false);
	let conflictMsg = $state(/** @type {string | null} */ (null));
	let dragTeamId = $state(/** @type {string | null} */ (null));
	let dropHintSlot = $state(/** @type {number | null} */ (null));

	const clubTeams = $derived(
		teamsStore.teams.filter((t) => t.clubId === resolvedClubId)
	);

	function pad2(n) {
		return n < 10 ? `0${n}` : `${n}`;
	}

	function slotToDate(slotIdx) {
		const [y, mo, d] = scheduleDate.split('-').map(Number);
		const base = new Date(y, mo - 1, d);
		const mins = DAY_START_MIN + slotIdx * SLOT_MIN;
		base.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
		return base;
	}

	function parseTimeOnDate(timeStr) {
		const [y, mo, d] = scheduleDate.split('-').map(Number);
		const [hh, mm] = timeStr.split(':').map((x) => parseInt(x, 10));
		const dt = new Date(y, mo - 1, d);
		dt.setHours(hh || 0, mm || 0, 0, 0);
		return dt;
	}

	function rangesOverlap(aStart, aEnd, bStart, bEnd) {
		return aStart < bEnd && bStart < aEnd;
	}

	function findConflictName(startD, endD) {
		for (const s of schedules) {
			if (rangesOverlap(startD, endD, s.startTime, s.endTime)) {
				const t = clubTeams.find((x) => x.id === s.teamId);
				return t?.name || s.teamId;
			}
		}
		return null;
	}

	function checkFormConflict() {
		const startD = parseTimeOnDate(startTimeInput);
		const endD = parseTimeOnDate(endTimeInput);
		conflictMsg = null;
		if (startD >= endD) return;
		const name = findConflictName(startD, endD);
		if (name) {
			conflictMsg = `Conflict: overlaps with ${name}. Choose another time.`;
		}
	}

	$effect(() => {
		startTimeInput;
		endTimeInput;
		schedules;
		checkFormConflict();
	});

	$effect(() => {
		if (!resolvedClubId) {
			fields = [];
			mapFacilities = [];
			return;
		}
		const q = query(collection(db, 'fields'), where('clubId', '==', resolvedClubId));
		const unsub = onSnapshot(
			q,
			(snap) => {
				fields = snap.docs.map((d) => ({
					id: d.id,
					name: typeof d.data().name === 'string' ? d.data().name : d.id,
					location: d.data().location,
					status: d.data().status
				}));
				if (fields.length > 0 && !fieldId) fieldId = fields[0].id;
			},
			(e) => console.error('[FieldOpsModule] fields', e)
		);
		const fq = collection(db, 'clubs', resolvedClubId, 'facilities');
		const unsubFac = onSnapshot(
			fq,
			(snap) => {
				mapFacilities = snap.docs.map((d) => {
					const x = d.data();
					return {
						id: d.id,
						name: typeof x.name === 'string' ? x.name : d.id,
						address: typeof x.address === 'string' ? x.address : '',
						status: typeof x.status === 'string' ? x.status : 'Active',
					};
				});
			},
			(e) => console.error('[FieldOpsModule] map facilities', e),
		);
		return () => {
			unsub();
			unsubFac();
		};
	});

	/** Backfill legacy `fields` docs for facilities registered before the bridge shipped. */
	$effect(() => {
		const cid = resolvedClubId;
		if (!cid || isReadOnly || mapFacilities.length === 0) return;
		const fieldIds = new Set(fields.map((f) => f.id));
		for (const fac of mapFacilities) {
			if (fieldIds.has(fac.id) || syncedFacilityIds.has(fac.id)) continue;
			syncedFacilityIds.add(fac.id);
			void syncFacilityToLegacyField({
				fieldId: fac.id,
				clubId: cid,
				name: fac.name,
				location: fac.address ?? '',
				status: fac.status,
			}).catch((e) => {
				syncedFacilityIds.delete(fac.id);
				console.error('[FieldOpsModule] facility backfill', e);
			});
		}
	});

	$effect(() => {
		if (!fieldId || !scheduleDate) {
			schedules = [];
			return;
		}
		const q = query(
			collection(db, 'fields', fieldId, 'schedules'),
			where('scheduleDate', '==', scheduleDate)
		);
		const unsub = onSnapshot(
			q,
			(snap) => {
				schedules = snap.docs
					.map((d) => {
						const x = d.data();
						const st = x.startTime?.toDate ? x.startTime.toDate() : null;
						const en = x.endTime?.toDate ? x.endTime.toDate() : null;
						if (!st || !en) return null;
						return {
							id: d.id,
							teamId: typeof x.teamId === 'string' ? x.teamId : '',
							startTime: st,
							endTime: en,
							activityType:
								x.activityType === 'Game' ? 'Game' : 'Practice'
						};
					})
					.filter(Boolean);
			},
			(e) => console.error('[FieldOpsModule] schedules', e)
		);
		return () => unsub();
	});

	function blockStyle(s) {
		const startMin =
			s.startTime.getHours() * 60 + s.startTime.getMinutes();
		const endMin = s.endTime.getHours() * 60 + s.endTime.getMinutes();
		const i0 = Math.max(0, Math.floor((startMin - DAY_START_MIN) / SLOT_MIN));
		const i1 = Math.min(
			NUM_SLOTS,
			Math.ceil((endMin - DAY_START_MIN) / SLOT_MIN)
		);
		const span = Math.max(1, i1 - i0);
		const left = (i0 / NUM_SLOTS) * 100;
		const width = (span / NUM_SLOTS) * 100;
		return `left:${left}%;width:${width}%;`;
	}

	function teamName(tid) {
		const t = clubTeams.find((x) => x.id === tid);
		return t?.name || tid;
	}

	async function addField() {
		if (isReadOnly) {
			openReadOnlyUpgrade();
			return;
		}
		if (!resolvedClubId || !newFieldName.trim()) return;
		savingField = true;
		try {
			const slug = newFieldName
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '_')
				.replace(/^_|_$/g, '')
				.slice(0, 64);
			const fid = `${resolvedClubId}_${slug || 'field'}_${Date.now().toString(36)}`;
			await directorUpsertField({
				fieldId: fid,
				clubId: resolvedClubId,
				name: newFieldName.trim(),
				location: newFieldLocation.trim(),
				status: 'active'
			});
			fieldId = fid;
			newFieldName = '';
			newFieldLocation = '';
		} catch (e) {
			alert(e instanceof Error ? e.message : String(e));
		} finally {
			savingField = false;
		}
	}

	async function submitBooking() {
		if (isReadOnly) {
			openReadOnlyUpgrade();
			return;
		}
		if (!fieldId || !bookingTeamId || !scheduleDate) return;
		const startD = parseTimeOnDate(startTimeInput);
		const endD = parseTimeOnDate(endTimeInput);
		if (startD >= endD) {
			alert('End time must be after start time.');
			return;
		}
		const c = findConflictName(startD, endD);
		if (c) {
			conflictMsg = `Conflict: overlaps with ${c}.`;
			return;
		}
		booking = true;
		conflictMsg = null;
		try {
			await secureBookField({
				fieldId,
				teamId: bookingTeamId,
				scheduleDate,
				startTime: startD.toISOString(),
				endTime: endD.toISOString(),
				activityType
			});
			const rKeys = /** @type {string[]} */ ([]);
			if (notify1h) {
				rKeys.push('h1');
			}
			if (notify30m) {
				rKeys.push('m30');
			}
			if (notifyMorning) {
				rKeys.push('morning');
			}
			try {
			await saveTeamScheduledEvent({
				teamId: bookingTeamId,
				eventKind: activityType,
				title: '',
				startAt: startD,
				endAt: endD,
				reminderKeys: rKeys,
				source: 'field_booking',
				fieldId,
				scheduleDate,
				announceToTeam
			});
			} catch (e2) {
				const msg2 =
					e2 && typeof e2 === 'object' && 'message' in e2 ?
						String(/** @type {{ message?: string }} */ (e2).message) :
						String(e2);
				console.error('[FieldOps] reminder payload write', e2);
				alert(
					`Field was booked, but saving notification settings failed: ${msg2}. You can re-enter this session in the coach Team schedule tab.`,
				);
			}
		} catch (e) {
			const msg =
				e && typeof e === 'object' && 'message' in e ?
					String(/** @type {{ message?: string }} */ (e).message) :
					String(e);
			alert(msg);
		} finally {
			booking = false;
		}
	}

	function onDragStart(teamId, e) {
		if (isReadOnly) {
			e.preventDefault();
			openReadOnlyUpgrade();
			return;
		}
		dragTeamId = teamId;
		e.dataTransfer?.setData('text/plain', teamId);
		e.dataTransfer.effectAllowed = 'copy';
	}

	function onDragOver(slotIdx, e) {
		e.preventDefault();
		dropHintSlot = slotIdx;
	}

	function onDragLeave() {
		dropHintSlot = null;
	}

	function onDrop(slotIdx, e) {
		e.preventDefault();
		if (isReadOnly) {
			openReadOnlyUpgrade();
			return;
		}
		dropHintSlot = null;
		const tid =
			dragTeamId ||
			(e.dataTransfer && e.dataTransfer.getData('text/plain')) ||
			'';
		dragTeamId = null;
		if (!tid) return;
		bookingTeamId = tid;
		const startD = slotToDate(slotIdx);
		const endD = slotToDate(slotIdx + 2);
		startTimeInput = `${pad2(startD.getHours())}:${pad2(startD.getMinutes())}`;
		endTimeInput = `${pad2(endD.getHours())}:${pad2(endD.getMinutes())}`;
		const c = findConflictName(startD, endD);
		if (c) {
			conflictMsg = `Conflict warning: ${c} already holds part of this window. Adjust times or pick another slot.`;
		} else {
			conflictMsg = null;
		}
	}

	const rulerHours = [6, 8, 10, 12, 14, 16, 18, 20, 22];

	function formatRulerHour(h) {
		if (h === 12) return '12p';
		if (h < 12) return `${h}a`;
		return `${h - 12}p`;
	}
</script>

<div class="director-field-ops-map field-ops-root">
	<TryoutsProgramsPanel clubId={resolvedClubId} />
	<header class="director-field-ops-z4-head">
		<h3 class="director-field-ops-z4-head__title">Field ops</h3>
		<p class="director-field-ops-z4-head__lede">
			Master schedule for your pitches — conflicts are blocked server-side.
		</p>
	</header>

	{#if weatherLockedFacilities.length > 0}
		<div class="director-field-ops-z3-weather director-field-ops-z3-weather--lock" role="status">
			<p class="director-field-ops-z3-weather__title">Weather lock active</p>
			<p class="director-field-ops-z3-weather__body">
				{weatherLockedFacilities.length} field{weatherLockedFacilities.length === 1 ? '' : 's'}
				locked — new deployments blocked until status clears.
				{#if weatherLockedFacilities[0]?.lockReason}
					({weatherLockedFacilities[0].lockReason})
				{/if}
			</p>
		</div>
	{:else if weatherAdvisoryFacilities.length > 0}
		<div class="director-field-ops-z3-weather director-field-ops-z3-weather--advisory" role="status">
			<p class="director-field-ops-z3-weather__title">Weather advisory</p>
			<p class="director-field-ops-z3-weather__body">
				{weatherAdvisoryFacilities.length} field{weatherAdvisoryFacilities.length === 1 ? '' : 's'}
				under watch — deployments allowed but verify conditions.
				{#if weatherAdvisoryFacilities[0]?.lockReason}
					({weatherAdvisoryFacilities[0].lockReason})
				{/if}
			</p>
		</div>
	{/if}

	{#if resolvedClubId}
		<div class="director-field-ops-z1-well">
			<div class="director-field-ops-z1-well__inner field-ops-split">
				<div class="director-field-ops-z2-panel">
					<DeploymentCalendar
						clubId={resolvedClubId}
						canManage={!isReadOnly}
						embedded
					/>
				</div>
				<div class="director-field-ops-z2-panel">
					<FacilityMapVault clubId={resolvedClubId} canManage={!isReadOnly} embedded />
				</div>
			</div>
		</div>

		<div class="director-field-ops-controls">
			<p class="director-field-ops-meta">
				<strong>Unified field registry:</strong>
				Facilities registered in the Facility Map sync to the pitch schedule automatically —
				deployments and bookings share the same field ids.
			</p>
			<label class="director-field-ops-field-label">
				Field
				<select class="director-field-ops-control director-field-ops-control--wide" bind:value={fieldId}>
					{#each fields as f (f.id)}
						<option value={f.id}>{f.name}</option>
					{/each}
				</select>
			</label>
			<label class="director-field-ops-field-label">
				Date
				<input type="date" bind:value={scheduleDate} class="director-field-ops-control" />
			</label>
		</div>

		{#if fields.length === 0}
			<div class="director-field-ops-empty-add">
				<input
					class="director-field-ops-control"
					placeholder="Field name (e.g. North Pitch)"
					bind:value={newFieldName}
				/>
				<input
					class="director-field-ops-control"
					placeholder="Location (optional)"
					bind:value={newFieldLocation}
				/>
				<button
					type="button"
					class="director-field-ops-btn-sync director-field-ops-btn-sync--block"
					class:dir-os-btn--readonly={isReadOnly}
					disabled={savingField || !newFieldName.trim()}
					onclick={addField}
				>
					{savingField ? 'Saving…' : 'Add first field'}
				</button>
			</div>
		{:else}
			<!-- CSS Grid timeline: hour row + slot row + overlay blocks -->
			<div class="dir-field-master" style="--dir-field-slots: {NUM_SLOTS};">
				<div class="dir-field-hour-ruler">
					{#each rulerHours as h}
						<span>{formatRulerHour(h)}</span>
					{/each}
				</div>

				<div class="dir-field-track-wrap">
					<div
						class="dir-field-slots-grid"
						style="grid-template-columns: repeat({NUM_SLOTS}, minmax(0, 1fr));"
					>
						{#each Array(NUM_SLOTS) as _, slotIdx}
							<div
								class="dir-field-slot"
								class:dir-field-slot--hint={dropHintSlot === slotIdx}
								role="button"
								tabindex="0"
								ondragover={(e) => onDragOver(slotIdx, e)}
								ondragleave={onDragLeave}
								ondrop={(e) => onDrop(slotIdx, e)}
							></div>
						{/each}
					</div>
					<div class="dir-field-blocks-layer" aria-hidden="true">
						{#each schedules as s}
							<div
								class="dir-field-block"
								title="{teamName(s.teamId)} · {s.activityType}"
								style={blockStyle(s)}
							>
								<span class="dir-field-block-text">{teamName(s.teamId)}</span>
								<span class="dir-field-block-sub">{s.activityType}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<p class="director-field-ops-hint">
				Drag a team onto a slot to draft a 1-hour window (adjust below). Booked times use data-cyan
				telemetry blocks.
			</p>

			<div class="director-field-ops-teams">
				<span class="director-field-ops-teams__label">Teams</span>
				{#each clubTeams as t}
					<button
						type="button"
						class="dir-field-team-chip"
						class:dir-field-team-chip--readonly={isReadOnly}
						draggable={!isReadOnly}
						ondragstart={(e) => onDragStart(t.id, e)}
					>
						{t.name}
					</button>
				{/each}
			</div>

			<div class="director-field-ops-z2-form">
				<label class="director-field-ops-field-label">
					Team
					<select class="director-field-ops-control" bind:value={bookingTeamId}>
						<option value="">Select…</option>
						{#each clubTeams as t}
							<option value={t.id}>{t.name}</option>
						{/each}
					</select>
				</label>
				<label class="director-field-ops-field-label">
					Activity
					<select class="director-field-ops-control" bind:value={activityType}>
						<option value="Practice">Practice</option>
						<option value="Game">Game</option>
					</select>
				</label>
				<label class="director-field-ops-field-label">
					Start
					<input type="time" bind:value={startTimeInput} class="director-field-ops-control" />
				</label>
				<label class="director-field-ops-field-label">
					End
					<input type="time" bind:value={endTimeInput} class="director-field-ops-control" />
				</label>
				<div class="director-field-ops-z2-form__span" role="group" aria-label="Notification triggers">
					<span class="director-field-ops-teams__label">Notification triggers</span>
					<div class="director-field-ops-checklist">
						<label>
							<input type="checkbox" bind:checked={notify1h} />
							1 hour before
						</label>
						<label>
							<input type="checkbox" bind:checked={notify30m} />
							30 minutes before
						</label>
						<label>
							<input type="checkbox" bind:checked={notifyMorning} />
							Morning of
						</label>
						<label title="Sends a team broadcast message via the SafeSport comms bus">
							<input type="checkbox" bind:checked={announceToTeam} />
							Announce to team
						</label>
					</div>
				</div>
				<button
					type="button"
					class="director-field-ops-btn-sync director-field-ops-z2-form__span"
					class:dir-os-btn--readonly={isReadOnly}
					disabled={booking || !!conflictMsg || !bookingTeamId}
					onclick={submitBooking}
				>
					{booking ? 'Booking…' : 'Book field'}
				</button>
			</div>

			{#if conflictMsg}
				<div class="director-field-ops-alert" role="alert">
					Conflict warning — {conflictMsg}
				</div>
			{/if}
		{/if}
	{:else}
		<div class="director-field-ops-scope-lock" role="alert">
			<p class="director-field-ops-scope-lock__eyebrow">Security lock</p>
			<p class="director-field-ops-scope-lock__body">
				Your account is not bound to a specific Organization. Contact a Global Admin to assign your Club
				Scope.
			</p>
		</div>
	{/if}
</div>
