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
	}: {
		clubId: string;
		teamId: string;
		teamName?: string;
	} = $props();

	const engine = new CommsEngine();
	const role = $derived(authStore.role);
	const myEmail = $derived((authStore.user?.email ?? '').toLowerCase());

	type ThreadRow = {
		threadId: string;
		parentEmail: string;
		coachEmail: string;
		includeAdOnParentDms: boolean;
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

	const title = $derived(
		teamName ? `${teamName} · Coach messages` : 'Coach messages',
	);
	const activeThread = $derived(threads.find((t) => t.threadId === activeThreadId) ?? null);
	const canCompose = $derived(!readOnly && (role === 'parent' || role === 'coach'));

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
				threads = res.threads.map((t) => ({
					threadId: t.threadId,
					parentEmail: t.parentEmail,
					coachEmail: t.coachEmail,
					includeAdOnParentDms: t.includeAdOnParentDms,
				}));
				includeAdOnParentDms = res.includeAdOnParentDms;
				readOnly = res.readOnly;
				if (!activeThreadId && threads.length > 0) {
					activeThreadId = threads[0].threadId;
				}
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

	async function startParentThread() {
		if (!coachEmail || readOnly) return;
		activeThreadId = '';
		selectedParentEmail = myEmail;
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
			if (result.threadId) activeThreadId = result.threadId;
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

<section class="plp-root" aria-labelledby="pcdm-heading">
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

	{#if includeAdOnParentDms}
		<p class="pcdm-disclosure" role="status">
			Club disclosure: an athletic director may read parent↔coach messages for oversight. Both
			parent and coach see this notice.
		</p>
	{/if}

	{#if threadsLoading}
		<p class="plp-hint">Loading threads…</p>
	{:else if threads.length > 0}
		<div class="pcdm-thread-picker">
			<label class="pcdm-label" for="pcdm-thread-select">Thread</label>
			<select
				id="pcdm-thread-select"
				class="pcdm-select"
				bind:value={activeThreadId}
			>
				{#each threads as t (t.threadId)}
					<option value={t.threadId}>
						{role === 'coach' ? t.parentEmail : t.coachEmail}
					</option>
				{/each}
			</select>
		</div>
	{:else if role === 'parent' && coachEmail}
		<button type="button" class="pcdm-start" onclick={() => void startParentThread()}>
			Message coach
		</button>
	{/if}

	{#if role === 'coach' && !activeThreadId && parentOptions.length > 0}
		<div class="pcdm-thread-picker">
			<label class="pcdm-label" for="pcdm-parent-select">Message parent</label>
			<select id="pcdm-parent-select" class="pcdm-select" bind:value={selectedParentEmail}>
				<option value="">Select a parent…</option>
				{#each parentOptions as p (p.email)}
					<option value={p.email}>{p.label}</option>
				{/each}
			</select>
		</div>
	{/if}

	{#if activeThreadId || (role === 'parent' && coachEmail) || (role === 'coach' && selectedParentEmail)}
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

		{#if canCompose}
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
	{:else if !threadsLoading && role === 'coach' && parentOptions.length === 0}
		<p class="plp-hint">No linked parents on this roster yet.</p>
	{/if}
</section>

<style>
	.pcdm-disclosure {
		margin: 0 0 12px;
		padding: 10px 12px;
		border: 1px solid #fbbf24;
		background: rgba(251, 191, 36, 0.1);
		color: #fde68a;
		font-size: 12px;
		line-height: 1.45;
	}

	.pcdm-thread-picker {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 12px;
	}

	.pcdm-label {
		font-size: 11px;
		font-weight: 700;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.pcdm-select {
		padding: 10px 12px;
		border: 1px solid #334155;
		background: #0f172a;
		color: #e2e8f0;
		font-size: 13px;
	}

	.pcdm-start {
		margin-bottom: 12px;
		padding: 10px 14px;
		border: 1px solid #14b8a6;
		background: rgba(20, 184, 166, 0.12);
		color: #e2e8f0;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		text-align: left;
	}
</style>
