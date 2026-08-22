<script lang="ts">
	import { page } from '$app/state';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { collection, query, where, onSnapshot } from 'firebase/firestore';
	import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
	import Icon from '$lib/components/ui/Icon.svelte';

	const teamId = $derived(page.params.teamId);

	const teamMeta = $derived(
		teamsStore.teams.find((t) => t.id === teamId) ?? null,
	);

	interface PlayerRow {
		id: string;
		displayName: string;
		email: string;
		parentName: string;
		parentEmail: string;
		parentPhone: string;
		jerseyNumber: string | number;
	}

	let players = $state<PlayerRow[]>([]);
	let loading = $state(true);
	let err = $state('');

	let unsub: (() => void) | null = null;

	$effect(() => {
		if (!db || !authStore.isAuthenticated || !teamId) return;
		if (!isFirestoreReady()) return;
		loading = true;
		err = '';
		unsub?.();
		const q = query(collection(db, 'player_lookup'), where('teamId', '==', teamId));
		unsub = onSnapshot(
			q,
			(snap) => {
				players = snap.docs.map((d) => {
					const x = d.data();
					return {
						id: d.id,
						displayName: String(x.displayName ?? x.name ?? '—'),
						email: String(x.email ?? '—'),
						parentName: String(x.parentName ?? '—'),
						parentEmail: String(x.parentEmail ?? '—'),
						parentPhone: String(x.parentPhone ?? '—'),
						jerseyNumber: x.jerseyNumber ?? x.number ?? '—',
					};
				});
				loading = false;
			},
			(e) => {
				console.error('[DirectorTeamRoster] onSnapshot error', e);
				err = e.message || 'Failed to load roster.';
				loading = false;
			},
		);
		return () => { unsub?.(); unsub = null; };
	});
</script>

<svelte:head>
	<title>Roster — {teamMeta?.name ?? teamId} · Director OS · Vanguard OS</title>
</svelte:head>

