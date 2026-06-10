<script>
	import { getFunctions, httpsCallable } from 'firebase/functions';
	import { getDoc, doc } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	/**
	 * MorningReadinessCard
	 * ─────────────────────
	 * Phase 3, Epic 4 (deliverable 2) — RL Adaptive Workout Engine (S2)
	 *
	 * Bento glass panel for daily physiological self-report.
	 * Writes physio_self_reports/{uid}/daily/{yyyy-mm-dd} via
	 * submitPhysioSelfReport callable — one submission per UTC day.
	 *
	 * Rendered at the top of AdaptiveHomework.svelte when today's doc
	 * does not yet exist.
	 */

	/** Emitted when the player successfully submits today's report. */
	const { onSubmitted = () => {} } = $props();

	let sleepHours = $state(7);
	let soreness = $state(1);
	let mood = $state(3);
	let restingFeel = $state(3);

	let submitting = $state(false);
	let error = $state('');
	let submitted = $state(false);

	/** Returns today's UTC date as 'yyyy-mm-dd'. */
	function todayUtc() {
		return new Date().toISOString().slice(0, 10);
	}

	/**
	 * Check if today's doc already exists (client guard — Firestore rule is
	 * the authoritative immutability enforcer).
	 */
	async function checkAlreadySubmitted() {
		const uid = authStore.user?.uid;
		if (!uid) return false;
		try {
			const ref = doc(db, 'physio_self_reports', uid, 'daily', todayUtc());
			const snap = await getDoc(ref);
			return snap.exists();
		} catch {
			return false;
		}
	}

	async function handleSubmit() {
		if (submitting || submitted) return;
		error = '';

		// Client-side immutability guard.
		const already = await checkAlreadySubmitted();
		if (already) {
			submitted = true;
			onSubmitted();
			return;
		}

		submitting = true;
		try {
			const fns = getFunctions();
			const submit = httpsCallable(fns, 'submitPhysioSelfReport');
			await submit({ sleepHours, soreness, mood, restingFeel });
			submitted = true;
			onSubmitted();
		} catch (err) {
			error = /** @type {Error} */ (err).message ?? 'Submission failed. Try again.';
		} finally {
			submitting = false;
		}
	}

	const moodLabels = ['', 'Very Low', 'Low', 'Okay', 'Good', 'Excellent'];
	const sorenessLabels = ['', 'None', 'Mild', 'Moderate', 'High', 'Severe'];
	const restingLabels = ['', 'Fatigued', 'Tired', 'Average', 'Fresh', 'Peak'];
</script>

