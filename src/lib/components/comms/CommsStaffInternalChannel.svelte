<script lang="ts">
	import { browser } from '$app/environment';
	import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { db, functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { CommsEngine } from '$lib/services/comms.svelte.js';

	let {
		clubId = '',
		teamId = '',
		teamName = '',
	}: {
		clubId?: string;
		teamId?: string;
		teamName?: string;
	} = $props();

	const channelId = $derived(teamId ? `staff-internal-${teamId}` : '');
	const myUid = $derived(authStore.user?.uid ?? '');
	const title = $derived(
		teamName ? `${teamName} · Staff internal` : 'Staff internal',
	);

	const engine = new CommsEngine();
	const provisionFn = httpsCallable(functions, 'coachProvisionStaffInternal');

	type StaffMessage = {
		id: string;
		senderId: string;
		senderName: string;
		senderRole: string;
		text: string;
		timestamp?: { toDate?: () => Date };
		deleted?: boolean;
	};

	let messages = $state<StaffMessage[]>([]);
	let loading = $state(false);
	let loadErr = $state('');
	let provisionErr = $state('');
	let draft = $state('');
	let sendErr = $state('');
	let scrollEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		const cId = clubId?.trim();
		const tId = teamId?.trim();
		if (!browser || !cId || !tId) return;

		provisionErr = '';
		void provisionFn({ teamId: tId }).catch((e: unknown) => {
			provisionErr =
				e instanceof Error ? e.message : 'Could not provision staff channel.';
		});
	});

	$effect(() => {
		const cId = clubId?.trim();
		const tId = teamId?.trim();
		const chId = channelId;

		if (!browser || !cId || !tId || !chId) {
			messages = [];
			loading = false;
			return;
		}

		loading = true;
		loadErr = '';

		const col = collection(db, 'clubs', cId, 'channels', chId, 'messages');
		const q = query(col, orderBy('timestamp', 'asc'), limit(50));

		const unsub = onSnapshot(
			q,
			(snap) => {
				const rows: StaffMessage[] = [];
				snap.forEach((d) => {
					const x = d.data();
					rows.push({
						id: d.id,
						senderId: String(x.senderId ?? ''),
						senderName: String(x.senderName ?? 'Staff'),
						senderRole: String(x.senderRole ?? ''),
						text: String(x.text ?? ''),
						timestamp: x.timestamp,
						deleted: x.deleted === true,
					});
				});
				messages = rows;
				loading = false;
			},
			(e) => {
				const msg = e instanceof Error ? e.message : 'Could not load messages.';
				if (msg.includes('permission') || msg.includes('Missing or insufficient')) {
					loadErr = 'Staff-only channel — you do not have access for this team.';
				} else {
					loadErr = msg;
				}
				loading = false;
			},
		);

		return () => unsub();
	});

	$effect(() => {
		void messages;
		queueMicrotask(() => {
			if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
		});
	});

	async function send() {
		const text = draft.trim();
		if (!text || !clubId?.trim() || !channelId || engine.isSending) return;
		sendErr = '';
		try {
			await engine.sendChannelMessage({ clubId: clubId.trim(), channelId, text });
			draft = '';
		} catch (e) {
			sendErr = e instanceof Error ? e.message : 'Failed to send. Please try again.';
		}
	}

	function fmtTime(ts?: { toDate?: () => Date }): string {
		if (!ts || typeof ts.toDate !== 'function') return '';
		try {
			return ts.toDate().toLocaleString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
			});
		} catch {
			return '';
		}
	}
</script>

