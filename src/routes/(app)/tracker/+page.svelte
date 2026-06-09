<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { untrack } from 'svelte';
	import { httpsCallable } from 'firebase/functions';
	import { db, functions } from '$lib/firebase.js';
	import { doc, getDoc } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { workoutsStore } from '$lib/stores/workouts.svelte.js';
	import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import PlayerDiegeticOverlay from '$lib/components/player/PlayerDiegeticOverlay.svelte';
	import { dopamineOnCallable } from '$lib/services/dopamine.svelte.js';

	const logTrainingSession = httpsCallable(functions, 'logTrainingSession');
	const logPlayerActivity = httpsCallable(functions, 'logPlayerActivity');

	/** @param {{ sets?: unknown; reps?: unknown }[]} items */
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

	/** @param {number} step */
	function intensityMultiplierFromStep(step) {
		if (step <= 3) return 1.0;
		if (step <= 7) return 1.15;
		return 1.35;
	}

	/** @param {number} step */
	function intensityApiFromStep(step) {
		if (step <= 3) return /** @type {const} */ ('low');
		if (step <= 7) return /** @type {const} */ ('medium');
		return /** @type {const} */ ('high');
	}

	const profile = $derived(authStore.userProfile);
	const isPlayer = $derived(authStore.role === 'player');

	const totalXpHud = $derived(
		Math.max(0, Math.floor(Number(profile?.totalXp ?? profile?.xp) || 0)),
	);
	const levelHud = $derived(getLevelProgressFromTotalXp(totalXpHud));
	const xpToNextLabel = $derived(
		levelHud.xpToNext <= 0
			? '—'
			: String(Math.max(0, levelHud.xpToNext - levelHud.xpIntoLevel)),
	);
	const streakDays = $derived(Math.max(0, Math.floor(Number(profile?.currentStreak) || 0)));

	/** @type {'technical' | 'physical' | 'match' | 'recovery' | null} */
	let workoutFocus = $state(null);
	let intensitySlider = $state(5);
	let sessionItems = $state([]);
	let totalMinutes = $state('');
	let outcome = $state('Good');
	let calDate = $state('');
	let calTime = $state('');
	let workoutAccuracyAck = $state(false);
	let homeworkAssignmentId = $state('');
	let submitting = $state(false);

	// CLB-1 — cohesive diegetic confirmation (replaces the legacy commit modal).
	let overlayOpen = $state(false);
	let overlayVariant = $state<'success' | 'error' | 'confirm'>('success');
	let overlayTitle = $state('');
	let overlayMessage = $state('');

	async function onOverlayConfirm() {
		const wasSuccess = overlayVariant === 'success';
		overlayOpen = false;
		if (wasSuccess) {
			await authStore.refresh({ silent: true });
			clearForm();
			goto('/stats');
		}
	}

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
	let builderOpen = $state(false);

	const warmupList = $derived(workoutsStore.byType('cardio'));
	const coreList = $derived(workoutsStore.byType('core'));
	const ballList = $derived(workoutsStore.byType('ball_mastery'));
	const basicsList = $derived(workoutsStore.byType('foundation'));

	const FOCUS_OPTIONS: Array<{ id: 'technical' | 'physical' | 'match' | 'recovery'; label: string; blurb: string; icon: IconName }> = [
		{
			id: 'technical',
			label: 'Technical',
			blurb: 'Touches, passing, finishing',
			icon: 'sport.soccer',
		},
		{
			id: 'physical',
			label: 'Physical',
			blurb: 'Strength, speed, conditioning',
			icon: 'game.dumbbell',
		},
		{
			id: 'match',
			label: 'Match',
			blurb: 'Games, scrimmages, reps',
			icon: 'sys.flag',
		},
		{
			id: 'recovery',
			label: 'Recovery',
			blurb: 'Mobility, reset, prehab',
			icon: 'data.pulse',
		},
	];

	const intensityApi = $derived(intensityApiFromStep(intensitySlider));
	const repTotalEst = $derived(sessionTotalReps(sessionItems));
	const minsEst = $derived(Math.max(0, parseInt(String(totalMinutes || '0'), 10) || 0));
	const estimatedXp = $derived.by(() => {
		const base = minsEst * 10 + repTotalEst * 2;
		const m = intensityMultiplierFromStep(intensitySlider);
		return Math.max(0, Math.floor(base * m));
	});

	$effect(() => {
		if (!authStore.isLoading && authStore.role === 'parent') {
			untrack(() => goto('/parent/log-workout', { replaceState: true }));
		}
	});

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
				untrack(() => {
					workoutFocus = 'technical';
				});
			} catch (e) {
				console.warn('[tracker] homework drill preload', e);
			}
		})();
		return () => {
			cancelled = true;
		};
	});

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
		intensitySlider = 5;
		workoutAccuracyAck = false;
		homeworkAssignmentId = '';
		workoutFocus = null;
		builderOpen = false;
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
		window.open(
			`https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Soccer training')}&dates=${start}/${end}&details=${encodeURIComponent(getSessionDescription())}&sf=true&output=xml`,
			'_blank',
		);
	};

	const downloadIcs = () => {
		if (sessionItems.length === 0) return alert('Add drills to the list first!');
		if (!calDate || !calTime) return alert('Select Date and Time.');
		const formatICS = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '').split('Z')[0];
		const startDate = new Date(`${calDate}T${calTime}`);
		const endDate = new Date(startDate.getTime() + 45 * 60000);
		const ics = [
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'BEGIN:VEVENT',
			'SUMMARY:⚽ Soccer Training',
			`DESCRIPTION:${getSessionDescription()}`,
			`DTSTART:${formatICS(startDate)}`,
			`DTEND:${formatICS(endDate)}`,
			'END:VEVENT',
			'END:VCALENDAR',
		].join('\n');
		const link = document.createElement('a');
		link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
		link.download = 'training_session.ics';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const focusLabel = $derived.by(() => {
		const f = FOCUS_OPTIONS.find((x) => x.id === workoutFocus);
		return f ? f.label : 'Session';
	});

	const submitWorkout = async () => {
		if (!workoutFocus) return alert('Pick a workout focus (Technical, Physical, Match, or Recovery).');
		if (!workoutAccuracyAck) {
			return alert('Confirm the accuracy checkbox to submit your workout log.');
		}
		const mins = parseInt(totalMinutes || 0);
		if (mins <= 0) return alert('Enter how many minutes you trained.');
		if (!profile?.teamId || !profile?.playerName) return alert('User profile is incomplete.');
		if (authStore.role !== 'player') {
			return alert('Use the parent workout log for guardian-verified sessions.');
		}

		const baseDrills =
			sessionItems.map((i) => i.name).filter(Boolean).join(' · ') || `${focusLabel} block`;
		const drillType = `[${focusLabel}] ${baseDrills} (${outcome})`.slice(0, 200);
		const repTotal = sessionTotalReps(sessionItems);

		submitting = true;
		try {
		const res = await dopamineOnCallable(
			logTrainingSession({
				drillType,
				duration: mins,
				reps: repTotal,
				intensity: intensityApi,
				...(homeworkAssignmentId ? { assignmentId: homeworkAssignmentId } : {}),
			}),
			{ kind: 'drill' },
		);
		const payload = res.data as
			| { earnedXP?: number; totalXp?: number; level?: number }
			| undefined;
		const earned = payload && typeof payload.earnedXP === 'number' ? payload.earnedXP : 0;
		const newTotal = payload && typeof payload.totalXp === 'number' ? payload.totalXp : 0;
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem(
				'elite_xp_pulse',
				JSON.stringify({
					fromTotal: Math.max(0, newTotal - earned),
					toTotal: newTotal,
				}),
			);
		}

		overlayVariant = 'success';
		overlayTitle = 'Workout Logged!';
		overlayMessage = `+${earned} XP · Level ${payload?.level ?? '—'}`;
		overlayOpen = true;
		} catch (e) {
			const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
			overlayVariant = 'error';
			overlayTitle = 'Log Failed';
			overlayMessage = 'Could not log workout: ' + msg;
			overlayOpen = true;
		} finally {
			submitting = false;
		}
	};
