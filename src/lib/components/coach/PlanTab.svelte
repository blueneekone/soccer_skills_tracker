<script>
	import { db } from '$lib/firebase.js';
	import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

	let { teamId = '', workouts = [], players = [] } = $props();

	let scheduleItems = $state([]);
	let hwItems = $state([]);
	let schedDate = $state('');
	let schedTime = $state('');
	let schedType = $state('Practice');
	let schedLocation = $state('');
	let hwDueDate = $state('');
	let hwSelectedDrill = $state('');
	let hwBuilderList = $state([]);
	let selectedPlayers = $state([]);
	let selectAll = $state(false);

	const loadSchedule = async () => {
		if (!teamId) return;
		const [sSnap, hwSnap] = await Promise.all([
			getDocs(query(collection(db, 'schedules'), where('teamId', '==', teamId))),
			getDocs(query(collection(db, 'assignments'), where('teamId', '==', teamId)))
		]);
		scheduleItems = [];
		sSnap.forEach((d) => scheduleItems.push({ id: d.id, ...d.data() }));
		scheduleItems.sort((a, b) => a.date.localeCompare(b.date));
		hwItems = [];
		hwSnap.forEach((d) => { const hw = d.data(); if (hw.status === 'active') hwItems.push({ id: d.id, ...hw }); });
	};

	$effect(() => { if (teamId) loadSchedule(); });

	const addScheduleEvent = async () => {
		if (!schedDate || !schedTime || !schedLocation || !teamId) return alert('Please fill all schedule fields.');
		await addDoc(collection(db, 'schedules'), { teamId, date: schedDate, time: schedTime, type: schedType, location: schedLocation });
		schedLocation = ''; schedDate = ''; schedTime = '';
		alert('Event Added!'); loadSchedule();
	};

	const deleteScheduleEvent = async (id) => {
		if (!confirm('Delete event?')) return;
		await deleteDoc(doc(db, 'schedules', id));
		loadSchedule();
	};

	const addHwDrill = () => {
		if (!hwSelectedDrill) return;
		hwBuilderList = [...hwBuilderList, { name: hwSelectedDrill, sets: 3, reps: 20 }];
	};
	const removeHwDrill = (idx) => { hwBuilderList = hwBuilderList.filter((_, i) => i !== idx); };

	const toggleSelectAll = () => {
		if (selectAll) { selectedPlayers = [...players]; }
		else { selectedPlayers = []; }
	};

	const assignHomework = async () => {
		if (selectedPlayers.length === 0 || hwBuilderList.length === 0 || !hwDueDate) return alert('Select players, add drills, and set a due date.');
		const batch = [];
		for (const player of selectedPlayers) {
			batch.push(addDoc(collection(db, 'assignments'), { teamId, player, drills: hwBuilderList, dueDate: hwDueDate, status: 'active' }));
		}
		await Promise.all(batch);
		hwBuilderList = []; selectedPlayers = []; selectAll = false; hwDueDate = '';
		alert('Homework Assigned!'); loadSchedule();
	};

	const deleteHw = async (id) => {
		if (!confirm('Delete assignment?')) return;
		await deleteDoc(doc(db, 'assignments', id)); loadSchedule();
	};
</script>

<div class="plan-tab">
	<!-- Schedule -->
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
						<div><b>{evt.type}</b>: {evt.location}<br /><span class="text-sm-sub">{evt.date} @ {evt.time}</span></div>
						<button class="delete-btn" onclick={() => deleteScheduleEvent(evt.id)}>✕</button>
					</li>
				{:else}
					<li class="session-empty">No events scheduled.</li>
				{/each}
			</ul>
		</div>
	</div>

	<!-- Homework Builder -->
	<div class="card">
		<div class="card-header bg-orange-header">🎯 Assign Homework</div>
		<div class="card-body">
			<label>Select Players &amp; Due Date</label>
			<div class="hw-select-box">
				<label class="hw-select-all-label">
					<input type="checkbox" bind:checked={selectAll} onchange={toggleSelectAll} />
					<b>Select All Players</b>
				</label>
				<div class="hw-player-list">
					{#each players as p}
						<div class="hw-player-row">
							<input type="checkbox" bind:group={selectedPlayers} value={p} />
							<span>{p}</span>
						</div>
					{/each}
				</div>
			</div>
			<div class="hw-due-row">
				<label class="m-0">Due Date:</label>
				<input type="date" bind:value={hwDueDate} class="flex-1 m-0" />
			</div>
			<label>Build the Workout</label>
			<select bind:value={hwSelectedDrill}>
				<option value="" disabled>Select Drill...</option>
				{#each workouts as w}<option value={w.name}>{w.name}</option>{/each}
			</select>
			<button class="secondary-btn w-100" onclick={addHwDrill}>+ Add Drill</button>
			<ul class="session-list">
				{#each hwBuilderList as item, i}
					<li class="session-item">
						<span>{i + 1}. {item.name}</span>
						<button class="delete-btn" onclick={() => removeHwDrill(i)}>✕</button>
					</li>
				{:else}
					<li class="session-empty">No drills added to this assignment yet.</li>
				{/each}
			</ul>
			<button class="primary-btn btn-orange w-100" onclick={assignHomework}>Send Assignment</button>

			<hr class="section-divider" />
			<label>Active Assignments</label>
			<ul class="session-list">
				{#each hwItems as hw}
					<li class="session-item">
						<div><b>{hw.player}</b><br /><span class="hw-due-label">Due: {hw.dueDate}</span></div>
						<button class="delete-btn" onclick={() => deleteHw(hw.id)}>✕</button>
					</li>
				{:else}
					<li class="session-empty">No active homework.</li>
				{/each}
			</ul>
		</div>
	</div>
</div>

<style>
	.schedule-input-row, .schedule-type-row {
		display: flex;
		gap: 10px;
		margin-bottom: 10px;
	}
	.schedule-input-row input, .schedule-type-row input, .schedule-type-row select {
		flex: 1; margin: 0;
	}
	.hw-select-box { border: 1px solid rgba(15,23,42,0.1); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
	.hw-select-all-label { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; margin-bottom: 8px; cursor: pointer; }
	.hw-player-list { max-height: 150px; overflow-y: auto; }
	.hw-player-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 0.9rem; }
	.hw-due-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
	select, input { margin-bottom: 10px; }
	.section-divider { border: none; border-top: 1px solid rgba(15,23,42,0.1); margin: 16px 0; }
	.delete-btn { background: none; border: none; cursor: pointer; color: var(--danger-red); font-size: 1rem; }
	.hw-due-label { font-size: 0.8rem; color: #ea580c; font-weight: 700; }
</style>
