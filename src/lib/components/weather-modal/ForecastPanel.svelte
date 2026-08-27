<script lang="ts">
	import weatherData from '$lib/mock/weatherData.json';

	let view = $state(5);
	const visibleDays = $derived(weatherData.slice(0, view));
	const tabs = [5, 7, 10];
</script>

<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-rounded-none tw-p-4 tw-font-mono tw-text-white tw-w-full">
	<div class="tw-flex tw-gap-2 tw-mb-4 tw-border-b tw-border-[#334155] tw-pb-2">
		{#each tabs as t}
			<button
				class="tw-px-3 tw-py-1 tw-text-xs tw-rounded-none tw-border tw-transition-colors {view === t ? 'tw-border-[#14b8a6] tw-text-[#14b8a6] tw-bg-[#14b8a6]/10' : 'tw-border-[#334155] tw-text-gray-400 hover:tw-border-gray-400'}"
				onclick={() => (view = t)}
			>
				{t}-DAY
			</button>
		{/each}
	</div>
	<div class="tw-grid tw-grid-cols-2 md:tw-grid-cols-5 tw-gap-2">
		{#each visibleDays as day}
			<div class="tw-border tw-border-[#334155] tw-rounded-none tw-p-2 tw-flex tw-flex-col tw-items-center tw-text-center tw-bg-[#0a0a0a]">
				<span class="tw-text-[10px] tw-text-gray-400">{day.date}</span>
				<span class="tw-text-2xl tw-my-1" aria-hidden="true">{day.icon}</span>
				<span class="tw-text-xs tw-font-bold tw-text-white">{day.tempMax}°</span>
				<span class="tw-text-[10px] tw-text-gray-500">{day.tempMin}°</span>
				<span class="tw-text-[9px] tw-text-[#14b8a6] tw-mt-1">{day.precip}% PRECIP</span>
			</div>
		{/each}
	</div>
</div>
