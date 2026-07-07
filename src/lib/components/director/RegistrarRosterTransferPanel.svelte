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
		background: #0B0F19;
		padding: 1.5rem;
		border-radius: 0;
	}
	.rrt-panel__head {
		margin-bottom: 1rem;
	}
	.rrt-panel__title {
		margin: 0;
		font-size: 1rem;
		font-family: 'Geist Sans', sans-serif;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: -0.02em;
		color: #FAFAFA;
	}
	.rrt-panel__sub {
		margin: 0.5rem 0 0;
		font-size: 0.85rem;
		font-family: 'Switzer', sans-serif;
		color: #D4D4D8;
		line-height: 1.5;
	}
	.rrt-panel__grid {
		display: grid;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	@media (min-width: 640px) {
		.rrt-panel__grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	.rrt-field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.rrt-label {
		font-family: 'Geist Mono', monospace;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #A1A1AA;
	}
	.rrt-input {
		min-height: 2.75rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid #334155;
		background: #020617;
		color: #FAFAFA;
		font-size: 0.85rem;
		font-family: 'Geist Mono', monospace;
		border-radius: 0;
		transition: border-color 0.15s ease;
	}
	.rrt-input:focus {
		border-color: #FAFAFA;
		outline: none;
	}
	.rrt-btn {
		width: 100%;
		min-height: 2.75rem;
		padding: 0.65rem 1.25rem;
		border: 1px solid #FAFAFA;
		background: transparent;
		color: #FAFAFA;
		font-size: 0.85rem;
		font-family: 'Geist Sans', sans-serif;
		font-weight: 700;
		text-transform: uppercase;
		cursor: pointer;
		border-radius: 0;
		transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease;
	}
	@media (min-width: 640px) {
		.rrt-btn {
			width: auto;
		}
	}
	.rrt-btn:hover:not(:disabled) {
		background: #FAFAFA;
		color: #020617;
	}
	.rrt-btn:active:not(:disabled) {
		transform: scale(0.98);
	}
	.rrt-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.rrt-err {
		margin: 0.75rem 0 0;
		font-size: 0.85rem;
		font-weight: 700;
		color: #ef4444;
	}
	.rrt-ok {
		margin: 0.75rem 0 0;
		font-size: 0.85rem;
		font-weight: 700;
		color: #14b8a6;
	}
</style>
