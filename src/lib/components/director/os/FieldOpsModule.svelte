<script lang="ts">
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

	const directorUpsertField = httpsCallable(functions, 'directorUpsertField');
	const secureBookField = httpsCallable(functions, 'secureBookField');

	/** Minutes from midnight; 6:00–22:00 = 32 half-hour slots */
	const DAY_START_MIN = 6 * 60;
	const DAY_END_MIN = 22 * 60;
	const SLOT_MIN = 30;
	const NUM_SLOTS = (DAY_END_MIN - DAY_START_MIN) / SLOT_MIN;

	let fields = $state(/** @type {Array<{ id: string; name: string; location?: string; status?: string }>} */ ([]));
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
		return () => unsub();
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

<div class="field-ops-root tw-flex tw-flex-col tw-gap-4">
	<div
		class="tw-rounded-xl tw-border tw-border-slate-800/80 tw-bg-gradient-to-br tw-from-slate-950 tw-via-slate-900 tw-to-slate-950 tw-px-4 tw-py-3 tw-shadow-xl tw-ring-1 tw-ring-white/5 tw-backdrop-blur-sm"
	>
		<h3 class="tw-m-0 tw-text-lg tw-font-extrabold tw-tracking-tight tw-text-slate-100">
			Field Ops
		</h3>
		<p class="tw-m-0 tw-mt-1 tw-text-sm tw-text-slate-400">
			Master schedule for your pitches — conflicts are blocked server-side.
		</p>
	</div>

	{#if resolvedClubId}
		<!-- Liquid glass split: deployments (1/3) + facility vault / map (2/3) -->
		<div
			class="field-ops-split tw-mb-6 tw-grid tw-min-h-[min(560px,72vh)] tw-grid-cols-1 tw-gap-4 tw-items-stretch lg:tw-grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]"
		>
			<div
				class="tw-flex tw-min-h-0 tw-flex-col tw-overflow-hidden tw-rounded-xl tw-border tw-border-slate-800 tw-bg-slate-900/95 tw-shadow-2xl tw-ring-1 tw-ring-white/5 tw-backdrop-blur-md"
			>
				<DeploymentCalendar
					clubId={resolvedClubId}
					canManage={!isReadOnly}
					embedded
				/>
			</div>
			<div
				class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-overflow-hidden tw-rounded-xl tw-border tw-border-slate-800 tw-bg-slate-900/95 tw-shadow-2xl tw-ring-1 tw-ring-white/5 tw-backdrop-blur-md"
			>
				<FacilityMapVault clubId={resolvedClubId} canManage={!isReadOnly} embedded />
			</div>
		</div>

		<div class="tw-flex tw-flex-wrap tw-gap-3 tw-items-end">
			<label class="tw-flex tw-flex-col tw-gap-1 tw-text-xs tw-font-bold" style="color: var(--text-secondary);">
				Field
				<select
					class="fieldops-control tw-rounded-lg tw-border tw-px-3 tw-min-w-[12rem]"
					bind:value={fieldId}
				>
					{#each fields as f (f.id)}
						<option value={f.id}>{f.name}</option>
					{/each}
				</select>
			</label>
			<label class="tw-flex tw-flex-col tw-gap-1 tw-text-xs tw-font-bold" style="color: var(--text-secondary);">
				Date
				<input
					type="date"
					bind:value={scheduleDate}
					class="fieldops-control tw-rounded-lg tw-border tw-px-3"
				/>
			</label>
		</div>

		{#if fields.length === 0}
			<div
				class="tw-rounded-xl tw-border tw-p-4 tw-grid tw-gap-2 md:tw-grid-cols-2"
				style="border-color: rgba(15,23,42,0.1);"
			>
				<input
					class="tw-rounded-lg tw-border tw-px-3 tw-py-2"
					placeholder="Field name (e.g. North Pitch)"
					bind:value={newFieldName}
				/>
				<input
					class="tw-rounded-lg tw-border tw-px-3 tw-py-2"
					placeholder="Location (optional)"
					bind:value={newFieldLocation}
				/>
				<button
					type="button"
					class="dir-os-btn-primary md:tw-col-span-2"
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

			<p class="tw-m-0 tw-text-xs" style="color: var(--muted-slate);">
				Drag a team onto a slot to draft a 1-hour window (adjust below). Booked times use your club brand
				gradient.
			</p>

			<div class="tw-flex tw-flex-wrap tw-gap-2 tw-items-center">
				<span class="tw-text-xs tw-font-bold" style="color: var(--text-secondary);">Teams</span>
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

			<div
				class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-3 tw-items-end tw-rounded-xl tw-border tw-p-4"
				style="border-color: color-mix(in srgb, var(--brand-primary) 18%, rgba(15,23,42,0.12)); background: color-mix(in srgb, var(--brand-accent) 6%, transparent);"
			>
				<label class="tw-flex tw-flex-col tw-gap-1 tw-text-xs tw-font-bold" style="color: var(--text-secondary);">
					Team
					<select class="tw-rounded-lg tw-border tw-px-2 tw-py-2" bind:value={bookingTeamId}>
						<option value="">Select…</option>
						{#each clubTeams as t}
							<option value={t.id}>{t.name}</option>
						{/each}
					</select>
				</label>
				<label class="tw-flex tw-flex-col tw-gap-1 tw-text-xs tw-font-bold" style="color: var(--text-secondary);">
					Activity
					<select class="tw-rounded-lg tw-border tw-px-2 tw-py-2" bind:value={activityType}>
						<option value="Practice">Practice</option>
						<option value="Game">Game</option>
					</select>
				</label>
				<label class="tw-flex tw-flex-col tw-gap-1 tw-text-xs tw-font-bold" style="color: var(--text-secondary);">
					Start
					<input type="time" bind:value={startTimeInput} class="tw-rounded-lg tw-border tw-px-2 tw-py-2" />
				</label>
				<label class="tw-flex tw-flex-col tw-gap-1 tw-text-xs tw-font-bold" style="color: var(--text-secondary);">
					End
					<input type="time" bind:value={endTimeInput} class="tw-rounded-lg tw-border tw-px-2 tw-py-2" />
				</label>
				<div
					class="tw-flex tw-flex-col tw-gap-2 sm:tw-col-span-2 lg:tw-col-span-4"
					role="group"
					aria-label="Notification triggers"
				>
					<span class="tw-text-xs tw-font-bold" style="color: var(--text-secondary);"
						>Notification triggers</span
					>
					<div class="tw-flex tw-flex-wrap tw-gap-3">
						<label class="tw-flex tw-items-center tw-gap-2 tw-text-xs tw-cursor-pointer">
							<input type="checkbox" bind:checked={notify1h} class="tw-rounded" />
							1 hour before
						</label>
						<label class="tw-flex tw-items-center tw-gap-2 tw-text-xs tw-cursor-pointer">
							<input type="checkbox" bind:checked={notify30m} class="tw-rounded" />
							30 minutes before
						</label>
					<label class="tw-flex tw-items-center tw-gap-2 tw-text-xs tw-cursor-pointer">
						<input type="checkbox" bind:checked={notifyMorning} class="tw-rounded" />
						Morning of
					</label>
					<label class="tw-flex tw-items-center tw-gap-2 tw-text-xs tw-cursor-pointer tw-border-l tw-border-slate-700 tw-pl-3" title="Sends a team broadcast message via the SafeSport comms bus">
						<input type="checkbox" bind:checked={announceToTeam} class="tw-rounded" />
						Announce to team
					</label>
				</div>
			</div>
				<button
					type="button"
					class="dir-os-btn-primary sm:tw-col-span-2 lg:tw-col-span-4"
					class:dir-os-btn--readonly={isReadOnly}
					disabled={booking || !!conflictMsg || !bookingTeamId}
					onclick={submitBooking}
				>
					{booking ? 'Booking…' : 'Book field'}
				</button>
			</div>

			{#if conflictMsg}
				<div
					class="tw-rounded-lg tw-px-3 tw-py-2 tw-text-sm tw-font-semibold"
					style="background: color-mix(in srgb, var(--danger-red) 15%, transparent); color: var(--danger-red); border: 1px solid color-mix(in srgb, var(--danger-red) 35%, transparent);"
					role="alert"
				>
					Conflict warning — {conflictMsg}
				</div>
			{/if}
		{/if}
	{:else}
		<div
			class="tw-rounded-xl tw-border tw-p-5 tw-max-w-2xl"
			style="
				border-color: rgba(148, 163, 184, 0.45);
				background: linear-gradient(
					165deg,
					rgba(15, 23, 42, 0.92) 0%,
					rgba(30, 41, 59, 0.88) 100%
				);
				box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset;
			"
			role="alert"
		>
			<p
				class="tw-m-0 tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider"
				style="color: rgba(251, 191, 36, 0.95); letter-spacing: 0.08em;"
			>
				Security lock
			</p>
			<p class="tw-m-0 tw-mt-2 tw-text-sm tw-leading-relaxed" style="color: #e2e8f0;">
				Your account is not bound to a specific Organization. Contact a Global Admin to assign your Club
				Scope.
			</p>
		</div>
	{/if}
</div>

<style>
	/* Normalize Field selector + Date input to identical 40px heights so the
	   two controls align perfectly. Native date inputs have invisible UA
	   padding; forcing height + box-sizing removes the drift. */
	.fieldops-control {
		height: 40px;
		line-height: 1;
		font-size: 13.5px;
		box-sizing: border-box;
		appearance: none;
		-webkit-appearance: none;
		background-color: #ffffff;
	}

	:global(html.dark) .fieldops-control {
		background-color: #0f0f11;
		color: #fafafa;
	}
</style>
