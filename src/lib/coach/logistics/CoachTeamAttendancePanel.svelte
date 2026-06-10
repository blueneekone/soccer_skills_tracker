<script lang="ts">
	import { db, auth } from '$lib/firebase.js';
	import {
		collection,
		doc,
		onSnapshot,
		query,
		where,
		orderBy,
		limit,
		setDoc,
		serverTimestamp,
	} from 'firebase/firestore';

	let { teamId = '' } = $props();

	let rosterLoading = $state(true);
	let sessionLoading = $state(true);
	let saving = $state(false);
	let err = $state('');
	let ok = $state('');
	let sessionTitle = $state('Practice');
	/** @type {Record<string, 'present' | 'absent'>} */
	let marks = $state({});
	/** @type {Array<{ id: string; displayName: string; email: string }>} */
	let players = $state([]);
	/** @type {string | null} */
	let activeSessionId = $state(null);

	$effect(() => {
		if (!teamId) {
			players = [];
			rosterLoading = false;
			return;
		}
		rosterLoading = true;
		const q = query(collection(db, 'player_lookup'), where('teamId', '==', teamId));
		const unsub = onSnapshot(q, (snap) => {
			players = snap.docs.map((d) => {
				const data = d.data();
				const email = d.id.toLowerCase();
				const displayName =
					(typeof data.displayName === 'string' && data.displayName.trim()) ||
					(typeof data.playerName === 'string' && data.playerName.trim()) ||
					email.split('@')[0];
				return { id: d.id, displayName, email };
			});
			players.sort((a, b) => a.displayName.localeCompare(b.displayName));
			const next = { ...marks };
			for (const p of players) {
				if (!next[p.email]) next[p.email] = 'present';
			}
			marks = next;
			rosterLoading = false;
		});
		return () => unsub();
	});

	$effect(() => {
		if (!teamId) {
			activeSessionId = null;
			sessionLoading = false;
			return;
		}
		sessionLoading = true;
		const q = query(
			collection(db, 'teams', teamId, 'attendance_sessions'),
			orderBy('createdAt', 'desc'),
			limit(1),
		);
		const unsub = onSnapshot(
			q,
			(snap) => {
				const latest = snap.docs[0];
				if (latest) {
					activeSessionId = latest.id;
					const data = latest.data();
					sessionTitle = typeof data.title === 'string' ? data.title : 'Practice';
					const rec = data.records && typeof data.records === 'object' ? data.records : {};
					marks = { ...marks, ...rec };
				}
				sessionLoading = false;
			},
			() => {
				sessionLoading = false;
			},
		);
		return () => unsub();
	});

	function toggle(email: string) {
		marks = { ...marks, [email]: marks[email] === 'present' ? 'absent' : 'present' };
	}

	async function saveSession() {
		if (!teamId || !auth.currentUser) {
			err = 'Sign in and select a team.';
			return;
		}
		saving = true;
		err = '';
		ok = '';
		const sessionId =
			activeSessionId ||
			`${new Date().toISOString().slice(0, 10)}_${Date.now().toString(36)}`;
		try {
			await setDoc(
				doc(db, 'teams', teamId, 'attendance_sessions', sessionId),
				{
					teamId,
					title: sessionTitle.trim().slice(0, 120) || 'Session',
					sessionDate: new Date().toISOString().slice(0, 10),
					records: marks,
					createdBy: auth.currentUser.uid,
					updatedAt: serverTimestamp(),
					...(activeSessionId ? {} : { createdAt: serverTimestamp() }),
				},
				{ merge: true },
			);
			activeSessionId = sessionId;
			ok = 'Attendance saved.';
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not save attendance.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="ops-panel">
	<h2 class="ops-panel__title">Attendance</h2>
	<p class="ops-panel__sub">Mark present or absent for today&apos;s session. Coaches only — flat ops record for readiness views.</p>

	<label class="ops-field">
		<span class="ops-label">Session title</span>
		<input class="ops-input" type="text" bind:value={sessionTitle} maxlength="120" />
	</label>

	{#if rosterLoading || sessionLoading}
		<p class="ops-muted">Loading…</p>
	{:else if players.length === 0}
		<p class="ops-muted">No players on roster — add players before taking attendance.</p>
	{:else}
		<ul class="ops-attendance">
			{#each players as p (p.id)}
				<li class="ops-attendance__row">
					<span class="ops-attendance__name">{p.displayName}</span>
					<button
						type="button"
						class="ops-attendance__toggle"
						class:ops-attendance__toggle--absent={marks[p.email] === 'absent'}
						onclick={() => toggle(p.email)}
					>
						{marks[p.email] === 'absent' ? 'Absent' : 'Present'}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	{#if err}<p class="ops-err" role="alert">{err}</p>{/if}
	{#if ok}<p class="ops-ok" role="status">{ok}</p>{/if}
	<button type="button" class="ops-btn" disabled={!teamId || saving || players.length === 0} onclick={() => void saveSession()}>
		{saving ? 'Saving…' : 'Save attendance'}
	</button>
</div>

<style>
	.ops-panel { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
	.ops-panel__title { margin: 0; font-size: 15px; font-weight: 800; color: var(--text-primary, #0f172a); }
	.ops-panel__sub { margin: 0; font-size: 12px; color: #64748b; max-width: 40rem; }
	.ops-field { display: flex; flex-direction: column; gap: 4px; max-width: 20rem; }
	.ops-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
	.ops-input { border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 10px; font-size: 13px; background: #fff; }
	.ops-muted { margin: 0; font-size: 13px; color: #64748b; }
	.ops-err { margin: 0; font-size: 12px; color: #b91c1c; }
	.ops-ok { margin: 0; font-size: 12px; color: #15803d; }
	.ops-btn { align-self: flex-start; border: none; border-radius: 10px; padding: 10px 16px; font-weight: 700; font-size: 13px; background: #0f172a; color: #fff; cursor: pointer; }
	.ops-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.ops-attendance { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
	.ops-attendance__row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
	.ops-attendance__name { font-size: 13px; font-weight: 600; color: #0f172a; }
	.ops-attendance__toggle { border: 1px solid #16a34a; background: #f0fdf4; color: #15803d; border-radius: 999px; padding: 4px 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
	.ops-attendance__toggle--absent { border-color: #dc2626; background: #fef2f2; color: #b91c1c; }
</style>
