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
		const q = query(col, orderBy('createdAt', 'asc'), limit(200));
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

<style>
	.hht-root {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 16px;
		padding: 16px;
		border: 1px solid var(--glass-border, #e2e8f0);
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.04);
	}

	.hht-title {
		margin: 0;
		font-size: 15px;
		font-weight: 800;
	}

	.hht-sub,
	.hht-hint {
		margin: 4px 0 0;
		font-size: 12px;
		line-height: 1.45;
		color: var(--text-secondary, #64748b);
	}

	.hht-scroll {
		display: flex;
		flex-direction: column;
		gap: 10px;
		max-height: 320px;
		overflow-y: auto;
		padding: 4px 2px;
	}

	.hht-row {
		display: flex;
	}

	.hht-row--mine {
		justify-content: flex-end;
	}

	.hht-bubble {
		max-width: min(100%, 520px);
		padding: 10px 12px;
		border-radius: 14px;
		border: 1px solid rgba(148, 163, 184, 0.25);
		background: rgba(248, 250, 252, 0.08);
	}

	.hht-row--mine .hht-bubble {
		background: rgba(245, 158, 11, 0.12);
		border-color: rgba(245, 158, 11, 0.28);
	}

	.hht-meta {
		display: flex;
		gap: 8px;
		align-items: center;
		margin-bottom: 4px;
	}

	.hht-name {
		font-size: 12px;
		font-weight: 800;
	}

	.hht-role {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		opacity: 0.7;
	}

	.hht-text {
		margin: 0;
		font-size: 14px;
		line-height: 1.45;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.hht-time {
		display: block;
		margin-top: 4px;
		font-size: 10px;
		opacity: 0.65;
	}

	.hht-err {
		margin: 0;
		font-size: 12px;
		color: #b91c1c;
	}

	.hht-footer {
		display: flex;
		gap: 10px;
		align-items: flex-end;
	}

	.hht-input {
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

	.hht-send {
		border: none;
		border-radius: 12px;
		padding: 10px 18px;
		font-size: 13px;
		font-weight: 800;
		cursor: pointer;
		background: var(--brand-primary, #f59e0b);
		color: #0f172a;
	}

	.hht-send:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
