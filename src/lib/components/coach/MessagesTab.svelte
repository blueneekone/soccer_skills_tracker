<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import {
		collection,
		query,
		where,
		orderBy,
		limit,
		onSnapshot,
		addDoc,
		updateDoc,
		doc,
		getDocs,
		getDoc,
		serverTimestamp,
	} from 'firebase/firestore';
	import { db, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import NewMessageModal from './NewMessageModal.svelte';

	const sendChannelMessageFn = httpsCallable(functions, 'sendChannelMessage');

	let { teamId = '', players = [], clubId = '' } = $props();

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
			authStore.role === 'super_admin' || authStore.role === 'global_admin',
	);
	const canCreateChannel = $derived(canModerate && !!clubId);

	/** @type {Array<{ id: string; name: string; type: string; memberIds: string[]; safesportMonitored: boolean; ccParentEmails: string[]; teamId?: string }>} */
	let channels = $state([]);
	let channelsLoading = $state(true);
	let channelsErr = $state('');

	let selectedChannelId = $state('');

	/** @type {Array<{ id: string; senderId: string; senderName: string; senderRole: string; text: string; timestamp?: import('firebase/firestore').Timestamp; deleted?: boolean; safesportMonitored?: boolean }>} */
	let messages = $state([]);
	let messagesLoading = $state(false);
	let messagesErr = $state('');

	let draft = $state('');
	let sending = $state(false);
	let seeding = $state(false);
	let newMessageOpen = $state(false);

	const selectedChannel = $derived(channels.find((c) => c.id === selectedChannelId) ?? null);

	const broadcastReadOnly = $derived(
		selectedChannel?.type === 'broadcast' &&
			(authStore.role === 'parent' || authStore.role === 'player'),
	);

	/**
	 * Collect lowercase email keys for team roster + coach (for channel membership).
	 * @param {string} tid
	 * @returns {Promise<string[]>}
	 */
	async function collectTeamMemberEmails(tid) {
		const emails = new Set();
		if (myEmail) emails.add(myEmail);
		try {
			const teamSnap = await getDoc(doc(db, 'teams', tid));
			if (teamSnap.exists()) {
				const ce = teamSnap.data().coachEmail;
				if (ce) emails.add(String(ce).toLowerCase());
				const asst = teamSnap.data().assistants;
				if (Array.isArray(asst)) {
					asst.forEach((a) => {
						if (typeof a === 'string') emails.add(a.toLowerCase());
					});
				}
			}
			const uq = query(collection(db, 'users'), where('teamId', '==', tid));
			const us = await getDocs(uq);
			us.forEach((d) => emails.add(d.id.toLowerCase()));
		} catch (e) {
			console.error('[MessagesTab] collectTeamMemberEmails', e);
		}
		return Array.from(emails);
	}

	async function ensureDefaultChannels() {
		if (!browser || !clubId || !teamId || !myUid || !canCreateChannel || seeding) return;
		seeding = true;
		try {
			const col = collection(db, 'clubs', clubId, 'channels');
			const q = query(col, where('teamId', '==', teamId));
			const snap = await getDocs(q);
			if (!snap.empty) return;
			const memberIds = await collectTeamMemberEmails(teamId);
			if (memberIds.length === 0) return;
			await addDoc(col, {
				name: 'Team announcements',
				type: 'broadcast',
				memberIds,
				teamId,
				createdBy: myUid,
				createdAt: serverTimestamp(),
			});
			await addDoc(col, {
				name: 'Team chat',
				type: 'group',
				memberIds,
				teamId,
				createdBy: myUid,
				createdAt: serverTimestamp(),
			});
		} catch (e) {
			console.error('[MessagesTab] seed', e);
		} finally {
			seeding = false;
		}
	}

	$effect(() => {
		if (!browser || !clubId || !teamId) {
			channels = [];
			channelsLoading = false;
			return;
		}
		channelsLoading = true;
		channelsErr = '';
		const col = collection(db, 'clubs', clubId, 'channels');
		const q = query(col, where('teamId', '==', teamId));
		const unsub = onSnapshot(
			q,
			(snap) => {
			channels = snap.docs.map((d) => {
				const x = d.data();
				return {
					id: d.id,
					name: typeof x.name === 'string' ? x.name : 'Channel',
					type: x.type === 'dm' ? 'dm' : x.type === 'broadcast' ? 'broadcast' : 'group',
					memberIds: Array.isArray(x.memberIds)
						? x.memberIds.map((e) => String(e).toLowerCase())
						: [],
					safesportMonitored: x.safesportMonitored === true,
					ccParentEmails: Array.isArray(x.ccParentEmails)
						? x.ccParentEmails.map((e) => String(e).toLowerCase())
						: [],
					...(typeof x.teamId === 'string' ? { teamId: x.teamId } : {}),
				};
			});
				channelsLoading = false;
				if (!selectedChannelId && channels.length > 0) {
					selectedChannelId = channels[0].id;
				}
			},
			(e) => {
				console.error('[MessagesTab] channels', e);
				channelsErr = e instanceof Error ? e.message : 'Could not load channels.';
				channelsLoading = false;
			},
		);
		return () => unsub();
	});

	$effect(() => {
		if (!browser || !clubId || !teamId || !canCreateChannel) return;
		if (channelsLoading) return;
		if (channels.length > 0) return;
		void ensureDefaultChannels();
	});

	$effect(() => {
		if (!browser || !clubId || !selectedChannelId) {
			messages = [];
			return;
		}
		messagesLoading = true;
		messagesErr = '';
		const mq = query(
			collection(db, 'clubs', clubId, 'channels', selectedChannelId, 'messages'),
			orderBy('timestamp', 'desc'),
			limit(100),
		);
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
						safesportMonitored: x.safesportMonitored === true,
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

	async function sendMessage() {
		if (!clubId || !selectedChannelId || !draft.trim() || broadcastReadOnly || sending) return;
		sending = true;
		const text = draft.trim().slice(0, 8000);
		try {
			if (selectedChannel?.safesportMonitored) {
				// Monitored channels: route through server-side callable.
				// The callable verifies CC integrity, re-adds missing parents,
				// and writes via Admin SDK (client writes are blocked by Rules).
				await sendChannelMessageFn({ clubId, channelId: selectedChannelId, text });
			} else {
				await addDoc(
					collection(db, 'clubs', clubId, 'channels', selectedChannelId, 'messages'),
					{
						senderId: myUid,
						senderName: myName,
						senderRole: myRole,
						text,
						timestamp: serverTimestamp(),
						deleted: false,
					},
				);
			}
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
		if (!clubId || !selectedChannelId || !canModerate) return;
		if (!confirm('Remove this message for everyone?')) return;
		try {
			await updateDoc(
				doc(db, 'clubs', clubId, 'channels', selectedChannelId, 'messages', messageId),
				{ deleted: true },
			);
		} catch (e) {
			alert(e instanceof Error ? e.message : String(e));
		}
	}

	function openSchedule() {
		goto('/coach?tab=plan');
	}

	const broadcastChannels = $derived(channels.filter((c) => c.type === 'broadcast'));
	const groupChannels = $derived(channels.filter((c) => c.type === 'group'));
	const dmChannels = $derived(channels.filter((c) => c.type === 'dm'));

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
	 * @param {string} channelId
	 */
	function onNewChannelCreated(channelId) {
		selectedChannelId = channelId;
	}
</script>

<NewMessageModal
	open={newMessageOpen}
	onClose={() => (newMessageOpen = false)}
	clubId={clubId}
	teamId={teamId}
	myEmail={myEmail}
	myUid={myUid}
	myRole={myRole}
	onChannelCreated={onNewChannelCreated}
/>

<div class="comms-hub" aria-label="Team communications">
	{#if !clubId}
		<p class="comms-hub__muted">Join a club with a team scope to use Comms Hub.</p>
	{:else if !teamId}
		<p class="comms-hub__muted">Select a team to load channels.</p>
	{:else}
		<!-- Pane 1 -->
		<aside class="comms-hub__pane comms-hub__pane--nav" aria-label="Channels">
			<div class="comms-hub__pane-head">
				<span class="comms-hub__pane-head-title">Channels</span>
				{#if canCreateChannel}
					<button
						type="button"
						class="comms-hub__new-chat"
						aria-label="New chat"
						onclick={() => (newMessageOpen = true)}
					>
						<i class="ph ph-pencil-simple" aria-hidden="true"></i>
					</button>
				{/if}
			</div>
			{#if channelsLoading || seeding}
				<p class="comms-hub__muted">Loading…</p>
			{:else if channelsErr}
				<p class="comms-hub__err" role="alert">{channelsErr}</p>
			{:else}
				<div class="comms-hub__nav-scroll">
					{#if broadcastChannels.length > 0}
						<p class="comms-hub__group-label">Announcements</p>
						<ul class="comms-hub__nav-list">
							{#each broadcastChannels as c (c.id)}
								<li>
									<button
										type="button"
										class="comms-hub__nav-item"
										class:comms-hub__nav-item--active={selectedChannelId === c.id}
										onclick={() => (selectedChannelId = c.id)}
									>
										<i class="ph ph-megaphone" aria-hidden="true"></i>
										<span class="comms-hub__nav-text">{c.name}</span>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
					{#if groupChannels.length > 0}
						<p class="comms-hub__group-label">Team chats</p>
						<ul class="comms-hub__nav-list">
							{#each groupChannels as c (c.id)}
								<li>
									<button
										type="button"
										class="comms-hub__nav-item"
										class:comms-hub__nav-item--active={selectedChannelId === c.id}
										onclick={() => (selectedChannelId = c.id)}
									>
										<i class="ph ph-chats-circle" aria-hidden="true"></i>
										<span class="comms-hub__nav-text">{c.name}</span>
										{#if c.safesportMonitored}
											<i
												class="ph ph-shield-check comms-hub__nav-shield"
												title="SafeSport monitored"
												aria-label="SafeSport monitored"
											></i>
										{/if}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
					{#if dmChannels.length > 0}
						<p class="comms-hub__group-label">Direct messages</p>
						<ul class="comms-hub__nav-list">
							{#each dmChannels as c (c.id)}
								<li>
									<button
										type="button"
										class="comms-hub__nav-item"
										class:comms-hub__nav-item--active={selectedChannelId === c.id}
										onclick={() => (selectedChannelId = c.id)}
									>
										<i class="ph ph-user-circle" aria-hidden="true"></i>
										<span class="comms-hub__nav-text">{c.name}</span>
										{#if c.safesportMonitored}
											<i
												class="ph ph-shield-check comms-hub__nav-shield"
												title="SafeSport monitored"
												aria-label="SafeSport monitored"
											></i>
										{/if}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		</aside>

		<!-- Pane 2 -->
		<section class="comms-hub__pane comms-hub__pane--main" aria-label="Conversation">
			{#if selectedChannel}
				<div class="comms-hub__chat-head">
					<h2 class="comms-hub__title">{selectedChannel.name}</h2>
					<div class="comms-hub__head-badges">
						<span class="comms-hub__badge">{selectedChannel.type}</span>
						{#if selectedChannel.safesportMonitored}
							<span
								class="comms-hub__badge comms-hub__badge--safesport"
								title="All messages in this thread are logged for SafeSport compliance."
							>
								<i class="ph ph-shield-check" aria-hidden="true"></i>
								SafeSport monitored
							</span>
						{/if}
					</div>
				</div>
				<div class="comms-hub__stream" role="log" aria-live="polite">
					{#if messagesLoading}
						<p class="comms-hub__muted">Loading messages…</p>
					{:else if messagesErr}
						<p class="comms-hub__err" role="alert">{messagesErr}</p>
					{:else if messages.length === 0}
						<p class="comms-hub__muted">No messages yet. Start the thread below.</p>
					{:else}
						{#each messages as m (m.id)}
							<div
								class="comms-hub__msg-row"
								class:comms-hub__msg-row--mine={m.senderId === myUid}
							>
								<div class="comms-hub__bubble-wrap">
									{#if m.deleted}
										<div class="comms-hub__bubble comms-hub__bubble--removed">
											This message was removed by an admin.
										</div>
									{:else}
										<div
											class="comms-hub__bubble"
											class:comms-hub__bubble--mine={m.senderId === myUid}
										>
											<span class="comms-hub__bubble-meta">
												{m.senderName}
												<span class="comms-hub__bubble-role">{m.senderRole}</span>
											</span>
											<p class="comms-hub__bubble-text">{m.text}</p>
											<span class="comms-hub__bubble-time">
												{fmtTime(m.timestamp)}
												{#if m.safesportMonitored}
													<i
														class="ph ph-shield-check comms-hub__bubble-shield"
														title="SafeSport logged"
														aria-label="SafeSport logged"
													></i>
												{/if}
											</span>
										</div>
										{#if canModerate && !m.deleted}
											<button
												type="button"
												class="comms-hub__del"
												onclick={() => void softDeleteMessage(m.id)}
											>
												Delete
											</button>
										{/if}
									{/if}
								</div>
							</div>
						{/each}
					{/if}
				</div>
				{#if selectedChannel?.safesportMonitored}
					<div class="comms-hub__safesport-notice" role="note">
						<i class="ph ph-shield-check" aria-hidden="true"></i>
						<span>
							This thread is SafeSport monitored. Parents are automatically CC'd and all
							messages are audit-logged.
						</span>
					</div>
				{/if}
				<div class="comms-hub__composer">
					{#if broadcastReadOnly}
						<p class="comms-hub__readonly">Read-only: Announcements channel</p>
					{:else}
						<textarea
							class="comms-hub__input"
							rows="2"
							maxlength="8000"
							placeholder="Write a message…"
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
							class="comms-hub__send"
							disabled={sending || !draft.trim()}
							onclick={() => void sendMessage()}
						>
							{sending ? 'Sending…' : 'Send'}
						</button>
					{/if}
				</div>
			{:else}
				<p class="comms-hub__muted">Select a channel.</p>
			{/if}
		</section>

		<!-- Pane 3 -->
		<aside class="comms-hub__pane comms-hub__pane--detail" aria-label="Channel details">
			{#if selectedChannel}
				<h3 class="comms-hub__detail-title">Details</h3>
				<p class="comms-hub__detail-name">{selectedChannel.name}</p>

				{#if selectedChannel.safesportMonitored}
					<div class="comms-hub__detail-safesport-badge">
						<i class="ph ph-shield-check" aria-hidden="true"></i>
						<span>SafeSport monitored</span>
					</div>
					{#if selectedChannel.ccParentEmails.length > 0}
						<p class="comms-hub__detail-sub">
							CC'd parents ({selectedChannel.ccParentEmails.length})
						</p>
						<ul class="comms-hub__members comms-hub__members--cc">
							{#each selectedChannel.ccParentEmails as e (e)}
								<li class="comms-hub__member comms-hub__member--cc">
									<i class="ph ph-user-circle-gear" aria-hidden="true"></i>
									{e}
								</li>
							{/each}
						</ul>
					{/if}
				{/if}

				<p class="comms-hub__detail-sub">Members ({selectedChannel.memberIds.length})</p>
				<ul class="comms-hub__members">
					{#each selectedChannel.memberIds as e (e)}
						<li class="comms-hub__member">{e}</li>
					{/each}
				</ul>
				<button type="button" class="comms-hub__schedule-btn" onclick={openSchedule}>
					View team schedule
				</button>
			{:else}
				<p class="comms-hub__muted">—</p>
			{/if}
		</aside>
	{/if}
</div>

<style>
	.comms-hub {
		display: flex;
		flex-direction: row;
		align-items: stretch;
		min-height: min(70vh, 720px);
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		background: #ffffff;
		overflow-x: hidden;
		overflow-y: visible;
		box-sizing: border-box;
	}

	:global(html.dark) .comms-hub {
		border-color: rgba(255, 255, 255, 0.12);
		background: #0f0f11;
	}

	.comms-hub__muted {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary);
		padding: 12px;
	}

	.comms-hub__err {
		margin: 0;
		font-size: 13px;
		color: #b91c1c;
		padding: 8px;
	}

	.comms-hub__pane--nav {
		width: 16rem;
		min-width: 16rem;
		border-right: 1px solid #e5e5e5;
		background: #fafafa;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	:global(html.dark) .comms-hub__pane--nav {
		border-right-color: rgba(255, 255, 255, 0.1);
		background: #09090b;
	}

	.comms-hub__pane-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 10px 12px 10px 14px;
		border-bottom: 1px solid #e5e5e5;
	}

	.comms-hub__pane-head-title {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
	}

	.comms-hub__new-chat {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: 1px solid #e5e5e5;
		border-radius: 10px;
		background: #ffffff;
		color: var(--text-primary);
		cursor: pointer;
		font-size: 16px;
	}

	.comms-hub__new-chat:hover {
		background: rgba(0, 0, 0, 0.04);
		border-color: #d4d4d8;
	}

	:global(html.dark) .comms-hub__new-chat {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.12);
	}

	:global(html.dark) .comms-hub__new-chat:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	:global(html.dark) .comms-hub__pane-head {
		border-bottom-color: rgba(255, 255, 255, 0.1);
	}

	.comms-hub__nav-scroll {
		flex: 1 1 auto;
		overflow: visible;
		padding: 8px 0 12px;
		min-height: 0;
	}

	.comms-hub__group-label {
		margin: 10px 14px 6px;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
	}

	.comms-hub__nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.comms-hub__nav-item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		border: none;
		background: transparent;
		cursor: pointer;
		font: inherit;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-primary);
		text-align: left;
	}

	.comms-hub__nav-item:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.comms-hub__nav-item--active {
		background: rgba(0, 0, 0, 0.06);
		border-left: 3px solid var(--brand-primary, #f59e0b);
		padding-left: 11px;
	}

	.comms-hub__nav-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	.comms-hub__nav-shield {
		flex-shrink: 0;
		font-size: 12px;
		color: #059669;
		margin-left: auto;
	}

	.comms-hub__pane--main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		background: #ffffff;
	}

	:global(html.dark) .comms-hub__pane--main {
		background: #0f0f11;
	}

	.comms-hub__chat-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 12px 16px;
		border-bottom: 1px solid #e5e5e5;
		background: #fafafa;
	}

	:global(html.dark) .comms-hub__chat-head {
		border-bottom-color: rgba(255, 255, 255, 0.1);
		background: #09090b;
	}

	.comms-hub__title {
		margin: 0;
		font-size: 15px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.comms-hub__head-badges {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}

	.comms-hub__badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
		border: 1px solid #e5e5e5;
		border-radius: 8px;
		padding: 4px 8px;
	}

	.comms-hub__badge--safesport {
		color: #059669;
		background: rgba(16, 185, 129, 0.08);
		border-color: rgba(16, 185, 129, 0.35);
	}

	.comms-hub__stream {
		flex: 0 1 auto;
		overflow: visible;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-height: 0;
	}

	.comms-hub__msg-row {
		display: flex;
		justify-content: flex-start;
	}

	.comms-hub__msg-row--mine {
		justify-content: flex-end;
	}

	.comms-hub__bubble-wrap {
		max-width: min(100%, 520px);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
	}

	.comms-hub__msg-row--mine .comms-hub__bubble-wrap {
		align-items: flex-end;
	}

	.comms-hub__bubble {
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		padding: 10px 12px;
		background: #f4f4f5;
		font-size: 13px;
		line-height: 1.45;
		color: var(--text-primary);
	}

	.comms-hub__bubble--mine {
		background: color-mix(in srgb, var(--brand-primary, #f59e0b) 18%, #ffffff);
		border-color: color-mix(in srgb, var(--brand-primary, #f59e0b) 35%, #e5e5e5);
	}

	:global(html.dark) .comms-hub__bubble {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.1);
	}

	:global(html.dark) .comms-hub__bubble--mine {
		background: rgba(245, 158, 11, 0.15);
		border-color: rgba(245, 158, 11, 0.35);
	}

	.comms-hub__bubble--removed {
		font-style: italic;
		color: var(--text-secondary);
		font-size: 12px;
	}

	.comms-hub__bubble-meta {
		display: block;
		font-size: 11px;
		font-weight: 700;
		margin-bottom: 6px;
		color: var(--text-secondary);
	}

	.comms-hub__bubble-role {
		font-weight: 600;
		margin-left: 6px;
		opacity: 0.85;
	}

	.comms-hub__bubble-text {
		margin: 0 0 6px;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.comms-hub__bubble-time {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 10px;
		color: var(--text-secondary);
	}

	.comms-hub__bubble-shield {
		font-size: 11px;
		color: #059669;
	}

	.comms-hub__del {
		font-size: 11px;
		font-weight: 600;
		padding: 2px 0;
		border: none;
		background: none;
		cursor: pointer;
		color: var(--text-secondary);
		text-decoration: underline;
	}

	.comms-hub__composer {
		border-top: 1px solid #e5e5e5;
		padding: 12px 16px;
		background: #fafafa;
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: flex-end;
	}

	:global(html.dark) .comms-hub__composer {
		border-top-color: rgba(255, 255, 255, 0.1);
		background: #09090b;
	}

	.comms-hub__safesport-notice {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		font-size: 12px;
		font-weight: 600;
		color: #047857;
		background: rgba(16, 185, 129, 0.07);
		border-bottom: 1px solid rgba(16, 185, 129, 0.2);
	}

	.comms-hub__readonly {
		margin: 0;
		width: 100%;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.comms-hub__input {
		flex: 1;
		min-width: 0;
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		padding: 10px 12px;
		font: inherit;
		font-size: 13px;
		resize: vertical;
		min-height: 44px;
		background: #ffffff;
		color: var(--text-primary);
	}

	:global(html.dark) .comms-hub__input {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.comms-hub__send {
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		padding: 10px 18px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		background: var(--brand-primary, #f59e0b);
		color: #0f172a;
	}

	.comms-hub__pane--detail {
		display: none;
		width: 16rem;
		min-width: 16rem;
		border-left: 1px solid #e5e5e5;
		background: #fafafa;
		padding: 14px;
		flex-direction: column;
		gap: 10px;
	}

	@media (min-width: 1024px) {
		.comms-hub__pane--detail {
			display: flex;
		}
	}

	:global(html.dark) .comms-hub__pane--detail {
		border-left-color: rgba(255, 255, 255, 0.1);
		background: #09090b;
	}

	.comms-hub__detail-title {
		margin: 0;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
	}

	.comms-hub__detail-name {
		margin: 0;
		font-size: 14px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.comms-hub__detail-sub {
		margin: 0;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.comms-hub__detail-safesport-badge {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		border-radius: 8px;
		background: rgba(16, 185, 129, 0.09);
		border: 1px solid rgba(16, 185, 129, 0.28);
		font-size: 11px;
		font-weight: 700;
		color: #047857;
	}

	.comms-hub__members {
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: 12px;
		color: var(--text-primary);
	}

	.comms-hub__members--cc {
		margin-bottom: 4px;
	}

	.comms-hub__member {
		padding: 4px 0;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		word-break: break-all;
	}

	.comms-hub__member--cc {
		display: flex;
		align-items: center;
		gap: 5px;
		color: #059669;
		font-weight: 600;
		font-size: 11px;
	}

	.comms-hub__schedule-btn {
		margin-top: auto;
		width: 100%;
		padding: 10px 12px;
		border-radius: 14px;
		border: 1px solid #e5e5e5;
		background: #ffffff;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		color: var(--text-primary);
	}

	:global(html.dark) .comms-hub__schedule-btn {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.12);
	}
</style>
