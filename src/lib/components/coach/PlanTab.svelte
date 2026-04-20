<script>
	import { db, auth, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import {
		addDoc,
		collection,
		deleteDoc,
		doc,
		getDoc,
		getDocs,
		orderBy,
		query,
		serverTimestamp,
		where,
	} from 'firebase/firestore';
	import Modal from '$lib/components/Modal.svelte';

	let { teamId = '', workouts = [] } = $props();

	const secureDeleteHomework = httpsCallable(functions, 'secureDeleteHomework');

	const DRAG_MIME = 'application/x-sstracker-drill+json';

	let scheduleItems = $state([]);
	let hwItems = $state([]);
	let schedDate = $state('');
	let schedTime = $state('');
	let schedType = $state('Practice');
	let schedLocation = $state('');
	/** @type {Array<{ id: string, name: string, durationMinutes: number, description: string, focusArea: string }>} */
	let drillLibrary = $state([]);
	/** @type {Array<{ instanceId: string, drillId: string, name: string, durationMinutes: number, description: string, focusArea: string }>} */
	let canvasDrills = $state([]);
	let workoutName = $state('');
	let workoutScheduledDate = $state('');
	/** @type {Array<{ id: string, name: string, totalMinutes?: number }>} */
	let savedWorkouts = $state([]);
	let selectedSavedWorkoutId = $state('');

	let drillModalOpen = $state(false);
	let newDrillName = $state('');
	let newDrillMinutes = $state(10);
	let newDrillFocus = $state('Passing');
	let newDrillDescription = $state('');
	let builderError = $state('');
	let builderBusy = $state(false);

	const totalWorkoutMinutes = $derived(
		canvasDrills.reduce((s, d) => s + (Number(d.durationMinutes) || 0), 0),
	);

	const loadSchedule = async () => {
		if (!teamId) return;
		const [sSnap, hwSnap] = await Promise.all([
			getDocs(query(collection(db, 'schedules'), where('teamId', '==', teamId))),
			getDocs(query(collection(db, 'assignments'), where('teamId', '==', teamId))),
		]);
		scheduleItems = [];
		sSnap.forEach((d) => scheduleItems.push({ id: d.id, ...d.data() }));
		scheduleItems.sort((a, b) => a.date.localeCompare(b.date));
		hwItems = [];
		hwSnap.forEach((d) => {
			const hw = d.data();
			const st = hw.status;
			if (st === 'active' || st === 'pending') {
				hwItems.push({ id: d.id, ...hw });
			}
		});
	};

	const loadDrillLibrary = async () => {
		if (!teamId) {
			drillLibrary = [];
			return;
		}
		try {
			const q = query(
				collection(db, 'teams', teamId, 'drills'),
				orderBy('name'),
			);
			const snap = await getDocs(q);
			drillLibrary = snap.docs.map((d) => {
				const x = d.data();
				return {
					id: d.id,
					name: typeof x.name === 'string' ? x.name : 'Drill',
					durationMinutes:
						typeof x.durationMinutes === 'number' ? x.durationMinutes : 0,
					description:
						typeof x.description === 'string' ? x.description : '',
					focusArea:
						typeof x.focusArea === 'string' ? x.focusArea : '',
				};
			});
		} catch (e) {
			console.error(e);
			drillLibrary = [];
		}
	};

	const loadSavedWorkouts = async () => {
		if (!teamId) {
			savedWorkouts = [];
			return;
		}
		try {
			const q = query(
				collection(db, 'teams', teamId, 'workouts'),
				orderBy('updatedAt', 'desc'),
			);
			const snap = await getDocs(q);
			savedWorkouts = snap.docs.map((d) => {
				const x = d.data();
				return {
					id: d.id,
					name: typeof x.name === 'string' ? x.name : 'Workout',
					totalMinutes: x.totalMinutes,
				};
			});
		} catch (e) {
			console.error(e);
			savedWorkouts = [];
		}
	};

	$effect(() => {
		if (teamId) loadSchedule();
	});

	$effect(() => {
		if (teamId) {
			loadDrillLibrary();
			loadSavedWorkouts();
		} else {
			drillLibrary = [];
			savedWorkouts = [];
			canvasDrills = [];
		}
	});

	const addScheduleEvent = async () => {
		if (!schedDate || !schedTime || !schedLocation || !teamId) {
			return alert('Please fill all schedule fields.');
		}
		await addDoc(collection(db, 'schedules'), {
			teamId,
			date: schedDate,
			time: schedTime,
			type: schedType,
			location: schedLocation,
		});
		schedLocation = '';
		schedDate = '';
		schedTime = '';
		alert('Event Added!');
		loadSchedule();
	};

	const deleteScheduleEvent = async (id) => {
		if (!confirm('Delete event?')) return;
		await deleteDoc(doc(db, 'schedules', id));
		loadSchedule();
	};

	const deleteHw = async (id) => {
		if (!confirm('Delete assignment?')) return;
		try {
			await secureDeleteHomework({ assignmentId: id });
			loadSchedule();
		} catch (e) {
			alert(
				e && typeof e === 'object' && 'message' in e ?
					String(e.message) :
					'Could not delete assignment.',
			);
		}
	};

	/**
	 * @param {DragEvent} e
	 * @param {{ id: string, name: string, durationMinutes: number, description: string, focusArea: string }} drill
	 */
	function onLibraryDragStart(e, drill) {
		const payload = {
			drillId: drill.id,
			name: drill.name,
			durationMinutes: drill.durationMinutes,
			description: drill.description,
			focusArea: drill.focusArea,
		};
		e.dataTransfer?.setData(DRAG_MIME, JSON.stringify(payload));
		e.dataTransfer?.setDragImage?.(e.currentTarget, 0, 0);
		e.dataTransfer.effectAllowed = 'copy';
	}

	/** @param {DragEvent} e */
	function onCanvasDragOver(e) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
	}

	/** @param {DragEvent} e */
	function onCanvasDrop(e) {
		e.preventDefault();
		const raw = e.dataTransfer?.getData(DRAG_MIME);
		if (!raw) return;
		try {
			const p = JSON.parse(raw);
			if (!p.drillId || !p.name) return;
			const instanceId =
				typeof crypto !== 'undefined' && crypto.randomUUID ?
					crypto.randomUUID() :
					`i_${Date.now()}_${Math.random().toString(36).slice(2)}`;
			canvasDrills = [
				...canvasDrills,
				{
					instanceId,
					drillId: String(p.drillId),
					name: String(p.name),
					durationMinutes: Number(p.durationMinutes) || 0,
					description:
						typeof p.description === 'string' ? p.description : '',
					focusArea:
						typeof p.focusArea === 'string' ? p.focusArea : '',
				},
			];
		} catch (err) {
			console.error(err);
		}
	}

	function removeCanvasDrill(idx) {
		canvasDrills = canvasDrills.filter((_, i) => i !== idx);
	}

	function moveCanvasDrill(idx, delta) {
		const j = idx + delta;
		if (j < 0 || j >= canvasDrills.length) return;
		const next = [...canvasDrills];
		[next[idx], next[j]] = [next[j], next[idx]];
		canvasDrills = next;
	}

	function clearWorkoutCanvas() {
		canvasDrills = [];
		builderError = '';
	}

	async function saveWorkoutToFirestore() {
		builderError = '';
		const uid = auth.currentUser?.uid;
		if (!teamId) {
			builderError = 'Select a team first.';
			return;
		}
		if (!uid) {
			builderError = 'Sign in to save workouts.';
			return;
		}
		const name = workoutName.trim();
		if (!name) {
			builderError = 'Enter a workout name.';
			return;
		}
		if (canvasDrills.length === 0) {
			builderError = 'Drag at least one drill into the workout.';
			return;
		}
		const drillsPayload = canvasDrills.map((d) => ({
			drillId: d.drillId,
			name: d.name,
			durationMinutes: d.durationMinutes,
			description: d.description,
			focusArea: d.focusArea,
		}));
		const totalMinutes = drillsPayload.reduce(
			(s, d) => s + (Number(d.durationMinutes) || 0),
			0,
		);
		builderBusy = true;
		try {
			await addDoc(collection(db, 'teams', teamId, 'workouts'), {
				name,
				scheduledDate: workoutScheduledDate.trim() || null,
				drills: drillsPayload,
				totalMinutes,
				createdBy: uid,
				updatedAt: serverTimestamp(),
			});
			workoutName = '';
			workoutScheduledDate = '';
			canvasDrills = [];
			await loadSavedWorkouts();
		} catch (err) {
			console.error(err);
			builderError = err?.message || 'Save failed.';
		} finally {
			builderBusy = false;
		}
	}

	async function loadSavedWorkoutIntoBuilder() {
		builderError = '';
		if (!teamId || !selectedSavedWorkoutId) {
			builderError = 'Choose a saved workout.';
			return;
		}
		try {
			const snap = await getDoc(
				doc(db, 'teams', teamId, 'workouts', selectedSavedWorkoutId),
			);
			if (!snap.exists()) {
				builderError = 'Workout not found.';
				return;
			}
			const data = snap.data();
			workoutName =
				typeof data.name === 'string' ? data.name : '';
			workoutScheduledDate =
				typeof data.scheduledDate === 'string' ? data.scheduledDate : '';
			const rawList = Array.isArray(data.drills) ? data.drills : [];
			canvasDrills = rawList.map((row) => {
				const r = /** @type {Record<string, unknown>} */ (row);
				const instanceId =
					typeof crypto !== 'undefined' && crypto.randomUUID ?
						crypto.randomUUID() :
						`i_${Date.now()}_${Math.random().toString(36).slice(2)}`;
				return {
					instanceId,
					drillId: String(r.drillId || ''),
					name: String(r.name || 'Drill'),
					durationMinutes: Number(r.durationMinutes) || 0,
					description:
						typeof r.description === 'string' ? r.description : '',
					focusArea:
						typeof r.focusArea === 'string' ? r.focusArea : '',
				};
			});
		} catch (err) {
			console.error(err);
			builderError = err?.message || 'Load failed.';
		}
	}

	async function deleteLibraryDrill(id, drillName) {
		if (!teamId || !confirm(`Delete drill “${drillName}”?`)) return;
		try {
			await deleteDoc(doc(db, 'teams', teamId, 'drills', id));
			await loadDrillLibrary();
		} catch (err) {
			console.error(err);
			alert(err?.message || 'Delete failed.');
		}
	}

	async function submitNewDrill() {
		builderError = '';
		const uid = auth.currentUser?.uid;
		if (!teamId || !uid) {
			builderError = 'Sign in and select a team.';
			return;
		}
		const name = newDrillName.trim();
		if (!name) {
			builderError = 'Drill name is required.';
			return;
		}
		const focusArea = newDrillFocus.trim() || 'General';
		const durationMinutes = Math.min(
			999,
			Math.max(1, Math.floor(Number(newDrillMinutes) || 1)),
		);
		builderBusy = true;
		try {
			await addDoc(collection(db, 'teams', teamId, 'drills'), {
				name,
				durationMinutes,
				description: newDrillDescription.trim(),
				focusArea,
				createdBy: uid,
				updatedAt: serverTimestamp(),
			});
			newDrillName = '';
			newDrillMinutes = 10;
			newDrillFocus = 'Passing';
			newDrillDescription = '';
			drillModalOpen = false;
			await loadDrillLibrary();
		} catch (err) {
			console.error(err);
			builderError = err?.message || 'Could not create drill.';
		} finally {
			builderBusy = false;
		}
	}
