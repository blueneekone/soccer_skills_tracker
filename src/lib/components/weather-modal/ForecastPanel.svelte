<script lang="ts">
	import weatherData from '$lib/mock/weatherData.json';

	let view = $state(5);
	const visibleDays = $derived(weatherData.slice(0, view));
	const tabs = [5, 7, 10];
	let selectedDay = $state(weatherData[0].date);
</script>

<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-rounded-none tw-p-3 sm:tw-p-4 tw-font-mono tw-text-white tw-w-full tw-flex tw-flex-col tw-h-full">
	<div class="tw-flex tw-gap-2 tw-mb-4 tw-border-b tw-border-[#334155] tw-pb-2 tw-shrink-0">
		{#each tabs as t}
			<button
				class="tw-px-3 tw-py-1 tw-text-xs tw-rounded-none tw-border tw-transition-colors {view === t ? 'tw-border-[#14b8a6] tw-text-[#14b8a6] tw-bg-[#14b8a6]/10' : 'tw-border-[#334155] tw-text-gray-400 hover:tw-border-gray-400'}"
				onclick={() => { 
					view = t; 
					if (!weatherData.slice(0, t).find(d => d.date === selectedDay)) {
						selectedDay = weatherData[0].date;
					}
				}}
			>
				{t}-DAY
			</button>
		{/each}
	</div>
	
	<!-- Days Container -->
	<div class="tw-grid tw-grid-cols-5 tw-gap-2 tw-overflow-x-auto tw-pb-2 tw-shrink-0" style="scrollbar-width: thin;">
		{#each visibleDays as day}
			<button 
				onclick={() => selectedDay = day.date}
				class="tw-border tw-border-[#334155] tw-rounded-none tw-p-2 tw-flex tw-flex-col tw-items-center tw-text-center tw-transition-colors {selectedDay === day.date ? 'tw-bg-[#14b8a6]/10 tw-border-[#14b8a6]' : 'tw-bg-[#0a0a0a] hover:tw-border-gray-400'} tw-min-w-[70px]">
				<span class="tw-text-[10px] tw-text-gray-400">{day.date}</span>
				<span class="tw-text-xl sm:tw-text-2xl tw-my-1" aria-hidden="true">{day.icon}</span>
				<span class="tw-text-xs tw-font-bold tw-text-white">{day.tempMax}°</span>
				<span class="tw-text-[10px] tw-text-gray-500">{day.tempMin}°</span>
				<span class="tw-text-[9px] tw-text-[#14b8a6] tw-mt-1">{day.precip}% PRECIP</span>
			</button>
		{/each}
	</div>

	<!-- Hourly Drill-down Container -->
	<div class="tw-mt-4 tw-border-t tw-border-[#334155] tw-pt-4 tw-flex-1 tw-min-h-0 tw-flex tw-flex-col">
		<div class="tw-text-[#14b8a6] tw-text-xs tw-mb-2 tw-font-bold tw-shrink-0">HOURLY STORM TRACKING: {selectedDay}</div>
		<div class="tw-flex-1 tw-overflow-y-auto tw-pr-2 tw-space-y-2" style="scrollbar-width: thin;">
			{#each Array(12) as _, i}
				<div class="tw-flex tw-justify-between tw-items-center tw-bg-[#0a0a0a] tw-border tw-border-[#334155] tw-p-2 tw-text-xs">
					<span class="tw-w-16 tw-text-gray-400">{i + 8}:00 {i+8 >= 12 ? 'PM' : 'AM'}</span>
					<span class="tw-flex-1 tw-text-center">
						<span class="tw-text-white">{Math.floor(70 + Math.random() * 20)}°</span>
					</span>
					<span class="tw-w-24 tw-text-right tw-text-[10px]">
						{#if Math.random() > 0.7}
							<span class="tw-text-red-500 tw-font-bold">{(Math.random() * 80 + 20).toFixed(0)}% STORMS</span>
						{:else if Math.random() > 0.4}
							<span class="tw-text-[#14b8a6]">{(Math.random() * 40).toFixed(0)}% PRECIP</span>
						{:else}
							<span class="tw-text-gray-500">CLEAR</span>
						{/if}
					</span>
				</div>
			{/each}
		</div>
	</div>
</div>
