<script lang="ts">
	import { httpsCallable } from 'firebase/functions';
	import { functions } from '$lib/firebase.js';

	interface Props {
		clubId?: string;
		/** Pre-fill player email from roster row selection */
		playerEmail?: string;
		/** Pre-fill destination team id */
		targetTeamId?: string;
	}

	let { clubId = '', playerEmail = '', targetTeamId = '' }: Props = $props();

	const registrarTransferPlayer = httpsCallable(functions, 'registrarTransferPlayer');

	let email = $state(playerEmail);
	let teamId = $state(targetTeamId);
	let busy = $state(false);
	let err = $state('');
	let ok = $state('');

	$effect(() => {
		email = playerEmail;
	});
	$effect(() => {
		teamId = targetTeamId;
	});

	async function submitTransfer() {
		err = '';
		ok = '';
		const em = email.trim().toLowerCase();
		const tid = teamId.trim();
		if (!em || !tid) {
			err = 'Player email and target team ID are required.';
			return;
		}
		busy = true;
		try {
			const res = await registrarTransferPlayer({
				playerEmail: em,
				targetTeamId: tid,
			});
			const data =
				res && typeof res === 'object' && 'data' in res ?
					(res.data as { playerName?: string; noop?: boolean })
				:	null;
			const name =
				data && typeof data.playerName === 'string' ? data.playerName : em;
			ok = data?.noop ?
				`${name} is already on team ${tid}.`
			:	`Transferred ${name} to team ${tid}.`;
		} catch (e) {
			err =
				e && typeof e === 'object' && 'message' in e ?
					String((e as { message: unknown }).message)
				:	'Transfer failed.';
		} finally {
			busy = false;
		}
	}
</script>

<section class="rrt-panel" aria-labelledby="rrt-title">
	<header class="rrt-panel__head">
		<h3 id="rrt-title" class="rrt-panel__title">In-club roster transfer</h3>
		<p class="rrt-panel__sub">
			Move a linked player between teams in {clubId || 'your club'} (users + player_lookup + roster).
		</p>
	</header>
	<div class="rrt-panel__grid">
		<label class="rrt-field">
			<span class="rrt-label">Player email</span>
			<input
				class="rrt-input"
				type="email"
				autocomplete="off"
				placeholder="slug@operative.local or player@email.com"
				bind:value={email}
			/>
		</label>
		<label class="rrt-field">
			<span class="rrt-label">Target team ID</span>
			<input
				class="rrt-input"
				type="text"
				autocomplete="off"
				placeholder="e.g. qa_launch_2026_ppc"
				bind:value={teamId}
			/>
		</label>
	</div>
	<button type="button" class="rrt-btn" disabled={busy} onclick={() => void submitTransfer()}>
		{busy ? 'Transferring…' : 'Transfer player'}
	</button>
	{#if err}
		<p class="rrt-err" role="alert">{err}</p>
	{/if}
	{#if ok}
		<p class="rrt-ok" role="status">{ok}</p>
	{/if}
</section>

<style>
	.rrt-panel {
		border: 1px solid #334155;
		background: #0f172a;
		padding: 1rem 1.25rem;
	}
	.rrt-panel__head {
		margin-bottom: 0.75rem;
	}
	.rrt-panel__title {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #f8fafc;
	}
	.rrt-panel__sub {
		margin: 0.35rem 0 0;
		font-size: 0.78rem;
		color: #94a3b8;
		line-height: 1.45;
	}
	.rrt-panel__grid {
		display: grid;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}
	@media (min-width: 640px) {
		.rrt-panel__grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	.rrt-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.rrt-label {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #64748b;
	}
	.rrt-input {
		min-height: 2.5rem;
		padding: 0.45rem 0.65rem;
		border: 1px solid #334155;
		background: #020617;
		color: #e2e8f0;
		font-size: 0.85rem;
	}
	.rrt-btn {
		min-height: 2.5rem;
		padding: 0.45rem 1rem;
		border: 1px solid #fbbf24;
		background: transparent;
		color: #fbbf24;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		cursor: pointer;
	}
	.rrt-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.rrt-err {
		margin: 0.65rem 0 0;
		font-size: 0.78rem;
		color: #fca5a5;
	}
	.rrt-ok {
		margin: 0.65rem 0 0;
		font-size: 0.78rem;
		color: #86efac;
	}
</style>