</script>

<div class="plan-tab">
	<!-- Epic 2.4: structured workout builder -->
	<div class="bento-section plan-builder-bento">
		<div class="card plan-builder-card plan-builder-library">
			<div class="card-header plan-builder-head">Drill library</div>
			<div class="card-body plan-builder-body">
				{#if !teamId}
					<p class="plan-builder-hint">Select a team to manage drills and workouts.</p>
				{:else}
					<button
						type="button"
						class="secondary-btn plan-builder-cta"
						onclick={() => {
							drillModalOpen = true;
							builderError = '';
						}}
					>
						+ Create new drill
					</button>
					<p class="plan-builder-drag-hint">
						Drag a drill into the workout canvas →
					</p>
					<ul class="plan-drill-list">
						{#each drillLibrary as drill (drill.id)}
							<li
								class="plan-drill-item"
								draggable="true"
								ondragstart={(e) => onLibraryDragStart(e, drill)}
								role="listitem"
							>
								<div class="plan-drill-main">
									<span class="plan-drill-name">{drill.name}</span>
									<span class="plan-drill-meta"
										>{drill.durationMinutes} min · {drill.focusArea}</span
									>
								</div>
								<button
									type="button"
									class="plan-drill-delete"
									aria-label="Delete drill"
									onclick={() => deleteLibraryDrill(drill.id, drill.name)}
								>
									✕
								</button>
							</li>
						{:else}
							<li class="plan-drill-empty">No drills yet. Create one to get started.</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>

		<div class="card plan-builder-card plan-builder-canvas-card">
			<div class="card-header plan-builder-head">Workout canvas</div>
			<div class="card-body plan-builder-body">
				{#if !teamId}
					<p class="plan-builder-hint">Select a team first.</p>
				{:else}
					<label class="plan-field-label" for="plan-workout-name">Workout name</label>
					<input
						id="plan-workout-name"
						class="plan-field-input"
						type="text"
						bind:value={workoutName}
						placeholder='e.g. "Tuesday technical block"'
						maxlength="200"
					/>
					<label class="plan-field-label" for="plan-workout-date"
						>Scheduled date (optional)</label
					>
					<input
						id="plan-workout-date"
						class="plan-field-input"
						type="date"
						bind:value={workoutScheduledDate}
					/>

					<div
						class="plan-drop-zone"
						ondragover={onCanvasDragOver}
						ondrop={onCanvasDrop}
						role="region"
						aria-label="Drop drills here to build workout"
					>
						{#if canvasDrills.length === 0}
							<p class="plan-drop-placeholder">
								Drop drills here to build your session. Order = run order.
							</p>
						{:else}
							<ol class="plan-canvas-list">
								{#each canvasDrills as row, idx (row.instanceId)}
									<li class="plan-canvas-row">
										<span class="plan-canvas-idx">{idx + 1}.</span>
										<div class="plan-canvas-info">
											<b>{row.name}</b>
											<span class="plan-canvas-sub"
												>{row.durationMinutes} min · {row.focusArea}</span
											>
										</div>
										<div class="plan-canvas-actions">
											<button
												type="button"
												class="plan-icon-btn"
												aria-label="Move up"
												disabled={idx === 0}
												onclick={() => moveCanvasDrill(idx, -1)}
											>
												↑
											</button>
											<button
												type="button"
												class="plan-icon-btn"
												aria-label="Move down"
												disabled={idx === canvasDrills.length - 1}
												onclick={() => moveCanvasDrill(idx, 1)}
											>
												↓
											</button>
											<button
												type="button"
												class="plan-icon-btn plan-icon-btn--danger"
												aria-label="Remove from workout"
												onclick={() => removeCanvasDrill(idx)}
											>
												✕
											</button>
										</div>
									</li>
								{/each}
							</ol>
						{/if}
					</div>

					<div class="plan-total-row">
						<span class="plan-total-label">Session total</span>
						<span class="plan-total-val">{totalWorkoutMinutes} min</span>
					</div>

					<div class="plan-save-row">
						<button
							type="button"
							class="secondary-btn plan-builder-cta"
							onclick={clearWorkoutCanvas}
						>
							Clear board
						</button>
						<button
							type="button"
							class="primary-btn btn-blue plan-save-btn"
							disabled={builderBusy}
							onclick={saveWorkoutToFirestore}
						>
							{builderBusy ? 'Saving…' : 'Save workout'}
						</button>
					</div>

					<div class="plan-load-saved">
						<label class="plan-field-label" for="plan-saved-workout"
							>Load saved workout</label
						>
						<div class="plan-load-row">
							<select
								id="plan-saved-workout"
								class="plan-field-input plan-load-select"
								bind:value={selectedSavedWorkoutId}
							>
								<option value="">— Choose —</option>
								{#each savedWorkouts as w (w.id)}
									<option value={w.id}>
										{w.name}
										{typeof w.totalMinutes === 'number' ?
											` (${w.totalMinutes} min)` :
											''}
									</option>
								{/each}
							</select>
							<button
								type="button"
								class="secondary-btn plan-builder-cta"
								onclick={loadSavedWorkoutIntoBuilder}
							>
								Load
							</button>
						</div>
					</div>

					{#if builderError}
						<p class="plan-builder-error" role="alert">{builderError}</p>
					{/if}
				{/if}
			</div>
		</div>
	</div>

	<Modal bind:open={drillModalOpen} title="Create drill" maxWidth="520px">
		<div class="plan-modal-fields">
			<label class="plan-field-label" for="plan-new-drill-name">Name</label>
			<input
				id="plan-new-drill-name"
				class="plan-field-input"
				type="text"
				bind:value={newDrillName}
				maxlength="200"
			/>
			<label class="plan-field-label" for="plan-new-drill-min">Duration (minutes)</label>
			<input
				id="plan-new-drill-min"
				class="plan-field-input"
				type="number"
				min="1"
				max="999"
				bind:value={newDrillMinutes}
			/>
			<label class="plan-field-label" for="plan-new-drill-focus">Focus area</label>
			<input
				id="plan-new-drill-focus"
				class="plan-field-input"
				type="text"
				bind:value={newDrillFocus}
				maxlength="120"
				placeholder="Passing, Fitness, Finishing…"
			/>
			<label class="plan-field-label" for="plan-new-drill-desc">Description</label>
			<textarea
				id="plan-new-drill-desc"
				class="plan-field-textarea"
				rows="4"
				bind:value={newDrillDescription}
				maxlength="8000"
			></textarea>
			<div class="plan-modal-actions">
				<button
					type="button"
					class="secondary-btn"
					onclick={() => {
						drillModalOpen = false;
					}}
				>
					Cancel
				</button>
				<button
					type="button"
					class="primary-btn btn-blue"
					disabled={builderBusy}
					onclick={submitNewDrill}
				>
					{builderBusy ? 'Saving…' : 'Save drill'}
				</button>
			</div>
		</div>
	</Modal>

	<div class="bento-section">
		<div class="card">
			<div class="card-header">📅 Manage Schedule</div>
			<div class="card-body">
				<div class="schedule-input-row">
					<input type="date" bind:value={schedDate} />
					<input type="time" bind:value={schedTime} />
				</div>
				<div class="schedule-type-row">
					<select bind:value={schedType}>
						<option value="Practice">Practice</option>
						<option value="Game">Game</option>
						<option value="Event">Event</option>
					</select>
					<input type="text" bind:value={schedLocation} placeholder="Location / Opponent" />
				</div>
				<button class="primary-btn btn-blue w-100" onclick={addScheduleEvent}>+ Add Event</button>
				<ul class="session-list">
					{#each scheduleItems as evt}
						<li class="session-item">
							<div>
								<b>{evt.type}</b>: {evt.location}<br /><span class="text-sm-sub"
									>{evt.date} @ {evt.time}</span
								>
							</div>
							<button class="delete-btn" onclick={() => deleteScheduleEvent(evt.id)}>✕</button>
						</li>
					{:else}
						<li class="session-empty">No events scheduled.</li>
					{/each}
				</ul>
			</div>
		</div>

		<div class="card">
			<div class="card-header bg-orange-header">🎯 Homework</div>
			<div class="card-body">
				<p class="plan-playbook-hint">
					Assign drills from the global library using the <strong>Playbook</strong> tab (secure
					server function). Below lists active / pending rows for this team.
				</p>
				<hr class="section-divider" />
				<label>Active &amp; pending assignments</label>
				<ul class="session-list">
					{#each hwItems as hw}
						<li class="session-item">
							<div>
								<b>{hw.drillTitle || (Array.isArray(hw.drills) && hw.drills[0]?.name) || 'Homework'}</b><br />
								<span class="text-sm-sub">{hw.player || '—'}</span><br />
								<span class="text-sm-sub text-accent-orange">Due: {hw.dueDate}</span>
							</div>
							<button type="button" class="delete-btn" onclick={() => deleteHw(hw.id)}>✕</button>
						</li>
					{:else}
						<li class="session-empty">No active homework.</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
</div>

<style>
	.plan-tab {
		width: 100%;
		box-sizing: border-box;
	}

	.plan-builder-bento {
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
		gap: clamp(16px, 3vw, 24px);
		margin-bottom: clamp(16px, 3vw, 24px);
	}

	.plan-builder-card {
		margin-bottom: 0;
		padding: var(--spacing-fluid);
		border-radius: var(--radius-premium);
	}

	.plan-builder-head {
		padding-bottom: clamp(12px, 2vw, 16px);
		margin-bottom: clamp(12px, 2vw, 16px);
	}

	.plan-builder-body {
		padding-top: 0;
	}

	.plan-builder-body > * + * {
		margin-top: clamp(12px, 2vw, 16px);
	}

	.plan-builder-hint,
	.plan-builder-drag-hint {
		margin: 0;
		font-size: clamp(0.86rem, 2.4vw, 0.92rem);
		color: var(--text-secondary);
		line-height: 1.5;
		font-weight: 600;
	}

	.plan-builder-cta {
		width: 100%;
		margin: 0;
		border-radius: var(--radius-premium);
		padding: clamp(10px, 2vw, 12px) clamp(14px, 3vw, 18px);
	}

	.plan-drill-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: clamp(8px, 2vw, 10px);
		max-height: min(420px, 55vh);
		overflow-y: auto;
	}

	.plan-drill-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: clamp(10px, 2.5vw, 14px);
		border-radius: var(--radius-premium);
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		-webkit-backdrop-filter: blur(18px) saturate(160%);
		backdrop-filter: blur(18px) saturate(160%);
		box-shadow: var(--shadow-premium);
		cursor: grab;
	}

	.plan-drill-item:active {
		cursor: grabbing;
	}

	.plan-drill-main {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.plan-drill-name {
		font-weight: 800;
		font-size: clamp(0.9rem, 2.5vw, 1rem);
	}

	.plan-drill-meta {
		font-size: 0.78rem;
		color: var(--text-secondary);
		font-weight: 600;
	}

	.plan-drill-delete {
		flex-shrink: 0;
		background: none;
		border: none;
		color: var(--danger-red);
		cursor: pointer;
		font-size: 1rem;
		padding: 4px 8px;
		border-radius: var(--radius-premium);
	}

	.plan-drill-delete:hover {
		background: rgba(153, 27, 27, 0.08);
	}

	.plan-drill-empty {
		padding: clamp(16px, 3vw, 24px);
		text-align: center;
		color: var(--text-secondary);
		font-weight: 600;
		border-radius: var(--radius-premium);
		border: 1px dashed var(--border-strong);
	}

	.plan-field-label {
		display: block;
		font-size: 0.78rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}

	.plan-field-input,
	.plan-field-textarea {
		width: 100%;
		box-sizing: border-box;
		padding: clamp(10px, 2vw, 12px) clamp(12px, 2vw, 14px);
		border-radius: var(--radius-premium);
		border: 1px solid var(--input-border);
		background: var(--input-bg);
		font: inherit;
		margin: 0;
	}

	.plan-field-textarea {
		resize: vertical;
		min-height: 88px;
	}

	.plan-drop-zone {
		min-height: clamp(180px, 28vh, 280px);
		padding: clamp(14px, 3vw, 20px);
		border-radius: var(--radius-premium);
		border: 2px dashed rgba(15, 23, 42, 0.2);
		background: rgba(255, 255, 255, 0.45);
		-webkit-backdrop-filter: blur(12px);
		backdrop-filter: blur(12px);
		transition:
			border-color 0.2s,
			background 0.2s;
	}

	.plan-drop-zone:focus-within,
	.plan-drop-zone:hover {
		border-color: rgba(15, 23, 42, 0.35);
		background: rgba(255, 255, 255, 0.6);
	}

	.plan-drop-placeholder {
		margin: 0;
		text-align: center;
		color: var(--text-secondary);
		font-weight: 600;
		font-size: clamp(0.88rem, 2.5vw, 0.95rem);
		line-height: 1.5;
		padding: clamp(24px, 5vw, 40px) clamp(12px, 3vw, 20px);
	}

	.plan-canvas-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: clamp(10px, 2vw, 12px);
	}

	.plan-canvas-row {
		display: flex;
		align-items: center;
		gap: clamp(8px, 2vw, 12px);
		padding: clamp(10px, 2vw, 12px);
		border-radius: var(--radius-premium);
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		box-shadow: var(--shadow-premium);
	}

	.plan-canvas-idx {
		font-weight: 900;
		color: var(--text-secondary);
		width: 1.5rem;
		flex-shrink: 0;
	}

	.plan-canvas-info {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.plan-canvas-sub {
		font-size: 0.78rem;
		color: var(--text-secondary);
		font-weight: 600;
	}

	.plan-canvas-actions {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}

	.plan-icon-btn {
		margin: 0;
		padding: 6px 10px;
		border-radius: var(--radius-premium);
		border: 1px solid var(--border-strong);
		background: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		font-weight: 800;
		line-height: 1;
	}

	.plan-icon-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.plan-icon-btn--danger {
		color: var(--danger-red);
		border-color: rgba(153, 27, 27, 0.35);
	}

	.plan-total-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: clamp(12px, 2.5vw, 14px);
		border-radius: var(--radius-premium);
		background: var(--surface-subtle);
		border: 1px solid var(--glass-border);
	}

	.plan-total-label {
		font-weight: 800;
		text-transform: uppercase;
		font-size: 0.78rem;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
	}

	.plan-total-val {
		font-size: clamp(1.2rem, 4vw, 1.5rem);
		font-weight: 900;
		color: var(--aggie-blue);
	}

	.plan-save-row {
		display: flex;
		flex-wrap: wrap;
		gap: clamp(10px, 2vw, 12px);
	}

	.plan-save-row .plan-builder-cta {
		flex: 1 1 140px;
	}

	.plan-save-btn {
		flex: 2 1 200px;
		margin: 0;
		border-radius: var(--radius-premium);
		padding: clamp(12px, 2.5vw, 14px);
	}

	.plan-load-saved {
		padding-top: clamp(8px, 2vw, 10px);
		border-top: 1px solid var(--border-subtle);
	}

	.plan-load-row {
		display: flex;
		flex-wrap: wrap;
		gap: clamp(8px, 2vw, 10px);
		align-items: center;
	}

	.plan-load-select {
		flex: 1 1 200px;
		min-width: 0;
	}

	.plan-load-row .plan-builder-cta {
		width: auto;
		flex: 0 0 auto;
	}

	.plan-builder-error {
		margin: 0;
		font-weight: 700;
		color: var(--danger-red);
		font-size: 0.9rem;
	}

	.plan-modal-fields > * + * {
		margin-top: clamp(12px, 2vw, 14px);
	}

	.plan-modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: clamp(18px, 3vw, 22px);
	}

	.plan-modal-actions .primary-btn,
	.plan-modal-actions .secondary-btn {
		margin: 0;
		border-radius: var(--radius-premium);
	}

	.schedule-input-row,
	.schedule-type-row {
		display: flex;
		gap: 10px;
		margin-bottom: 10px;
	}
	.schedule-input-row input,
	.schedule-type-row input,
	.schedule-type-row select {
		flex: 1;
		margin: 0;
	}
	.card-body > label + * {
		margin-top: 0;
	}
	select,
	input {
		margin-bottom: 10px;
	}
	.plan-playbook-hint {
		margin: 0 0 12px;
		font-size: 0.9rem;
		line-height: 1.5;
		color: var(--text-secondary);
	}
	.section-divider {
		border: none;
		border-top: 1px solid rgba(15, 23, 42, 0.1);
		margin: 16px 0;
	}
	.delete-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--danger-red);
		font-size: 1rem;
	}
</style>
