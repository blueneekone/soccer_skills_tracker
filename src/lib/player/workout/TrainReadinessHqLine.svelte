<script lang="ts">
	import { httpsCallable } from 'firebase/functions';
	import { functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { useTrainReadinessStrip } from '$lib/player/workout/useTrainReadinessStrip.svelte.js';
	import {
		TRAIN_READINESS_MOOD_LABELS,
		TRAIN_READINESS_RESTING_LABELS,
		TRAIN_READINESS_SORENESS_LABELS,
		submitTrainReadinessReport,
	} from '$lib/player/workout/trainReadiness.js';

	const readiness = useTrainReadinessStrip(
		() => authStore.user?.uid,
		() => authStore.role,
	);

	let submitting = $state(false);
	let error = $state('');

	async function saveCheckIn() {
		if (submitting) return;
		error = '';
		submitting = true;
		try {
			const submit = httpsCallable(functions, 'submitPhysioSelfReport');
			await submitTrainReadinessReport(
				{
					sleepHoursLastNight: readiness.readinessSleepHours,
					soreness: readiness.readinessSoreness,
					mood: readiness.readinessMood,
					restingFeel: readiness.readinessRestingFeel,
				},
				(payload) => submit(payload),
			);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save check-in.';
		} finally {
			submitting = false;
		}
	}
</script>

{#if readiness.showReadinessStrip}
	<details class="hq-readiness bento-span-12">
	<summary class="hq-readiness__summary">
			<span class="hq-readiness__summary-text pd-mono">Pre-session check · tap to log sleep &amp; energy</span>
		</summary>
		<div class="hq-readiness__panel" role="group" aria-label="Pre-session check-in">
			<div class="hq-readiness__row">
				<label class="hq-readiness__field" for="hq-readiness-sleep">
					<span class="hq-readiness__label">Sleep</span>
					<span class="hq-readiness__val">{readiness.readinessSleepHours}h</span>
				</label>
				<input
					id="hq-readiness-sleep"
					class="hq-readiness__range"
					type="range"
					min="0"
					max="12"
					step="0.5"
					bind:value={readiness.readinessSleepHours}
				/>
			</div>
			<div class="hq-readiness__row hq-readiness__row--pips">
				<span class="hq-readiness__label">Energy</span>
				<div class="hq-readiness__pips" role="radiogroup" aria-label="Mood">
					{#each [1, 2, 3, 4, 5] as v}
						<button
							type="button"
							class="hq-readiness__pip"
							class:hq-readiness__pip--on={readiness.readinessMood === v}
							aria-pressed={readiness.readinessMood === v}
							aria-label={TRAIN_READINESS_MOOD_LABELS[v]}
							onclick={() => { readiness.readinessMood = v; }}
						>{v}</button>
					{/each}
				</div>
			</div>
			<div class="hq-readiness__row hq-readiness__row--pips">
				<span class="hq-readiness__label">Soreness</span>
				<div class="hq-readiness__pips" role="radiogroup" aria-label="Soreness">
					{#each [1, 2, 3, 4, 5] as v}
						<button
							type="button"
							class="hq-readiness__pip"
							class:hq-readiness__pip--on={readiness.readinessSoreness === v}
							aria-pressed={readiness.readinessSoreness === v}
							aria-label={TRAIN_READINESS_SORENESS_LABELS[v]}
							onclick={() => { readiness.readinessSoreness = v; }}
						>{v}</button>
					{/each}
				</div>
			</div>
			<div class="hq-readiness__row hq-readiness__row--pips">
				<span class="hq-readiness__label">Ready</span>
				<div class="hq-readiness__pips" role="radiogroup" aria-label="Starting readiness">
					{#each [1, 2, 3, 4, 5] as v}
						<button
							type="button"
							class="hq-readiness__pip"
							class:hq-readiness__pip--on={readiness.readinessRestingFeel === v}
							aria-pressed={readiness.readinessRestingFeel === v}
							aria-label={TRAIN_READINESS_RESTING_LABELS[v]}
							onclick={() => { readiness.readinessRestingFeel = v; }}
						>{v}</button>
					{/each}
				</div>
			</div>
			<div class="hq-readiness__actions">
				<button
					type="button"
					class="hq-readiness__save pd-mono"
					disabled={submitting}
					onclick={saveCheckIn}
				>
					{submitting ? 'Saving…' : 'Save check-in'}
				</button>
				{#if error}
					<p class="hq-readiness__err pd-mono" role="alert">{error}</p>
				{/if}
			</div>
		</div>
	</details>
{/if}
