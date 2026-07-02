<script>
	import { db } from '$lib/firebase.js';
	import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

	let { clubId = '' } = $props();

	let email = $state('');
	let displayName = $state('');
	let msg = $state('');
	let err = $state('');
	let busy = $state(false);

	async function inviteRegistrar() {
		err = '';
		msg = '';
		const e = email.trim().toLowerCase();
		const n = displayName.trim();
		if (!clubId || !e || !n) {
			err = 'Club scope, work email, and display name are required.';
			return;
		}
		busy = true;
		try {
			await setDoc(doc(db, 'registrar_lookup', e), {
				clubId,
				playerName: n
			});
			msg =
				'Registrar invite saved. They sign in with that email; the app provisions their account on first login.';
			email = '';
			displayName = '';
		} catch (e2) {
			err = e2 instanceof Error ? e2.message : 'Could not save invite.';
		} finally {
			busy = false;
		}
	}

	async function revokeInvite() {
		err = '';
		msg = '';
		const e = email.trim().toLowerCase();
		if (!e) {
			err = 'Enter the registrar email to revoke.';
			return;
		}
		if (!confirm(`Remove registrar invite for ${e}?`)) return;
		busy = true;
		try {
			const ref = doc(db, 'registrar_lookup', e);
			const snap = await getDoc(ref);
			if (!snap.exists()) {
				err = 'No invite found for that email.';
				return;
			}
			if (snap.data().clubId !== clubId) {
				err = 'That invite belongs to another club.';
				return;
			}
			await deleteDoc(ref);
			msg = 'Invite removed.';
			email = '';
		} catch (e2) {
			err = e2 instanceof Error ? e2.message : 'Could not revoke.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="card">
	<div class="card-header">Club registrars</div>
	<div class="card-body registrar-invite-body">
		{#if !clubId}
			<div class="auth-error-msg" role="alert">
				Your account has no club scope. Directors can invite registrars here; super admins should set
				<code>clubId</code> on their user profile or use a director account for this club.
			</div>
		{/if}
		<p class="text-sm-sub">
			Registrars can manage rosters, player invites, and club-scoped transfers between teams (including
			cross-club moves when destination staff run the transfer). They cannot change COPPA or household
			data.
		</p>

		<label class="field-label" for="reg-email">Work email (sign-in address)</label>
		<input id="reg-email" class="field-input" type="email" bind:value={email} autocomplete="off" />

		<label class="field-label" for="reg-name">Display name</label>
		<input id="reg-name" class="field-input" type="text" bind:value={displayName} autocomplete="name" />

		{#if err}
			<div class="auth-error-msg" role="alert">{err}</div>
		{/if}
		{#if msg}
			<p class="ok-msg" role="status">{msg}</p>
		{/if}

		<div class="btn-row">
			<button class="btn-primary" type="button" onclick={inviteRegistrar} disabled={busy}>
				{busy ? 'Saving…' : 'Save registrar invite'}
			</button>
			<button class="secondary-btn" type="button" onclick={revokeInvite} disabled={busy}>
				Revoke invite
			</button>
		</div>
	</div>
</div>

<style>
	.registrar-invite-body {
		display: flex;
		flex-direction: column;
		gap: clamp(10px, 2vw, 14px);
	}

	.field-label {
		font-weight: 800;
		font-size: 0.9rem;
	}

	.field-input {
		width: 100%;
		box-sizing: border-box;
		padding: clamp(10px, 2vw, 12px);
		border-radius: 16px;
		border: 1px solid var(--glass-border);
		font: inherit;
	}

	.btn-row {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 8px;
	}

	.ok-msg {
		margin: 0;
		color: var(--success-green);
		font-weight: 700;
		font-size: 0.9rem;
	}
</style>