<section class="staff-internal" aria-labelledby="staff-internal-heading">
	<header class="staff-internal__head">
		<p class="staff-internal__eyebrow">STAFF COORDINATION</p>
		<h2 id="staff-internal-heading" class="staff-internal__title">{title}</h2>
		<p class="staff-internal__note">
			Staff-only thread — not visible to parents or players. All writes are audited.
		</p>
	</header>

	{#if !clubId?.trim() || !teamId?.trim()}
		<p class="staff-internal__hint">Select a team to open the staff channel.</p>
	{:else}
		{#if provisionErr}
			<p class="staff-internal__err" role="alert">{provisionErr}</p>
		{/if}

		<div
			class="staff-internal__scroll"
			bind:this={scrollEl}
			role="log"
			aria-live="polite"
			aria-label="Staff internal messages"
		>
			{#if loading}
				<p class="staff-internal__hint">Loading thread…</p>
			{:else if loadErr}
				<p class="staff-internal__err" role="alert">{loadErr}</p>
			{:else if messages.length === 0}
				<p class="staff-internal__hint">No staff messages yet. Coordinate field ops here.</p>
			{:else}
				{#each messages as m (m.id)}
					{@const isMine = m.senderId === myUid}
					<article class="staff-internal__row" class:staff-internal__row--mine={isMine}>
						<div class="staff-internal__meta">
							<span class="staff-internal__sender">{m.senderName}</span>
							{#if m.senderRole}
								<span class="staff-internal__role">{m.senderRole}</span>
							{/if}
							{#if m.timestamp}
								<time class="staff-internal__time">{fmtTime(m.timestamp)}</time>
							{/if}
						</div>
						{#if m.deleted}
							<p class="staff-internal__deleted">Message removed.</p>
						{:else}
							<p class="staff-internal__text">{m.text}</p>
						{/if}
					</article>
				{/each}
			{/if}
		</div>

		{#if sendErr || engine.error}
			<p class="staff-internal__err" role="alert">{sendErr || engine.error}</p>
		{/if}

		<footer class="staff-internal__footer">
			<label class="staff-internal__label" for="staff-internal-draft">Staff message</label>
			<textarea
				id="staff-internal-draft"
				class="staff-internal__input"
				rows="3"
				maxlength="8000"
				placeholder="Coordinate with staff — parents cannot see this thread…"
				bind:value={draft}
				disabled={engine.isSending}
				onkeydown={(e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						void send();
					}
				}}
			></textarea>
			<button
				type="button"
				class="staff-internal__send"
				disabled={engine.isSending || !draft.trim()}
				onclick={() => void send()}
			>
				{engine.isSending ? 'TRANSMITTING…' : 'TRANSMIT'}
			</button>
		</footer>
	{/if}
</section>

<style>
	.staff-internal {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
		border: 1px solid #334155;
		background: #020202;
	}

	.staff-internal__head {
		padding: 12px 14px;
		border-bottom: 1px solid #334155;
		background: rgba(15, 23, 42, 0.65);
	}

	.staff-internal__eyebrow {
		margin: 0 0 4px;
		font-family: ui-monospace, monospace;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: #22d3ee;
	}

	.staff-internal__title {
		margin: 0 0 4px;
		font-size: 14px;
		font-weight: 800;
		color: #e2e8f0;
	}

	.staff-internal__note {
		margin: 0;
		font-family: ui-monospace, monospace;
		font-size: 11px;
		line-height: 1.45;
		color: #94a3b8;
	}

	.staff-internal__scroll {
		max-height: min(52vh, 28rem);
		overflow-y: auto;
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.staff-internal__row {
		padding: 10px 12px;
		border: 1px solid #1e293b;
		background: rgba(15, 23, 42, 0.45);
	}

	.staff-internal__row--mine {
		border-color: #0e7490;
		background: rgba(8, 51, 68, 0.35);
	}

	.staff-internal__meta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: baseline;
		margin-bottom: 6px;
		font-family: ui-monospace, monospace;
		font-size: 10px;
		color: #64748b;
	}

	.staff-internal__sender {
		color: #cbd5e1;
		font-weight: 700;
	}

	.staff-internal__role {
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.staff-internal__text {
		margin: 0;
		font-family: ui-monospace, monospace;
		font-size: 12px;
		line-height: 1.5;
		color: #e2e8f0;
		white-space: pre-wrap;
	}

	.staff-internal__deleted {
		margin: 0;
		font-style: italic;
		color: #64748b;
		font-size: 12px;
	}

	.staff-internal__hint {
		margin: 0;
		font-size: 12px;
		color: #94a3b8;
	}

	.staff-internal__err {
		margin: 0;
		padding: 0 14px;
		font-size: 12px;
		color: #f87171;
	}

	.staff-internal__footer {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px 14px 14px;
		border-top: 1px solid #334155;
	}

	.staff-internal__label {
		font-family: ui-monospace, monospace;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: #64748b;
	}

	.staff-internal__input {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid #334155;
		background: #0f172a;
		color: #e2e8f0;
		font-family: ui-monospace, monospace;
		font-size: 12px;
		resize: vertical;
	}

	.staff-internal__send {
		align-self: flex-end;
		padding: 10px 16px;
		border: 1px solid #22d3ee;
		background: rgba(34, 211, 238, 0.1);
		color: #22d3ee;
		font-family: ui-monospace, monospace;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.06em;
		cursor: pointer;
	}

	.staff-internal__send:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
