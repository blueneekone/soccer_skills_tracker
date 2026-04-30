<script>
	import { httpsCallable } from 'firebase/functions';
	import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
	import { functions, db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Swal from 'sweetalert2';

	let {
		teamId = '',
		/** Session id — correlates docs under `teams/{teamId}/telemetry_events` with the live terminal query. */
		matchId = '',
		/** @type {string[]} */
		players = [],
		/**
		 * Resolve player_stats document id for a roster display name.
		 * @param {string} rosterName
		 */
		getStatsId = /** @param {string} _ */ (_) => '',
		/** @param {() => void | Promise<void>} fn */
		onCommitted = async () => {},
	} = $props();

	const commitMatchTelemetry = httpsCallable(functions, 'commitMatchTelemetry');

	/** Maps UI metric keys → Firestore action label + points for live feed. */
	const LIVE_ACTION = /** @type {const} */ ({
		goals: /** @type {const} */ ({ action: 'goal', points: 10 }),
		assists: /** @type {const} */ ({ action: 'assist', points: 6 }),
		shots: /** @type {const} */ ({ action: 'shot', points: 1 }),
		saves: /** @type {const} */ ({ action: 'save', points: 3 }),
	});

	/** @type {Record<string, { goals: number, assists: number, shots: number, saves: number }>} */
	let pending = $state({});

	let committing = $state(false);
	/** @type {{ type: 'error' | 'success'; text: string } | null} */
	let feedback = $state(null);

	let lastTeamId = $state('');
	/** `@statsDoc-metricKey` for CSS pulse on successful tap */
	let pulseToken = $state(/** @type {string | null} */ (null));

	$effect(() => {
		if (teamId !== lastTeamId) {
			lastTeamId = teamId;
			pending = {};
		}
	});

	/**
	 * Streams one tap to `teams/{teamId}/telemetry_events` (same shape as `$userStore?.uid` → {@link authStore}.user?.uid).
	 * @param {string} actionType
	 * @param {number} points
	 * @param {string} playerId `player_stats` doc id for this athlete
	 */
	async function logMatchEvent(actionType, points, playerId) {
		if (!teamId || !matchId || !playerId) return;
		const uid = authStore.user?.uid;
		if (!uid) {
			feedback = { type: 'error', text: 'Sign in required to log live taps.' };
			return;
		}
		try {
			await addDoc(collection(db, 'teams', teamId, 'telemetry_events'), {
				teamId,
				matchId,
				playerId,
				action: actionType,
				points,
				timestamp: serverTimestamp(),
				loggedBy: uid,
			});
			void Swal.fire({
				icon: 'success',
				title: actionType.toUpperCase(),
				text: 'Synced',
				toast: true,
				position: 'bottom-end',
				showConfirmButton: false,
				timer: 1400,
				timerProgressBar: true,
				background: 'rgba(5,5,10,0.92)',
				color: '#e5e7eb',
				customClass: { popup: 'swal2-glass-toast' },
			});
		} catch (e) {
			console.error('[MatchLogger] telemetry_events', e);
			feedback = {
				type: 'error',
				text: 'Live tap did not reach Firestore (check connection / rules).',
			};
		}
	}

	/**
	 * @param {string} rosterName
	 * @param {'goals' | 'assists' | 'shots' | 'saves'} k
	 */
	function bump(rosterName, k) {
		if (!teamId) return;
		const id = getStatsId(rosterName);
		if (!id) return;
		const cur = pending[id] || { goals: 0, assists: 0, shots: 0, saves: 0 };
		pending = {
			...pending,
			[id]: { ...cur, [k]: cur[k] + 1 },
		};
		const spec = LIVE_ACTION[k];
		const tok = `${id}-${k}`;
		pulseToken = tok;
		setTimeout(() => {
			if (pulseToken === tok) pulseToken = null;
		}, 520);
		void logMatchEvent(spec.action, spec.points, id);
	}

	/**
	 * @param {string} id
	 */
	function rowFor(id) {
		return pending[id] || { goals: 0, assists: 0, shots: 0, saves: 0 };
	}

	function hasAnyPending() {
		for (const v of Object.values(pending)) {
			if (v.goals + v.assists + v.shots + v.saves > 0) return true;
		}
		return false;
	}

	async function commit() {
		if (!teamId || committing || !hasAnyPending()) return;
		committing = true;
		feedback = null;
		const rows = [];
		for (const p of players) {
			const playerKey = getStatsId(p);
			const r = rowFor(playerKey);
			if (r.goals + r.assists + r.shots + r.saves === 0) continue;
			rows.push({
				playerKey,
				goals: r.goals,
				assists: r.assists,
				shots: r.shots,
				saves: r.saves,
			});
		}
		if (rows.length === 0) {
			committing = false;
			return;
		}
		try {
			await commitMatchTelemetry({ teamId, rows });
			pending = {};
			feedback = { type: 'success', text: 'Telemetry ingested to Firestore.' };
			await onCommitted();
		} catch (e) {
			const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : 'Commit failed.';
			feedback = { type: 'error', text: msg };
		} finally {
			committing = false;
		}
	}
</script>

<section class="ml-wrap" aria-labelledby="ml-live-telemetry" data-region="match-logger">
	<header class="ml-head">
		<div>
			<p class="ml-eyebrow">Coach OS · field</p>
			<h2 id="ml-live-telemetry" class="ml-title">Live telemetry</h2>
			<p class="ml-sub">
				Each + tap streams to Firestore ({#if matchId}<span class="ml-mono">{matchId.slice(0, 8)}…</span>{:else}<span
					class="ml-muted-inline">no session id</span
				>{/if}). Commit batches XP when the period ends.
			</p>
		</div>
	</header>

	{#if feedback}
		<p
			class="ml-feedback"
			role="status"
			class:ml-feedback--ok={feedback.type === 'success'}
			class:ml-feedback--err={feedback.type === 'error'}
		>
			{feedback.text}
		</p>
	{/if}

	<div class="ml-list" role="list">
		{#if !teamId}
			<p class="ml-muted">Select a team context.</p>
		{:else if players.length === 0}
			<p class="ml-muted">No athletes on roster.</p>
		{:else}
			{#each players as p (p + teamId)}
				{@const sid = getStatsId(p)}
				{@const row = rowFor(sid)}
				<div class="ml-row" role="listitem">
					<div class="ml-who">
						<span class="ml-name">{p}</span>
					</div>
					<div class="ml-mets" aria-label="Session deltas — not yet committed">
						<div class="ml-metric">
							<span class="ml-lbl">G</span>
							<span class="ml-val" aria-live="polite">{row.goals}</span
							><button
								type="button"
								class="ml-plus"
								class:ml-plus--pulse={pulseToken === `${sid}-goals`}
								aria-label="Add goal for {p}"
								onclick={() => bump(p, 'goals')}>+</button
							>
						</div>
						<div class="ml-metric">
							<span class="ml-lbl">A</span>
							<span class="ml-val" aria-live="polite">{row.assists}</span
							><button
								type="button"
								class="ml-plus"
								class:ml-plus--pulse={pulseToken === `${sid}-assists`}
								aria-label="Add assist for {p}"
								onclick={() => bump(p, 'assists')}>+</button
							>
						</div>
						<div class="ml-metric">
							<span class="ml-lbl">Sht</span>
							<span class="ml-val" aria-live="polite">{row.shots}</span
							><button
								type="button"
								class="ml-plus"
								class:ml-plus--pulse={pulseToken === `${sid}-shots`}
								aria-label="Add shot for {p}"
								onclick={() => bump(p, 'shots')}>+</button
							>
						</div>
						<div class="ml-metric">
							<span class="ml-lbl">Sv</span>
							<span class="ml-val" aria-live="polite">{row.saves}</span
							><button
								type="button"
								class="ml-plus"
								class:ml-plus--pulse={pulseToken === `${sid}-saves`}
								aria-label="Add save for {p}"
								onclick={() => bump(p, 'saves')}>+</button
							>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<div class="ml-actions">
		<button
			type="button"
			class="ml-commit"
			disabled={!teamId || committing || !hasAnyPending()}
			onclick={commit}
		>
			{committing ? 'Ingesting…' : 'Commit telemetry'}
		</button>
	</div>
</section>

<style>
	:global(.swal2-glass-toast) {
		border: 1px solid rgba(34, 211, 238, 0.35) !important;
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
		backdrop-filter: blur(12px);
	}

	.ml-wrap {
		--ml-line: rgba(0, 212, 255, 0.25);
		--ml-bg: #05050a;
		--ml-glow: rgba(0, 212, 255, 0.12);
		background: var(--ml-bg);
		border: 1px solid var(--ml-line);
		border-radius: 0;
		margin-bottom: 1rem;
		padding: 0.9rem 0.75rem 1rem;
		min-width: 0;
	}

	.ml-head {
		margin-bottom: 0.6rem;
	}

	.ml-eyebrow {
		margin: 0 0 0.2rem;
		font-size: 0.55rem;
		font-weight: 800;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: rgba(0, 212, 255, 0.75);
	}

	.ml-title {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #fafafa;
	}

	.ml-sub {
		margin: 0.35rem 0 0;
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.45);
		max-width: 40rem;
	}

	.ml-mono {
		font-family: ui-monospace, Menlo, Consolas, monospace;
		font-size: 0.62rem;
		color: rgba(34, 211, 238, 0.85);
	}

	.ml-muted-inline {
		color: rgba(255, 255, 255, 0.35);
		font-style: italic;
	}

	.ml-feedback {
		margin: 0 0 0.5rem;
		font-size: 0.7rem;
	}
	.ml-feedback--ok {
		color: #86efac;
	}
	.ml-feedback--err {
		color: #fecaca;
	}

	.ml-list {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		max-height: min(60vh, 520px);
		overflow: auto;
		-webkit-overflow-scrolling: touch;
	}

	.ml-muted {
		margin: 0;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.ml-row {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem 0.45rem;
		border: 1px solid var(--ml-line);
		background: #000;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);
	}

	@media (min-width: 520px) {
		.ml-row {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}

	.ml-who {
		min-width: 0;
		flex: 1 1 8rem;
	}

	.ml-name {
		display: block;
		font-size: 0.85rem;
		font-weight: 800;
		color: #f4f4f5;
		overflow-wrap: anywhere;
	}

	.ml-mets {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.35rem;
		flex: 1 1 auto;
		max-width: 100%;
	}

	.ml-metric {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		border: 1px solid var(--ml-line);
		background: #05050a;
		padding: 0.1rem 0.15rem 0.1rem 0.3rem;
		min-width: 0;
	}

	.ml-lbl {
		font-size: 0.5rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.4);
		flex-shrink: 0;
	}

	.ml-val {
		flex: 1;
		min-width: 1.25rem;
		text-align: right;
		font-size: 1rem;
		font-weight: 800;
		font-family: ui-monospace, Menlo, Consolas, monospace;
		font-variant-numeric: tabular-nums;
		color: #e4e4e7;
	}

	.ml-plus {
		flex: 0 0 auto;
		min-width: 2.75rem;
		min-height: 2.75rem;
		padding: 0;
		margin: 0;
		font-size: 1.2rem;
		font-weight: 900;
		line-height: 1;
		color: #00d4ff;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(0, 212, 255, 0.5);
		cursor: pointer;
		touch-action: manipulation;
		box-shadow: inset 0 0 0 1px var(--ml-glow);
		transition:
			box-shadow 0.35s ease,
			transform 0.12s ease;
	}

	.ml-plus:hover {
		background: rgba(0, 212, 255, 0.12);
	}

	.ml-plus:active {
		transform: scale(0.97);
	}

	.ml-plus--pulse {
		animation: ml-tap-pulse 0.52s ease-out;
		box-shadow:
			0 0 22px rgba(34, 211, 238, 0.55),
			inset 0 0 0 1px rgba(34, 211, 238, 0.35);
	}

	@keyframes ml-tap-pulse {
		0% {
			box-shadow:
				0 0 0 0 rgba(34, 211, 238, 0.65),
				inset 0 0 0 1px rgba(34, 211, 238, 0.45);
		}
		100% {
			box-shadow:
				0 0 28px 6px rgba(34, 211, 238, 0),
				inset 0 0 0 1px var(--ml-glow);
		}
	}

	.ml-plus:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.ml-actions {
		margin-top: 0.75rem;
		padding-top: 0.65rem;
		border-top: 1px solid var(--ml-line);
	}

	.ml-commit {
		width: 100%;
		min-height: 3.25rem;
		font-size: 0.7rem;
		font-weight: 900;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: #05050a;
		background: linear-gradient(180deg, #22d3ee 0%, #06b6d4 100%);
		border: 1px solid rgba(34, 211, 238, 0.9);
		box-shadow: 0 0 20px rgba(6, 182, 212, 0.35);
		cursor: pointer;
		touch-action: manipulation;
	}

	.ml-commit:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
