<script lang="ts">
	import {
		benchmarkBonusEarned,
		computeBenchmarkXp,
		formatBenchmarkBonusHint,
		isBenchmarkInputValid,
		type BenchmarkDrill,
	} from '$lib/player/benchmark/benchmarkDrillCatalog.js';

	let {
		drill,
		coachTargetValue = null as number | null,
		submitting = false,
		onSubmit = (_value: number) => {},
	} = $props();

	let inputValue = $state('');
	let submitState = $state<'idle' | 'success' | 'error'>('idle');

	const numInput = $derived(parseFloat(inputValue));
	const isValid = $derived(isBenchmarkInputValid(drill, inputValue));
	const bonusEarned = $derived(isValid && benchmarkBonusEarned(drill, numInput));
	const previewXp = $derived(isValid ? computeBenchmarkXp(drill, numInput) : drill.baseXP);

	$effect(() => {
		drill.id;
		inputValue = '';
		submitState = 'idle';
	});

	function handleSubmit() {
		if (!isValid || submitting) {
			submitState = 'error';
			return;
		}
		onSubmit(numInput);
	}
</script>

<section class="pw-benchmark tw-space-y-4" aria-label="Benchmark submission">
	<header class="tw-space-y-2">
		<p class="pw-mono pw-dim tw-text-[10px] tw-uppercase tw-tracking-widest">
			{drill.category} · {drill.statKey} axis
		</p>
		<h2 class="pw-mono tw-text-lg tw-font-bold tw-uppercase tw-tracking-wide tw-text-white">
			{drill.label}
		</h2>
		<p class="pw-mono pw-dim tw-text-xs tw-leading-relaxed">{drill.description}</p>
		{#if coachTargetValue != null && coachTargetValue > 0}
			<p class="pw-mono tw-text-[10px] tw-text-[#14b8a6]/80 tw-uppercase tw-tracking-wide">
				Coach target · {coachTargetValue} {drill.unit}
			</p>
		{/if}
	</header>

	<form class="tw-space-y-4" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
		<div>
			<label
				for="train-benchmark-input"
				class="pw-mono tw-block tw-text-[10px] tw-uppercase tw-tracking-widest tw-mb-2
				       {submitState === 'error' ? 'tw-text-[#ff4444]' : 'pw-dim'}"
			>
				{#if submitState === 'error'}
					⚠ INVALID INPUT — CHECK RANGE [{drill.inputMin}–{drill.inputMax} {drill.unit}]
				{:else}
					Enter measurement
				{/if}
			</label>
			<div class="tw-flex tw-items-end tw-gap-3">
				<input
					id="train-benchmark-input"
					type="number"
					step="any"
					min={drill.inputMin}
					max={drill.inputMax}
					placeholder={drill.placeholder}
					bind:value={inputValue}
					class="pw-input pw-input--hero tw-flex-1"
					autocomplete="off"
				/>
				<span class="pw-mono tw-text-lg tw-font-bold" style:color="{drill.categoryAccent}99">
					{drill.unit}
				</span>
			</div>
		</div>

		<div class="tw-space-y-1">
			<p class="pw-mono pw-dim tw-text-[10px] tw-uppercase tw-tracking-widest">Drill yield</p>
			<p class="pw-mono tw-text-2xl tw-font-bold tw-tabular-nums" style:color={bonusEarned ? drill.categoryAccent : 'rgba(255,255,255,0.55)'}>
				+{previewXp.toLocaleString()} XP
			</p>
			<p class="pw-mono pw-dim tw-text-[9px] tw-uppercase tw-tracking-wide">
				{formatBenchmarkBonusHint(drill)}
			</p>
		</div>

		<button
			type="submit"
			class="pw-commit-btn tw-w-full"
			disabled={!isValid || submitting}
		>
			{submitting ? '[ TRANSMITTING… ]' : '[ LOG BENCHMARK ]'}
		</button>
	</form>
</section>
