<script>
	import MatchLogger from '$lib/components/coach/MatchLogger.svelte';

	let {
		teamId = '',
		/** Correlates live taps with the squad telemetry terminal (`teams/{teamId}/telemetry_events`). */
		matchId = '',
		/** @type {string[]} */
		players = [],
		/**
		 * @param {string} rosterName
		 */
		getStatsId = (/** @param {string} _ */ (_) => ''),
		/** @param {() => void | Promise<void>} fn */
		onCommitted = async () => {},
	} = $props();
</script>

<section
	class="stw__live stw__live-telemetry"
	aria-labelledby="stw-live-telemetry"
	data-region="live-telemetry"
>
	<div class="stw__live-head">
		<h2 id="stw-live-telemetry" class="stw__live-title">LIVE TELEMETRY</h2>
		<p class="stw__live-sub">Ingest match events with rapid + taps, then commit to Firestore.</p>
	</div>
	<div
		class="stw__live-scroll tw-flex tw-w-full tw-flex-wrap tw-gap-3 tw-overflow-visible tw-pb-4"
	>
		<MatchLogger {teamId} {matchId} {players} {getStatsId} {onCommitted} />
	</div>
</section>

<style>
	.stw__live-telemetry {
		margin-bottom: 1.25rem;
		min-width: 0;
	}
	.stw__live-head {
		margin-bottom: 0.65rem;
	}
	.stw__live-title {
		margin: 0 0 0.25rem;
		font-size: 0.85rem;
		font-weight: 900;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: #00f0ff;
		text-shadow: 0 0 18px rgba(0, 240, 255, 0.2);
	}
	.stw__live-sub {
		margin: 0;
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.4);
		max-width: 40rem;
	}
</style>
