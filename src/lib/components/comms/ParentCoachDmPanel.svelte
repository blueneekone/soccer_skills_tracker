<script lang="ts">
	import { browser } from '$app/environment';
	import {
		collection,
		limit,
		onSnapshot,
		orderBy,
		query,
		where,
		getDocs,
		doc,
		getDoc,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { CommsEngine } from '$lib/services/comms.svelte.js';
	import DeliveryReceipt from '$lib/components/comms/DeliveryReceipt.svelte';

	async function guardianEmailsForProfile(prof: Record<string, unknown>): Promise<string[]> {
		const out: string[] = [];
		const householdId =
			typeof prof.householdId === 'string' ? prof.householdId.trim() : '';
		if (householdId) {
			const hSnap = await getDoc(doc(db, 'households', householdId));
			if (hSnap.exists()) {
				const pe = hSnap.data().parentEmails ?? [];
				for (const p of pe) {
					const n = String(p ?? '').trim().toLowerCase();
					if (n) out.push(n);
				}
			}
		}
		const direct = String(prof.parentEmail ?? '').trim().toLowerCase();
		if (direct) out.push(direct);
		return [...new Set(out)];
	}

	let {
		clubId,
		teamId,
		teamName = '',
		workspaceMode = false,
	}: {
		clubId: string;
		teamId: string;
		teamName?: string;
		workspaceMode?: boolean;
	} = $props();

	const engine = new CommsEngine();
	const role = $derived(authStore.role);
	const myEmail = $derived((authStore.user?.email ?? '').toLowerCase());

	type ThreadRow = {
		threadId: string;
		parentEmail: string;
		coachEmail: string;
		includeAdOnParentDms: boolean;
		lastMessageAt?: unknown;
		preview?: string;
	};

	type DmMessage = {
		id: string;
		fromEmail: string;
		fromRole: string;
		body: string;
		createdAt?: { toDate?: () => Date };
	};

	let threads = $state<ThreadRow[]>([]);
	let threadsLoading = $state(false);
	let includeAdOnParentDms = $state(false);
	let readOnly = $state(false);
	let activeThreadId = $state('');
	let messages = $state<DmMessage[]>([]);
	let msgLoading = $state(false);
	let msgErr = $state('');
	let draft = $state('');
	let sendErr = $state('');
	let coachEmail = $state('');
	let parentOptions = $state<Array<{ email: string; label: string }>>([]);
	let selectedParentEmail = $state('');
	let scrollEl = $state<HTMLDivElement | null>(null);
	let mobilePane = $state<'list' | 'conversation'>('list');
	let composingNew = $state(false);

	const title = $derived(
		teamName ? `${teamName} · Parent messages` : 'Parent messages',
	);
	const activeThread = $derived(threads.find((t) => t.threadId === activeThreadId) ?? null);
	const canCompose = $derived(!readOnly && (role === 'parent' || role === 'coach'));
	const showConversation = $derived(
		composingNew ||
			Boolean(activeThreadId) ||
			(role === 'parent' && coachEmail && threads.length === 0),
	);

	function parseTs(raw: unknown): number {
		if (!raw) return 0;
		if (typeof raw === 'object' && raw !== null) {
			const o = raw as Record<string, unknown>;
			if (typeof o.toDate === 'function') return (o.toDate as () => Date)().getTime();
			if (typeof o._seconds === 'number') return o._seconds * 1000;
			if (typeof o.seconds === 'number') return o.seconds * 1000;
		}
		return 0;
	}

	function threadSeenKey(threadId: string) {
		return `coach-dm-thread-seen-${threadId}`;
	}

	function isThreadUnread(t: ThreadRow): boolean {
		const at = parseTs(t.lastMessageAt);
		if (!at) return false;
		return at > Number(localStorage.getItem(threadSeenKey(t.threadId)) || 0);
	}

	function markThreadSeen(threadId: string) {
		if (!browser || !threadId) return;
		localStorage.setItem(threadSeenKey(threadId), String(Date.now()));
	}

	function displayNameForThread(t: ThreadRow): string {
		if (role === 'coach') {
			const opt = parentOptions.find((p) => p.email === t.parentEmail);
			return opt?.label ?? t.parentEmail;
		}
		return t.coachEmail;
	}

	function fmtListTime(raw: unknown): string {
		const ms = parseTs(raw);
		if (!ms) return '';
		try {
			return new Date(ms).toLocaleString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
			});
		} catch {
			return '';
		}
	}

	async function loadThreadPreviews(rows: ThreadRow[], cId: string) {
		const next = [...rows];
		await Promise.all(
			next.map(async (t, idx) => {
				try {
					const q = query(
						collection(db, 'clubs', cId, 'parent_coach_threads', t.threadId, 'messages'),
						orderBy('createdAt', 'desc'),
						limit(1),
					);
					const snap = await getDocs(q);
					if (snap.empty) return;
					const body = String(snap.docs[0].data().body ?? '').trim();
					next[idx] = {
						...t,
						preview: body.length > 72 ? `${body.slice(0, 72)}…` : body,
					};
				} catch {
					/* non-fatal */
				}
			}),
		);
		threads = next;
	}

	$effect(() => {
		const cId = clubId?.trim();
		const tId = teamId?.trim();
		if (!browser || !cId || !tId) {
			threads = [];
			return;
		}

		threadsLoading = true;
		void engine
			.listParentCoachDmThreads({ clubId: cId, teamId: tId })
			.then((res) => {
				const mapped = res.threads.map((t) => ({
					threadId: t.threadId,
					parentEmail: t.parentEmail,
					coachEmail: t.coachEmail,
					includeAdOnParentDms: t.includeAdOnParentDms,
					lastMessageAt: t.lastMessageAt,
				}));
				threads = mapped;
				includeAdOnParentDms = res.includeAdOnParentDms;
				readOnly = res.readOnly;
				if (!activeThreadId && mapped.length > 0) {
					activeThreadId = mapped[0].threadId;
				}
				void loadThreadPreviews(mapped, cId);
			})
			.catch(() => {
				threads = [];
			})
			.finally(() => {
				threadsLoading = false;
			});
	});

	$effect(() => {
		const cId = clubId?.trim();
		const tId = teamId?.trim();
		if (!browser || !cId || !tId || role !== 'coach') {
			parentOptions = [];
			return;
		}

		void (async () => {
			const rosterSnap = await getDocs(
				query(collection(db, 'player_lookup'), where('teamId', '==', tId)),
			);
			const seen: Record<string, true> = {};
			const options: Array<{ email: string; label: string }> = [];

			for (const row of rosterSnap.docs) {
				const playerEmail = row.id.toLowerCase();
				const profSnap = await getDoc(doc(db, 'users', playerEmail));
				if (!profSnap.exists()) continue;
				const prof = profSnap.data() as Record<string, unknown>;
				const guardians = await guardianEmailsForProfile(prof);
				const playerName =
					typeof prof.playerName === 'string' && prof.playerName.trim()
						? prof.playerName.trim()
						: playerEmail;
				for (const g of guardians) {
					if (!seen[g]) {
						seen[g] = true;
						options.push({ email: g, label: `${g} (${playerName})` });
					}
				}
			}
			parentOptions = options.sort((a, b) => a.label.localeCompare(b.label));
			if (!selectedParentEmail && options.length === 1) {
				selectedParentEmail = options[0].email;
			}
		})();
	});

	$effect(() => {
		const cId = clubId?.trim();
		const threadId = activeThreadId?.trim();
		if (!browser || !cId || !threadId) {
			messages = [];
			return;
		}

		msgLoading = true;
		msgErr = '';
		const col = collection(db, 'clubs', cId, 'parent_coach_threads', threadId, 'messages');
		const q = query(col, orderBy('createdAt', 'asc'), limit(200));
		const unsub = onSnapshot(
			q,
			(snap) => {
				const rows: DmMessage[] = [];
				snap.forEach((d) => {
					const x = d.data();
					rows.push({
						id: d.id,
						fromEmail: String(x.fromEmail ?? ''),
						fromRole: String(x.fromRole ?? ''),
						body: String(x.body ?? ''),
						createdAt: x.createdAt,
					});
				});
				messages = rows;
				msgLoading = false;
				markThreadSeen(threadId);
			},
			(e) => {
				msgErr = e instanceof Error ? e.message : 'Could not load messages.';
				msgLoading = false;
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

	$effect(() => {
		const cId = clubId?.trim();
		const tId = teamId?.trim();
		if (!browser || !cId || !tId || role !== 'parent') return;

		void getDoc(doc(db, 'teams', tId)).then((snap) => {
			if (!snap.exists()) return;
			const data = snap.data();
			const emails: string[] = [];
			if (Array.isArray(data.coachEmails)) {
				data.coachEmails.forEach((e: unknown) => {
					const n = String(e ?? '').trim().toLowerCase();
					if (n) emails.push(n);
				});
			} else if (typeof data.coachEmail === 'string' && data.coachEmail.trim()) {
				emails.push(data.coachEmail.trim().toLowerCase());
			}
			coachEmail = emails[0] ?? '';
		});
	});

	function openThread(threadId: string) {
		activeThreadId = threadId;
		composingNew = false;
		mobilePane = 'conversation';
		markThreadSeen(threadId);
	}

	function openNewCompose() {
		activeThreadId = '';
		composingNew = true;
		selectedParentEmail = '';
		mobilePane = 'conversation';
	}

	async function startParentThread() {
		if (!coachEmail || readOnly) return;
		composingNew = true;
		activeThreadId = '';
		selectedParentEmail = myEmail;
		mobilePane = 'conversation';
	}

	function backToList() {
		mobilePane = 'list';
	}

	async function send() {
		if (!draft.trim() || engine.isSending || readOnly) return;
		const cId = clubId?.trim();
		const tId = teamId?.trim();
		if (!cId || !tId) return;

		sendErr = '';
		try {
			const payload: {
				clubId: string;
				teamId: string;
				body: string;
				threadId?: string;
				parentEmail?: string;
				coachEmail?: string;
			} = {
				clubId: cId,
				teamId: tId,
				body: draft.trim(),
			};

			if (activeThread) {
				payload.threadId = activeThread.threadId;
				payload.parentEmail = activeThread.parentEmail;
				payload.coachEmail = activeThread.coachEmail;
			} else if (role === 'parent') {
				payload.coachEmail = coachEmail;
			} else if (role === 'coach') {
				payload.parentEmail = selectedParentEmail;
			} else {
				return;
			}

			const result = await engine.sendParentCoachMessage(payload);
			draft = '';
			composingNew = false;
			if (result.threadId) {
				activeThreadId = result.threadId;
				mobilePane = 'conversation';
			}
			if (!threads.some((t) => t.threadId === result.threadId)) {
				threads = [
					...threads,
					{
						threadId: result.threadId,
						parentEmail: payload.parentEmail ?? myEmail,
						coachEmail: payload.coachEmail ?? coachEmail,
						includeAdOnParentDms: result.includeAdOnParentDms,
					},
				];
			}
		} catch (e) {
			sendErr = e instanceof Error ? e.message : 'Send failed.';
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

<section class="plp-root pcdm-root" class:pcdm-root--workspace={workspaceMode} aria-labelledby="pcdm-heading">
	{#if !workspaceMode}
		<header class="plp-head">
			<div>
				<h3 id="pcdm-heading" class="plp-title">
					<span class="plp-icon" aria-hidden="true">✉</span>{title}
				</h3>
				<p class="plp-sub">
					{#if role === 'parent'}
						Bilateral thread with your coach — not visible to players. Use Parent Circle for
						peer discussion.
					{:else if role === 'coach'}
						Message parents on your roster — players cannot access this channel.
					{:else}
						Read-only director oversight when the club enables AD access on parent↔coach DMs.
					{/if}
				</p>
			</div>
		</header>
	{:else}
		<header class="pcdm-workspace-head">
			<h3 id="pcdm-heading" class="plp-title">{title}</h3>
			<p class="plp-sub">Bilateral parent↔coach threads — not visible to players.</p>
		</header>
	{/if}

	{#if includeAdOnParentDms}
		<p class="pcdm-disclosure" role="status">
			Club disclosure: an athletic director may read parent↔coach messages for oversight. Both
			parent and coach see this notice.
		</p>
	{/if}

	<div
		class="pcdm-layout"
		class:pcdm-layout--conversation={mobilePane === 'conversation'}
	>
		<aside class="pcdm-list" aria-label="Message threads">
			{#if role === 'coach' && !readOnly}
				<button type="button" class="pcdm-new" onclick={openNewCompose}>New message</button>
			{/if}

			{#if threadsLoading}
				<p class="plp-hint">Loading threads…</p>
			{:else if threads.length === 0 && role === 'parent' && coachEmail}
				<button type="button" class="pcdm-new" onclick={() => void startParentThread()}>
					Message coach
				</button>
			{:else if threads.length === 0}
				<p class="plp-hint">No conversations yet.</p>
			{:else}
				<ul class="pcdm-thread-list" role="list">
					{#each threads as t (t.threadId)}
						<li>
							<button
								type="button"
								class="pcdm-thread-row"
								class:pcdm-thread-row--active={activeThreadId === t.threadId}
								class:pcdm-thread-row--unread={isThreadUnread(t)}
								onclick={() => openThread(t.threadId)}
							>
								<span class="pcdm-thread-row__top">
									<span class="pcdm-thread-row__name">{displayNameForThread(t)}</span>
									{#if t.lastMessageAt}
										<time class="pcdm-thread-row__time">{fmtListTime(t.lastMessageAt)}</time>
									{/if}
								</span>
								<span class="pcdm-thread-row__preview">
									{t.preview || 'No messages yet'}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			{#if role === 'coach' && !threadsLoading && parentOptions.length === 0 && threads.length === 0}
				<p class="plp-hint">No linked parents on this roster yet.</p>
			{/if}
		</aside>

		<div class="pcdm-conversation">
			{#if mobilePane === 'conversation'}
				<button type="button" class="pcdm-back" onclick={backToList}>← Threads</button>
			{/if}

			{#if showConversation}
				{#if role === 'coach' && (composingNew || !activeThreadId) && parentOptions.length > 0}
					<div class="pcdm-recipient">
						<p class="pcdm-label">To</p>
						<ul class="pcdm-recipient-list" role="list">
							{#each parentOptions as p (p.email)}
								<li>
									<button
										type="button"
										class="pcdm-recipient-row"
										class:pcdm-recipient-row--active={selectedParentEmail === p.email}
										onclick={() => (selectedParentEmail = p.email)}
									>
										{p.label}
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				<div
					class="plp-scroll"
					bind:this={scrollEl}
					role="log"
					aria-live="polite"
					aria-label="Parent coach messages"
				>
					{#if msgLoading}
						<p class="plp-hint">Loading messages…</p>
					{:else if msgErr}
						<p class="plp-err" role="alert">{msgErr}</p>
					{:else if messages.length === 0}
						<p class="plp-hint">No messages yet. Start the conversation below.</p>
					{:else}
						{#each messages as m (m.id)}
							<div class="plp-row" class:plp-row--mine={m.fromEmail === myEmail}>
								<div class="plp-content" class:plp-content--mine={m.fromEmail === myEmail}>
									<div class="plp-bubble" class:plp-bubble--mine={m.fromEmail === myEmail}>
										<div class="plp-bubble-top">
											<span class="plp-name">{m.fromEmail}</span>
											{#if m.fromRole}
												<span class="plp-role">{m.fromRole}</span>
											{/if}
										</div>
										<p class="plp-text">{m.body}</p>
										{#if m.createdAt}
											<time class="plp-time">{fmtTime(m.createdAt)}</time>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					{/if}
				</div>

				{#if engine.lastParentCoachResult?.deliveryReport}
					<DeliveryReceipt report={engine.lastParentCoachResult.deliveryReport} compact />
				{/if}

				{#if sendErr || engine.error}
					<p class="plp-err" role="alert">{sendErr || engine.error}</p>
				{/if}

				{#if canCompose && (activeThread || (role === 'parent' && coachEmail) || (role === 'coach' && selectedParentEmail))}
					<footer class="plp-footer">
						<textarea
							class="plp-input"
							rows="2"
							maxlength="4000"
							placeholder={role === 'coach' ? 'Message parent…' : 'Message coach…'}
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
			{:else}
				<p class="plp-hint pcdm-empty">Select a thread to read and reply.</p>
			{/if}
		</div>
	</div>
</section>

<style>
	.pcdm-root {
		min-height: 0;
	}

	.pcdm-workspace-head {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 4px;
	}

	.pcdm-disclosure {
		margin: 0 0 12px;
		padding: 10px 12px;
		border: 1px solid var(--pd-atom-amber, #d97706);
		background: rgba(217, 119, 6, 0.12);
		color: #fde68a;
		font-size: 12px;
		line-height: 1.45;
		border-radius: var(--pd-chamfer-sm, 4px);
	}

	.pcdm-layout {
		display: grid;
		grid-template-columns: minmax(11rem, 16rem) minmax(0, 1fr);
		gap: 14px;
		min-height: 320px;
		min-width: 0;
	}

	.pcdm-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
		border-right: 1px solid var(--pd-grey-trim, #334155);
		padding-right: 12px;
	}

	.pcdm-conversation {
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
		min-height: 0;
	}

	.pcdm-back {
		display: none;
		align-self: flex-start;
		border: none;
		border-left: 3px solid var(--pd-data-cyan, #14b8a6);
		border-radius: 0;
		padding: 6px 10px;
		background: transparent;
		color: var(--pd-nav-cyan, #06b6d4);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}

	.pcdm-new {
		padding: 10px 12px;
		border: 1px solid var(--pd-data-cyan, #14b8a6);
		border-radius: var(--pd-chamfer-sm, 4px);
		background: rgba(20, 184, 166, 0.1);
		color: #e2e8f0;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		text-align: left;
	}

	.pcdm-thread-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 4px;
		overflow-y: auto;
		max-height: 420px;
	}

	.pcdm-thread-row {
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 100%;
		padding: 10px 10px 10px 8px;
		border: 1px solid transparent;
		border-left: 3px solid transparent;
		border-radius: 0;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}

	.pcdm-thread-row:hover {
		background: rgba(15, 23, 42, 0.45);
	}

	.pcdm-thread-row--active {
		border-left-color: var(--pd-data-cyan, #14b8a6);
		background: rgba(20, 184, 166, 0.08);
	}

	.pcdm-thread-row--unread .pcdm-thread-row__name {
		color: #e2e8f0;
	}

	.pcdm-thread-row--unread .pcdm-thread-row__preview {
		color: #cbd5e1;
		font-weight: 600;
	}

	.pcdm-thread-row__top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}

	.pcdm-thread-row__name {
		font-size: 12px;
		font-weight: 800;
		color: #94a3b8;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pcdm-thread-row__time {
		flex-shrink: 0;
		font-size: 10px;
		color: #64748b;
	}

	.pcdm-thread-row__preview {
		font-size: 12px;
		line-height: 1.4;
		color: #64748b;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pcdm-label {
		margin: 0;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #64748b;
	}

	.pcdm-recipient {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.pcdm-recipient-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 140px;
		overflow-y: auto;
	}

	.pcdm-recipient-row {
		width: 100%;
		padding: 8px 10px;
		border: 1px solid var(--pd-grey-trim, #334155);
		border-left: 3px solid transparent;
		border-radius: 0;
		background: rgba(15, 23, 42, 0.35);
		color: #cbd5e1;
		font-size: 12px;
		text-align: left;
		cursor: pointer;
	}

	.pcdm-recipient-row--active {
		border-left-color: var(--pd-data-cyan, #14b8a6);
		background: rgba(20, 184, 166, 0.08);
	}

	.pcdm-empty {
		padding: 24px 0;
	}

	@media (max-width: 767px) {
		.pcdm-layout {
			grid-template-columns: 1fr;
		}

		.pcdm-list {
			border-right: none;
			padding-right: 0;
		}

		.pcdm-layout--conversation .pcdm-list {
			display: none;
		}

		.pcdm-layout:not(.pcdm-layout--conversation) .pcdm-conversation {
			display: none;
		}

		.pcdm-layout--conversation .pcdm-back {
			display: inline-flex;
		}
	}
</style>
