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

<div class="readiness" data-region="coach-squad-readiness">
	<p class="readiness__eyebrow">Squad pulse</p>
	<h2 class="readiness__title">Readiness</h2>

	{#if loading}
		<p class="readiness__muted">Loading roster signals…</p>
	{:else if err}
		<p class="readiness__err" role="alert">{err}</p>
	{:else}
		<div class="readiness__block">
			<h3 class="readiness__sub">Closest to leveling up</h3>
			{#if levelingSoon.length === 0}
				<p class="readiness__muted">No XP progression rows yet, or squad is at cap.</p>
			{:else}
				<ol class="readiness__list">
					{#each levelingSoon as row, i (row.name + i)}
						<li class="readiness__li">
							<span class="readiness__name">{row.name}</span>
							<span class="readiness__meta"
								>L{row.level} · {row.gap.toLocaleString()} XP to next</span
							>
						</li>
					{/each}
				</ol>
			{/if}
		</div>

		<div class="readiness__block">
			<h3 class="readiness__sub">Injured / absent / inactive</h3>
			{#if unavailable.length === 0}
				<p class="readiness__muted">No non-active availability flags on linked players.</p>
			{:else}
				<ul class="readiness__list readiness__list--plain">
					{#each unavailable as row (row.name)}
						<li class="readiness__li readiness__li--warn">
							<span class="readiness__name">{row.name}</span>
							<span class="readiness__pill">{row.status}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<style>
	.readiness {
		min-width: 0;
	}

	.readiness__eyebrow {
		margin: 0 0 0.35rem;
		font-family: ui-sans-serif, system-ui, Inter, sans-serif;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: rgb(148 163 184);
	}

	.readiness__title {
		margin: 0 0 1rem;
		font-family: ui-sans-serif, system-ui, Inter, sans-serif;
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: rgb(248 250 252);
	}

	.readiness__block {
		margin-bottom: 1.1rem;
	}
	.readiness__block:last-child {
		margin-bottom: 0;
	}

	.readiness__sub {
		margin: 0 0 0.5rem;
		font-family: ui-sans-serif, system-ui, Inter, sans-serif;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: rgb(148 163 184);
	}

	.readiness__muted {
		margin: 0;
		font-size: 0.78rem;
		line-height: 1.45;
		color: rgb(148 163 184 / 0.9);
	}

	.readiness__err {
		margin: 0;
		font-size: 0.8rem;
		color: rgb(248 113 113);
	}

	.readiness__list {
		margin: 0;
		padding: 0 0 0 1rem;
		list-style: decimal;
	}

	.readiness__list--plain {
		list-style: none;
		padding-left: 0;
	}

	.readiness__li {
		margin-bottom: 0.45rem;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.readiness__li--warn {
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.readiness__name {
		font-family: ui-monospace, Menlo, Consolas, monospace;
		font-size: 0.8rem;
		color: rgb(226 232 240);
	}

	.readiness__meta {
		font-size: 0.68rem;
		color: rgb(34 211 238 / 0.85);
	}

	.readiness__pill {
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		padding: 0.2rem 0.45rem;
		border-radius: 0.15rem;
		border: 1px solid rgb(251 113 133 / 0.45);
		color: rgb(254 202 202);
		background: rgb(127 29 29 / 0.25);
	}
</style>
