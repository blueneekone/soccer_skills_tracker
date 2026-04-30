<script>
	import ActionInbox from '$lib/components/shell/ActionInbox.svelte';
	import CoachTeamXpVelocityChart from '$lib/components/shell/CoachTeamXpVelocityChart.svelte';
	import CoachSquadReadinessCard from '$lib/components/coach/CoachSquadReadinessCard.svelte';
</script>

<div class="view-section coach-dashboard">
	<div class="card-header coach-dashboard__page-head">
		<div class="min-w-0">
			<h1 class="view-title flush-top">Daily Intelligence</h1>
			<p class="text-sm-sub mt-10">
				Review player telemetry and prepare for upcoming missions.
			</p>
		</div>

		<a href="/coach/tactical" class="primary-btn coach-dashboard__cta-match no-underline shrink-0">
			INITIATE MATCH DAY MODE
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="coach-dashboard__cta-icon"
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

	<div class="bento-grid bento-grid--3">
		<div class="bento-card bento-card--glass">
			<h2 class="bg-blue-header">Priority Actions</h2>
			<ActionInbox />
		</div>

		<div class="bento-card bento-card--glass coach-dashboard__bento-main">
			<div class="coach-dashboard__stack-block">
				<h2 class="bg-orange-header">Squad XP Velocity</h2>
				<CoachTeamXpVelocityChart />
			</div>

			<div class="coach-dashboard__stack-block coach-dashboard__stack-block--tight">
				<h2 class="bg-green-header">Squad Readiness</h2>
				<CoachSquadReadinessCard />
			</div>
		</div>
	</div>
</div>

<style>
	.coach-dashboard__page-head {
		border-bottom: none;
		margin-bottom: 2rem;
		padding-bottom: 0;
	}

	@media (min-width: 64rem) {
		.coach-dashboard__bento-main {
			grid-column: span 2;
		}
	}

	.coach-dashboard__cta-match {
		background: #dc2626;
		color: #fff;
		border-color: transparent;
		font-weight: 800;
		box-shadow: 0 0 20px rgba(220, 38, 38, 0.4);
	}

	.coach-dashboard__cta-match:hover {
		opacity: 1;
		background: #ef4444;
		box-shadow: 0 0 30px rgba(220, 38, 38, 0.55);
		transform: translateY(-1px);
	}

	.coach-dashboard__cta-icon {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}

	.coach-dashboard__stack-block :global(.ec-coach-xp) {
		margin-bottom: 0;
	}

	.coach-dashboard__stack-block--tight {
		margin-top: 1.5rem;
	}
</style>