</script>

<div class="view-section locked-dashboard-view tracker-page" class:pos-tracker={isPlayer}>
	{#if isPlayer}
		<div class="gw-root">
			<!-- 1. Player HUD -->
			<section class="gw-hud" aria-label="Player progress">
				<div class="gw-hud__cell">
					<span class="gw-hud__label">Current level</span>
					<span class="gw-hud__value gw-hud__value--level">Lv. {levelHud.level}</span>
				</div>
				<div class="gw-hud__cell">
					<span class="gw-hud__label">XP to next level</span>
					<span class="gw-hud__value gw-hud__value--mono">{xpToNextLabel}</span>
				</div>
				<div class="gw-hud__cell">
					<span class="gw-hud__label">Day streak</span>
					<span class="gw-hud__value gw-hud__value--streak">
						<Icon name="game.flame" />
						{streakDays}d
					</span>
				</div>
			</section>

			{#if homeworkAssignmentId}
				<div class="gw-banner">
					<strong>Assigned homework</strong>
					<p class="gw-banner__text">
						This log completes the assignment when you submit (server-verified).
					</p>
				</div>
			{/if}

			<!-- 2. Workout focus grid -->
			<section class="gw-section" aria-labelledby="gw-focus-heading">
				<h2 id="gw-focus-heading" class="gw-section__title">Workout focus</h2>
				<p class="gw-section__hint">What dominated this session? One tap.</p>
				<div class="gw-focus-grid" role="group" aria-label="Workout focus">
					{#each FOCUS_OPTIONS as opt (opt.id)}
						<button
							type="button"
							class="gw-focus-card"
							class:gw-focus-card--active={workoutFocus === opt.id}
							onclick={() => (workoutFocus = opt.id)}
						>
							<Icon name={opt.icon} class="gw-focus-card__icon" />
							<span class="gw-focus-card__label">{opt.label}</span>
							<span class="gw-focus-card__blurb">{opt.blurb}</span>
						</button>
					{/each}
				</div>
			</section>

			<!-- Duration + outcome -->
			<section class="gw-section">
				<label class="gw-field-label" for="gw-mins">Duration (minutes)</label>
				<input
					id="gw-mins"
					class="gw-input"
					type="number"
					inputmode="numeric"
					min="1"
					max="240"
					placeholder="e.g. 45"
					bind:value={totalMinutes}
				/>

				<span class="gw-field-label gw-field-label--spaced">How did it feel?</span>
				<div class="gw-pills" role="group" aria-label="Session outcome">
					{#each ['Struggled', 'Good', 'Mastered'] as opt}
						<button
							type="button"
							class="gw-pill"
							class:gw-pill--active={outcome === opt}
							onclick={() => (outcome = opt)}
						>
							{opt}
						</button>
					{/each}
				</div>
			</section>

			<!-- 3. Intensity slider -->
			<section class="gw-section" aria-labelledby="gw-intensity-heading">
				<div class="gw-intensity-head">
					<h2 id="gw-intensity-heading" class="gw-section__title gw-section__title--inline">Intensity</h2>
					<span class="gw-intensity-badge" aria-live="polite">{intensitySlider} / 10</span>
				</div>
				<p class="gw-section__hint">
					Dials your XP multiplier ({intensityApi} · server-verified curve).
				</p>
				<div class="gw-slider-wrap">
					<input
						class="gw-slider"
						type="range"
						min="1"
						max="10"
						step="1"
						bind:value={intensitySlider}
						aria-valuemin={1}
						aria-valuemax={10}
						aria-valuenow={intensitySlider}
						aria-valuetext="Intensity {intensitySlider} of 10"
					/>
					<div class="gw-slider-ticks" aria-hidden="true">
						{#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as n}
							<span class:gw-slider-ticks__on={n <= intensitySlider}></span>
						{/each}
					</div>
				</div>
			</section>

			<!-- Session payload: drills optional -->
			<section class="gw-section">
				<button
					type="button"
					class="gw-accordion-btn"
					aria-expanded={builderOpen}
					onclick={() => (builderOpen = !builderOpen)}
				>
					<span>Add specific drills (optional)</span>
					<Icon name="nav.chevron-down" class="gw-accordion-btn__icon {builderOpen ? 'gw-accordion-btn__icon--open' : ''}" />
				</button>
				{#if builderOpen}
					<div class="gw-builder">
						<div class="gw-builder__grid">
							<div class="gw-builder__block">
								<span class="gw-builder__tag">Cardio</span>
								<select class="gw-select" bind:value={selectWarmup}>
									<option value="" disabled>Pick warm-up…</option>
									{#each warmupList as w}<option value={w.name}>{w.name}</option>{/each}
								</select>
								<div class="gw-builder__row">
									<input class="gw-input gw-input--sm" type="number" bind:value={cardioDist} placeholder="Mi" />
									<input class="gw-input gw-input--sm" type="number" bind:value={cardioTime} placeholder="Min" />
									<button type="button" class="gw-mini-add" onclick={() => addDrill(selectWarmup, cardioDist, cardioTime)}>Add</button>
								</div>
							</div>
							<div class="gw-builder__block">
								<span class="gw-builder__tag">Core</span>
								<select class="gw-select" bind:value={selectCore}>
									<option value="" disabled>Pick exercise…</option>
									{#each coreList as w}<option value={w.name}>{w.name}</option>{/each}
								</select>
								<div class="gw-builder__row">
									<input class="gw-input gw-input--sm" type="number" bind:value={setsCore} placeholder="Sets" />
									<input class="gw-input gw-input--sm" type="number" bind:value={repsCore} placeholder="Reps" />
									<button type="button" class="gw-mini-add" onclick={() => addDrill(selectCore, setsCore, repsCore)}>Add</button>
								</div>
							</div>
							<div class="gw-builder__block">
								<span class="gw-builder__tag">Ball</span>
								<select class="gw-select" bind:value={selectBallWork}>
									<option value="" disabled>Pick drill…</option>
									{#each ballList as w}<option value={w.name}>{w.name}</option>{/each}
								</select>
								<div class="gw-builder__row">
									<input class="gw-input gw-input--sm" type="number" bind:value={setsBall} placeholder="Sets" />
									<input class="gw-input gw-input--sm" type="number" bind:value={repsBall} placeholder="Reps" />
									<button type="button" class="gw-mini-add" onclick={() => addDrill(selectBallWork, setsBall, repsBall)}>Add</button>
								</div>
							</div>
							<div class="gw-builder__block">
								<span class="gw-builder__tag">Basics</span>
								<select class="gw-select" bind:value={selectBasics}>
									<option value="" disabled>Pick drill…</option>
									{#each basicsList as w}<option value={w.name}>{w.name}</option>{/each}
								</select>
								<div class="gw-builder__row">
									<input class="gw-input gw-input--sm" type="number" bind:value={setsBasics} placeholder="Sets" />
									<input class="gw-input gw-input--sm" type="number" bind:value={repsBasics} placeholder="Reps" />
									<button type="button" class="gw-mini-add" onclick={() => addDrill(selectBasics, setsBasics, repsBasics)}>Add</button>
								</div>
							</div>
						</div>
						{#if sessionItems.length > 0}
							<ul class="gw-cart">
								{#each sessionItems as item, idx}
									<li class="gw-cart__row">
										<span class="gw-cart__text">
											<strong>{item.name}</strong>
											<span class="gw-cart__meta">{item.sets} × {item.reps}</span>
										</span>
										<button type="button" class="gw-cart__rm" onclick={() => removeDrill(idx)} aria-label="Remove">×</button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
			</section>

			<section class="gw-section gw-section--schedule">
				<span class="gw-field-label">Schedule instead</span>
				<div class="gw-schedule-row">
					<input class="gw-input" type="date" bind:value={calDate} />
					<input class="gw-input" type="time" bind:value={calTime} />
				</div>
				<div class="gw-schedule-actions">
					<button type="button" class="gw-btn-secondary" onclick={addToGoogleCalendar}>Google Calendar</button>
					<button type="button" class="gw-btn-secondary" onclick={downloadIcs}>Download .ics</button>
				</div>
			</section>

			<div class="gw-verify">
				<p class="gw-verify__note">
					XP is calculated on the server. Self-log — guardians use
					<a class="gw-link" href="/parent/log-workout">parent verify</a>.
				</p>
				<label class="gw-check">
					<input type="checkbox" bind:checked={workoutAccuracyAck} />
					<span>I confirm this log is accurate.</span>
				</label>
			</div>

			<!-- 4. Primary payload CTA -->
			<button
				type="button"
				class="gw-submit"
				disabled={submitting || estimatedXp < 1}
				onclick={submitWorkout}
			>
				{#if submitting}
					<span class="gw-submit__shine">Logging…</span>
				{:else}
					Log workout &amp; claim +{estimatedXp} XP
				{/if}
			</button>
		</div>
	{:else}
		<h2 class="view-title">Log workout</h2>
		<div class="tracker-main-panel">
			<div class="card">
				<div class="card-body">
					<div class="tracker-box bg-orange">
						<span class="section-label text-orange">Part A: Cardio Warm-Up</span>
						<label for="selectWarmup-legacy">Select Warm-Up</label>
						<select id="selectWarmup-legacy" bind:value={selectWarmup}>
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
					<div class="tracker-box bg-red">
						<span class="section-label text-red">Part B: Core Strength</span>
						<label for="selectCore-legacy">Select Core Exercise</label>
						<select id="selectCore-legacy" bind:value={selectCore}>
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
					<div class="tracker-box bg-blue">
						<span class="section-label text-blue">Part C: Ball Handling</span>
						<label for="selectBallWork-legacy">Select Ball Work Exercise</label>
						<select id="selectBallWork-legacy" bind:value={selectBallWork}>
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
					<div class="tracker-box bg-green">
						<span class="section-label text-green">Part D: Brilliant Basics</span>
						<label for="selectBasics-legacy">Select Brilliant Basics Exercise</label>
						<select id="selectBasics-legacy" bind:value={selectBasics}>
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
					<label for="legacy-mins">Total Session Time (Minutes)</label>
					<input id="legacy-mins" type="number" placeholder="e.g. 45" bind:value={totalMinutes} />
					<label>How did you do?</label>
					<div class="outcome-row">
						{#each ['Struggled', 'Good', 'Mastered'] as opt}
							<button class="outcome-btn" class:active={outcome === opt} onclick={() => (outcome = opt)}>{opt}</button>
						{/each}
					</div>
					<label>Intensity (XP multiplier)</label>
					<div class="outcome-row">
						{#each ['low', 'medium', 'high'] as tier}
							<button
								type="button"
								class="outcome-btn"
								class:active={intensityApi === tier}
								onclick={() => {
									intensitySlider = tier === 'low' ? 2 : tier === 'medium' ? 5 : 9;
								}}
							>
								{tier}
							</button>
						{/each}
					</div>
					<p class="verify-help">Use a player account to earn XP, or parent log for verified sessions.</p>
					<button class="primary-btn btn-log-workout" onclick={() => alert('Open this page as a player to submit.')}>Log workout</button>
				</div>
			</div>
		</div>
	{/if}

	<PlayerDiegeticOverlay
		open={overlayOpen}
		variant={overlayVariant}
		title={overlayTitle}
		message={overlayMessage}
		confirmLabel={overlayVariant === 'success' ? 'Continue' : 'OK'}
		onConfirm={onOverlayConfirm}
		onCancel={() => (overlayOpen = false)}
	/>
</div>

<style>
	/* ═══ Gamified workout logger (player) ═══ */
	.gw-root {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 0.25rem 0 1.5rem;
		background: #09090b;
		border-radius: 20px;
		max-width: 100%;
	}

	.gw-hud {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--bento-gap-xs);
		padding: var(--bento-pad-sm) 12px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
	}

	@media (max-width: 360px) {
		.gw-hud {
			grid-template-columns: 1fr;
		}
	}

	.gw-hud__cell {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
		padding: 8px 6px;
	}

	.gw-hud__label {
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(228, 228, 231, 0.55);
	}

	.gw-hud__value {
		font-size: 1.35rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		color: #fafafa;
		line-height: 1.1;
	}

	.gw-hud__value--level {
		background: linear-gradient(120deg, #fde68a 0%, #f59e0b 35%, #a855f7 90%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.gw-hud__value--mono {
		font-variant-numeric: tabular-nums;
	}

	.gw-hud__value--streak {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-variant-numeric: tabular-nums;
		color: #fb923c;
	}

	.gw-hud__value--streak i {
		font-size: 1.15rem;
	}

	.gw-banner {
		padding: 12px 14px;
		border-radius: 14px;
		border: 1px solid rgba(99, 102, 241, 0.35);
		background: rgba(79, 70, 229, 0.12);
		color: #e4e4e7;
		font-size: 0.88rem;
	}

	.gw-banner__text {
		margin: 6px 0 0;
		opacity: 0.9;
		line-height: 1.45;
	}

	.gw-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.gw-section--schedule {
		padding: 14px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.02);
	}

	.gw-section__title {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(228, 228, 231, 0.75);
	}

	.gw-section__title--inline {
		margin: 0;
	}

	.gw-section__hint {
		margin: -2px 0 4px;
		font-size: 0.8rem;
		color: rgba(212, 212, 216, 0.65);
		line-height: 1.4;
	}

	.gw-focus-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--bento-gap-sm);
	}

	.gw-focus-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
		min-height: 108px;
		padding: 14px 14px 12px;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		color: #fafafa;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			box-shadow 0.2s ease,
			background 0.15s ease,
			transform 0.1s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.gw-focus-card:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.16);
	}

	.gw-focus-card:active {
		transform: scale(0.98);
	}

	.gw-focus-card--active {
		border-color: rgba(167, 139, 250, 0.65);
		box-shadow:
			0 0 0 1px rgba(99, 102, 241, 0.25),
			0 0 28px -6px rgba(139, 92, 246, 0.45);
		background: linear-gradient(145deg, rgba(79, 70, 229, 0.18), rgba(168, 85, 247, 0.1));
	}

	.gw-focus-card__icon {
		font-size: 1.5rem;
		color: #a5b4fc;
	}

	.gw-focus-card--active .gw-focus-card__icon {
		color: #c4b5fd;
	}

	.gw-focus-card__label {
		font-size: 1rem;
		font-weight: 900;
		letter-spacing: -0.02em;
	}

	.gw-focus-card__blurb {
		font-size: 0.72rem;
		font-weight: 600;
		color: rgba(212, 212, 216, 0.65);
		line-height: 1.35;
	}

	.gw-field-label {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(228, 228, 231, 0.55);
	}

	.gw-field-label--spaced {
		margin-top: 0.75rem;
	}

	.gw-input {
		width: 100%;
		box-sizing: border-box;
		padding: 14px 14px;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.35);
		color: #fafafa;
		font: inherit;
		font-weight: 600;
		font-size: 1rem;
	}

	.gw-input:focus {
		outline: none;
		border-color: rgba(129, 140, 248, 0.55);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
	}

	.gw-input--sm {
		padding: 10px;
		font-size: 0.875rem;
	}

	.gw-pills {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.gw-pill {
		flex: 1;
		min-width: 92px;
		padding: 12px 10px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
		color: rgba(228, 228, 231, 0.85);
		font: inherit;
		font-weight: 800;
		font-size: 0.82rem;
		cursor: pointer;
		transition: background 0.12s ease, border-color 0.12s ease;
	}

	.gw-pill--active {
		border-color: rgba(20, 184, 166, 0.45);
		background: rgba(20, 184, 166, 0.12);
		color: #fafafa;
	}

	.gw-intensity-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.gw-intensity-badge {
		font-size: 0.9rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		padding: 6px 12px;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(99, 102, 241, 0.15);
		color: #c4b5fd;
	}

	.gw-slider-wrap {
		position: relative;
		padding: 8px 0 4px;
	}

	.gw-slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 14px;
		border-radius: 999px;
		background: linear-gradient(90deg, rgba(55, 65, 81, 0.9), rgba(99, 102, 241, 0.35));
		outline: none;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.gw-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: linear-gradient(145deg, #e0e7ff, #a855f7);
		border: 2px solid rgba(255, 255, 255, 0.35);
		box-shadow: 0 4px 16px rgba(79, 70, 229, 0.45);
		cursor: grab;
		margin-top: -1px;
	}

	.gw-slider::-webkit-slider-runnable-track {
		height: 14px;
		border-radius: 999px;
	}

	.gw-slider::-moz-range-thumb {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: linear-gradient(145deg, #e0e7ff, #a855f7);
		border: 2px solid rgba(255, 255, 255, 0.35);
		box-shadow: 0 4px 16px rgba(79, 70, 229, 0.45);
		cursor: grab;
	}

	.gw-slider::-moz-range-track {
		height: 14px;
		border-radius: 999px;
		background: linear-gradient(90deg, rgba(55, 65, 81, 0.9), rgba(99, 102, 241, 0.35));
	}

	.gw-slider-ticks {
		display: flex;
		justify-content: space-between;
		margin-top: 8px;
		padding: 0 10px;
	}

	.gw-slider-ticks span {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.12);
	}

	.gw-slider-ticks__on {
		background: rgba(167, 139, 250, 0.85);
	}

	.gw-accordion-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 14px 16px;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		color: #fafafa;
		font: inherit;
		font-weight: 800;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.gw-accordion-btn__icon {
		transition: transform 0.2s ease;
		font-size: 1.1rem;
		color: rgba(228, 228, 231, 0.6);
	}

	.gw-accordion-btn__icon--open {
		transform: rotate(180deg);
	}

	.gw-builder {
		margin-top: 10px;
		padding: 12px;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.25);
	}

	.gw-builder__grid {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.gw-builder__block {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.gw-builder__tag {
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(167, 139, 250, 0.9);
	}

	.gw-builder__row {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.gw-builder__row .gw-input--sm {
		flex: 1;
	}

	.gw-select {
		width: 100%;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.35);
		color: #fafafa;
		font: inherit;
		font-size: 0.875rem;
	}

	.gw-mini-add {
		flex-shrink: 0;
		padding: 10px 14px;
		border-radius: 10px;
		border: none;
		background: linear-gradient(135deg, #4f46e5, #7c3aed);
		color: #fff;
		font-weight: 800;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.gw-cart {
		list-style: none;
		margin: 12px 0 0;
		padding: 0;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.gw-cart__row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		font-size: 0.875rem;
	}

	.gw-cart__meta {
		display: block;
		font-size: 0.75rem;
		color: rgba(212, 212, 216, 0.55);
		margin-top: 2px;
	}

	.gw-cart__rm {
		border: none;
		background: transparent;
		color: #f87171;
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
		padding: 4px 8px;
	}

	.gw-schedule-row {
		display: flex;
		gap: 10px;
	}

	.gw-schedule-actions {
		display: flex;
		gap: 8px;
		margin-top: 10px;
		flex-wrap: wrap;
	}

	.gw-btn-secondary {
		flex: 1;
		min-width: 120px;
		padding: 10px 12px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
		color: #e4e4e7;
		font: inherit;
		font-weight: 700;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.gw-verify {
		padding: 12px;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.02);
	}

	.gw-verify__note {
		margin: 0 0 10px;
		font-size: 0.78rem;
		line-height: 1.45;
		color: rgba(212, 212, 216, 0.65);
	}

	.gw-link {
		color: #a5b4fc;
		font-weight: 800;
	}

	.gw-check {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		font-size: 0.82rem;
		font-weight: 600;
		color: #e4e4e7;
		cursor: pointer;
	}

	.gw-check input {
		margin-top: 3px;
	}

	.gw-submit {
		width: 100%;
		padding: 18px 20px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 16px;
		background: linear-gradient(135deg, #4338ca 0%, #6366f1 40%, #7c3aed 75%, #9333ea 100%);
		color: #fafafa;
		font: inherit;
		font-weight: 900;
		font-size: clamp(0.95rem, 3.5vw, 1.05rem);
		letter-spacing: -0.01em;
		cursor: pointer;
		box-shadow:
			0 16px 40px -12px rgba(79, 70, 229, 0.65),
			inset 0 1px 0 rgba(255, 255, 255, 0.15);
		transition: filter 0.15s ease, transform 0.1s ease;
		min-height: 56px;
	}

	.gw-submit:hover:not(:disabled) {
		filter: brightness(1.06);
	}

	.gw-submit:active:not(:disabled) {
		transform: scale(0.99);
	}

	.gw-submit:disabled {
		opacity: 0.45;
		cursor: not-allowed;
		filter: grayscale(0.2);
	}

	.gw-submit__shine {
		display: block;
	}

	/* Player shell: page padding harmony */
	.pos-tracker.view-section {
		padding-top: 0;
	}

	/* ─── Legacy non-player layout (unchanged essentials) ─── */
	.tracker-box {
		margin-bottom: var(--bento-gap-md);
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
	.workout-summary-box {
		background: var(--input-bg);
		border: 1px solid var(--border-subtle);
		padding: 20px;
		border-radius: 16px;
		margin-top: 20px;
	}
	.verify-help {
		font-size: 0.85rem;
		margin-bottom: 12px;
	}
	.session-item-title {
		font-weight: 700;
	}
	.session-item-detail {
		font-size: 0.85rem;
		color: var(--muted-slate);
	}
	.delete-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--danger-red);
		font-size: 1rem;
		padding: 4px 8px;
	}
</style>
