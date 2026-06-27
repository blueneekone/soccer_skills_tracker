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
	const title = $derived(teamName ? `${teamName} · Parent Circle` : 'Parent Circle');

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
		const q = query(col, orderBy('timestamp', 'asc'), limit(50));

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
					loadErr =
						'You do not yet have access to this circle. Link your household or ask your club to verify your parent account.';
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
				Peer parent lounge — monitored per SafeSport policy. Coaches do not post here; use
				Announcements or Message coach for staff reach.
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
			aria-label="Parent Circle messages"
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
				placeholder="Message parent peers…"
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
