<script lang="ts">
	import { browser } from '$app/environment';
	import {
		addDoc,
		collection,
		limit,
		onSnapshot,
		orderBy,
		query,
		serverTimestamp,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { canPersonaPostChannel } from '$lib/comms/channelTypes.js';
	import { DEFAULT_TEAM_CHANNELS } from '$lib/coach/comms/messagesTabChannels.js';
	import CommsThreadShell from '$lib/components/comms/CommsThreadShell.svelte';

	let {
		teamId = '',
		channelId = 'game-day',
	}: {
		teamId?: string;
		channelId?: string;
	} = $props();

	const myUid = $derived(authStore.user?.uid ?? '');
	const myName = $derived(
		authStore.userProfile?.playerName ||
			authStore.user?.displayName ||
			authStore.user?.email?.split('@')[0] ||
			'Staff',
	);
	const myRole = $derived(authStore.role || 'player');
	const canCompose = $derived(canPersonaPostChannel('team_logistics', myRole));

	const channelLabel = $derived(
		DEFAULT_TEAM_CHANNELS.find((c) => c.id === channelId)?.label ?? 'Team logistics',
	);
	const title = $derived(`${channelLabel} logistics`);
	const subtitle =
		'Monitored team channel — parents read schedule context here; minors use HQ and calendar.';

	type LogisticsMessage = {
		id: string;
		senderId: string;
		senderName: string;
		senderRole: string;
		text: string;
		timestamp?: { toDate?: () => Date };
		deleted?: boolean;
	};

	let messages = $state<LogisticsMessage[]>([]);
	let loading = $state(false);
	let loadErr = $state('');
	let draft = $state('');
	let sending = $state(false);
	let scrollEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		const tId = teamId?.trim();
		const ch = channelId?.trim();
		if (!browser || !tId || !ch) {
			messages = [];
			loading = false;
			return;
		}

		loading = true;
		loadErr = '';
		const col = collection(db, 'teams', tId, 'channels', ch, 'messages');
		const q = query(col, orderBy('timestamp', 'desc'), limit(100));
		const unsub = onSnapshot(
			q,
			(snap) => {
				const rows: LogisticsMessage[] = [];
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
				messages = rows.reverse();
				loading = false;
			},
			(e) => {
				loadErr = e instanceof Error ? e.message : 'Could not load messages.';
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
		const tId = teamId?.trim();
		const ch = channelId?.trim();
		const text = draft.trim();
		if (!tId || !ch || !text || sending || !canCompose) return;
		sending = true;
		try {
			await addDoc(collection(db, 'teams', tId, 'channels', ch, 'messages'), {
				senderId: myUid,
				senderName: myName,
				senderRole: myRole,
				text: text.slice(0, 8000),
				timestamp: serverTimestamp(),
				deleted: false,
			});
			draft = '';
		} catch (e) {
			loadErr = e instanceof Error ? e.message : 'Send failed.';
		} finally {
			sending = false;
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

{#if !teamId?.trim()}
	<p class="plp-hint">Select a team to view logistics threads.</p>
{:else}
	<CommsThreadShell
		{title}
		{subtitle}
		headingId="comms-logistics-thread-heading"
		logLabel="{channelLabel} logistics messages"
		bind:scrollEl
	>
		{#snippet body()}
			{#if loading}
				<p class="plp-hint">Loading messages…</p>
			{:else if loadErr}
				<p class="plp-err" role="alert">{loadErr}</p>
			{:else if messages.length === 0}
				<p class="plp-hint">No messages yet. Staff can post logistics updates here.</p>
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
		{/snippet}
		{#snippet footer()}
			{#if canCompose}
				<footer class="plp-footer">
					<textarea
						class="plp-input"
						rows="2"
						maxlength="8000"
						placeholder="Post a logistics update…"
						bind:value={draft}
						disabled={sending}
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
						disabled={sending || !draft.trim()}
						onclick={() => void send()}
					>
						{sending ? '…' : 'Send'}
					</button>
				</footer>
			{:else}
				<p class="plp-hint">Read-only — contact your coach for schedule changes.</p>
			{/if}
		{/snippet}
	</CommsThreadShell>
{/if}