<div class="dtr-root">
	<header class="dtr-header">
		<nav class="dtr-breadcrumb" aria-label="Breadcrumb">
			<a href="/director/dashboard?tab=teams" class="dtr-bc-link">← Teams</a>
			<span class="dtr-bc-sep">›</span>
			<span class="dtr-bc-current">{teamMeta?.name ?? teamId}</span>
			<span class="dtr-bc-sep">›</span>
			<span class="dtr-bc-active">Roster</span>
		</nav>
		<div class="dtr-title-row">
			<div>
				<h1 class="dtr-title">{teamMeta?.name ?? teamId} — Roster</h1>
				<p class="dtr-subtitle">Athletes registered in team <code class="dtr-code">{teamId}</code>.</p>
			</div>
			<span class="dtr-count-badge">{loading ? '…' : players.length} ATHLETES</span>
		</div>
	</header>

	<main class="dtr-main">
		{#if loading}
			<div class="dtr-loading"><span class="dtr-spinner"></span><p class="dtr-loading-text">Loading roster telemetry…</p></div>
		{:else if err}
			<div class="dtr-error"><p>{err}</p></div>
		{:else if players.length === 0}
			<div class="dtr-empty">
				<p class="dtr-empty-title">No athletes on this roster yet.</p>
				<p class="dtr-empty-sub">Coaches can upload a roster CSV from the Team Ops panel, or athletes can be linked via parent onboarding.</p>
			</div>
		{:else}
			<div class="dtr-table-wrap" role="region" aria-label="Roster table">
				<table class="dtr-table">
					<thead>
						<tr class="dtr-thead-row">
							<th class="dtr-th dtr-th--jersey">#</th>
							<th class="dtr-th">Athlete</th>
							<th class="dtr-th dtr-th--email">Email</th>
							<th class="dtr-th">Parent / Guardian</th>
							<th class="dtr-th dtr-th--contact">Contact</th>
						</tr>
					</thead>
					<tbody>
						{#each players as p (p.id)}
							<tr class="dtr-row">
								<td class="dtr-td dtr-td--jersey">{p.jerseyNumber}</td>
								<td class="dtr-td dtr-td--name">{p.displayName}</td>
								<td class="dtr-td dtr-td--email">{p.email}</td>
								<td class="dtr-td">{p.parentName}</td>
								<td class="dtr-td dtr-td--contact">
									<span class="dtr-contact-line">{p.parentEmail}</span>
									{#if p.parentPhone !== '—'}<span class="dtr-contact-line dtr-contact-line--phone">{p.parentPhone}</span>{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</main>
</div>

<style>
	.dtr-root { min-height: 100dvh; background: #000000; color: #fafafa; display: flex; flex-direction: column; font-family: 'Geist Sans', 'Inter', sans-serif; }
	.dtr-header { background: #0f172a; border-bottom: 1px solid #334155; padding: clamp(16px,3vw,24px) clamp(20px,4vw,40px); display: flex; flex-direction: column; gap: 12px; }
	.dtr-breadcrumb { display: flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 11px; color: #94a3b8; }
	.dtr-bc-link { color: #14b8a6; text-decoration: none; transition: color 150ms; }
	.dtr-bc-link:hover { color: #5eead4; }
	.dtr-bc-sep { color: #334155; }
	.dtr-bc-current { color: #94a3b8; }
	.dtr-bc-active { color: #fafafa; font-weight: 700; }
	.dtr-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
	.dtr-title { margin: 0; font-family: 'Geist Mono', monospace; font-size: clamp(16px,2.5vw,22px); font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; color: #fafafa; }
	.dtr-subtitle { margin: 4px 0 0; font-size: 12px; color: #94a3b8; }
	.dtr-code { font-family: 'Geist Mono', monospace; font-size: 11px; color: #14b8a6; background: #0f172a; border: 1px solid #334155; padding: 1px 6px; }
	.dtr-count-badge { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: #daff0a; background: #0f172a; border: 1px solid #334155; padding: 6px 14px; white-space: nowrap; align-self: center; }
	.dtr-main { flex: 1; padding: clamp(20px,3vw,32px) clamp(20px,4vw,40px); }
	.dtr-loading { display: flex; align-items: center; gap: 12px; padding: 48px 0; }
	.dtr-spinner { width: 18px; height: 18px; border: 2px solid #334155; border-top-color: #14b8a6; border-radius: 50%; animation: dtr-spin 0.8s linear infinite; }
	@keyframes dtr-spin { to { transform: rotate(360deg); } }
	.dtr-loading-text { font-family: 'Geist Mono', monospace; font-size: 12px; color: #64748b; margin: 0; }
	.dtr-error { padding: 20px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; font-family: 'Geist Mono', monospace; font-size: 12px; }
	.dtr-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 64px 20px; text-align: center; border: 1px dashed #334155; color: #64748b; }
	.dtr-empty-title { margin: 0; font-family: 'Geist Mono', monospace; font-size: 14px; color: #94a3b8; font-weight: 700; }
	.dtr-empty-sub { margin: 0; font-size: 12px; max-width: 420px; line-height: 1.6; }
	.dtr-table-wrap { overflow-x: auto; border: 1px solid #334155; }
	.dtr-table { width: 100%; border-collapse: collapse; font-family: 'Geist Mono', monospace; font-size: 12px; }
	.dtr-thead-row { background: #0f172a; border-bottom: 1px solid #334155; }
	.dtr-th { padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; white-space: nowrap; }
	.dtr-th--jersey { width: 48px; text-align: center; }
	.dtr-row { border-bottom: 1px solid #1e293b; transition: background 120ms; }
	.dtr-row:hover { background: rgba(20,184,166,0.05); }
	.dtr-row:last-child { border-bottom: none; }
	.dtr-td { padding: 10px 14px; color: #d4d4d8; vertical-align: middle; }
	.dtr-td--jersey { color: #daff0a; font-weight: 900; text-align: center; }
	.dtr-td--name { color: #fafafa; font-weight: 700; }
	.dtr-td--email { color: #14b8a6; font-size: 11px; }
	.dtr-contact-line { display: block; color: #94a3b8; }
	.dtr-contact-line--phone { color: #64748b; font-size: 10px; }
</style>