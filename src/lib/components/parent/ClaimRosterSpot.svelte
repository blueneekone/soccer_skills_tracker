<script lang="ts">
	import { functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let pendingName = $state('');
	let callsign = $state('');
	let busy = $state(false);
	let err = $state('');
	let ok = $state('');

	const claimRosterSpot = httpsCallable(functions, 'claimRosterSpot');

	$effect(() => {
		const profile = authStore.userProfile as Record<string, unknown> | null;
		const raw =
			typeof profile?.pendingRosterPlayerName === 'string' ?
				profile.pendingRosterPlayerName.trim() :
				'';
		pendingName = raw;
	});

	async function claim() {
		err = '';
		ok = '';
		busy = true;
		try {
			const res = await claimRosterSpot({ operativeCallsign: callsign.trim() });
			const data = res.data as { playerName?: string };
			ok = data.playerName ?
				`${data.playerName} is now on your household roster.` :
				'Roster spot claimed.';
			pendingName = '';
			callsign = '';
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not claim roster spot.';
		} finally {
			busy = false;
		}
	}
</script>

{#if pendingName}
	<section class="crs" aria-labelledby="crs-title">
		<h3 id="crs-title" class="crs__title">Claim roster spot</h3>
		<p class="crs__sub">
			Your club invited you to link <strong>{pendingName}</strong>. Choose an operative callsign for their account.
		</p>
		<label class="crs__label" for="crs-callsign">Operative callsign</label>
		<input
			id="crs-callsign"
			class="crs__input"
			type="text"
			bind:value={callsign}
			placeholder="e.g. striker-07"
			autocomplete="off"
		/>
		{#if err}<p class="crs__err" role="alert">{err}</p>{/if}
		{#if ok}<p class="crs__ok" role="status">{ok}</p>{/if}
		<button type="button" class="crs__btn tw-inline-flex tw-items-center tw-gap-1.5" disabled={busy || !callsign.trim()} onclick={() => void claim()}>
			<Icon name={"user.group" as IconName} size={15} />
			<span>{busy ? 'CLAIMING...' : 'CLAIM ATHLETE'}</span>
		</button>
	</section>
{/if}

<style>
	.crs {
		margin-bottom: 1.25rem;
		padding: 1rem 1.1rem;
		border-radius: 0;
		border: 1px solid rgba(218, 255, 10, 0.35);
		background: rgba(218, 255, 10, 0.05);
	}

	.crs__title {
		margin: 0 0 0.35rem;
		font-size: 0.9375rem;
		font-weight: 800;
		color: #f8fafc;
		font-family: 'Geist Sans', sans-serif;
	}

	.crs__sub {
		margin: 0 0 0.75rem;
		font-size: 0.8125rem;
		line-height: 1.5;
		color: #94a3b8;
	}

	.crs__label {
		display: block;
		margin-bottom: 0.25rem;
		font-size: 0.6875rem;
		font-weight: 700;
		font-family: 'Geist Mono', monospace;
		text-transform: uppercase;
		color: #64748b;
	}

	.crs__input {
		width: 100%;
		box-sizing: border-box;
		margin-bottom: 0.65rem;
		padding: 0.5rem 0.65rem;
		border-radius: 0;
		border: 1px solid #334155;
		background: #0f172a;
		color: #f8fafc;
		font-family: 'Geist Mono', monospace;
		font-size: 0.8125rem;
	}

	.crs__input:focus {
		outline: none;
		border-color: #daff0a;
	}

	.crs__err {
		margin: 0 0 0.5rem;
		font-size: 0.8125rem;
		font-family: 'Geist Mono', monospace;
		color: #f87171;
	}

	.crs__ok {
		margin: 0 0 0.5rem;
		font-size: 0.8125rem;
		font-family: 'Geist Mono', monospace;
		color: #daff0a;
	}

	.crs__btn {
		border: none;
		border-radius: 0;
		padding: 0.55rem 1rem;
		font-size: 0.75rem;
		font-weight: 800;
		font-family: 'Geist Mono', monospace;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background: #daff0a;
		color: #000000;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.crs__btn:hover:not(:disabled) {
		background: #ebff47;
		box-shadow: 0 0 12px rgba(218, 255, 10, 0.4);
	}

	.crs__btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
