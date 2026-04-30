<script>
	import { resolve } from '$app/paths';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import ActionInbox from '$lib/components/shell/ActionInbox.svelte';
	import CoachTeamXpVelocityChart from '$lib/components/shell/CoachTeamXpVelocityChart.svelte';
	import CoachSquadReadinessCard from '$lib/components/coach/CoachSquadReadinessCard.svelte';
</script>

<div
	class="tw-flex tw-min-h-screen tw-flex-col tw-bg-slate-950 tw-font-sans tw-text-slate-100 tw-selection:bg-cyan-500/30"
>
	<AppHeader title="Coach Command Center" />

	<main class="tw-mx-auto tw-w-full tw-max-w-7xl tw-flex-1 tw-px-4 tw-py-8 sm:tw-px-6 lg:tw-px-8">
		<div
			class="tw-mb-8 tw-flex tw-flex-col tw-items-start tw-justify-between tw-gap-4 md:tw-flex-row md:tw-items-center"
		>
			<div>
				<h1 class="tw-text-3xl tw-font-bold tw-tracking-tight tw-text-white">Daily Intelligence</h1>
				<p class="tw-mt-1 tw-text-slate-400">
					Review player telemetry and prepare for upcoming missions.
				</p>
			</div>

			<a
				href={resolve('/coach/tactical')}
				class="tw-group tw-relative tw-z-10 tw-inline-flex tw-cursor-pointer tw-items-center tw-justify-center tw-rounded-xl tw-bg-red-600 tw-px-8 tw-py-4 tw-font-bold tw-text-white tw-shadow-[0_0_20px_rgba(220,38,38,0.4)] tw-transition-all tw-duration-300 hover:tw--translate-y-1 hover:tw-bg-red-500 hover:tw-shadow-[0_0_30px_rgba(220,38,38,0.6)]"
			>
				INITIATE MATCH DAY MODE
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="tw-ml-2 tw-h-5 tw-w-5 tw-transition-transform tw-group-hover:tw-translate-x-1"
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						fill-rule="evenodd"
						d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
			</a>
		</div>

		<div class="tw-grid tw-grid-cols-1 tw-gap-6 lg:tw-grid-cols-3">
			<div class="tw-flex tw-flex-col tw-gap-6 lg:tw-col-span-1">
				<ActionInbox />
			</div>

			<div class="tw-flex tw-flex-col tw-gap-6 lg:tw-col-span-2">
				<div
					class="tw-relative tw-z-10 tw-rounded-2xl tw-border tw-border-white/5 tw-bg-slate-900/60 tw-p-6 tw-shadow-2xl tw-backdrop-blur-md"
				>
					<h2
						class="tw-mb-4 tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-400"
					>
						Squad XP Velocity
					</h2>
					<CoachTeamXpVelocityChart />
				</div>

				<div
					class="tw-relative tw-z-10 tw-rounded-2xl tw-border tw-border-white/5 tw-bg-slate-900/60 tw-p-6 tw-shadow-2xl tw-backdrop-blur-md"
				>
					<CoachSquadReadinessCard />
				</div>
			</div>
		</div>
	</main>
</div>
