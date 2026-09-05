<script lang="ts">
	import weatherData from '$lib/mock/weatherData.json';

	interface DayForecast {
		date: string;
		icon: string;
		tempMax: number;
		tempMin: number;
		precip: number;
	}

	let view = $state<number>(5);
	const tabs = [5, 7, 10];
	const visibleDays = $derived(weatherData.slice(0, view));
	let selectedDate = $state<string>(weatherData[0].date);

	const activeDayData = $derived(
		(weatherData.find((d) => d.date === selectedDate) as DayForecast) ?? weatherData[0]
	);

	function getHourlyForDay(day: DayForecast) {
		const baseTemp = day.tempMin;
		const tempRange = day.tempMax - day.tempMin;
		const isThunderstorm = day.icon.includes('⛈️') || day.precip >= 75;
		const hours = [
			{ h: '08:00', label: '8 AM', heat: 0.15, stormFactor: 0.2 },
			{ h: '10:00', label: '10 AM', heat: 0.45, stormFactor: 0.35 },
			{ h: '12:00', label: '12 PM', heat: 0.85, stormFactor: 0.6 },
			{ h: '14:00', label: '2 PM', heat: 1.0, stormFactor: 0.95 },
			{ h: '16:00', label: '4 PM', heat: 0.92, stormFactor: 1.0 },
			{ h: '18:00', label: '6 PM', heat: 0.65, stormFactor: 0.7 },
			{ h: '20:00', label: '8 PM', heat: 0.35, stormFactor: 0.4 },
		];

		return hours.map((hour) => {
			const temp = Math.round(baseTemp + tempRange * hour.heat);
			const stormPct = Math.min(100, Math.round(day.precip * hour.stormFactor));
			const isSevere = isThunderstorm && stormPct >= 65;
			const isElevated = stormPct >= 40 && !isSevere;
			const windMph = Math.round(8 + hour.heat * 10 + (isSevere ? 12 : 0));

			let status: 'GO' | 'MONITOR' | 'LOCKOUT' = 'GO';
			if (isSevere) status = 'LOCKOUT';
			else if (isElevated) status = 'MONITOR';

			return {
				time: hour.h,
				label: hour.label,
				temp,
				stormPct,
				windMph,
				isSevere,
				isElevated,
				status,
			};
		});
	}

	const hourlyRows = $derived(getHourlyForDay(activeDayData));
</script>