<div class="readiness-card">
	<div class="card-header">
		<span class="card-icon">🌅</span>
		<div>
			<h3 class="card-title">Morning Readiness</h3>
			<p class="card-subtitle">Tell us how you're feeling so we can tailor today's workout</p>
		</div>
	</div>

	{#if submitted}
		<div class="submitted-state">
			<span class="check-icon">✓</span>
			<p>Readiness logged. Your workout is being personalised.</p>
		</div>
	{:else}
		<form class="readiness-form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
			<!-- Sleep -->
			<div class="field-row">
				<label class="field-label">
					<span class="label-text">Sleep last night</span>
					<span class="value-badge">{sleepHours}h</span>
				</label>
				<input
					type="range"
					min="0"
					max="12"
					step="0.5"
					bind:value={sleepHours}
					class="slider"
					aria-label="Hours of sleep"
				/>
				<div class="range-ends"><span>0h</span><span>12h</span></div>
			</div>

			<!-- Soreness -->
			<div class="field-row">
				<label class="field-label">
					<span class="label-text">Muscle soreness</span>
					<span class="value-badge">{sorenessLabels[soreness]}</span>
				</label>
				<div class="pip-row" role="radiogroup" aria-label="Soreness level">
					{#each [1,2,3,4,5] as v}
						<button
							type="button"
							class="pip"
							class:active={soreness === v}
							onclick={() => { soreness = v; }}
							aria-label={sorenessLabels[v]}
							aria-pressed={soreness === v}
						>{v}</button>
					{/each}
				</div>
			</div>

			<!-- Mood -->
			<div class="field-row">
				<label class="field-label">
					<span class="label-text">Mood / energy</span>
					<span class="value-badge">{moodLabels[mood]}</span>
				</label>
				<div class="pip-row" role="radiogroup" aria-label="Mood level">
					{#each [1,2,3,4,5] as v}
						<button
							type="button"
							class="pip"
							class:active={mood === v}
							onclick={() => { mood = v; }}
							aria-label={moodLabels[v]}
							aria-pressed={mood === v}
						>{v}</button>
					{/each}
				</div>
			</div>

			<!-- Resting feel -->
			<div class="field-row">
				<label class="field-label">
					<span class="label-text">Pre-workout readiness</span>
					<span class="value-badge">{restingLabels[restingFeel]}</span>
				</label>
				<div class="pip-row" role="radiogroup" aria-label="Resting feel">
					{#each [1,2,3,4,5] as v}
						<button
							type="button"
							class="pip"
							class:active={restingFeel === v}
							onclick={() => { restingFeel = v; }}
							aria-label={restingLabels[v]}
							aria-pressed={restingFeel === v}
						>{v}</button>
					{/each}
				</div>
			</div>

			{#if error}
				<p class="error-text">{error}</p>
			{/if}

			<button type="submit" class="submit-btn" disabled={submitting}>
				{submitting ? 'Submitting…' : 'Log Readiness'}
			</button>
		</form>
	{/if}
</div>

<style>
	.readiness-card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.10);
		border-radius: var(--vanguard-radius, 24px);
		backdrop-filter: blur(16px) saturate(180%);
		-webkit-backdrop-filter: blur(16px) saturate(180%);
		padding: 1.5rem;
		margin-bottom: 1.25rem;
		box-shadow:
			0 0 0 1px rgba(255, 255, 255, 0.06) inset,
			0 8px 32px rgba(0, 0, 0, 0.25);
	}

	.card-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.card-icon {
		font-size: 1.75rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.card-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: #e2e8f0;
		letter-spacing: 0.02em;
	}

	.card-subtitle {
		margin: 0.15rem 0 0;
		font-size: 0.75rem;
		color: rgba(226, 232, 240, 0.55);
		line-height: 1.4;
	}

	.readiness-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.field-row {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.field-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.label-text {
		font-size: 0.75rem;
		font-weight: 600;
		color: rgba(226, 232, 240, 0.75);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.value-badge {
		font-size: 0.7rem;
		font-weight: 700;
		color: #00d4ff;
		background: rgba(0, 212, 255, 0.1);
		border: 1px solid rgba(0, 212, 255, 0.25);
		border-radius: 999px;
		padding: 0.1rem 0.6rem;
	}

	.slider {
		width: 100%;
		accent-color: #00d4ff;
		cursor: pointer;
	}

	.range-ends {
		display: flex;
		justify-content: space-between;
		font-size: 0.65rem;
		color: rgba(226, 232, 240, 0.35);
	}

	.pip-row {
		display: flex;
		gap: 0.5rem;
	}

	.pip {
		flex: 1;
		padding: 0.35rem 0;
		font-size: 0.8rem;
		font-weight: 700;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
		color: rgba(226, 232, 240, 0.6);
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s, color 0.15s;
	}

	.pip.active {
		background: rgba(0, 212, 255, 0.15);
		border-color: #00d4ff;
		color: #00d4ff;
	}

	.pip:hover:not(.active) {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
		color: #e2e8f0;
	}

	.submit-btn {
		margin-top: 0.5rem;
		padding: 0.65rem 1.5rem;
		background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
		color: #0a0a1a;
		font-weight: 800;
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		transition: opacity 0.15s, transform 0.1s;
	}

	.submit-btn:hover:not(:disabled) {
		opacity: 0.88;
		transform: translateY(-1px);
	}

	.submit-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.submitted-state {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: 12px;
		background: rgba(57, 255, 20, 0.08);
		border: 1px solid rgba(57, 255, 20, 0.2);
		color: #2dd4bf;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.check-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.error-text {
		font-size: 0.75rem;
		color: #ff6b6b;
		margin: 0;
	}
</style>
