<script lang="ts">
	import { browser } from '$app/environment';
	import {
		collection,
		limit,
		onSnapshot,
		orderBy,
		query,
		where,
		doc,
		getDoc,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { workoutsStore } from '$lib/stores/workouts.svelte.js';
	import { CommsEngine } from '$lib/services/comms.svelte.js';
	import DeliveryReceipt from '$lib/components/comms/DeliveryReceipt.svelte';

	let {
		clubId,
		teamId,
		teamName = '',
		calendarEventId = '',
	}: {
		clubId: string;
		teamId: string;
		teamName?: string;
		calendarEventId?: string;
	} = $props();

	const engine = new CommsEngine();
	const role = $derived(authStore.role);
	const canSchedule = $derived(role === 'coach' || role === 'director');
	const canJoin = $derived(
		role === 'parent' || role === 'coach' || role === 'director',
	);

	type SessionRow = {
		id: string;
		title: string;
		calendarEventId: string;
		scheduledStartTimestamp: number | null;
		hostEmail: string;
	};

	type CalendarOption = {
		id: string;
		label: string;
		startTimestamp: number | null;
	};

	let sessions = $state<SessionRow[]>([]);
	let sessionsLoading = $state(false);
	let calendarOptions = $state<CalendarOption[]>([]);
	let selectedCalendarEventId = $state('');
	let sessionTitle = $state('');
	let scheduleErr = $state('');
	let joinErr = $state('');
	let activeSessionId = $state('');
	let joinedSessionId = $state('');
	let disclosure = $state('');

	const title = $derived(
		teamName ? `${teamName} · Parent voice sessions` : 'Parent voice sessions',
	);

	function fmtStart(ts: number | null): string {
		if (ts == null || !Number.isFinite(ts)) return 'Time TBD';
		return new Date(ts).toLocaleString(undefined, {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		});
	}

	$effect(() => {
		const cId = clubId?.trim();
		const tId = teamId?.trim();
		if (!browser || !cId || !tId) {
			sessions = [];
			return;
		}

		sessionsLoading = true;
		const q = query(
			collection(db, 'clubs', cId, 'parent_voice_sessions'),
			where('teamId', '==', tId),
			orderBy('scheduledStartTimestamp', 'desc'),
			limit(20),
		);
		const unsub = onSnapshot(
			q,
			(snap) => {
				sessions = snap.docs.map((d) => {
					const x = d.data();
					return {
						id: d.id,
						title: String(x.title || 'Parent info session'),
						calendarEventId: String(x.calendarEventId || ''),
						scheduledStartTimestamp:
							typeof x.scheduledStartTimestamp === 'number' ?
								x.scheduledStartTimestamp :
								null,
						hostEmail: String(x.hostEmail || ''),
					};
				});
				sessionsLoading = false;
			},
			() => {
				sessionsLoading = false;
			},
		);
		return () => unsub();
	});

	$effect(() => {
		const tId = teamId?.trim();
		if (!browser || !tId) {
			calendarOptions = [];
			return;
		}
		void workoutsStore.loadForTeam(tId);
	});

	$effect(() => {
		calendarOptions = workoutsStore.scheduledEvents.map((ev) => ({
			id: String(ev.id),
			label: `${String(ev.name || ev.eventKind || 'Event')} · ${fmtStart(
				typeof ev.startTimestamp === 'number' ? ev.startTimestamp : null,
			)}`,
			startTimestamp:
				typeof ev.startTimestamp === 'number' ? ev.startTimestamp : null,
		}));
	});

	$effect(() => {
		const deep = calendarEventId?.trim();
		if (deep) selectedCalendarEventId = deep;
	});

	async function scheduleSession() {
		const cId = clubId?.trim();
		const tId = teamId?.trim();
		const evId = selectedCalendarEventId?.trim();
		if (!cId || !tId || !evId) {
			scheduleErr = 'Select a calendar event to link this session.';
			return;
		}
		scheduleErr = '';
		try {
			await engine.createParentVoiceSession({
				clubId: cId,
				teamId: tId,
				calendarEventId: evId,
				title: sessionTitle.trim() || undefined,
			});
			sessionTitle = '';
		} catch (e) {
			scheduleErr = e instanceof Error ? e.message : 'Could not schedule session.';
		}
	}

	async function joinSession(sessionId: string, action: 'join' | 'leave' = 'join') {
		const cId = clubId?.trim();
		if (!cId || !sessionId) return;
		joinErr = '';
		try {
			const result = await engine.joinParentVoiceSession({ clubId: cId, sessionId, action });
			disclosure = result.disclosure;
			if (action === 'join') {
				joinedSessionId = sessionId;
				activeSessionId = sessionId;
			} else if (joinedSessionId === sessionId) {
				joinedSessionId = '';
			}
		} catch (e) {
			joinErr = e instanceof Error ? e.message : 'Could not update session attendance.';
		}
	}

	async function openLinkedEvent(evId: string) {
		if (!evId) return;
		const snap = await getDoc(doc(db, 'team_workouts', evId));
		if (!snap.exists()) return;
		const data = snap.data();
		const name = String(data.name || 'Calendar event');
		const ts =
			typeof data.startTimestamp === 'number' ? data.startTimestamp : null;
		disclosure = `${name} · ${fmtStart(ts)}`;
	}
</script>

<section class="pvs-lobby" aria-labelledby="pvs-lobby-title">
	<header class="pvs-head">
		<h2 id="pvs-lobby-title" class="pvs-title">{title}</h2>
		<p class="pvs-disclosure">
			Attendance (join and leave times) is logged for club compliance. There is no undisclosed monitoring.
			Sessions are <strong>not recorded</strong> in v1 — recording requires a future consent workflow
			(COMMS-VOICE-RECORDING).
		</p>
	</header>

	{#if canSchedule}
		<div class="pvs-schedule">
			<h3 class="pvs-sub">Schedule parent info session</h3>
			<p class="pvs-hint">Link a voice session to a team calendar event in <code>team_workouts</code>.</p>
			<label class="pvs-label">
				Calendar event
				<select class="pvs-input" bind:value={selectedCalendarEventId}>
					<option value="">Select event…</option>
					{#each calendarOptions as opt (opt.id)}
						<option value={opt.id}>{opt.label}</option>
					{/each}
				</select>
			</label>
			<label class="pvs-label">
				Session title (optional)
				<input
					class="pvs-input"
					type="text"
					maxlength="200"
					placeholder="Season kickoff Q&A"
					bind:value={sessionTitle}
				/>
			</label>
			<button
				type="button"
				class="pvs-btn pvs-btn--primary"
				disabled={engine.isSending || !selectedCalendarEventId}
				onclick={() => void scheduleSession()}
			>
				{engine.isSending ? 'Scheduling…' : 'Schedule session'}
			</button>
			{#if scheduleErr || engine.error}
				<p class="pvs-err" role="alert">{scheduleErr || engine.error}</p>
			{/if}
			{#if engine.lastVoiceSessionResult && 'deliveryReport' in engine.lastVoiceSessionResult}
				<DeliveryReceipt report={engine.lastVoiceSessionResult.deliveryReport} compact />
			{/if}
		</div>
	{/if}

	<div class="pvs-list">
		<h3 class="pvs-sub">Scheduled sessions</h3>
		{#if sessionsLoading}
			<p class="pvs-hint">Loading sessions…</p>
		{:else if sessions.length === 0}
			<p class="pvs-hint">No parent voice sessions scheduled for this team yet.</p>
		{:else}
			<ul class="pvs-cards">
				{#each sessions as s (s.id)}
					<li class="pvs-card">
						<div class="pvs-card__top">
							<strong>{s.title}</strong>
							<time>{fmtStart(s.scheduledStartTimestamp)}</time>
						</div>
						<p class="pvs-hint">Host: {s.hostEmail}</p>
						{#if s.calendarEventId}
							<button
								type="button"
								class="pvs-link"
								onclick={() => void openLinkedEvent(s.calendarEventId)}
							>
								View linked calendar event
							</button>
						{/if}
						{#if canJoin}
							<div class="pvs-card__actions">
								{#if joinedSessionId === s.id}
									<span class="pvs-badge">In session</span>
									<button
										type="button"
										class="pvs-btn"
										disabled={engine.isSending}
										onclick={() => void joinSession(s.id, 'leave')}
									>
										Leave session
									</button>
								{:else}
									<button
										type="button"
										class="pvs-btn pvs-btn--primary"
										disabled={engine.isSending}
										onclick={() => void joinSession(s.id, 'join')}
									>
										Join session
									</button>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if disclosure}
		<p class="pvs-note" role="status">{disclosure}</p>
	{/if}
	{#if joinErr}
		<p class="pvs-err" role="alert">{joinErr}</p>
	{/if}
	{#if engine.lastVoiceSessionResult && 'metadataOnly' in engine.lastVoiceSessionResult}
		{#if engine.lastVoiceSessionResult.metadataOnly}
			<p class="pvs-hint">
				Voice vendor is not enabled on this environment — attendance metadata only.
			</p>
		{:else if engine.lastVoiceSessionResult.vendorToken}
			<p class="pvs-hint">Voice token minted (stub vendor behind feature flag).</p>
		{/if}
	{/if}
</section>

<style>
	.pvs-lobby {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 0.75rem 0;
	}
	.pvs-head {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.pvs-title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
	}
	.pvs-disclosure {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.45;
		color: var(--color-text-muted, #94a3b8);
	}
	.pvs-sub {
		margin: 0 0 0.35rem;
		font-size: 0.9rem;
		font-weight: 600;
	}
	.pvs-hint {
		margin: 0;
		font-size: 0.8rem;
		color: var(--color-text-muted, #94a3b8);
	}
	.pvs-label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.8rem;
		margin-bottom: 0.5rem;
	}
	.pvs-input {
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--color-border, #334155);
		border-radius: 4px;
		background: var(--color-surface, #0f172a);
		color: inherit;
	}
	.pvs-schedule,
	.pvs-list {
		border: 1px solid var(--color-border, #334155);
		border-radius: 6px;
		padding: 0.75rem;
	}
	.pvs-cards {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}
	.pvs-card {
		border: 1px solid var(--color-border, #334155);
		border-radius: 6px;
		padding: 0.65rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.pvs-card__top {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.pvs-card__actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.pvs-btn {
		padding: 0.35rem 0.65rem;
		border: 1px solid var(--color-border, #334155);
		border-radius: 4px;
		background: transparent;
		color: inherit;
		cursor: pointer;
		font-size: 0.8rem;
	}
	.pvs-btn--primary {
		background: var(--color-accent, #fbbf24);
		color: #0f172a;
		border-color: transparent;
	}
	.pvs-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.pvs-link {
		background: none;
		border: none;
		padding: 0;
		color: var(--color-accent, #fbbf24);
		font-size: 0.8rem;
		cursor: pointer;
		text-align: left;
	}
	.pvs-badge {
		font-size: 0.75rem;
		padding: 0.15rem 0.4rem;
		border-radius: 999px;
		background: rgba(34, 197, 94, 0.15);
		color: #86efac;
	}
	.pvs-err {
		margin: 0.35rem 0 0;
		color: #f87171;
		font-size: 0.8rem;
	}
	.pvs-note {
		margin: 0;
		font-size: 0.8rem;
		color: var(--color-text-muted, #94a3b8);
	}
</style>
