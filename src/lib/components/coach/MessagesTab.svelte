<script>
	import { httpsCallable } from 'firebase/functions';
	import { functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	let { teamId = '', players = [] } = $props();

	let selectedPlayer = $state('');
	let body = $state('');
	let busy = $state(false);

	const sendMsg = httpsCallable(functions, 'sendCoachPlayerMessage');

	const canSend = $derived(
		authStore.role === 'coach' ||
			authStore.role === 'director' ||
			authStore.role === 'super_admin'
	);

	async function onSend() {
		if (!teamId || !selectedPlayer || !body.trim()) {
			alert('Choose an athlete and enter a message.');
			return;
		}
		busy = true;
		try {
			const res = await sendMsg({
				teamId,
				playerName: selectedPlayer,
				body: body.trim()
			});
			const d = /** @type {{ warnNoCc?: boolean; minorRecipient?: boolean; ccCount?: number }} */ (
				res.data || {}
			);
			let msg = 'Message sent.';
			if (d.warnNoCc) {
				msg +=
					'\n\nThis athlete is under 13, but no guardians are linked for CC. ' +
					'Ask your director to connect a household (Households & COPPA).';
			} else if (d.minorRecipient && (d.ccCount ?? 0) > 0) {
				msg += ` Linked guardians can view this thread in their inbox (${d.ccCount}).`;
			}
			alert(msg);
			body = '';
		} catch (e) {
			alert(e instanceof Error ? e.message : String(e));
		} finally {
			busy = false;
		}
	}
</script>

<div class="messages-tab">
	<div class="bento-section">
		<div class="card">
			<div class="card-header bg-blue-header">Athlete messages (SafeSport)</div>
			<div class="card-body">
				{#if !canSend}
					<p class="muted">Your role cannot send staff messages.</p>
				{:else if !teamId}
					<p class="muted">Select a team first.</p>
				{:else}
					<p class="safesport-lead">
						<strong>One-to-one staff messaging is mirrored for minors.</strong> When the athlete is under 13
						and has a linked household, guardian emails are copied on read access in the app (not email
						delivery). A separate audit record is stored for compliance.
					</p>
					<p class="muted small">
						The athlete must have a roster email link (invite) and completed setup before messaging works.
					</p>

					<label class="field-label" for="msg-player">Athlete (roster name)</label>
					<select id="msg-player" class="msg-select" bind:value={selectedPlayer}>
						<option value="">— Select —</option>
						{#each players as p}
							<option value={p}>{p}</option>
						{/each}
					</select>

					<label class="field-label" for="msg-body">Message</label>
					<textarea
						id="msg-body"
						class="msg-body"
						rows="6"
						maxlength="4000"
						placeholder="Practice update, encouragement, logistics…"
						bind:value={body}
					></textarea>
					<p class="char-hint">{body.length} / 4000</p>

					<button type="button" class="primary-btn btn-green w-100" disabled={busy} onclick={onSend}>
						{busy ? 'Sending…' : 'Send message'}
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.messages-tab {
		display: flex;
		flex-direction: column;
		gap: clamp(16px, 3vw, 24px);
	}

	.safesport-lead {
		margin: 0 0 clamp(10px, 2vw, 14px) 0;
		line-height: 1.5;
		font-size: 0.92rem;
	}

	.muted {
		margin: 0;
		opacity: 0.88;
		line-height: 1.45;
	}

	.muted.small {
		font-size: 0.85rem;
		margin-bottom: clamp(12px, 2vw, 16px);
	}

	.field-label {
		display: block;
		font-weight: 800;
		font-size: 0.88rem;
		margin-top: clamp(10px, 2vw, 14px);
		margin-bottom: clamp(4px, 1vw, 6px);
	}

	.msg-select,
	.msg-body {
		width: 100%;
		box-sizing: border-box;
		padding: clamp(10px, 2vw, 14px);
		border-radius: 16px;
		border: 1px solid var(--glass-border);
		font: inherit;
		background: var(--glass-bg);
		color: inherit;
	}

	.msg-body {
		resize: vertical;
		min-height: 120px;
		line-height: 1.45;
	}

	.char-hint {
		margin: 6px 0 12px 0;
		font-size: 0.8rem;
		opacity: 0.75;
		text-align: right;
	}
</style>
