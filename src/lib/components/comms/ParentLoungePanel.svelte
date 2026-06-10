<script lang="ts">
	import { browser } from '$app/environment';
	import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { CommsEngine } from '$lib/services/comms.svelte.js';

	// ── Props ─────────────────────────────────────────────────────────────────

	let {
		clubId,
		teamId,
		teamName = '',
	}: {
		clubId: string;
		teamId: string;
		teamName?: string;
	} = $props();

	// ── Derived ───────────────────────────────────────────────────────────────

	const channelId = $derived(`parent-lounge-${teamId}`);
	const myEmail = $derived((authStore.user?.email ?? '').toLowerCase());
	const myUid = $derived(authStore.user?.uid ?? '');
	const title = $derived(teamName ? `${teamName} · Parent Lounge` : 'Parent Lounge');

	// ── Engine ────────────────────────────────────────────────────────────────

	const engine = new CommsEngine();

	// ── State ─────────────────────────────────────────────────────────────────

	type LoungeMessage = {
		id: string;
		senderId: string;
		senderName: string;
		senderRole: string;
		text: string;
		timestamp?: { toDate?: () => Date };
		deleted?: boolean;
	};

	let messages = $state<LoungeMessage[]>([]);
	let loading = $state(false);
	let loadErr = $state('');
	let draft = $state('');
	let sendErr = $state('');
	let scrollEl = $state<HTMLDivElement | null>(null);

	// ── Listener ──────────────────────────────────────────────────────────────

	$effect(() => {
		const cId = clubId?.trim();
		const tId = teamId?.trim();

		if (!browser || !cId || !tId) {
			messages = [];
			loading = false;
			return;
		}

		loading = true;
		loadErr = '';

		const col = collection(db, 'clubs', cId, 'channels', channelId, 'messages');
		const q = query(col, orderBy('timestamp', 'asc'), limit(200));

		const unsub = onSnapshot(
			q,
			(snap) => {
				const rows: LoungeMessage[] = [];
				snap.forEach((d) => {
					const x = d.data();
					rows.push({
						id: d.id,
						senderId: String(x.senderId ?? ''),
						senderName: String(x.senderName ?? x.fromEmail ?? 'Member'),
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
				// Treat permission-denied gracefully — parent may not yet be in memberIds
				if (msg.includes('permission') || msg.includes('Missing or insufficient')) {
					loadErr = 'You do not yet have access to this lounge. Ask your coach to add you.';
				} else {
					loadErr = msg;
				}
				loading = false;
			},
		);

		return () => unsub();
	});

	// Auto-scroll to bottom when messages update
	$effect(() => {
		void messages;
		queueMicrotask(() => {
			if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
		});
	});

	// ── Send ──────────────────────────────────────────────────────────────────

	async function send() {
		const text = draft.trim();
		if (!text || !clubId?.trim() || !teamId?.trim() || engine.isSending) return;
		sendErr = '';
		try {
			await engine.sendChannelMessage({ clubId: clubId.trim(), channelId, text });
			draft = '';
		} catch (e) {
			sendErr = e instanceof Error ? e.message : 'Failed to send. Please try again.';
		}
	}

	// ── Helpers ───────────────────────────────────────────────────────────────

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

	function initialsFor(name: string): string {
		const t = (name ?? '?').trim();
		if (!t) return '?';
		const parts = t.split(/\s+/).filter(Boolean);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
		}
		return t.slice(0, 2).toUpperCase();
	}
</script>

<section class="plp-root" aria-labelledby="plp-heading">
	<header class="plp-head">
		<div>
			<h3 id="plp-heading" class="plp-title">
				<span class="plp-icon" aria-hidden="true">💬</span>{title}
			</h3>
			<p class="plp-sub">
				Group conversation monitored per SafeSport policy. Coaches and parents only.
			</p>
		</div>
	</header>

	{#if !clubId?.trim() || !teamId?.trim()}
		<p class="plp-hint">Team information is unavailable.</p>
	{:else}
		<div
			class="plp-scroll"
			bind:this={scrollEl}
			role="log"
			aria-live="polite"
			aria-label="Parent Lounge messages"
		>
			{#if loading}
				<p class="plp-hint">Loading messages…</p>
			{:else if loadErr}
				<p class="plp-err" role="alert">{loadErr}</p>
			{:else if messages.length === 0}
				<p class="plp-hint">No messages yet. Be the first to say hello.</p>
			{:else}
				{#each messages as m (m.id)}
					{@const isMine = m.senderId === myUid}
					<div class="plp-row" class:plp-row--mine={isMine}>
						{#if !isMine}
							<div class="plp-avatar plp-avatar--other" aria-hidden="true" title={m.senderName}>
								<span class="plp-avatar-inner">{initialsFor(m.senderName)}</span>
							</div>
						{/if}
						<div class="plp-content" class:plp-content--mine={isMine}>
							{#if m.deleted}
								<div class="plp-bubble plp-bubble--deleted">This message was removed.</div>
							{:else}
								<div class="plp-bubble" class:plp-bubble--mine={isMine}>
									<div class="plp-bubble-top">
										<span class="plp-name">{m.senderName}</span>
										{#if m.senderRole}
											<span class="plp-role">{m.senderRole}</span>
										{/if}
									</div>
									<p class="plp-text">{m.text}</p>
									{#if m.timestamp}
										<time class="plp-time">{fmtTime(m.timestamp)}</time>
									{/if}
								</div>
							{/if}
						</div>
						{#if isMine}
							<div class="plp-avatar plp-avatar--self" aria-hidden="true" title={m.senderName}>
								<span class="plp-avatar-inner">{initialsFor(m.senderName)}</span>
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>

		{#if sendErr || engine.error}
			<p class="plp-err" role="alert">{sendErr || engine.error}</p>
		{/if}

		<footer class="plp-footer">
			<textarea
				class="plp-input"
				rows="2"
				maxlength="8000"
				placeholder="Message the parent lounge…"
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
				class="plp-send"
				disabled={engine.isSending || !draft.trim()}
				onclick={() => void send()}
			>
				{engine.isSending ? '…' : 'Send'}
			</button>
		</footer>
	{/if}
</section>

<style>
	.plp-root {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px;
		border-radius: 16px;
		border: 1px solid var(--glass-border, #e2e8f0);
		background: rgba(255, 255, 255, 0.04);
	}

	:global(html.dark) .plp-root {
		background: rgba(15, 23, 42, 0.35);
		border-color: rgba(51, 65, 85, 0.6);
	}

	.plp-head {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.plp-title {
		margin: 0;
		font-size: 15px;
		font-weight: 800;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.plp-icon {
		font-size: 16px;
		line-height: 1;
	}

	.plp-sub {
		margin: 4px 0 0;
		font-size: 12px;
		line-height: 1.45;
		color: var(--text-secondary, #64748b);
	}

	.plp-hint {
		margin: 0;
		font-size: 13px;
		opacity: 0.7;
		padding: 4px 2px;
	}

	.plp-err {
		margin: 0;
		font-size: 12px;
		color: #b91c1c;
	}

	.plp-scroll {
		display: flex;
		flex-direction: column;
		gap: 10px;
		max-height: 360px;
		overflow-y: auto;
		padding: 4px 2px;
		scroll-behavior: smooth;
	}

	.plp-row {
		display: flex;
		align-items: flex-end;
		gap: 8px;
	}

	.plp-row--mine {
		justify-content: flex-end;
	}

	.plp-avatar {
		width: 34px;
		height: 34px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.plp-avatar-inner {
		font-size: 11px;
		font-weight: 800;
		line-height: 1;
	}

	.plp-avatar--other {
		background: rgba(100, 116, 139, 0.15);
		color: var(--text-primary, #0f172a);
		border: 1px solid rgba(100, 116, 139, 0.25);
	}

	:global(html.dark) .plp-avatar--other {
		background: rgba(100, 116, 139, 0.2);
		color: #e2e8f0;
	}

	.plp-avatar--self {
		background: rgba(148, 163, 184, 0.15);
		color: var(--text-primary, #0f172a);
		border: 1px solid rgba(148, 163, 184, 0.3);
	}

	:global(html.dark) .plp-avatar--self {
		background: rgba(148, 163, 184, 0.18);
		color: #e2e8f0;
	}

	.plp-content {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		min-width: 0;
	}

	.plp-content--mine {
		align-items: flex-end;
	}

	.plp-bubble {
		max-width: min(100%, 480px);
		padding: 10px 12px;
		border-radius: 14px 14px 14px 4px;
		border: 1px solid rgba(148, 163, 184, 0.25);
		background: rgba(248, 250, 252, 0.08);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	:global(html.dark) .plp-bubble {
		background: rgba(15, 23, 42, 0.5);
		border-color: rgba(51, 65, 85, 0.5);
	}

	.plp-bubble--mine {
		border-radius: 14px 14px 4px 14px;
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.28);
	}

	:global(html.dark) .plp-bubble--mine {
		background: rgba(245, 158, 11, 0.12);
		border-color: rgba(245, 158, 11, 0.32);
	}

	.plp-bubble--deleted {
		font-size: 12px;
		font-style: italic;
		color: #94a3b8;
	}

	.plp-bubble-top {
		display: flex;
		align-items: center;
		gap: 7px;
		flex-wrap: wrap;
	}

	.plp-name {
		font-size: 12px;
		font-weight: 800;
	}

	.plp-role {
		font-size: 9px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
		background: rgba(148, 163, 184, 0.12);
		border: 1px solid rgba(148, 163, 184, 0.2);
		border-radius: 6px;
		padding: 2px 5px;
		line-height: 1.2;
	}

	:global(html.dark) .plp-role {
		color: #94a3b8;
		background: rgba(148, 163, 184, 0.08);
	}

	.plp-text {
		margin: 0;
		font-size: 14px;
		line-height: 1.45;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.plp-time {
		display: block;
		margin-top: 2px;
		font-size: 10px;
		opacity: 0.6;
	}

	.plp-footer {
		display: flex;
		gap: 10px;
		align-items: flex-end;
		padding-top: 4px;
	}

	.plp-input {
		flex: 1;
		border: 1px solid rgba(148, 163, 184, 0.35);
		border-radius: 12px;
		padding: 10px 12px;
		font: inherit;
		font-size: 13px;
		resize: vertical;
		min-height: 44px;
		background: transparent;
		color: inherit;
	}

	:global(html.dark) .plp-input {
		border-color: rgba(51, 65, 85, 0.7);
	}

	.plp-input:disabled {
		opacity: 0.5;
	}

	.plp-send {
		border: none;
		border-radius: 12px;
		padding: 10px 18px;
		font-size: 13px;
		font-weight: 800;
		cursor: pointer;
		background: var(--brand-primary, #f59e0b);
		color: #0f172a;
		flex-shrink: 0;
	}

	.plp-send:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
