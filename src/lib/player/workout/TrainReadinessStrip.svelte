<script lang="ts">
	import {
		TRAIN_READINESS_MOOD_LABELS,
		TRAIN_READINESS_RESTING_LABELS,
		TRAIN_READINESS_SORENESS_LABELS,
		type TrainReadinessInput,
	} from '$lib/player/workout/trainReadiness.js';

	let {
		sleepHoursLastNight = $bindable(7),
		soreness = $bindable(1),
		mood = $bindable(3),
		restingFeel = $bindable(3),
	}: TrainReadinessInput = $props();
</script>

<div class="pw-readiness" role="group" aria-label="Session readiness">
	<div class="pw-readiness__head">
		<span class="pw-eyebrow">Pre-session check</span>
		<span class="pw-dim pw-mono tw-text-[10px]">Once per day · improves adaptive suggestions</span>
	</div>

	<div class="pw-readiness__grid">
		<div class="pw-readiness__field">
			<label class="pw-readiness__label" for="pw-readiness-sleep">
				<span>Sleep</span>
				<span class="pw-mono pw-telem">{sleepHoursLastNight}h</span>
			</label>
			<input
				id="pw-readiness-sleep"
				class="pw-range"
				type="range"
				min="0"
				max="12"
				step="0.5"
				bind:value={sleepHoursLastNight}
			/>
		</div>

		<div class="pw-readiness__field">
			<span class="pw-readiness__label">Soreness</span>
			<div class="pw-readiness__pips" role="radiogroup" aria-label="Muscle soreness">
				{#each [1, 2, 3, 4, 5] as v}
					<button
						type="button"
						class="pw-readiness__pip"
						class:pw-readiness__pip--on={soreness === v}
						aria-pressed={soreness === v}
						aria-label={TRAIN_READINESS_SORENESS_LABELS[v]}
						onclick={() => { soreness = v; }}
					>{v}</button>
				{/each}
			</div>
			<span class="pw-dim pw-mono tw-text-[10px]">{TRAIN_READINESS_SORENESS_LABELS[soreness]}</span>
		</div>

		<div class="pw-readiness__field">
			<span class="pw-readiness__label">Mood / energy</span>
			<div class="pw-readiness__pips" role="radiogroup" aria-label="Mood">
				{#each [1, 2, 3, 4, 5] as v}
					<button
						type="button"
						class="pw-readiness__pip"
						class:pw-readiness__pip--on={mood === v}
						aria-pressed={mood === v}
						aria-label={TRAIN_READINESS_MOOD_LABELS[v]}
						onclick={() => { mood = v; }}
					>{v}</button>
				{/each}
			</div>
			<span class="pw-dim pw-mono tw-text-[10px]">{TRAIN_READINESS_MOOD_LABELS[mood]}</span>
		</div>

		<div class="pw-readiness__field">
			<span class="pw-readiness__label">Starting readiness</span>
			<div class="pw-readiness__pips" role="radiogroup" aria-label="Pre-workout readiness">
				{#each [1, 2, 3, 4, 5] as v}
					<button
						type="button"
						class="pw-readiness__pip"
						class:pw-readiness__pip--on={restingFeel === v}
						aria-pressed={restingFeel === v}
						aria-label={TRAIN_READINESS_RESTING_LABELS[v]}
						onclick={() => { restingFeel = v; }}
					>{v}</button>
				{/each}
			</div>
			<span class="pw-dim pw-mono tw-text-[10px]">{TRAIN_READINESS_RESTING_LABELS[restingFeel]}</span>
		</div>
	</div>
</div>

<style>
	.pw-readiness {
		margin-top: 0.75rem;
		padding: 0.85rem 1rem;
		border: 1px solid rgba(20, 184, 166, 0.22);
		background: rgba(20, 184, 166, 0.05);
		border-radius: 10px;
	}

	.pw-readiness__head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.35rem 0.75rem;
		margin-bottom: 0.75rem;
	}

	.pw-readiness__grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem 1rem;
	}

	@media (max-width: 640px) {
		.pw-readiness__grid {
			grid-template-columns: 1fr;
		}
	}

	.pw-readiness__field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
	}

	.pw-readiness__label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(226, 232, 240, 0.72);
	}

	.pw-readiness__pips {
		display: flex;
		gap: 0.35rem;
	}

	.pw-readiness__pip {
		flex: 1;
		min-width: 0;
		padding: 0.3rem 0;
		font-family: ui-monospace, monospace;
		font-size: 0.72rem;
		font-weight: 700;
		border-radius: 6px;
		border: 1px solid rgba(148, 163, 184, 0.25);
		background: rgba(15, 23, 42, 0.55);
		color: rgba(226, 232, 240, 0.55);
		cursor: pointer;
	}

	.pw-readiness__pip--on {
		border-color: rgba(20, 184, 166, 0.55);
		background: rgba(20, 184, 166, 0.14);
		color: #5eead4;
	}
</style>
