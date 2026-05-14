<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import {
		collection,
		query,
		orderBy,
		limit,
		onSnapshot,
		addDoc,
		updateDoc,
		doc,
		serverTimestamp,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { teamId = '', players: _players = [], clubId: _clubId = '' } = $props();

	/** @type {Array<{ id: string; label: string; description: string; icon: IconName }>} */
	const DEFAULT_CHANNELS = [
		{ id: 'game-day', label: 'Game Day', description: 'Matchday logistics & squad notes', icon: /** @type {IconName} */ ('game.trophy') },
		{
			id: 'practice-sessions',
			label: 'Practice',
			description: 'Session plans, drills, and attendance',
			icon: /** @type {IconName} */ ('game.dumbbell'),
		},
		{
			id: 'general',
			label: 'General',
			description: 'Everyday team conversation',
			icon: /** @type {IconName} */ ('comm.chats'),
		},
	];

	/** Default landing channel; path: teams/{teamId}/channels/{activeChannel}/messages */
	let activeChannel = $state(/** @type {string} */ ('game-day'));

	const myEmail = $derived((authStore.user?.email || '').toLowerCase());
	const myUid = $derived(authStore.user?.uid || '');
	const myName = $derived(
		authStore.userProfile?.playerName ||
			authStore.user?.displayName ||
			authStore.user?.email?.split('@')[0] ||
			'Member',
	);
	const myRole = $derived(authStore.role || 'player');

	const canModerate = $derived(
		authStore.role === 'coach' ||
			authStore.role === 'director' ||
			authStore.role === 'super_admin' ||
			authStore.role === 'global_admin',
	);

	/** @type {Array<{ id: string; senderId: string; senderName: string; senderRole: string; text: string; timestamp?: import('firebase/firestore').Timestamp; deleted?: boolean }>} */
	let messages = $state([]);
	let messagesLoading = $state(false);
	let messagesErr = $state('');

	let draft = $state('');
	let sending = $state(false);
	/** @type {HTMLDivElement | null} */
	let scrollEl = $state(null);

	const activeChannelDef = $derived(
		DEFAULT_CHANNELS.find((c) => c.id === activeChannel) ?? DEFAULT_CHANNELS[0],
	);

	/**
	 * @param {string} id
	 */
	function isAllowedChannelId(id) {
		return DEFAULT_CHANNELS.some((c) => c.id === id);
	}

	$effect(() => {
		if (!browser || !teamId) {
			messages = [];
			return;
		}
		if (!isAllowedChannelId(activeChannel)) {
			return;
		}
		messagesLoading = true;
		messagesErr = '';
		const colPath = collection(db, 'teams', teamId, 'channels', activeChannel, 'messages');
		const mq = query(colPath, orderBy('timestamp', 'desc'), limit(100));
		const unsub = onSnapshot(
			mq,
			(snap) => {
				const rows = [];
				snap.forEach((d) => {
					const x = d.data();
					rows.push({
						id: d.id,
						senderId: String(x.senderId || ''),
						senderName: String(x.senderName || ''),
						senderRole: String(x.senderRole || ''),
						text: String(x.text || ''),
						timestamp: x.timestamp,
						deleted: x.deleted === true,
					});
				});
				messages = rows.reverse();
				messagesLoading = false;
			},
			(e) => {
				console.error('[MessagesTab] messages', e);
				messagesErr = e instanceof Error ? e.message : 'Could not load messages.';
				messagesLoading = false;
			},
		);
		return () => unsub();
	});

	$effect(() => {
		void messages;
		void activeChannel;
		queueMicrotask(() => {
			if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
		});
	});

	async function sendMessage() {
		if (!teamId || !draft.trim() || !isAllowedChannelId(activeChannel) || sending) return;
		sending = true;
		const text = draft.trim().slice(0, 8000);
		try {
			await addDoc(collection(db, 'teams', teamId, 'channels', activeChannel, 'messages'), {
				senderId: myUid,
				senderName: myName,
				senderRole: myRole,
				text,
				timestamp: serverTimestamp(),
				deleted: false,
			});
			draft = '';
		} catch (e) {
			alert(e instanceof Error ? e.message : String(e));
		} finally {
			sending = false;
		}
	}

	/**
	 * @param {string} messageId
	 */
	async function softDeleteMessage(messageId) {
		if (!teamId || !isAllowedChannelId(activeChannel) || !canModerate) return;
		if (!confirm('Remove this message for everyone?')) return;
		try {
			await updateDoc(
				doc(db, 'teams', teamId, 'channels', activeChannel, 'messages', messageId),
				{ deleted: true },
			);
		} catch (e) {
			alert(e instanceof Error ? e.message : String(e));
		}
	}

	function openSchedule() {
		goto('/coach/drills');
	}

	/**
	 * @param {import('firebase/firestore').Timestamp | undefined} ts
	 */
	function fmtTime(ts) {
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

	/**
	 * @param {import('firebase/firestore').Timestamp | undefined} ts
	 */
	function fmtIso(ts) {
		if (!ts || typeof ts.toDate !== 'function') return '';
		try {
			return ts.toDate().toISOString();
		} catch {
			return '';
		}
	}

	/**
	 * @param {import('firebase/firestore').Timestamp | undefined} ts
	 */
	function dayLabel(ts) {
		if (!ts || typeof ts.toDate !== 'function') return '';
		try {
			const d = ts.toDate();
			const today = new Date();
			const yesterday = new Date(today);
			yesterday.setDate(yesterday.getDate() - 1);
			if (d.toDateString() === today.toDateString()) return 'Today';
			if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
			return d.toLocaleDateString(undefined, {
				weekday: 'long',
				month: 'short',
				day: 'numeric',
				year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
			});
		} catch {
			return '';
		}
	}

	/**
	 * @param {import('firebase/firestore').Timestamp | undefined} a
	 * @param {import('firebase/firestore').Timestamp | undefined} b
	 */
	function sameCalendarDay(a, b) {
		if (!a || !b || typeof a.toDate !== 'function' || typeof b.toDate !== 'function') {
			return false;
		}
		try {
			return a.toDate().toDateString() === b.toDate().toDateString();
		} catch {
			return false;
		}
	}

	/**
	 * @param {string} name
	 */
	function initialsFor(name) {
		const t = (name || '?').trim();
		if (!t) return '?';
		const parts = t.split(/\s+/).filter(Boolean);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
		}
		return t.slice(0, 2).toUpperCase();
	}
</script>

<div class="matrix" aria-label="Team channel messaging">
	{#if !teamId}
		<p class="matrix__hint">Select a team to open channels.</p>
	{:else}
		<!-- Mobile: top channel scroller -->
		<div class="matrix__strip md:hidden" role="tablist" aria-label="Channels">
			{#each DEFAULT_CHANNELS as ch (ch.id)}
				<button
					type="button"
					class="matrix__chip"
					role="tab"
					aria-selected={activeChannel === ch.id}
					class:matrix__chip--on={activeChannel === ch.id}
					onclick={() => (activeChannel = ch.id)}
				>
					<Icon name={ch.icon} />
					<span>{ch.label}</span>
				</button>
			{/each}
		</div>

		<div class="matrix__shell">
			<!-- Desktop: left channel rail -->
			<aside class="matrix__rail" aria-label="Channel list">
				<div class="matrix__rail-head">
					<span class="matrix__rail-title">Channels</span>
					<span class="matrix__rail-hint">Team matrix</span>
				</div>
				<nav class="matrix__nav">
					{#each DEFAULT_CHANNELS as ch (ch.id)}
						<button
							type="button"
							class="matrix__ch"
							class:matrix__ch--active={activeChannel === ch.id}
							onclick={() => (activeChannel = ch.id)}
						>
							<span class="matrix__ch-hash" aria-hidden="true">#</span>
							<div class="matrix__ch-text">
								<span class="matrix__ch-label">{ch.label}</span>
								<span class="matrix__ch-sub">{ch.description}</span>
							</div>
						</button>
					{/each}
				</nav>
			</aside>

			<section class="matrix__main" aria-label="Channel conversation">
				<header class="matrix__head">
					<div class="matrix__head-titles">
						<h2 class="matrix__h2">
							<span class="matrix__h2-hash">#</span>{activeChannelDef.label}
						</h2>
						<p class="matrix__h2-sub">{activeChannelDef.description}</p>
					</div>
					<div class="matrix__head-aside" aria-hidden="true">
						<span class="matrix__id-badge">{activeChannel}</span>
					</div>
				</header>

				<div
					class="matrix__scroll"
					role="log"
					aria-live="polite"
					bind:this={scrollEl}
				>
					{#if messagesLoading}
						<p class="matrix__hint">Loading messages…</p>
					{:else if messagesErr}
						<p class="matrix__err" role="alert">{messagesErr}</p>
					{:else if messages.length === 0}
						<p class="matrix__empty">No messages in this channel yet. Say hello below.</p>
					{:else}
						{#each messages as m, i (m.id)}
							{#if i === 0 || !sameCalendarDay(m.timestamp, messages[i - 1]?.timestamp)}
								<div class="matrix__day" role="separator">
									<span class="matrix__day-line" aria-hidden="true"></span>
									<time
										class="matrix__day-label"
										datetime={m.timestamp && typeof m.timestamp.toDate === 'function'
											? m.timestamp.toDate().toISOString().slice(0, 10)
											: ''}
										>{dayLabel(m.timestamp)}</time
									>
									<span class="matrix__day-line" aria-hidden="true"></span>
								</div>
							{/if}
							<div
								class="matrix__row"
								class:matrix__row--mine={m.senderId === myUid}
							>
								{#if m.senderId !== myUid}
									<div
										class="matrix__avatar matrix__avatar--other"
										class:matrix__avatar--staff={m.senderRole === 'coach' || m.senderRole === 'director' || m.senderRole === 'super_admin' || m.senderRole === 'global_admin'}
										aria-hidden="true"
										title={m.senderName}
									>
										<span class="matrix__avatar-inner">{initialsFor(m.senderName)}</span>
									</div>
								{/if}
								<div class="matrix__content">
									{#if m.deleted}
										<div class="matrix__bubble matrix__bubble--deleted">
											This message was removed.
										</div>
									{:else}
										<div
											class="matrix__bubble"
											class:matrix__bubble--mine={m.senderId === myUid}
										>
											<div class="matrix__bubble-top">
												<span class="matrix__name">{m.senderName}</span>
												<span class="matrix__role-pill">{m.senderRole}</span>
											</div>
											<p class="matrix__text">{m.text}</p>
											<time
												class="matrix__time"
												datetime={fmtIso(m.timestamp)}>{fmtTime(m.timestamp)}</time
											>
										</div>
										{#if canModerate && !m.deleted}
											<button
												type="button"
												class="matrix__mod"
												onclick={() => void softDeleteMessage(m.id)}
											>
												Remove
											</button>
										{/if}
									{/if}
								</div>
								{#if m.senderId === myUid}
									<div
										class="matrix__avatar matrix__avatar--self"
										class:matrix__avatar--staff={m.senderRole === 'coach' || m.senderRole === 'director' || m.senderRole === 'super_admin' || m.senderRole === 'global_admin'}
										aria-hidden="true"
										title={m.senderName}
									>
										<span class="matrix__avatar-inner">{initialsFor(m.senderName)}</span>
									</div>
								{/if}
							</div>
						{/each}
					{/if}
				</div>

				<footer class="matrix__footer">
					<textarea
						class="matrix__input"
						rows="2"
						maxlength="8000"
						placeholder="Message #{activeChannelDef.label}…"
						bind:value={draft}
						onkeydown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								void sendMessage();
							}
						}}
					></textarea>
					<button
						type="button"
						class="matrix__send"
						disabled={sending || !draft.trim()}
						onclick={() => void sendMessage()}
					>
						{sending ? '…' : 'Send'}
					</button>
				</footer>
			</section>

			<aside class="matrix__context" aria-label="Channel details">
				<h3 class="matrix__context-h">Context</h3>
				<p class="matrix__context-p">
					<strong>#{activeChannelDef.label}</strong>
					· live path <code class="matrix__code">teams/{teamId}/channels/{activeChannel}/messages</code>
				</p>
				<button type="button" class="matrix__link" onclick={openSchedule}>
					Open training &amp; schedule
				</button>
			</aside>
		</div>
	{/if}
</div>

<style>
	.matrix {
		--mx-radius: 24px;
		--mx-surface: #f4f6fa;
		--mx-elev: #ffffff;
		--mx-border: #e2e8f0;
		display: flex;
		flex-direction: column;
		min-height: min(70vh, 720px);
		border: 1px solid var(--mx-border);
		border-radius: var(--mx-radius);
		background: var(--mx-surface);
		overflow: visible;
		box-sizing: border-box;
		box-shadow:
			0 1px 0 rgba(15, 23, 42, 0.04),
			0 12px 40px -16px rgba(15, 23, 42, 0.12);
	}

	:global(html.dark) .matrix {
		--mx-surface: #0a0a0c;
		--mx-elev: #111113;
		border-color: rgba(255, 255, 255, 0.09);
		box-shadow: 0 24px 48px -24px rgba(0, 0, 0, 0.55);
	}

	.matrix__hint,
	.matrix__empty {
		margin: 0;
		padding: 16px 20px;
		font-size: 13px;
		color: var(--text-secondary, #64748b);
	}
	.matrix__err {
		margin: 0;
		padding: 12px 20px;
		font-size: 13px;
		color: #b91c1c;
	}

	/* Mobile top strip */
	.matrix__strip {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 10px 12px;
		overflow-x: visible;
		border-bottom: 1px solid #e2e8f0;
		background: #fff;
		flex-shrink: 0;
	}

	:global(html.dark) .matrix__strip {
		background: #111113;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.matrix__chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		border-radius: 9999px;
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		color: var(--text-primary, #0f172a);
		font: inherit;
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
	}
	:global(html.dark) .matrix__chip {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.12);
		color: #e4e4e7;
	}
	.matrix__chip--on {
		background: color-mix(in srgb, var(--brand-primary, #f59e0b) 20%, #fff);
		border-color: color-mix(in srgb, var(--brand-primary, #f59e0b) 50%, #e2e8f0);
	}

	.matrix__shell {
		display: flex;
		flex: 1 1 auto;
		min-height: 0;
		flex-direction: row;
		align-items: stretch;
	}

	@media (min-width: 768px) {
		.matrix__strip {
			display: none;
		}
	}

	/* Left rail (desktop) */
	.matrix__rail {
		display: none;
		width: 15rem;
		min-width: 15rem;
		flex-direction: column;
		border-right: 1px solid #e2e8f0;
		background: #fff;
	}

	@media (min-width: 768px) {
		.matrix__rail {
			display: flex;
		}
	}

	:global(html.dark) .matrix__rail {
		background: #09090b;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.matrix__rail-head {
		padding: 14px 16px 10px;
		border-bottom: 1px solid #e2e8f0;
	}
	:global(html.dark) .matrix__rail-head {
		border-color: rgba(255, 255, 255, 0.08);
	}
	.matrix__rail-title {
		display: block;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-secondary, #64748b);
	}
	.matrix__rail-hint {
		font-size: 11px;
		color: #94a3b8;
	}

	.matrix__nav {
		display: flex;
		flex-direction: column;
		padding: 8px 0 12px;
		gap: 2px;
		overflow-y: visible;
	}
	.matrix__ch {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		text-align: left;
		border: none;
		background: transparent;
		padding: 10px 14px 10px 12px;
		cursor: pointer;
		color: inherit;
		font: inherit;
	}
	.matrix__ch:hover {
		background: rgba(15, 23, 42, 0.04);
	}
	:global(html.dark) .matrix__ch:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	.matrix__ch--active {
		background: rgba(245, 158, 11, 0.1);
		border-left: 3px solid var(--brand-primary, #f59e0b);
		padding-left: 9px;
	}
	.matrix__ch-hash {
		font-size: 13px;
		font-weight: 800;
		color: #94a3b8;
		margin-top: 2px;
	}
	.matrix__ch-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.matrix__ch-label {
		font-size: 13px;
		font-weight: 700;
		color: var(--text-primary, #0f172a);
	}
	.matrix__ch-sub {
		font-size: 10px;
		font-weight: 500;
		color: #94a3b8;
		line-height: 1.3;
	}

	.matrix__main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		background: #f8fafc;
	}
	:global(html.dark) .matrix__main {
		background: #0c0c0e;
	}

	.matrix__head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		padding: 16px 20px 14px;
		border-bottom: 1px solid var(--mx-border, #e2e8f0);
		background: var(--mx-elev, #fff);
		position: sticky;
		top: 0;
		z-index: 5;
	}
	:global(html.dark) .matrix__head {
		background: var(--mx-elev, #111113);
		border-color: rgba(255, 255, 255, 0.08);
	}
	.matrix__h2 {
		margin: 0;
		font-size: 17px;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text-primary, #0f172a);
	}
	.matrix__h2-hash {
		color: #94a3b8;
		font-weight: 700;
		margin-right: 2px;
	}
	.matrix__h2-sub {
		margin: 4px 0 0;
		font-size: 12px;
		color: #64748b;
		font-weight: 500;
	}
	.matrix__id-badge {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #94a3b8;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 4px 8px;
	}

	.matrix__day {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 4px 0 16px;
		user-select: none;
	}
	.matrix__day-line {
		flex: 1;
		height: 1px;
		background: linear-gradient(90deg, transparent, #cbd5e1 20%, #cbd5e1 80%, transparent);
		opacity: 0.7;
	}
	:global(html.dark) .matrix__day-line {
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.12) 18%,
			rgba(255, 255, 255, 0.12) 82%,
			transparent
		);
	}
	.matrix__day-label {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #64748b;
		white-space: nowrap;
	}

	.matrix__scroll {
		flex: 1 1 auto;
		overflow-y: visible;
		padding: 20px 18px 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-height: 180px;
		scroll-behavior: smooth;
	}

	.matrix__row {
		display: flex;
		align-items: flex-end;
		gap: 10px;
		max-width: 820px;
	}
	.matrix__row--mine {
		margin-left: auto;
		flex-direction: row;
	}
	.matrix__row:not(.matrix__row--mine) {
		margin-right: auto;
	}

	.matrix__avatar {
		position: relative;
		width: 40px;
		height: 40px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
	}
	.matrix__avatar-inner {
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.02em;
		line-height: 1;
	}
	.matrix__avatar--other {
		background: linear-gradient(150deg, #e8eeff, #c7d2fe);
		color: #1e1b4b;
		border: 1px solid rgba(99, 102, 241, 0.25);
	}
	.matrix__avatar--self {
		background: linear-gradient(150deg, #fff7ed, #fed7aa);
		color: #7c2d12;
		border: 1px solid rgba(245, 158, 11, 0.4);
	}
	.matrix__avatar--staff.matrix__avatar--other {
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
	}
	.matrix__avatar--staff.matrix__avatar--self {
		box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3);
	}
	:global(html.dark) .matrix__avatar--other {
		background: linear-gradient(150deg, #1e1b4b, #312e81);
		color: #c7d2fe;
		border-color: rgba(99, 102, 241, 0.45);
	}
	:global(html.dark) .matrix__avatar--self {
		background: linear-gradient(150deg, #431407, #7c2d12);
		color: #fdba74;
		border-color: rgba(245, 158, 11, 0.35);
	}

	.matrix__content {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
		min-width: 0;
	}
	.matrix__row--mine .matrix__content {
		align-items: flex-end;
	}

	.matrix__bubble {
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 16px 16px 16px 4px;
		padding: 10px 14px 8px;
		max-width: min(100%, 520px);
		box-shadow:
			0 1px 0 rgba(15, 23, 42, 0.04),
			0 4px 14px -4px rgba(15, 23, 42, 0.08);
	}
	.matrix__row--mine .matrix__bubble {
		border-radius: 16px 16px 4px 16px;
		background: color-mix(in srgb, var(--brand-primary, #f59e0b) 10%, #fff);
		border-color: color-mix(in srgb, var(--brand-primary, #f59e0b) 28%, #e2e8f0);
	}
	:global(html.dark) .matrix__bubble {
		background: #141416;
		border-color: rgba(255, 255, 255, 0.09);
		box-shadow: 0 6px 20px -8px rgba(0, 0, 0, 0.45);
	}
	:global(html.dark) .matrix__row--mine .matrix__bubble {
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.32);
	}
	.matrix__bubble--deleted {
		font-size: 12px;
		font-style: italic;
		color: #94a3b8;
		box-shadow: none;
	}

	.matrix__bubble-top {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 4px;
	}
	.matrix__name {
		font-size: 12px;
		font-weight: 800;
		color: #0f172a;
		letter-spacing: -0.01em;
	}
	:global(html.dark) .matrix__name {
		color: #f4f4f5;
	}
	.matrix__role-pill {
		font-size: 9px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
		background: #f1f5f9;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		padding: 2px 6px;
		line-height: 1.2;
	}
	:global(html.dark) .matrix__role-pill {
		color: #a1a1aa;
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.1);
	}
	.matrix__text {
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-word;
		color: #1e293b;
	}
	:global(html.dark) .matrix__text {
		color: #e2e8f0;
	}
	.matrix__time {
		font-size: 10px;
		color: #94a3b8;
		margin-top: 2px;
		display: block;
	}
	.matrix__mod {
		font-size: 10px;
		font-weight: 700;
		border: none;
		background: none;
		cursor: pointer;
		color: #94a3b8;
		text-decoration: underline;
		padding: 0;
	}

	.matrix__footer {
		display: flex;
		gap: 10px;
		align-items: flex-end;
		padding: 12px 16px 16px;
		border-top: 1px solid #e2e8f0;
		background: #fff;
	}
	:global(html.dark) .matrix__footer {
		background: #111113;
		border-color: rgba(255, 255, 255, 0.08);
	}
	.matrix__input {
		flex: 1;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 10px 12px;
		font: inherit;
		font-size: 13px;
		resize: vertical;
		min-height: 44px;
		background: #f8fafc;
	}
	:global(html.dark) .matrix__input {
		background: #0c0c0e;
		border-color: rgba(255, 255, 255, 0.12);
		color: #e4e4e7;
	}
	.matrix__send {
		border: none;
		border-radius: 12px;
		padding: 10px 20px;
		font-size: 13px;
		font-weight: 800;
		cursor: pointer;
		background: var(--brand-primary, #f59e0b);
		color: #0f172a;
		flex-shrink: 0;
	}
	.matrix__send:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Right context panel — hide on small screens */
	.matrix__context {
		display: none;
	}
	@media (min-width: 1280px) {
		.matrix__context {
			display: flex;
			flex-direction: column;
			gap: 10px;
			width: 15rem;
			min-width: 15rem;
			padding: 16px 14px;
			border-left: 1px solid #e2e8f0;
			background: #fff;
		}
		:global(html.dark) .matrix__context {
			background: #09090b;
			border-color: rgba(255, 255, 255, 0.08);
		}
	}
	.matrix__context-h {
		margin: 0;
		font-size: 11px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #94a3b8;
	}
	.matrix__context-p {
		margin: 0;
		font-size: 11px;
		line-height: 1.45;
		color: #64748b;
		word-break: break-word;
	}
	.matrix__code {
		font-size: 10px;
		display: block;
		margin-top: 4px;
		padding: 6px 8px;
		border-radius: 8px;
		background: #f1f5f9;
		color: #334155;
	}
	:global(html.dark) .matrix__code {
		background: #18181b;
		color: #a1a1aa;
	}
	.matrix__link {
		margin-top: 4px;
		padding: 8px 12px;
		border-radius: 10px;
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		font: inherit;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		color: var(--text-primary, #0f172a);
	}
	:global(html.dark) .matrix__link {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.12);
		color: #e4e4e7;
	}
</style>
