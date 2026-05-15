<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { httpsCallable } from 'firebase/functions';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { db, functions } from '$lib/firebase.js';
	import { doc, getDoc } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { writePlayerOsWorkout } from '$lib/stores/playerEngine.svelte.js';
	import {
		calculateWorkoutXp,
		calculateTrainingSessionEarnedXp,
		getLevelProgressFromTotalXp,
	} from '$lib/gamification/level.js';
	import Swal from 'sweetalert2';
	import { dopamineOnCallable } from '$lib/services/dopamine.svelte.js';
	import IntelModal from '$lib/components/ui/IntelModal.svelte';

	const TELEMETRY_INTEL = {
		title: 'GUARDIAN TELEMETRY',
		instructions: [
			"1. Select the Operative (household player) who performed the work.",
			'2. Set focus, sub-drill, duration, and RPE to match the session.',
			'3. Log training — XP follows the same engine as the Player OS and updates their profile and stats.',
		],
	};

	const logTrainingSession = httpsCallable(functions, 'logTrainingSession');

	/** @param {number} step */
	function intensityApiFromStep(step) {
		if (step <= 3) return /** @type {const} */ ('low');
		if (step <= 7) return /** @type {const} */ ('medium');
		return /** @type {const} */ ('high');
	}

	const role = $derived(authStore.role);
	const profile = $derived(authStore.userProfile);

	/** @type {Array<{ email: string; playerName: string; teamId: string }>} */
	let children = $state([]);
	let childrenLoading = $state(true);
	let selectedChildEmail = $state('');
	/** @type {Record<string, unknown> & { email?: string } | null} */
	let childProfile = $state(null);
	let childProfileLoading = $state(false);

	/** @type {'technical' | 'physical' | 'tactical' | 'recovery'} */
	let selectedFocus = $state('technical');
	let selectedDrill = $state(/** @type {string | null} */ (null));
	let intensity = $state(5);
	let duration = $state(30);
	let logSubmitting = $state(false);

	let verifierLegalName = $state('');
	let parentVerifiedAck = $state(false);

	let durGaugeEl = $state(/** @type {HTMLDivElement | null} */ (null));
	let rpeGaugeEl = $state(/** @type {HTMLDivElement | null} */ (null));
	let xpTrackEl = $state(/** @type {HTMLDivElement | null} */ (null));

	/** @param {number} d */
	const durationPct = (d) => ((Math.max(1, Math.min(1440, d)) - 1) / (1440 - 1)) * 100;
	/** @param {number} r */
	const rpePct = (r) => ((Math.max(1, Math.min(10, r)) - 1) / 9) * 100;

	$effect(() => {
		if (durGaugeEl) durGaugeEl.style.setProperty('--gauge', `${durationPct(duration)}%`);
	});
	$effect(() => {
		if (rpeGaugeEl) rpeGaugeEl.style.setProperty('--gauge', `${rpePct(intensity)}%`);
	});

	const childXp = $derived(
		Math.max(0, Math.floor(Number(childProfile?.totalXp ?? childProfile?.xp) || 0)),
	);
	const levelProgress = $derived(getLevelProgressFromTotalXp(childXp));
	const level = $derived(levelProgress.level);
	const currentXp = $derived(levelProgress.xpIntoLevel);
	const nextLevelXp = $derived(levelProgress.xpToNext);
	const streak = $derived(Math.max(0, Math.floor(Number(childProfile?.currentStreak) || 0)));

	const xpLoadPct = $derived(
		nextLevelXp > 0 ? Math.min(100, (currentXp / nextLevelXp) * 100) : 100,
	);

	$effect(() => {
		if (xpTrackEl) {
			xpTrackEl.style.setProperty('--fill', `${xpLoadPct}%`);
		}
	});

	/**
	 * Engine preview: same curve as `calculateTrainingSessionEarnedXp` (wraps
	 * {@link calculateWorkoutXp} with session multipliers) — must match the callable.
	 */
	const estimatedLogXp = $derived.by(() => {
		const dMin = Math.max(0, Math.floor(Number(duration) || 0));
		const ir = intensityApiFromStep(intensity);
		const mult = ir === 'high' ? 1.35 : ir === 'medium' ? 1.15 : 1.0;
		return calculateWorkoutXp({
			totalReps: 0,
			intenseMinutes: dMin,
			sportPayload: {
				gamification: {
					xpPerRep: 2 * mult,
					xpPerIntenseMinute: 10 * mult,
				},
			},
		});
	});

	const focusAreas = [
		{ id: /** @type {const} */ ('technical'), label: 'Technical', op: 'OP-TECH' },
		{ id: /** @type {const} */ ('physical'), label: 'Physical', op: 'OP-PHY' },
		{ id: /** @type {const} */ ('tactical'), label: 'Tactical', op: 'OP-TAC' },
		{ id: /** @type {const} */ ('recovery'), label: 'Recovery', op: 'OP-RCV' },
	];

	const drillsByFocus = {
		technical: ['Juggling', 'First Touch', 'Shooting', 'Wall Passing', 'Cone Dribbling'],
		physical: ['100m Sprints', 'Beep Test', '5k Run', 'Agility Ladder', 'Weight Training'],
		tactical: ['Film Study', 'Set Pieces', 'Scrimmage', 'Positional Drills', 'Box-to-Box'],
		recovery: ['Stretching', 'Yoga', 'Foam Rolling', 'Light Jog', 'Ice Bath'],
	};

	const availableDrills = $derived(
		selectedFocus ? drillsByFocus[selectedFocus] : [],
	);

	const focusLabel = $derived(
		(focusAreas.find((f) => f.id === selectedFocus) ?? { label: 'Session' }).label,
	);

	const selectedChild = $derived(children.find((c) => c.email === selectedChildEmail) || null);
	const childDisplayName = $derived(
		(typeof childProfile?.playerName === 'string' && childProfile.playerName) ||
			selectedChild?.playerName ||
			'Operative',
	);

	$effect(() => {
		if (!authStore.isLoading && role !== 'parent') {
			untrack(() => goto('/parent/household', { replaceState: true }));
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
						teamId: u.teamId || '',
					});
				}
				if (!cancelled) children = rows;
			} catch (e) {
				console.error('[parent log-workout] household', e);
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
		if (!browser) return;
		const em = selectedChildEmail.trim().toLowerCase();
		if (!em) {
			childProfile = null;
			childProfileLoading = false;
			return;
		}
		let cancelled = false;
		childProfileLoading = true;
		(async () => {
			try {
				const snap = await getDoc(doc(db, 'users', em));
				if (cancelled) return;
				if (!snap.exists()) {
					childProfile = null;
					return;
				}
				childProfile = { email: em, ...snap.data() };
			} catch (e) {
				console.error('[parent log-workout] child profile', e);
				if (!cancelled) childProfile = null;
			} finally {
				if (!cancelled) childProfileLoading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	/**
	 * @param {'technical' | 'physical' | 'tactical' | 'recovery'} id
	 */
	function selectFocus(id) {
		if (id !== selectedFocus) {
			selectedDrill = null;
		}
		selectedFocus = id;
	}

	const fullNameOk = (raw) => {
		const parts = raw.trim().split(/\s+/).filter(Boolean);
		return parts.length >= 2 && raw.trim().length >= 4;
	};

	async function logWorkout() {
		if (logSubmitting) return;
		if (!selectedChildEmail) {
			return Swal.fire({ title: 'No operative', text: 'Select a household player first.', icon: 'warning' });
		}
		if (!childProfile || !childProfile?.teamId || childProfile.teamId === 'admin') {
			return Swal.fire({ title: 'Profile incomplete', text: 'The selected player needs a team on file.', icon: 'warning' });
		}
		if (!selectedDrill) {
			return Swal.fire({ title: 'Sub-drill required', text: 'Choose a sub-drill before transmit.', icon: 'info' });
		}
		if (!parentVerifiedAck) {
			return Swal.fire({ title: 'Attestation', text: 'Confirm the verification checkbox.', icon: 'info' });
		}
		if (!fullNameOk(verifierLegalName)) {
			return Swal.fire({
				title: 'Guardian name',
				text: 'Enter your full legal name (first and last) as the verifying parent.',
				icon: 'info',
			});
		}
		const dMin = Math.max(0, Math.floor(Number(duration) || 0));
		if (dMin < 1) {
			return Swal.fire({ title: 'Duration', text: 'Set time on task to at least 1 minute.', icon: 'info' });
		}
		const intensityCall = intensityApiFromStep(intensity);
		const expectedXp = calculateTrainingSessionEarnedXp({
			duration: dMin,
			reps: 0,
			intensity: intensityCall,
		});
		if (expectedXp < 1) {
			return Swal.fire({ title: 'Zero yield', text: 'Increase duration or RPE to earn XP.', icon: 'warning' });
		}

		const drillType = `[${focusLabel}] ${selectedDrill} (Parent proxy)`.slice(0, 200);
		const emailKey = selectedChildEmail.trim().toLowerCase();
		const teamId = String(childProfile.teamId);
		const playerName = childDisplayName;

		logSubmitting = true;
		try {
		const res = await dopamineOnCallable(
			logTrainingSession({
				playerEmail: emailKey,
				verifierLegalName: verifierLegalName.trim().replace(/\s+/g, ' '),
				drillType,
				duration: dMin,
				reps: 0,
				intensity: intensityCall,
				// Pass raw RPE through — RL pipeline consumes the full 1-10 scale.
				subjectiveRpe: intensity,
			}),
			{ kind: 'drill' },
		);
			const payload = res.data;
			const earned = payload && typeof payload.earnedXP === 'number' ? payload.earnedXP : 0;
			const athUid =
				payload && typeof payload.athleteUid === 'string' && payload.athleteUid ? payload.athleteUid : '';

			if (athUid) {
				try {
					await writePlayerOsWorkout({
						emailKey,
						userUid: athUid,
						teamId,
						focus: focusLabel,
						drill: String(selectedDrill),
						duration: dMin,
						intensityRpe: intensity,
						earnedXp: earned,
					});
				} catch (we) {
					console.error('[Parent OS] users/', emailKey, '/workouts', we);
				}
			}

			await Swal.fire({
				text: `Workout Logged. ${playerName} awarded ${earned} XP.`,
				icon: 'success',
				confirmButtonColor: '#00d4ff',
				confirmButtonText: 'Acknowledge',
				customClass: { popup: 'card' },
			});
			await goto('/parent/household', { replaceState: true });
		} catch (e) {
			console.error(e);
			const msg =
				e && typeof e === 'object' && 'message' in e ? String(/** @type {*} */ (e).message) : 'Could not log workout.';
			await Swal.fire({ title: 'Execution failed', text: msg, icon: 'error' });
		} finally {
			logSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Log workout (guardian) · SSTRACKER</title>
</svelte:head>

<div class="pw-cmd" data-region="parent-siem-workout">
	<header class="plw-strap tw-mb-3 tw-text-center" aria-label="Context">
		<p class="pw-mono tw-m-0 tw-text-[0.6rem] tw-uppercase tw-tracking-[0.25em] tw-text-cyan-500/80">
			Parent proxy · training intake
		</p>
	</header>

	<header class="pw-hud" aria-label="Operative clearance (selected child)">
		<div class="pw-hud__cell pw-hud__cell--level">
			<span class="pw-eyebrow">Operative / Level</span>
			<p class="pw-mono pw-hud__level" aria-live="polite">
				{selectedChildEmail ? `LVL.${String(level).padStart(2, '0')}` : '—'}
			</p>
		</div>
		<div class="pw-hud__cell pw-hud__cell--load">
			<div class="pw-hud__row">
				<span class="pw-eyebrow">System load (XP to next level)</span>
				<span class="pw-mono pw-cyber"
					>{selectedChildEmail ? currentXp : '—'}<span class="pw-dim"> / </span
					>{!selectedChildEmail ? '—' : nextLevelXp > 0 ? nextLevelXp : 'MAX'}</span
				>
			</div>
			<div
				class="pw-loadbar"
				bind:this={xpTrackEl}
				role="progressbar"
				aria-valuenow={Math.round(xpLoadPct)}
				aria-valuemin="0"
				aria-valuemax="100"
				aria-label="XP progress (selected operative)"
			>
				<div class="pw-loadbar__fill"></div>
				<div class="pw-loadbar__scan" aria-hidden="true"></div>
			</div>
		</div>
		<div class="pw-hud__cell pw-hud__cell--streak">
			<span class="pw-eyebrow">Uptime (day streak)</span>
			<p class="pw-mono pw-hud__streak">
				<Icon name="game.zap" class="pw-ico pw-ico--orange" />
				<span>{selectedChildEmail ? `${streak}D` : '—'}</span>
			</p>
		</div>
	</header>

	<div class="pw-grid plw-onecol">
		<section class="pw-panel pw-panel--term" aria-labelledby="plw-exec-heading">
			<div class="pw-panel__head pw-panel__head--row">
				<div>
					<span class="pw-eyebrow">Target selector</span>
					<h2 id="plw-exec-heading" class="pw-title">Guardian execution terminal</h2>
				</div>
				<div class="tw-flex tw-shrink-0 tw-items-center tw-gap-2">
					<IntelModal title={TELEMETRY_INTEL.title} instructions={TELEMETRY_INTEL.instructions} />
					<div class="pw-mono pw-est">
						<span class="pw-dim">EST. YIELD (MODEL)</span>
						<span class="pw-green">+{estimatedLogXp} XP</span>
					</div>
				</div>
			</div>

			<div class="pw-section">
				<span class="pw-eyebrow">0 · Operative (household)</span>
				{#if childrenLoading}
					<p class="pw-mono tw-text-sm tw-text-zinc-400">Loading household roster…</p>
				{:else if children.length === 0}
					<p class="pw-mono tw-text-sm tw-text-amber-300/90">
						No player emails linked. Ask your director to attach athletes to the household.
					</p>
				{:else}
					<label class="plw-sr" for="plw-child">Operative</label>
					<select
						id="plw-child"
						class="plw-select"
						bind:value={selectedChildEmail}
						aria-label="Select operative receiving XP"
					>
						<option value="">— Select operative —</option>
						{#each children as c}
							<option value={c.email}>{c.playerName} · {c.email}</option>
						{/each}
					</select>
				{/if}
			</div>

			{#if childProfileLoading}
				<p class="pw-mono tw-mb-3 tw-text-xs tw-text-cyan-500/80">Syncing operative profile…</p>
			{/if}

			<div class="pw-section">
				<span class="pw-eyebrow">1 · Focus area</span>
				<div class="pw-focus" role="group" aria-label="Focus area">
					{#each focusAreas as focus}
						<button
							type="button"
							class="pw-focus__btn"
							class:pw-focus__btn--on={selectedFocus === focus.id}
							disabled={!selectedChildEmail}
							onclick={() => selectFocus(focus.id)}
						>
							<span class="pw-mono pw-focus__op">{focus.op}</span>
							<span class="pw-focus__lab">{focus.label}</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="pw-section">
				<span class="pw-eyebrow">2 · Sub-drill (dynamic)</span>
				<div class="pw-subdrill" role="list">
					{#each availableDrills as drill}
						<button
							type="button"
							class="pw-chip"
							class:pw-chip--on={selectedDrill === drill}
							disabled={!selectedChildEmail}
							onclick={() => {
								selectedDrill = drill;
							}}
						>
							{drill}
						</button>
					{/each}
				</div>
			</div>

			<div class="pw-gauges">
				<div class="pw-gauge">
					<div class="pw-gauge__head">
						<span class="pw-eyebrow">Time on task (min)</span>
						<span class="pw-mono pw-cyber">{duration}</span>
					</div>
					<div class="pw-gauge__bar" bind:this={durGaugeEl} aria-label="Duration">
						<div class="pw-gauge__bar-fill"></div>
					</div>
					<input
						class="pw-range"
						type="range"
						min="1"
						max="1440"
						step="1"
						bind:value={duration}
						aria-label="Duration in minutes"
					/>
				</div>
				<div class="pw-gauge">
					<div class="pw-gauge__head">
						<span class="pw-eyebrow">RPE (intensity 1–10)</span>
						<span class="pw-mono pw-orange">{intensity} / 10</span>
					</div>
					<div class="pw-gauge__bar pw-gauge__bar--rpe" bind:this={rpeGaugeEl} aria-label="RPE">
						<div class="pw-gauge__bar-fill"></div>
					</div>
					<input
						class="pw-range"
						type="range"
						min="1"
						max="10"
						step="1"
						bind:value={intensity}
						aria-label="RPE intensity"
					/>
				</div>
			</div>

			<div class="plw-guardian tw-mb-4 tw-rounded tw-border tw-border-cyan-500/25 tw-bg-black/40 tw-p-3">
				<span class="pw-eyebrow tw-mb-2 tw-block">Guardian attestation</span>
				<label class="plw-sr" for="plw-legal">Your full legal name</label>
				<input
					id="plw-legal"
					class="plw-input"
					type="text"
					autocomplete="name"
					placeholder="First and last (verifying parent)"
					bind:value={verifierLegalName}
				/>
				<label class="plw-check">
					<input type="checkbox" bind:checked={parentVerifiedAck} />
					<span>I confirm this session was completed as logged for the selected operative.</span>
				</label>
			</div>

			<div class="pw-execrow">
				<button
					type="button"
					class="pw-exec"
					disabled={!selectedChildEmail || !selectedDrill || logSubmitting || !children.length}
					onclick={logWorkout}
				>
					{#if logSubmitting}
						<span class="pw-mono">TRANSMITTING…</span>
					{:else}
						<Icon name="game.zap" />
						<span>LOG FOR OPERATIVE · +{estimatedLogXp} XP</span>
					{/if}
				</button>
				{#if !selectedChildEmail}
					<p class="pw-mono pw-locked">Select an operative to arm the logger</p>
				{:else if !selectedDrill}
					<p class="pw-mono pw-locked">Awaiting sub-drill selection</p>
				{/if}
			</div>
		</section>
	</div>
</div>

<style>
	.plw-strap p {
		margin: 0;
	}

	.plw-onecol {
		grid-template-columns: 1fr;
	}

	.plw-sr {
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

	.plw-select {
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		margin-top: 0.4rem;
		padding: 0.6rem 0.75rem;
		font-family: ui-monospace, 'Cascadia Code', Menlo, Monaco, Consolas, monospace;
		font-size: 0.8rem;
		background: #000;
		color: #e5e5e5;
		border: 1px solid rgba(0, 212, 255, 0.45);
		border-radius: 0.25rem;
	}

	.plw-input {
		width: 100%;
		box-sizing: border-box;
		padding: 0.5rem 0.6rem;
		margin-bottom: 0.6rem;
		font: inherit;
		background: #000;
		color: #fafafa;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 0.25rem;
	}

	.plw-check {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		font-size: 0.75rem;
		line-height: 1.4;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
	}

	.plw-check input {
		margin-top: 0.15rem;
	}

	/* ——— Player OS SIEM skin (local copy for parent route) ——— */
	.pw-cmd {
		min-height: 0;
		height: auto;
		overflow: visible;
		box-sizing: border-box;
		background: #000000;
		color: #fafafa;
		padding: var(--bento-pad);
		--cyber: #00d4ff;
		--toxic: #39ff14;
		--threat: #ff6b00;
		--border: rgba(255, 255, 255, 0.1);
	}

	@media (min-width: 768px) {
		.pw-cmd {
			min-height: calc(100vh - 5rem);
		}
	}

	.pw-eyebrow {
		display: block;
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.45);
	}

	.pw-title {
		margin: 0.25rem 0 0;
		font-size: 1.125rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.pw-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
		font-feature-settings: 'tnum' 1;
	}

	.pw-dim {
		color: rgba(255, 255, 255, 0.4);
	}

	.pw-cyber {
		color: var(--cyber);
	}

	.pw-green {
		color: var(--toxic);
	}

	.pw-orange {
		color: var(--threat);
	}

	.pw-hud {
		display: grid;
		grid-template-columns: minmax(7rem, 9rem) minmax(0, 1fr) minmax(5.5rem, 8rem);
		gap: var(--bento-gap-sm);
		align-items: stretch;
		min-height: 6.5rem;
		padding: 1rem 1.25rem;
		margin-bottom: var(--bento-gap-md);
		border: 1px solid var(--border);
		background: #05050a;
	}

	.pw-hud__cell {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.pw-hud__cell--load {
		min-width: 0;
	}

	.pw-hud__cell--level {
		border-right: 1px solid var(--border);
		padding-right: 1rem;
	}

	.pw-hud__level {
		margin: 0;
		font-size: clamp(1.75rem, 4vw, 2.5rem);
		font-weight: 800;
		color: var(--cyber);
		line-height: 1;
	}

	.pw-hud__row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.75rem;
	}

	.pw-loadbar {
		--fill: 0%;
		position: relative;
		height: 0.5rem;
		width: 100%;
		background: #000;
		border: 1px solid var(--border);
		overflow: hidden;
	}

	.pw-loadbar__fill {
		height: 100%;
		width: var(--fill);
		background: linear-gradient(90deg, #0a3a45 0%, var(--cyber) 55%, var(--toxic) 100%);
		box-shadow: 0 0 12px rgba(0, 212, 255, 0.5);
	}

	.pw-loadbar__scan {
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
		animation: plw-scan 2.5s linear infinite;
		pointer-events: none;
	}

	@keyframes plw-scan {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(200%);
		}
	}

	.pw-hud__cell--streak {
		text-align: right;
		border-left: 1px solid var(--border);
		padding-left: 1rem;
	}

	.pw-hud__streak {
		margin: 0;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.35rem;
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--threat);
	}

	:global(.pw-ico--orange) {
		color: var(--threat);
		filter: drop-shadow(0 0 6px rgba(255, 107, 0, 0.8));
	}

	@media (max-width: 900px) {
		.pw-hud {
			grid-template-columns: 1fr;
			min-height: 0;
		}
		.pw-hud__cell--level,
		.pw-hud__cell--streak {
			border: none;
			padding: 0;
			text-align: left;
		}
		.pw-hud__streak {
			justify-content: flex-start;
		}
	}

	.pw-grid {
		display: grid;
		gap: var(--bento-gap-md);
		align-items: start;
		overflow: visible;
	}

	.pw-panel {
		border: 1px solid var(--border);
		background: #05050a;
		padding: 1.25rem;
		min-width: 0;
		overflow: visible;
	}

	.pw-panel__head {
		margin-bottom: 0.25rem;
	}

	.pw-panel__head--row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.pw-est {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.2rem;
		font-size: 0.8rem;
	}

	.pw-section {
		margin-bottom: 1.25rem;
	}

	.pw-focus {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.5rem;
	}

	@media (min-width: 640px) {
		.pw-focus {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.pw-focus__btn {
		padding: 0.6rem 0.5rem;
		background: #000;
		border: 1px solid var(--border);
		color: #ccc;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
		transition: border-color 0.12s, box-shadow 0.12s;
	}

	.pw-focus__btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pw-focus__btn:hover:not(:disabled) {
		border-color: rgba(0, 212, 255, 0.35);
	}

	.pw-focus__btn--on {
		border-color: var(--cyber);
		box-shadow: 0 0 16px rgba(0, 212, 255, 0.2);
	}

	.pw-focus__op {
		font-size: 0.6rem;
		color: var(--cyber);
	}

	.pw-focus__lab {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.pw-subdrill {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.pw-chip {
		padding: 0.4rem 0.7rem;
		background: #000;
		border: 1px solid var(--border);
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.75rem;
		cursor: pointer;
		transition: border-color 0.12s, color 0.12s, box-shadow 0.12s;
	}

	.pw-chip:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.pw-chip:hover:not(:disabled) {
		color: #fff;
		border-color: rgba(255, 255, 255, 0.2);
	}

	.pw-chip--on {
		border-color: var(--toxic);
		color: #fff;
		box-shadow: 0 0 12px rgba(57, 255, 20, 0.18);
	}

	.pw-gauges {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.25rem;
		margin-bottom: 1.5rem;
	}

	@media (max-width: 640px) {
		.pw-gauges {
			grid-template-columns: 1fr;
		}
	}

	.pw-gauge {
		min-width: 0;
	}

	.pw-gauge__head {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.4rem;
	}

	.pw-gauge__bar {
		--gauge: 0%;
		height: 0.35rem;
		width: 100%;
		background: #000;
		border: 1px solid var(--border);
		margin-bottom: 0.2rem;
	}

	.pw-gauge__bar--rpe {
		border-color: rgba(255, 107, 0, 0.3);
	}

	.pw-gauge__bar-fill {
		height: 100%;
		width: var(--gauge);
	}

	.pw-gauge:first-child .pw-gauge__bar-fill {
		background: linear-gradient(90deg, #0a1e22, var(--cyber));
		box-shadow: 0 0 8px rgba(0, 212, 255, 0.4);
	}

	.pw-gauge:last-child .pw-gauge__bar-fill {
		background: linear-gradient(90deg, #2a1a0a, var(--threat));
		box-shadow: 0 0 8px rgba(255, 107, 0, 0.4);
	}

	.pw-range {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 1.25rem;
		background: transparent;
		cursor: pointer;
		margin: 0;
	}

	.pw-range:focus {
		outline: 1px solid var(--cyber);
		outline-offset: 2px;
	}

	.pw-range::-webkit-slider-runnable-track {
		height: 4px;
		background: #111;
		border: 1px solid var(--border);
	}

	.pw-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 14px;
		height: 14px;
		margin-top: -6px;
		background: #000;
		border: 2px solid var(--cyber);
		box-shadow: 0 0 8px var(--cyber);
	}

	.pw-gauge:last-child .pw-range::-webkit-slider-thumb {
		border-color: var(--threat);
		box-shadow: 0 0 8px var(--threat);
	}

	.pw-range::-moz-range-track {
		height: 4px;
		background: #111;
		border: 1px solid var(--border);
	}

	.pw-range::-moz-range-thumb {
		width: 14px;
		height: 14px;
		background: #000;
		border: 2px solid var(--cyber);
		box-shadow: 0 0 8px var(--cyber);
	}

	.pw-gauge:last-child .pw-range::-moz-range-thumb {
		border-color: var(--threat);
		box-shadow: 0 0 8px var(--threat);
	}

	.pw-execrow {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0.5rem;
	}

	.pw-exec {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		min-height: 3.5rem;
		padding: 0.75rem 1rem;
		background: #000;
		border: 1px solid rgba(0, 212, 255, 0.4);
		color: #fff;
		font-size: 0.85rem;
		font-weight: 800;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		cursor: pointer;
		transition: box-shadow 0.2s ease, border-color 0.2s ease;
	}

	.pw-exec:hover:not(:disabled) {
		border-color: var(--toxic);
		box-shadow:
			0 0 32px rgba(57, 255, 20, 0.35),
			0 0 18px rgba(0, 212, 255, 0.3);
	}

	.pw-exec:disabled {
		cursor: not-allowed;
		opacity: 0.4;
		box-shadow: none;
	}

	.pw-locked {
		font-size: 0.65rem;
		text-align: center;
		color: rgba(255, 255, 255, 0.35);
		margin: 0;
	}
</style>
