<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { httpsCallable } from 'firebase/functions';
	import { db, functions } from '$lib/firebase.js';
	import { doc, getDoc } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { workoutsStore } from '$lib/stores/workouts.svelte.js';
	import TeamLeaderboard from '$lib/components/tracker/TeamLeaderboard.svelte';
	import Swal from 'sweetalert2';
	import confetti from 'canvas-confetti';

	const logTrainingSession = httpsCallable(functions, 'logTrainingSession');
	const logPlayerActivity = httpsCallable(functions, 'logPlayerActivity');

	/**
	 * @param {{ sets?: unknown; reps?: unknown }[]} items
	 */
	function sessionTotalReps(items) {
		let n = 0;
		for (const i of items) {
			const s = Number(i.sets);
			const r = Number(i.reps);
			if (Number.isFinite(s) && Number.isFinite(r) && s >= 0 && r >= 0) {
				n += Math.floor(s * r);
			}
		}
		return n;
	}

	const profile = $derived(authStore.userProfile);

	$effect(() => {
		if (!authStore.isLoading && authStore.role === 'parent') {
			untrack(() => goto('/parent/log-workout', { replaceState: true }));
		}
	});

	/** Silent daily XP / streak when a player opens the tracker. */
	$effect(() => {
		if (!browser) return;
		if (authStore.isLoading || !authStore.isAuthenticated) return;
		if (authStore.role !== 'player') return;
		let cancelled = false;
		(async () => {
			try {
				await logPlayerActivity({});
				if (cancelled) return;
				await authStore.refresh({ silent: true });
			} catch (e) {
				console.warn('[tracker] logPlayerActivity', e);
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	// Session state
	let sessionItems = $state([]);
	let totalMinutes = $state('');
	let outcome = $state('Good');
	/** @type {'low' | 'medium' | 'high'} */
	let intensity = $state('medium');
	let calDate = $state('');
	let calTime = $state('');

	/** Athlete acknowledgment (self-log; parent-verified logs use /parent/log-workout). */
	let workoutAccuracyAck = $state(false);

	/** Epic 11: completing a coach assignment from the inbox. */
	let homeworkAssignmentId = $state('');

	$effect(() => {
		if (!browser) return;
		const aid = page.url.searchParams.get('assignmentId');
		const did = page.url.searchParams.get('drillId');
		homeworkAssignmentId = aid && aid.trim() ? aid.trim() : '';
		if (!did || !did.trim()) return;
		if (authStore.role !== 'player') return;
		let cancelled = false;
		(async () => {
			try {
				const ds = await getDoc(doc(db, 'drills', did.trim()));
				if (cancelled || !ds.exists()) return;
				const dr = ds.data();
				const name =
					typeof dr.title === 'string' ? dr.title.trim() : 'Assigned drill';
				sessionItems = [{ name, sets: 3, reps: 20 }];
			} catch (e) {
				console.warn('[tracker] homework drill preload', e);
			}
		})();
		return () => {
			cancelled = true;
		};
	});

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
		intensity = 'medium';
		workoutAccuracyAck = false;
		homeworkAssignmentId = '';
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
		if (!workoutAccuracyAck) {
			return alert('Confirm the accuracy checkbox to submit your workout log.');
		}
		const mins = parseInt(totalMinutes || 0);
		if (mins <= 0) return alert('Please enter valid total minutes.');
		if (!profile?.teamId || !profile?.playerName) return alert('User profile is incomplete.');
		if (authStore.role !== 'player') {
			return alert('Use the parent workout log for guardian-verified sessions.');
		}

		try {
			const baseDrills =
				sessionItems.map((i) => i.name).filter(Boolean).join(' · ') || 'Training session';
			const drillType = `${baseDrills} (${outcome})`.slice(0, 200);
			const repTotal = sessionTotalReps(sessionItems);

			const res = await logTrainingSession({
				drillType,
				duration: mins,
				reps: repTotal,
				intensity,
				...(homeworkAssignmentId ? { assignmentId: homeworkAssignmentId } : {})
			});
			const payload = res.data;
			const earned = payload && typeof payload.earnedXP === 'number' ? payload.earnedXP : 0;
			const newTotal = payload && typeof payload.totalXp === 'number' ? payload.totalXp : 0;
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.setItem(
					'elite_xp_pulse',
					JSON.stringify({
						fromTotal: Math.max(0, newTotal - earned),
						toTotal: newTotal
					})
				);
			}

			confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#0f172a', '#fbbf24', '#3b82f6'] });
			await Swal.fire({
				title: 'Workout Logged!',
				text: `+${earned} XP · Level ${payload?.level ?? '—'}`,
				icon: 'success',
				confirmButtonColor: '#0f172a',
				confirmButtonText: 'Keep Grinding',
				customClass: { popup: 'card' }
			});
			await authStore.refresh({ silent: true });
			clearForm();
			goto('/stats');
		} catch (e) {
			const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
			alert('Could not log workout: ' + msg);
		}
	};
</script>

<div class="view-section locked-dashboard-view tracker-page">
	<h2 class="view-title">Log Workout</h2>

	{#if homeworkAssignmentId && authStore.role === 'player'}
		<div class="card tracker-hw-banner">
			<div class="card-body">
				<strong>Completing assigned homework</strong>
				<p class="tracker-hw-banner__text">
					This log will mark the assignment complete when you submit (server-verified).
				</p>
			</div>
		</div>
	{/if}

	{#if authStore.role === 'player' && profile?.teamId && profile.teamId !== 'admin'}
		<TeamLeaderboard />
	{/if}

	<div class="tracker-main-panel">
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

			<label>Intensity (XP multiplier)</label>
			<div class="outcome-row">
				{#each ['low', 'medium', 'high'] as tier}
					<button
						type="button"
						class="outcome-btn"
						class:active={intensity === tier}
						onclick={() => (intensity = /** @type {'low' | 'medium' | 'high'} */ (tier))}
					>
						<span>{tier === 'low' ? '🌙' : tier === 'medium' ? '⚡' : '🔥'}</span>
						{tier}
					</button>
				{/each}
			</div>

			<div class="verify-panel">
				<span class="verify-heading">Submit workout (player account)</span>
				<p class="verify-help">
					XP is calculated on the server (<code>logTrainingSession</code>). This path is a
					<strong>self-log</strong> (not guardian-verified). For a parent-verified session, a guardian must sign
					in and use
					<a class="parent-log-link" href="/parent/log-workout">Log workout for athlete</a>.
				</p>
				<label class="verify-check">
					<input type="checkbox" bind:checked={workoutAccuracyAck} />
					<span>I confirm this workout log is accurate to the best of my knowledge.</span>
				</label>
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
</div>

<style>
	.tracker-hw-banner {
		margin-bottom: clamp(14px, 2.5vw, 20px);
		border-color: color-mix(in srgb, var(--brand-primary) 35%, var(--glass-border));
		background: color-mix(in srgb, var(--brand-primary) 8%, var(--glass-bg));
	}
	.tracker-hw-banner__text {
		margin: 8px 0 0;
		font-size: 0.88rem;
		line-height: 1.45;
	}
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
	.verify-panel {
		margin-bottom: clamp(14px, 2.5vw, 18px);
		padding: clamp(12px, 2vw, 16px);
		border-radius: 16px;
		border: 1px solid var(--glass-border);
		background: rgba(15, 23, 42, 0.03);
		display: flex;
		flex-direction: column;
		gap: clamp(8px, 1.5vw, 12px);
	}
	:global(html.dark) .verify-panel {
		background: rgba(15, 23, 42, 0.35);
	}
	.verify-heading {
		font-weight: 800;
		font-size: 0.95rem;
	}
	.verify-help {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.45;
		opacity: 0.9;
	}
	.parent-log-link {
		font-weight: 800;
		color: var(--aggie-blue);
		text-decoration: underline;
	}
	.verify-check {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		font-size: 0.86rem;
		font-weight: 600;
		line-height: 1.45;
		cursor: pointer;
	}
	.verify-check input {
		margin-top: 0.125rem;
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
