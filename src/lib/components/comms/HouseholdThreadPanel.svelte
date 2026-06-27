<script lang="ts">
	import { browser } from '$app/environment';
	import {
		collection,
		limit,
		onSnapshot,
		orderBy,
		query,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { CommsEngine } from '$lib/services/comms.svelte.js';

	let { householdId = '' }: { householdId?: string } = $props();

	const engine = new CommsEngine();
	const myEmail = $derived((authStore.user?.email || '').toLowerCase());
	const myRole = $derived(authStore.role || 'player');

	let messages = $state<
		Array<{
			id: string;
			fromEmail: string;
			fromRole: string;
			fromName: string;
			body: string;
			createdAt?: { toDate?: () => Date };
		}>
	>([]);
	let loading = $state(false);
	let loadErr = $state('');
	let draft = $state('');
	let scrollEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (!browser || !householdId?.trim()) {
			messages = [];
			return;
		}
		loading = true;
		loadErr = '';
		const col = collection(db, 'households', householdId.trim(), 'thread_messages');
		const q = query(col, orderBy('createdAt', 'asc'), limit(50));
		const unsub = onSnapshot(
			q,
			(snap) => {
				const rows: typeof messages = [];
				snap.forEach((d) => {
					const x = d.data();
					rows.push({
						id: d.id,
						fromEmail: String(x.fromEmail || ''),
						fromRole: String(x.fromRole || ''),
						fromName: String(x.fromName || x.fromEmail || 'Member'),
						body: String(x.body || ''),
						createdAt: x.createdAt,
					});
				});
				messages = rows;
				loading = false;
			},
			(e) => {
				loadErr = e instanceof Error ? e.message : 'Could not load household thread.';
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
		if (!householdId?.trim() || !draft.trim() || engine.isSending) return;
		try {
			await engine.sendHouseholdMessage(draft.trim());
			draft = '';
		} catch {
			/* engine.error shown below */
		}
	}

	function fmtTime(ts?: { toDate?: () => Date }) {
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

<section class="hht-root" aria-labelledby="hht-heading">
	<header class="hht-head">
		<div>
			<h3 id="hht-heading" class="hht-title">Household thread</h3>
			<p class="hht-sub">
				Parent ↔ linked operative only — same household gate per COMMS_HUB. Staff cannot participate.
			</p>
		</div>
	</header>

	{#if !householdId}
		<p class="hht-hint">Link a household to open your family thread.</p>
	{:else}
		<div class="hht-scroll" bind:this={scrollEl} role="log" aria-live="polite">
			{#if loading}
				<p class="hht-hint">Loading thread…</p>
			{:else if loadErr}
				<p class="hht-err" role="alert">{loadErr}</p>
			{:else if messages.length === 0}
				<p class="hht-hint">No household messages yet. Say hello below.</p>
			{:else}
				{#each messages as m (m.id)}
					<div class="hht-row" class:hht-row--mine={m.fromEmail === myEmail}>
						<div class="hht-bubble">
							<div class="hht-meta">
								<span class="hht-name">{m.fromName}</span>
								<span class="hht-role">{m.fromRole}</span>
							</div>
							<p class="hht-text">{m.body}</p>
							<time class="hht-time">{fmtTime(m.createdAt)}</time>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		{#if engine.error}
			<p class="hht-err" role="alert">{engine.error}</p>
		{/if}

		<footer class="hht-footer">
			<textarea
				class="hht-input"
				rows="2"
				maxlength="4000"
				placeholder="Message your household…"
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
				class="hht-send"
				disabled={engine.isSending || !draft.trim()}
				onclick={() => void send()}
			>
				{engine.isSending ? '…' : 'Send'}
			</button>
		</footer>
	{/if}
</section>
