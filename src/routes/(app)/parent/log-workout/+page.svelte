<script>
	import { goto } from '$app/navigation';
	import { httpsCallable } from 'firebase/functions';
	import { functions, db } from '$lib/firebase.js';
	import { doc, getDoc } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { workoutsStore } from '$lib/stores/workouts.svelte.js';
	import Swal from 'sweetalert2';
	import confetti from 'canvas-confetti';

	const submitWorkoutRep = httpsCallable(functions, 'submitWorkoutRep');

	const role = $derived(authStore.role);
	const profile = $derived(authStore.userProfile);

	let children = $state([]);
	let childrenLoading = $state(true);
	let selectedChildEmail = $state('');
	let sessionItems = $state([]);
	let totalMinutes = $state('');
	let outcome = $state('Good');
	let verifierLegalName = $state('');
	let parentVerifiedAck = $state(false);

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

	const selectedChild = $derived(children.find((c) => c.email === selectedChildEmail) || null);

	const warmupList = $derived(workoutsStore.byType('cardio'));
	const coreList = $derived(workoutsStore.byType('core'));
	const ballList = $derived(workoutsStore.byType('ball_mastery'));
	const basicsList = $derived(workoutsStore.byType('foundation'));

	$effect(() => {
		if (!authStore.isLoading && role !== 'parent') {
			goto('/home', { replaceState: true });
		}
	});

	$effect(() => {
		if (!profile?.householdId || role !== 'parent') {
			childrenLoading = false;
			children = [];
			return;
		}
		let cancelled = false;
		childrenLoading = true;
		(async () => {
			try {
				const hSnap = await getDoc(doc(db, 'households', profile.householdId));
				if (!hSnap.exists() || cancelled) return;
				const pe = hSnap.data().playerEmails || [];
				const rows = [];
				for (const raw of pe) {
					const em = String(raw || '')
						.trim()
						.toLowerCase();
					if (!em) continue;
					const uSnap = await getDoc(doc(db, 'users', em));
					if (!uSnap.exists()) continue;
					const u = uSnap.data();
					rows.push({
						email: em,
						playerName: u.playerName || em,
						teamId: u.teamId || ''
					});
				}
				if (!cancelled) children = rows;
			} catch (e) {
				console.error(e);
				if (!cancelled) children = [];
			} finally {
				if (!cancelled) childrenLoading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const tid = selectedChild?.teamId;
		if (tid) workoutsStore.loadForTeam(tid);
	});

	const addDrill = (name, sets, reps) => {
		if (!name || name === 'Select Workout...') return alert('Please select a drill first.');
		sessionItems = [...sessionItems, { name, sets: sets || 1, reps: reps || 1 }];
	};

	const removeDrill = (idx) => {
		sessionItems = sessionItems.filter((_, i) => i !== idx);
	};

	const fullNameOk = (raw) => {
		const parts = raw.trim().split(/\s+/).filter(Boolean);
		return parts.length >= 2 && raw.trim().length >= 4;
	};

	const clearForm = () => {
		sessionItems = [];
		totalMinutes = '';
		outcome = 'Good';
		verifierLegalName = '';
		parentVerifiedAck = false;
	};

	const submitWorkout = async () => {
		if (!selectedChildEmail) return alert('Select an athlete linked to your household.');
		if (sessionItems.length === 0) return alert('Add drills to the session first.');
		if (!parentVerifiedAck) return alert('Confirm the verification checkbox.');
		if (!fullNameOk(verifierLegalName)) {
			return alert('Enter your full legal name (first and last) as the verifying guardian.');
		}
		const mins = parseInt(totalMinutes || 0);
		if (mins <= 0) return alert('Enter valid total minutes.');

		try {
			await submitWorkoutRep({
				playerEmail: selectedChildEmail,
				verifierLegalName: verifierLegalName.trim().replace(/\s+/g, ' '),
				minutes: mins,
				outcome,
				drills: sessionItems
			});
			confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#0f172a', '#fbbf24', '#3b82f6'] });
			await Swal.fire({
				title: 'Workout logged',
				text: 'Guardian-verified session saved.',
				icon: 'success',
				confirmButtonColor: '#0f172a'
			});
			clearForm();
			goto('/home');
		} catch (e) {
			const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
			alert('Could not log workout: ' + msg);
		}
	};
</script>

<div class="view-section">
	<h2 class="view-title">Log workout for athlete</h2>
	<p class="lead">
		Parent accounts verify sessions on behalf of a linked minor or athlete. Entries are stored with your Firebase
		identity and an integrity digest.
	</p>

	<div class="card">
		<div class="card-body">
			{#if childrenLoading}
				<p class="muted">Loading linked athletes…</p>
			{:else if children.length === 0}
				<p class="muted">No athlete accounts linked to your household yet. Ask your director to connect player emails.</p>
			{:else}
				<label class="field-label" for="child-pick">Athlete</label>
				<select id="child-pick" class="field-control" bind:value={selectedChildEmail}>
					<option value="">— Select —</option>
					{#each children as c}
						<option value={c.email}>{c.playerName} ({c.email})</option>
					{/each}
				</select>

				{#if selectedChild?.teamId}
					<div class="tracker-box bg-orange">
						<span class="section-label text-orange">Cardio</span>
						<label for="pwarm">Warm-Up</label>
						<select id="pwarm" bind:value={selectWarmup}>
							<option value="" disabled>Select…</option>
							{#each warmupList as w}<option value={w.name}>{w.name}</option>{/each}
						</select>
						<div class="input-row">
							<input type="number" bind:value={cardioDist} placeholder="Miles" class="flex-1" />
							<span class="input-divider">/</span>
							<input type="number" bind:value={cardioTime} placeholder="Mins" class="flex-1" />
							<button type="button" class="action-btn btn-orange" onclick={() => addDrill(selectWarmup, cardioDist, cardioTime)}>+ Add</button>
						</div>
					</div>

					<div class="tracker-box bg-red">
						<span class="section-label text-red">Core</span>
						<label for="pcore">Core</label>
						<select id="pcore" bind:value={selectCore}>
							<option value="" disabled>Select…</option>
							{#each coreList as w}<option value={w.name}>{w.name}</option>{/each}
						</select>
						<div class="input-row">
							<input type="number" bind:value={setsCore} placeholder="Sets" class="w-50" />
							<span class="input-divider">x</span>
							<input type="number" bind:value={repsCore} placeholder="Reps" class="flex-1" />
							<button type="button" class="action-btn btn-red" onclick={() => addDrill(selectCore, setsCore, repsCore)}>+ Add</button>
						</div>
					</div>

					<div class="tracker-box bg-blue">
						<span class="section-label text-blue">Ball</span>
						<label for="pball">Ball work</label>
						<select id="pball" bind:value={selectBallWork}>
							<option value="" disabled>Select…</option>
							{#each ballList as w}<option value={w.name}>{w.name}</option>{/each}
						</select>
						<div class="input-row">
							<input type="number" bind:value={setsBall} placeholder="Sets" class="w-50" />
							<span class="input-divider">x</span>
							<input type="number" bind:value={repsBall} placeholder="Reps" class="flex-1" />
							<button type="button" class="action-btn btn-blue" onclick={() => addDrill(selectBallWork, setsBall, repsBall)}>+ Add</button>
						</div>
					</div>

					<div class="tracker-box bg-green">
						<span class="section-label text-green">Basics</span>
						<label for="pbasic">Brilliant basics</label>
						<select id="pbasic" bind:value={selectBasics}>
							<option value="" disabled>Select…</option>
							{#each basicsList as w}<option value={w.name}>{w.name}</option>{/each}
						</select>
						<div class="input-row">
							<input type="number" bind:value={setsBasics} placeholder="Sets" class="w-50" />
							<span class="input-divider">x</span>
							<input type="number" bind:value={repsBasics} placeholder="Reps" class="flex-1" />
							<button type="button" class="action-btn btn-green" onclick={() => addDrill(selectBasics, setsBasics, repsBasics)}>+ Add</button>
						</div>
					</div>

					<div class="cart">
						<span class="section-label text-blue">Session</span>
						<ul class="session-list">
							{#if sessionItems.length === 0}
								<li class="session-empty">Add drills above.</li>
							{:else}
								{#each sessionItems as item, idx}
									<li class="session-item">
										<div>
											<b>{idx + 1}. {item.name}</b>
											<span class="detail">({item.sets} × {item.reps})</span>
										</div>
										<button type="button" class="delete-btn" onclick={() => removeDrill(idx)}>✕</button>
									</li>
								{/each}
							{/if}
						</ul>

						<label class="field-label" for="pmins">Total minutes</label>
						<input id="pmins" class="field-control" type="number" bind:value={totalMinutes} placeholder="e.g. 45" />

						<span class="field-label">How did they do?</span>
						<div class="outcome-row">
							{#each ['Struggled', 'Good', 'Mastered'] as opt}
								<button type="button" class="outcome-btn" class:active={outcome === opt} onclick={() => (outcome = opt)}>
									{opt}
								</button>
							{/each}
						</div>

						<div class="verify-panel">
							<span class="verify-heading">Guardian attestation</span>
							<label class="field-label" for="plegal">Your full legal name</label>
							<input
								id="plegal"
								class="field-control"
								type="text"
								autocomplete="name"
								placeholder="First and last name"
								bind:value={verifierLegalName}
							/>
							<label class="verify-check">
								<input type="checkbox" bind:checked={parentVerifiedAck} />
								<span>I confirm this session was completed as logged for the selected athlete.</span>
							</label>
						</div>

						<button type="button" class="primary-btn w-full" onclick={submitWorkout}>Save verified workout</button>
					</div>
				{:else if selectedChildEmail}
					<p class="muted">Selected athlete has no team on file yet.</p>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.lead {
		font-size: 0.9rem;
		line-height: 1.5;
		opacity: 0.92;
		margin-bottom: clamp(12px, 2vw, 18px);
	}
	.field-label {
		display: block;
		font-weight: 800;
		font-size: 0.82rem;
		margin-top: clamp(10px, 2vw, 14px);
		margin-bottom: 6px;
	}
	.field-control {
		width: 100%;
		box-sizing: border-box;
		padding: clamp(10px, 2vw, 12px);
		border-radius: 14px;
		border: 1px solid var(--glass-border);
		font: inherit;
		background: var(--glass-bg);
		color: inherit;
	}
	.tracker-box {
		margin-bottom: clamp(14px, 2.5vw, 20px);
		padding: clamp(10px, 2vw, 14px);
		border-radius: 16px;
		border: 1px solid var(--glass-border);
	}
	.section-label {
		display: block;
		font-weight: 800;
		font-size: 0.85rem;
		margin-bottom: 8px;
	}
	.input-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 8px;
	}
	.input-divider {
		opacity: 0.6;
	}
	.flex-1 {
		flex: 1;
	}
	.w-50 {
		width: 48px;
	}
	.action-btn {
		padding: 8px 12px;
		border-radius: 12px;
		border: none;
		cursor: pointer;
		font-weight: 700;
		color: white;
	}
	.btn-orange {
		background: #ea580c;
	}
	.btn-red {
		background: #dc2626;
	}
	.btn-blue {
		background: #2563eb;
	}
	.btn-green {
		background: #16a34a;
	}
	.cart {
		margin-top: clamp(12px, 2vw, 18px);
	}
	.session-list {
		list-style: none;
		padding: 0;
		margin: 0 0 12px;
	}
	.session-empty {
		padding: 12px;
		opacity: 0.8;
	}
	.session-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 0;
		border-bottom: 1px solid var(--glass-border);
	}
	.detail {
		font-size: 0.85rem;
		opacity: 0.85;
		margin-left: 8px;
	}
	.delete-btn {
		background: none;
		border: none;
		color: var(--danger-red);
		cursor: pointer;
		font-size: 1rem;
	}
	.outcome-row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 12px;
	}
	.outcome-btn {
		flex: 1;
		min-width: 90px;
		padding: 10px;
		border-radius: 12px;
		border: 2px solid var(--glass-border);
		background: var(--glass-bg);
		cursor: pointer;
		font-weight: 700;
	}
	.outcome-btn.active {
		border-color: var(--aggie-blue);
		background: var(--aggie-blue);
		color: white;
	}
	.verify-panel {
		padding: clamp(12px, 2vw, 16px);
		border-radius: 16px;
		border: 1px solid var(--glass-border);
		background: rgba(15, 23, 42, 0.03);
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 16px;
	}
	:global(html.dark) .verify-panel {
		background: rgba(15, 23, 42, 0.35);
	}
	.verify-heading {
		font-weight: 800;
	}
	.verify-check {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		font-size: 0.88rem;
		font-weight: 600;
		line-height: 1.45;
		cursor: pointer;
	}
	.verify-check input {
		margin-top: 4px;
	}
	.w-full {
		width: 100%;
	}
	.muted {
		opacity: 0.85;
	}
</style>
