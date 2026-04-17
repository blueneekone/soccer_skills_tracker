<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { db } from '$lib/firebase.js';
	import { collection, doc, writeBatch, increment } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { workoutsStore } from '$lib/stores/workouts.svelte.js';
	import Swal from 'sweetalert2';
	import confetti from 'canvas-confetti';

	const profile = $derived(authStore.userProfile);

	// Session state
	let sessionItems = $state([]);
	let totalMinutes = $state('');
	let outcome = $state('Good');
	let calDate = $state('');
	let calTime = $state('');

	// Signature canvas state
	let sigCanvas;
	let sigCtx;
	let isSignatureBlank = $state(true);
	let isDrawing = false;

	// Workout selects
	let selectWarmup = $state('');
	let selectCore = $state('');
	let selectBallWork = $state('');
	let selectBasics = $state('');
	let cardioDist = $state('');
	let cardioTime = $state('');
	let setsCore = $state('3');
	let repsCore = $state('20');
	let setsBall = $state('3');
	let repsBall = $state('20');
	let setsBasics = $state('3');
	let repsBasics = $state('20');

	const warmupList = $derived(workoutsStore.byType('cardio'));
	const coreList = $derived(workoutsStore.byType('core'));
	const ballList = $derived(workoutsStore.byType('ball_mastery'));
	const basicsList = $derived(workoutsStore.byType('foundation'));

	const addDrill = (name, sets, reps) => {
		if (!name || name === 'Select Workout...') return alert('Please select a drill first.');
		sessionItems = [...sessionItems, { name, sets: sets || 1, reps: reps || 1 }];
	};

	const removeDrill = (idx) => {
		sessionItems = sessionItems.filter((_, i) => i !== idx);
	};

	const clearForm = () => {
		sessionItems = [];
		totalMinutes = '';
		outcome = 'Good';
		if (sigCtx && sigCanvas) {
			sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
			isSignatureBlank = true;
		}
	};

	const getSessionDescription = () => {
		if (sessionItems.length === 0) return '';
		return `Training Plan:\n\n${sessionItems.map((i, idx) => `${idx + 1}. ${i.name} (${i.sets} x ${i.reps})`).join('\n')}\n\nLog results here: https://soccer-skills-tracker.web.app`;
	};

	const addToGoogleCalendar = () => {
		if (sessionItems.length === 0) return alert('Add drills to the list first!');
		if (!calDate || !calTime) return alert('Select Date and Time.');
		const start = new Date(`${calDate}T${calTime}`).toISOString().replace(/-|:|\.\d\d\d/g, '');
		const end = new Date(new Date(`${calDate}T${calTime}`).getTime() + 45 * 60000).toISOString().replace(/-|:|\.\d\d\d/g, '');
		window.open(`https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('⚽ Soccer Training')}&dates=${start}/${end}&details=${encodeURIComponent(getSessionDescription())}&sf=true&output=xml`, '_blank');
	};

	const downloadIcs = () => {
		if (sessionItems.length === 0) return alert('Add drills to the list first!');
		if (!calDate || !calTime) return alert('Select Date and Time.');
		const formatICS = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '').split('Z')[0];
		const startDate = new Date(`${calDate}T${calTime}`);
		const endDate = new Date(startDate.getTime() + 45 * 60000);
		const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'SUMMARY:⚽ Soccer Training', `DESCRIPTION:${getSessionDescription()}`, `DTSTART:${formatICS(startDate)}`, `DTEND:${formatICS(endDate)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\n');
		const link = document.createElement('a');
		link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
		link.download = 'training_session.ics';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const submitWorkout = async () => {
		if (sessionItems.length === 0) return alert('Add drills to your session first!');
		if (isSignatureBlank) return alert('A parent must sign to verify this workout.');
		const mins = parseInt(totalMinutes || 0);
		if (mins <= 0) return alert('Please enter valid total minutes.');
		if (!profile?.teamId || !profile?.playerName) return alert('User profile is incomplete.');

		try {
			const batch = writeBatch(db);
			const repRef = doc(collection(db, 'reps'));
			batch.set(repRef, {
				timestamp: new Date(),
				teamId: profile.teamId,
				player: profile.playerName,
				minutes: mins,
				drills: sessionItems,
				drillSummary: sessionItems.map((x) => x.name).join(', '),
				outcome
			});
			const statsRef = doc(db, 'player_stats', profile.playerName);
			batch.set(statsRef, { teamId: profile.teamId, totalMins: increment(mins), totalWorkouts: increment(1), lastActive: new Date() }, { merge: true });
			await batch.commit();

			confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#0f172a', '#fbbf24', '#3b82f6'] });
			await Swal.fire({ title: 'Workout Logged!', text: 'Awesome job! +XP added to your profile.', icon: 'success', confirmButtonColor: '#0f172a', confirmButtonText: 'Keep Grinding', customClass: { popup: 'card' } });
			clearForm();
			goto('/home');
		} catch (e) {
			alert('Database Error: ' + e.message);
		}
	};

	// Signature canvas setup
	const resizeCanvas = () => {
		if (!sigCanvas) return;
		if (sigCanvas.parentElement?.offsetWidth > 0) {
			sigCanvas.width = sigCanvas.parentElement.offsetWidth;
			sigCanvas.height = 120;
			sigCtx = sigCanvas.getContext('2d');
			sigCtx.lineWidth = 2;
			sigCtx.lineCap = 'round';
			sigCtx.strokeStyle = '#00263A';
		}
	};

	const getCoords = (e) => {
		const rect = sigCanvas.getBoundingClientRect();
		const clientX = e.touches ? e.touches[0].clientX : e.clientX;
		const clientY = e.touches ? e.touches[0].clientY : e.clientY;
		return { x: clientX - rect.left, y: clientY - rect.top };
	};

	const startDraw = (e) => { isDrawing = true; sigCtx.beginPath(); drawSig(e); };
	const endDraw = () => { isDrawing = false; sigCtx.beginPath(); checkSig(); };
	const drawSig = (e) => {
		if (!isDrawing) return;
		e.preventDefault();
		const { x, y } = getCoords(e);
		sigCtx.lineTo(x, y);
		sigCtx.stroke();
		sigCtx.beginPath();
		sigCtx.moveTo(x, y);
		isSignatureBlank = false;
	};
	const checkSig = () => {
		const buf = new Uint32Array(sigCtx.getImageData(0, 0, sigCanvas.width, sigCanvas.height).data.buffer);
		isSignatureBlank = !buf.some((c) => c !== 0);
	};
	const clearSig = () => {
		sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
		isSignatureBlank = true;
	};

	onMount(() => {
		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);
		return () => window.removeEventListener('resize', resizeCanvas);
	});
</script>

<div class="view-section">
	<h2 class="view-title">Log Workout</h2>

	<div class="card">
		<div class="card-body">
			<!-- Part A: Cardio -->
			<div class="tracker-box bg-orange">
				<span class="section-label text-orange">Part A: Cardio Warm-Up</span>
				<label for="selectWarmup">Select Warm-Up</label>
				<select id="selectWarmup" bind:value={selectWarmup}>
					<option value="" disabled>Select Workout...</option>
					{#each warmupList as w}<option value={w.name}>{w.name}</option>{/each}
				</select>
				<div class="input-row">
					<input type="number" bind:value={cardioDist} placeholder="Miles" class="flex-1" />
					<span class="input-divider">/</span>
					<input type="number" bind:value={cardioTime} placeholder="Mins" class="flex-1" />
					<button class="action-btn btn-orange" onclick={() => addDrill(selectWarmup, cardioDist, cardioTime)}>+ Add</button>
				</div>
			</div>

			<!-- Part B: Core -->
			<div class="tracker-box bg-red">
				<span class="section-label text-red">Part B: Core Strength</span>
				<label for="selectCore">Select Core Exercise</label>
				<select id="selectCore" bind:value={selectCore}>
					<option value="" disabled>Select Workout...</option>
					{#each coreList as w}<option value={w.name}>{w.name}</option>{/each}
				</select>
				<div class="input-row">
					<input type="number" bind:value={setsCore} placeholder="Sets" class="w-50" />
					<span class="input-divider">x</span>
					<input type="number" bind:value={repsCore} placeholder="Reps" class="flex-1" />
					<button class="action-btn btn-red" onclick={() => addDrill(selectCore, setsCore, repsCore)}>+ Add</button>
				</div>
			</div>

			<!-- Part C: Ball Handling -->
			<div class="tracker-box bg-blue">
				<span class="section-label text-blue">Part C: Ball Handling</span>
				<label for="selectBallWork">Select Ball Work Exercise</label>
				<select id="selectBallWork" bind:value={selectBallWork}>
					<option value="" disabled>Select Workout...</option>
					{#each ballList as w}<option value={w.name}>{w.name}</option>{/each}
				</select>
				<div class="input-row">
					<input type="number" bind:value={setsBall} placeholder="Sets" class="w-50" />
					<span class="input-divider">x</span>
					<input type="number" bind:value={repsBall} placeholder="Reps" class="flex-1" />
					<button class="action-btn btn-blue" onclick={() => addDrill(selectBallWork, setsBall, repsBall)}>+ Add</button>
				</div>
			</div>

			<!-- Part D: Basics -->
			<div class="tracker-box bg-green">
				<span class="section-label text-green">Part D: Brilliant Basics</span>
				<label for="selectBasics">Select Brilliant Basics Exercise</label>
				<select id="selectBasics" bind:value={selectBasics}>
					<option value="" disabled>Select Workout...</option>
					{#each basicsList as w}<option value={w.name}>{w.name}</option>{/each}
				</select>
				<div class="input-row">
					<input type="number" bind:value={setsBasics} placeholder="Sets" class="w-50" />
					<span class="input-divider">x</span>
					<input type="number" bind:value={repsBasics} placeholder="Reps" class="flex-1" />
					<button class="action-btn btn-green" onclick={() => addDrill(selectBasics, setsBasics, repsBasics)}>+ Add</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Training Cart -->
	<div class="tracker-box bg-light-blue">
		<span class="section-label text-blue">Your Training Cart</span>
		<ul class="session-list">
			{#if sessionItems.length === 0}
				<li class="session-empty">Empty. Select drills above to build your workout!</li>
			{:else}
				{#each sessionItems as item, idx}
					<li class="session-item">
						<div class="session-item-text">
							<span class="session-item-title">{idx + 1}. {item.name}</span><br />
							<span class="session-item-detail">({item.sets} x {item.reps})</span>
						</div>
						<button class="delete-btn" onclick={() => removeDrill(idx)}>✕</button>
					</li>
				{/each}
			{/if}
		</ul>

		<div class="workout-summary-box">
			<label>Total Session Time (Minutes)</label>
			<input type="number" placeholder="e.g. 45" bind:value={totalMinutes} />

			<label>How did you do?</label>
			<div class="outcome-row">
				{#each ['Struggled', 'Good', 'Mastered'] as opt}
					<button class="outcome-btn" class:active={outcome === opt} onclick={() => (outcome = opt)}>
						<span>{opt === 'Struggled' ? '🥵' : opt === 'Good' ? '👍' : '🔥'}</span>
						{opt}
					</button>
				{/each}
			</div>

			<label>Parent/Coach Signature</label>
			<div class="signature-canvas-container">
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<canvas
					bind:this={sigCanvas}
					class="signature-canvas"
					onmousedown={startDraw}
					onmouseup={endDraw}
					onmousemove={drawSig}
					onmouseout={endDraw}
					ontouchstart={startDraw}
					ontouchend={endDraw}
					ontouchmove={drawSig}
					aria-label="Signature canvas"
					role="img"
				></canvas>
				<button class="clear-sig-btn" onclick={clearSig}>✕ Clear</button>
			</div>

			<button class="primary-btn btn-log-workout" onclick={submitWorkout}>💾 Log Workout (+XP)</button>
		</div>

		<label>Schedule This Workout instead?</label>
		<div class="schedule-row">
			<input type="date" bind:value={calDate} class="schedule-input" />
			<input type="time" bind:value={calTime} class="schedule-input" />
		</div>

		<div class="export-row">
			<button class="secondary-btn btn-export" onclick={addToGoogleCalendar}>📅 Save to Google Cal</button>
			<button class="secondary-btn btn-export" onclick={downloadIcs}>🗓️ Download .ICS</button>
		</div>
	</div>
</div>

<style>
	.tracker-box {
		margin-bottom: clamp(16px, 3vw, 24px);
	}
	.outcome-row {
		display: flex;
		gap: 10px;
		margin-bottom: 16px;
	}
	.outcome-btn {
		flex: 1;
		padding: 12px;
		text-align: center;
		border: 2px solid #e2e8f0;
		border-radius: 12px;
		cursor: pointer;
		font-weight: 700;
		color: var(--muted-slate);
		background: white;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		font-size: 0.9rem;
		transition: all 0.2s;
	}
	.outcome-btn.active {
		border-color: var(--aggie-blue);
		background: var(--aggie-blue);
		color: white;
	}
	.btn-log-workout {
		width: 100%;
		margin-bottom: 16px;
	}
	.schedule-row {
		display: flex;
		gap: 10px;
		margin-bottom: 12px;
	}
	.export-row {
		display: flex;
		gap: 10px;
	}
	.schedule-input {
		flex: 1;
		margin: 0;
	}
	.btn-export {
		flex: 1;
	}
	.session-item-title { font-weight: 700; }
	.session-item-detail { font-size: 0.85rem; color: var(--muted-slate); }
	.delete-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--danger-red);
		font-size: 1rem;
		padding: 4px 8px;
	}
</style>
