<script>
	import MatchLogger from '$lib/components/coach/MatchLogger.svelte';

	let {
		teamId = '',
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
	<MatchLogger {teamId} {players} {getStatsId} {onCommitted} />
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
		color: #22d3ee;
		text-shadow: 0 0 18px rgba(34, 211, 238, 0.2);
	}
	.stw__live-sub {
		margin: 0;
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.4);
		max-width: 40rem;
	}
</style>
