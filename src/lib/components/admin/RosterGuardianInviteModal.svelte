<script lang="ts">
	import { functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { authStore } from '$lib/stores/auth.svelte.js';

	let {
		playerName = '',
		teamId = '',
		clubId = '',
		onclose,
	}: {
		playerName?: string;
		teamId?: string;
		clubId?: string;
		onclose?: () => void;
	} = $props();

	let guardianEmail = $state('');
	let busy = $state(false);
	let err = $state('');
	let ok = $state('');

	const mintMagicUplink = httpsCallable(functions, 'mintMagicUplink');

	async function sendInvite() {
		err = '';
		ok = '';
		const email = guardianEmail.trim().toLowerCase();
		if (!email.includes('@')) {
			err = 'Enter a valid guardian email.';
			return;
		}
		if (!teamId || !clubId || !playerName.trim()) {
			err = 'Missing team or player context.';
			return;
		}
		busy = true;
		try {
			await mintMagicUplink({
				targetEmail: email,
				purpose: 'parent',
				role: 'parent',
				clubId,
				tenantId: clubId,
				teamId,
				pendingRosterPlayerName: playerName.trim(),
				expiryHours: 168,
			});
			ok = `Guardian invite sent to ${email}. They will claim "${playerName}" after sign-in.`;
			guardianEmail = '';
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not send invite.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="rg-modal" role="dialog" aria-modal="true" aria-labelledby="rg-title">
	<div class="rg-backdrop" role="presentation" onclick={() => onclose?.()}></div>
	<div class="rg-panel">
		<h3 id="rg-title" class="rg-title">Invite guardian</h3>
		<p class="rg-sub">
			Send a magic link to link <strong>{playerName}</strong> (name-only roster row) to a parent account.
		</p>

		<label class="rg-label" for="rg-email">Guardian email</label>
		<input
			id="rg-email"
			class="rg-input"
			type="email"
			bind:value={guardianEmail}
			placeholder="parent@example.com"
			autocomplete="email"
		/>

		{#if err}<p class="rg-err" role="alert">{err}</p>{/if}
		{#if ok}<p class="rg-ok" role="status">{ok}</p>{/if}

		<div class="rg-actions">
			<button type="button" class="rg-btn rg-btn--ghost" onclick={() => onclose?.()}>Cancel</button>
			<button type="button" class="rg-btn" disabled={busy} onclick={() => void sendInvite()}>
				{busy ? 'Sending…' : 'Send invite'}
			</button>
		</div>
	</div>
</div>

<style>
	.rg-modal {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.rg-backdrop {
		position: absolute;
		inset: 0;
		background: rgb(0 0 0 / 0.65);
	}

	.rg-panel {
		position: relative;
		width: 100%;
		max-width: 420px;
		padding: 1.25rem;
		border-radius: 12px;
		border: 1px solid #334155;
		background: #0f172a;
	}

	.rg-title {
		margin: 0 0 0.35rem;
		font-size: 1rem;
		font-weight: 800;
		color: #f8fafc;
	}

	.rg-sub {
		margin: 0 0 1rem;
		font-size: 0.8125rem;
		line-height: 1.5;
		color: #94a3b8;
	}

	.rg-label {
		display: block;
		margin-bottom: 0.35rem;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #64748b;
	}

	.rg-input {
		width: 100%;
		box-sizing: border-box;
		margin-bottom: 0.75rem;
		padding: 0.55rem 0.65rem;
		border-radius: 8px;
		border: 1px solid #334155;
		background: #1e293b;
		color: #f8fafc;
		font: inherit;
	}

	.rg-err {
		margin: 0 0 0.5rem;
		font-size: 0.8125rem;
		color: #f87171;
	}

	.rg-ok {
		margin: 0 0 0.5rem;
		font-size: 0.8125rem;
		color: #14b8a6;
	}

	.rg-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.rg-btn {
		border: none;
		border-radius: 8px;
		padding: 0.45rem 0.85rem;
		font-size: 0.8125rem;
		font-weight: 700;
		background: #14b8a6;
		color: #0f172a;
		cursor: pointer;
	}

	.rg-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.rg-btn--ghost {
		background: transparent;
		border: 1px solid #334155;
		color: #e2e8f0;
	}
</style>
