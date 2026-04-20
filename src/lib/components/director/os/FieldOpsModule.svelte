<script>
	import { db, functions } from '$lib/firebase.js';
	import { collection, query, where, onSnapshot } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { teamsStore } from '$lib/stores/teams.svelte.js';

	let { clubId = '' } = $props();

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
	let booking = $state(false);
	let conflictMsg = $state(/** @type {string | null} */ (null));
	let dragTeamId = $state(/** @type {string | null} */ (null));
	let dropHintSlot = $state(/** @type {number | null} */ (null));

	const clubTeams = $derived(teamsStore.teams.filter((t) => t.clubId === clubId));

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
		if (!clubId) {
			fields = [];
			return;
		}
		const q = query(collection(db, 'fields'), where('clubId', '==', clubId));
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
		if (!clubId || !newFieldName.trim()) return;
		savingField = true;
		try {
			const slug = newFieldName
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '_')
				.replace(/^_|_$/g, '')
				.slice(0, 64);
			const fid = `${clubId}_${slug || 'field'}_${Date.now().toString(36)}`;
			await directorUpsertField({
				fieldId: fid,
				clubId,
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

<div class="tw-flex tw-flex-col tw-gap-4">
	<div class="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3">
		<div>
			<h3 class="tw-m-0 tw-text-lg tw-font-extrabold tw-tracking-tight" style="color: var(--text-primary);">
				Field ops
			</h3>
			<p class="tw-m-0 tw-text-sm tw-mt-1" style="color: var(--text-secondary);">
				Master schedule for your pitches — conflicts are blocked server-side.
			</p>
		</div>
	</div>

	{#if !clubId}
		<p class="tw-m-0 tw-text-sm" style="color: var(--danger-red);">No club scope.</p>
	{:else}
		<div class="tw-flex tw-flex-wrap tw-gap-3 tw-items-end">
			<label class="tw-flex tw-flex-col tw-gap-1 tw-text-xs tw-font-bold" style="color: var(--text-secondary);">
				Field
				<select class="tw-rounded-lg tw-border tw-px-2 tw-py-2 tw-min-w-[12rem]" bind:value={fieldId}>
					{#each fields as f}
						<option value={f.id}>{f.name}</option>
					{/each}
				</select>
			</label>
			<label class="tw-flex tw-flex-col tw-gap-1 tw-text-xs tw-font-bold" style="color: var(--text-secondary);">
				Date
				<input type="date" bind:value={scheduleDate} class="tw-rounded-lg tw-border tw-px-2 tw-py-2" />
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
						draggable="true"
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
				<button
					type="button"
					class="dir-os-btn-primary sm:tw-col-span-2 lg:tw-col-span-4"
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
	{/if}
</div>