<div class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-p-3 sm:tw-p-4 tw-font-mono tw-text-white tw-w-full tw-flex tw-flex-col tw-h-full">
	<!-- Tab Switcher -->
	<div class="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-mb-3 tw-border-b tw-border-[#334155] tw-pb-2.5 tw-shrink-0">
		<span class="tw-text-[10px] tw-font-bold tw-text-slate-400 tw-tracking-widest tw-uppercase">
			RADAR FORECAST
		</span>
		<div class="tw-flex tw-gap-1.5">
			{#each tabs as t}
				<button
					type="button"
					class="tw-px-2.5 tw-py-1 tw-text-[11px] tw-font-mono tw-font-bold tw-border tw-transition-colors {view === t ? 'tw-border-[#14b8a6] tw-text-[#14b8a6] tw-bg-[#14b8a6]/15' : 'tw-border-[#334155] tw-text-slate-400 hover:tw-border-slate-400 hover:tw-text-white'}"
					onclick={() => { 
						view = t; 
						if (!weatherData.slice(0, t).find(d => d.date === selectedDate)) {
							selectedDate = weatherData[0].date;
						}
					}}
				>
					{t}-DAY
				</button>
			{/each}
		</div>
	</div>

	<!-- Days Scroll Strip -->
	<div class="tw-flex tw-gap-2 tw-overflow-x-auto tw-pb-2 tw-shrink-0 tw-scrollbar-thin">
		{#each visibleDays as day}
			{@const active = selectedDate === day.date}
			<button 
				type="button"
				onclick={() => (selectedDate = day.date)}
				class="tw-flex-1 tw-min-w-[70px] sm:tw-min-w-[78px] tw-border tw-p-2 tw-flex tw-flex-col tw-items-center tw-text-center tw-transition-all {active ? 'tw-bg-[#0f172a] tw-border-[#14b8a6] tw-shadow-[0_0_12px_rgba(20,184,166,0.3)]' : 'tw-bg-[#000000] tw-border-[#334155] hover:tw-border-slate-500'} tw-cursor-pointer"
			>
				<span class="tw-text-[10px] tw-font-bold {active ? 'tw-text-[#14b8a6]' : 'tw-text-slate-400'}">{day.date}</span>
				<span class="tw-text-xl sm:tw-text-2xl tw-my-1" aria-hidden="true">{day.icon}</span>
				<div class="tw-flex tw-items-baseline tw-gap-1">
					<span class="tw-text-xs tw-font-bold tw-text-white">{day.tempMax}°</span>
					<span class="tw-text-[10px] tw-text-slate-500">{day.tempMin}°</span>
				</div>
				<span class="tw-text-[9px] tw-font-bold tw-mt-1 {day.precip >= 50 ? 'tw-text-[#f59e0b]' : 'tw-text-[#14b8a6]'}">
					{day.precip}% RAIN
				</span>
			</button>
		{/each}
	</div>

	<!-- Hourly Drill-down Container (compact, non-overflowing) -->
	<div class="tw-mt-3 tw-border-t tw-border-[#334155] tw-pt-3 tw-flex-1 tw-min-h-0 tw-flex tw-flex-col">
		<div class="tw-flex tw-items-center tw-justify-between tw-mb-2 tw-shrink-0">
			<span class="tw-text-[#14b8a6] tw-text-xs tw-font-bold tw-tracking-wider tw-uppercase">
				HOURLY STORM TRACKING · {selectedDate}
			</span>
			<span class="tw-text-[10px] tw-font-mono tw-text-slate-400">
				PEAK PRECIP: <strong class="tw-text-white">{activeDayData.precip}%</strong>
			</span>
		</div>

		<div class="tw-flex-1 tw-overflow-y-auto tw-pr-1 tw-space-y-1.5 tw-max-h-[220px] tw-scrollbar-thin">
			{#each hourlyRows as row}
				<div class="tw-flex tw-items-center tw-justify-between tw-bg-[#000000] tw-border tw-border-[#334155] tw-px-3 tw-py-1.5 tw-text-xs hover:tw-border-[#14b8a6]/50 tw-transition-colors">
					<!-- Time -->
					<div class="tw-w-16 tw-font-mono tw-text-[11px] tw-text-slate-300 tw-font-bold">
						{row.label}
					</div>

					<!-- Temperature -->
					<div class="tw-w-14 tw-text-center tw-font-mono tw-font-bold tw-text-white">
						{row.temp}°F
					</div>

					<!-- Storm Probability Bar -->
					<div class="tw-flex-1 tw-mx-3 tw-hidden sm:tw-flex tw-items-center tw-gap-2">
						<div class="tw-flex-1 tw-h-1.5 tw-bg-slate-800 tw-rounded-full tw-overflow-hidden">
							<div
								class="tw-h-full tw-transition-all"
								class:tw-bg-[#14b8a6]={!row.isSevere && !row.isElevated}
								class:tw-bg-[#f59e0b]={row.isElevated}
								class:tw-bg-[#ef4444]={row.isSevere}
								style="width: {row.stormPct}%;"
							></div>
						</div>
						<span class="tw-text-[10px] tw-w-8 tw-text-right tw-font-mono tw-text-slate-400">
							{row.stormPct}%
						</span>
					</div>

					<!-- Status Badge -->
					<div class="tw-w-28 tw-text-right">
						{#if row.status === 'LOCKOUT'}
							<span class="tw-bg-[#ef4444]/20 tw-border tw-border-[#ef4444] tw-text-[#ef4444] tw-text-[9px] tw-font-bold tw-px-2 tw-py-0.5 tw-rounded">
								⚡ LOCKOUT
							</span>
						{:else if row.status === 'MONITOR'}
							<span class="tw-bg-[#f59e0b]/20 tw-border tw-border-[#f59e0b] tw-text-[#f59e0b] tw-text-[9px] tw-font-bold tw-px-2 tw-py-0.5 tw-rounded">
								⚠ CAUTION
							</span>
						{:else}
							<span class="tw-bg-[#14b8a6]/15 tw-border tw-border-[#14b8a6]/40 tw-text-[#14b8a6] tw-text-[9px] tw-font-bold tw-px-2 tw-py-0.5 tw-rounded">
								● GO
							</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
