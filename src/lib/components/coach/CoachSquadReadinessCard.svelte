<script>
	import { browser } from '$app/environment';
	import { collection, getDocs, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { getLevelProgressFromTotalXp, MAX_PLAYER_LEVEL } from '$lib/gamification/level.js';

	let { teamId = '' } = $props();

	/** @type {Array<{ name: string, level: number, xpToNext: number, gap: number }>} */
	let levelingSoon = $state([]);
	/** @type {Array<{ name: string, status: string }>} */
	let unavailable = $state([]);
	let loading = $state(true);
	let err = $state('');

	const MOCK_PLAYERS = [
		{ name: 'Jimmy Torres', initials: 'JT', status: 'Cleared', variant: 'ok' },
		{ name: 'Ava Chen', initials: 'AC', status: 'Cleared', variant: 'ok' },
		{ name: 'Marcus Reid', initials: 'MR', status: 'Injured', variant: 'bad' },
		{ name: 'Sofia Okonkwo', initials: 'SO', status: 'Fatigued', variant: 'bad' },
	];

	const READINESS_PCT = 85;

	const OK_LOOKUP = new Set(['active', 'pending', '']);

	/**
	 * @param {unknown} v
	 */
	function normStatus(v) {
		if (typeof v !== 'string') return '';
		return v.trim().toLowerCase();
	}

	$effect(() => {
		if (!browser || !teamId) {
			levelingSoon = [];
			unavailable = [];
			loading = false;
			err = '';
			return;
		}
		let cancelled = false;
		loading = true;
		err = '';
		void (async () => {
			try {
				const [statsSnap, lookupSnap] = await Promise.all([
					getDocs(query(collection(db, 'player_stats'), where('teamId', '==', teamId))),
					getDocs(query(collection(db, 'player_lookup'), where('teamId', '==', teamId))),
				]);
				if (cancelled) return;

				/** @type {Array<{ name: string, level: number, xpToNext: number, gap: number }>} */
				const xpRows = [];
				statsSnap.forEach((d) => {
					const data = d.data();
					const name =
						typeof data.playerName === 'string' && data.playerName.trim() ?
							data.playerName.trim()
						:	'';
					if (!name) return;
					const totalXp = Math.max(0, Math.floor(Number(data.total_xp) || 0));
					const prog = getLevelProgressFromTotalXp(totalXp);
					if (prog.level >= MAX_PLAYER_LEVEL || prog.xpToNext <= 0) return;
					const gap = Math.max(0, prog.xpToNext - prog.xpIntoLevel);
					xpRows.push({
						name,
						level: prog.level,
						xpToNext: prog.xpToNext,
						gap,
					});
				});
				xpRows.sort((a, b) => a.gap - b.gap);
				levelingSoon = xpRows.slice(0, 3);

				/** @type {Array<{ name: string, status: string }>} */
				const bad = [];
				lookupSnap.forEach((d) => {
					const data = d.data();
					const name =
						typeof data.playerName === 'string' && data.playerName.trim() ?
							data.playerName.trim()
						:	'';
					const st = normStatus(data.status);
					if (!name || OK_LOOKUP.has(st)) return;
					bad.push({ name, status: typeof data.status === 'string' ? data.status.trim() : st });
				});
				bad.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
				unavailable = bad.slice(0, 8);
			} catch (e) {
				console.error('[CoachSquadReadinessCard]', e);
				err = e instanceof Error ? e.message : 'Could not load readiness.';
				levelingSoon = [];
				unavailable = [];
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});
</script>

<div
	class="rounded-2xl border border-white/5 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-md"
	data-region="coach-squad-readiness"
>
	<h2 class="mb-5 text-xs font-bold uppercase tracking-widest text-slate-400">Squad readiness</h2>

	<div class="mb-6">
		<div class="mb-2 flex items-center justify-between gap-3">
			<span class="text-sm font-semibold text-slate-200">Overall readiness</span>
			<span class="font-mono text-sm tabular-nums text-cyan-400/90">{READINESS_PCT}%</span>
		</div>
		<div class="h-2 overflow-hidden rounded-full bg-slate-800/80">
			<div
				class="h-full rounded-full bg-gradient-to-r from-cyan-600 to-emerald-400 shadow-[0_0_12px_rgba(34,211,238,0.35)] transition-[width] duration-500"
				style="width: {READINESS_PCT}%"
			></div>
		</div>
	</div>

	<div class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
		{#each MOCK_PLAYERS as p (p.name)}
			<div
				class="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-slate-950/40 p-3 backdrop-blur-sm"
			>
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-800/80 text-xs font-bold text-slate-200"
				>
					{p.initials}
				</div>
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-semibold text-slate-100">{p.name}</p>
					<span
						class="mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide {p.variant ===
						'ok'
							? 'bg-emerald-400/10 text-emerald-400'
							: 'bg-red-400/10 text-red-400'}"
					>
						{p.status}
					</span>
				</div>
			</div>
		{/each}
	</div>

	{#if loading}
		<p class="text-sm text-slate-500">Loading roster signals…</p>
	{:else if err}
		<p class="text-sm text-red-400" role="alert">{err}</p>
	{:else}
		<div class="border-t border-white/5 pt-5">
			<h3 class="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
				Live signals
			</h3>
			<div class="space-y-4">
				<div>
					<h4 class="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
						Closest to leveling up
					</h4>
					{#if levelingSoon.length === 0}
						<p class="text-xs text-slate-600">No XP progression rows yet, or squad is at cap.</p>
					{:else}
						<ol class="list-decimal space-y-2 pl-4 text-sm text-slate-300">
							{#each levelingSoon as row, i (row.name + i)}
								<li>
									<span class="font-medium text-slate-200">{row.name}</span>
									<span class="ml-1 text-xs text-slate-500">
										L{row.level} · {row.gap.toLocaleString()} XP to next
									</span>
								</li>
							{/each}
						</ol>
					{/if}
				</div>

				<div>
					<h4 class="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
						Injured / absent / inactive
					</h4>
					{#if unavailable.length === 0}
						<p class="text-xs text-slate-600">No non-active availability flags on linked players.</p>
					{:else}
						<ul class="space-y-2">
							{#each unavailable as row (row.name)}
								<li class="flex items-center justify-between gap-2 rounded-lg bg-slate-950/30 px-3 py-2">
									<span class="truncate font-mono text-xs text-slate-300">{row.name}</span>
									<span
										class="shrink-0 rounded-md border border-red-400/35 bg-red-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-300"
									>
										{row.status}
									</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
