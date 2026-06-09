<script lang="ts">
	import { browser } from '$app/environment';
	import { collection, getDocs, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import EligibilityBadge from './EligibilityBadge.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	/**
	 * @typedef {{
	 *   id: string; name: string; number: string; position: string;
	 *   stamina: number; hr: number;
	 *   vpc_approved: boolean;
	 *   status: 'READY' | 'FATIGUED' | 'INJURED' | 'SUSPENDED' | 'OFFLINE' | 'INJURY RISK';
	 *   skills?: number[];
	 * }} ReadinessPlayer
	 */

	/** @type {{ teamId?: string; player?: ReadinessPlayer | null }} */
	let { teamId = '', player = null } = $props();

	// ── Individual card derived state ─────────────────────────────────────────
	const initials = $derived(
		player
			? player.name
					.split(/[\s.]/)
					.filter(Boolean)
					.map((p) => p[0])
					.join('')
					.slice(0, 2)
					.toUpperCase()
			: '',
	);
	/** @type {Record<string, string>} */
	const STATUS_COLORS = {
		READY: '#14b8a6',
		FATIGUED: '#ffff00',
		INJURED: '#ff003c',
		SUSPENDED: '#ff6600',
		OFFLINE: '#666666',
		'INJURY RISK': '#ff003c',
	};
	const statusColor = $derived(player ? (STATUS_COLORS[player.status] ?? '#ffffff') : '#ffffff');
	const isAtRisk = $derived(player?.status === 'INJURY RISK');
	const isOffline = $derived(player?.status === 'OFFLINE');
	/** Deterministic skill bar values — fall back if roster row omits skills. */
	const skillBars = $derived(
		player?.skills && player.skills.length > 0
			? player.skills
			: [70, 65, 72, 68, 75, 70],
	);
	const SKILL_LABELS = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'];
	const staminaColor = $derived(
		player ? (player.stamina >= 70 ? '#14b8a6' : player.stamina >= 40 ? '#ffff00' : '#ff003c') : '#14b8a6',
	);
	const hrColor = $derived(
		player ? (player.hr <= 80 ? '#14b8a6' : player.hr <= 100 ? '#ffff00' : '#ff003c') : '#14b8a6',
	);

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
				const lookupSnap = await getDocs(
					query(collection(db, 'player_lookup'), where('teamId', '==', teamId)),
				);
				if (cancelled) return;

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

<svelte:head>
	<style>
		@keyframes atRiskPulse {
			0%, 100% { box-shadow: inset 0 1px 1px rgba(255, 0, 60, 0.1), 0 0 24px rgba(255, 0, 60, 0.35); }
			50% { box-shadow: inset 0 1px 1px rgba(255, 0, 60, 0.18), 0 0 36px rgba(255, 0, 60, 0.6); }
		}
	</style>
</svelte:head>

{#if player}
	<!-- ── Individual Readiness Card ──────────────────────────────────────────── -->
	<article
		class="tw-relative tw-rounded-2xl tw-border tw-p-4 tw-backdrop-blur-3xl tw-transition-all {isAtRisk
			? 'tw-border-[#ff003c]/55 tw-bg-[#1a0008]/80 tw-shadow-[inset_0_1px_1px_rgba(255,0,60,0.1),_0_0_24px_rgba(255,0,60,0.35)] tw-animate-[atRiskPulse_2.4s_ease-in-out_infinite]'
			: isOffline
				? 'tw-border-white/8 tw-bg-[#020202]/60 tw-opacity-60 tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]'
				: 'tw-border-white/10 tw-bg-[#020202]/80 tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] hover:tw-border-white/20 hover:tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_0_24px_rgba(20, 184, 166,0.06)]'}"
		data-player-id={player.id}
		data-status={player.status}
	>
		<!-- Header: avatar + identity + status -->
		<div class="tw-mb-3 tw-flex tw-items-start tw-justify-between tw-gap-2">
			<div class="tw-flex tw-min-w-0 tw-items-center tw-gap-3">
				<div
					class="tw-relative tw-flex tw-h-11 tw-w-11 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-white/15 tw-bg-[#0a0a14] tw-font-mono tw-text-sm tw-font-bold tw-text-white/80"
					style="box-shadow: 0 0 0 2px {statusColor}33;"
				>
					{initials}
					<span
						class="tw-absolute tw-bottom-0 tw-right-0 tw-h-2.5 tw-w-2.5 tw-rounded-full tw-border-2 tw-border-[#020202]"
						style="background: {statusColor};"
					></span>
				</div>
				<div class="tw-min-w-0">
					<p class="tw-truncate tw-font-mono tw-text-xs tw-font-bold tw-text-white/90">{player.name}</p>
					<p class="tw-font-mono tw-text-[10px] tw-text-white/40">{player.position} · #{player.number}</p>
				</div>
			</div>
			<span
				class="tw-shrink-0 tw-rounded-full tw-px-2 tw-py-0.5 tw-font-mono tw-text-[8px] tw-font-bold tw-uppercase tw-tracking-widest"
				style="color: {statusColor}; background: {statusColor}18; border: 1px solid {statusColor}40;"
			>
				{player.status}
			</span>
		</div>

		<!-- Biometrics + VPC consent gate -->
		<div class="tw-relative tw-mb-3 tw-rounded-xl tw-border tw-border-white/5 tw-bg-white/[0.02] tw-p-3">
			<div class="tw-grid tw-grid-cols-2 tw-gap-3" class:tw-opacity-0={!player.vpc_approved}>
				<div>
					<p class="tw-mb-0.5 tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest tw-text-white/30">
						STAMINA
					</p>
					<p class="tw-font-mono tw-text-lg tw-font-bold tw-tabular-nums" style="color: {staminaColor};">
						{player.stamina}<span class="tw-text-[10px] tw-opacity-60">%</span>
					</p>
					<div class="tw-mt-1 tw-h-0.5 tw-overflow-hidden tw-rounded-full tw-bg-white/10">
						<div
							class="tw-h-full tw-rounded-full"
							style="width: {player.stamina}%; background: {staminaColor};"
						></div>
					</div>
				</div>
				<div>
					<p class="tw-mb-0.5 tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest tw-text-white/30">
						HEART RATE
					</p>
					<p class="tw-font-mono tw-text-lg tw-font-bold tw-tabular-nums" style="color: {hrColor};">
						{player.hr}<span class="tw-text-[10px] tw-opacity-60"> bpm</span>
					</p>
				</div>
			</div>
		{#if !player.vpc_approved}
			<div
				class="tw-absolute tw-inset-0 tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-1 tw-rounded-xl tw-bg-[#020202]/80 tw-backdrop-blur-sm"
			>
				<Icon name="sys.lock" size={14} class="tw-text-[#ff003c]" />
				<span
					class="tw-font-mono tw-text-[8px] tw-font-bold tw-uppercase tw-tracking-[0.15em] tw-text-[#ff003c]"
					>CONSENT REQUIRED</span
				>
			</div>
		{/if}
		</div>

		<!-- Skill Radar sparkline — cyan-bloomed bars -->
		<div class="tw-mb-3 tw-rounded-xl tw-border tw-border-[#14b8a6]/15 tw-bg-[#14b8a6]/[0.03] tw-p-2.5">
			<p class="tw-mb-1.5 tw-font-mono tw-text-[8px] tw-font-bold tw-uppercase tw-tracking-[0.2em] tw-text-[#14b8a6]/70">
				SKILL RADAR
			</p>
			<svg class="tw-block tw-h-10 tw-w-full" viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true">
				<defs>
					<filter id="csrcSparkBloom-{player.id}" x="-20%" y="-50%" width="140%" height="200%">
						<feGaussianBlur in="SourceGraphic" stdDeviation="0.85" result="blur" />
						<feMerge>
							<feMergeNode in="blur" />
							<feMergeNode in="blur" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
					<linearGradient id="csrcSparkGrad-{player.id}" x1="0" y1="1" x2="0" y2="0">
						<stop offset="0%" stop-color="#14b8a6" stop-opacity="0.25" />
						<stop offset="100%" stop-color="#14b8a6" stop-opacity="1" />
					</linearGradient>
				</defs>
				{#each skillBars as v, i (i)}
					{@const barX = i * 20 + 4}
					{@const barH = Math.max(2, (Math.min(99, Math.max(0, v)) / 99) * 28)}
					{@const barY = 30 - barH}
					<rect
						x={barX}
						y={barY}
						width="12"
						height={barH}
						rx="1.5"
						fill="url(#csrcSparkGrad-{player.id})"
						filter="url(#csrcSparkBloom-{player.id})"
						opacity={isOffline ? 0.4 : 1}
					/>
				{/each}
			</svg>
			<div class="tw-mt-1 tw-flex tw-justify-between tw-px-1 tw-font-mono tw-text-[7px] tw-font-bold tw-tracking-widest tw-text-white/35">
				{#each SKILL_LABELS as lbl, i (lbl + i)}
					<span>{lbl}</span>
				{/each}
			</div>
		</div>

		<!-- VPC eligibility pill -->
		<EligibilityBadge vpc_approved={player.vpc_approved} />
	</article>
{:else}

<div
	class="rounded-3xl border border-white/10 bg-[#020202]/80 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-3xl"
	data-region="coach-squad-readiness"
>
	<h2 class="mb-5 text-xs font-bold uppercase tracking-widest text-slate-400">Squad readiness</h2>

	<div class="mb-6">
		<div class="mb-2 flex items-center justify-between gap-3">
			<span class="text-sm font-semibold uppercase tracking-wider text-slate-200">Overall readiness</span>
			<span class="font-mono text-sm tabular-nums text-cyan-400/90">{READINESS_PCT}%</span>
		</div>
		<div class="h-2 overflow-hidden rounded-full bg-slate-800/80">
			<div
				class="h-full rounded-full bg-gradient-to-r from-cyan-600 to-emerald-400 shadow-[0_0_12px_rgba(20, 184, 166,0.35)] transition-[width] duration-500"
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
						class="mt-1 inline-block rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide {p.variant ===
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
						Injured / absent / inactive
					</h4>
					{#if unavailable.length === 0}
						<p class="text-xs text-slate-600">No non-active availability flags on linked players.</p>
					{:else}
						<ul class="space-y-2">
							{#each unavailable as row (row.name)}
								<li class="flex items-center justify-between gap-2 rounded-2xl bg-slate-950/30 px-3 py-2">
									<span class="truncate font-mono text-xs text-slate-300">{row.name}</span>
									<span
										class="shrink-0 rounded-full border border-red-400/35 bg-red-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-red-300"
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

{/if}
