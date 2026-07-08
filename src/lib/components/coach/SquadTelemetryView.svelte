<script lang="ts">
	/**
	 * Coach OS — Squad Telemetry View (Tactical SIEM Dashboard)
	 * Sprint 6.1: Subcollection Event-Sourcing & bento-span-12 aesthetics
	 */
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { db } from '$lib/firebase.js';
	import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { teamId = '', matchId = '' } = $props();

	/** @type {Array<Record<string, any>>} */
	let events = $state([]);
	let errorState = $state('');

	$effect(() => {
		const tid = teamId;
		const mid = matchId;
		/** @type {undefined | (() => void)} */
		let unsub;

		untrack(() => {
			if (!browser || !tid || !mid) {
				events = [];
				errorState = '';
				return;
			}
			errorState = '';

			const q = query(
				collection(db, 'teams', tid, 'telemetry_events'),
				where('matchId', '==', mid),
				orderBy('timestamp', 'desc')
			);

			unsub = onSnapshot(
				q,
				(snap) => {
					let newEvents: Array<Record<string, any>> = [];
					snap.forEach((d) => newEvents.push({ id: d.id, ...d.data() }));
					events = newEvents;
				},
				(e) => {
					console.error('[SquadTelemetry] onSnapshot Error:', e);
					errorState = 'Live feed unavailable. Ensure Firestore indexes are built.';
				}
			);
		});

		return () => {
			if (unsub) unsub();
		};
	});

	let statsByPlayer = $derived(() => {
		let agg: Record<string, { goals: number, assists: number, shots: number, saves: number, tackles: number }> = {};
		for (const ev of events) {
			if (!ev.playerId) continue;
			if (!agg[ev.playerId]) {
				agg[ev.playerId] = { goals: 0, assists: 0, shots: 0, saves: 0, tackles: 0 };
			}
			if (ev.action === 'goal') agg[ev.playerId].goals++;
			else if (ev.action === 'assist') agg[ev.playerId].assists++;
			else if (ev.action === 'shot') agg[ev.playerId].shots++;
			else if (ev.action === 'save') agg[ev.playerId].saves++;
			else if (ev.action === 'tackle') agg[ev.playerId].tackles++;
		}
		return agg;
	});
	
	let aggStats = $derived(statsByPlayer());
</script>

<div class="tw-col-span-1 tw-md:col-span-12 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-6 tw-flex tw-flex-col tw-gap-4">
	<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-3">
		<div class="tw-flex tw-items-center tw-gap-3">
			<Icon name={"comms.radar" as IconName} size={20} class="tw-text-[#14b8a6]" />
			<h2 class="tw-text-[#f8fafc] tw-font-mono tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase">
				Live Squad Telemetry
			</h2>
		</div>
		<div class="tw-flex tw-items-center tw-gap-2">
			<div class="tw-w-2 tw-h-2 tw-rounded-none tw-bg-[#14b8a6] tw-animate-pulse"></div>
			<span class="tw-text-[#64748b] tw-font-mono tw-text-xs tw-uppercase">Sync Active</span>
		</div>
	</div>

	{#if errorState}
		<div class="tw-bg-[#020617] tw-border tw-border-[#ef4444] tw-p-4 tw-text-[#ef4444] tw-font-mono tw-text-xs">
			[SYS.ERR] {errorState}
		</div>
	{/if}

	{#if !teamId || !matchId}
		<div class="tw-bg-[#020617] tw-border tw-border-[#1e293b] tw-p-6 tw-text-[#64748b] tw-font-mono tw-text-xs tw-text-center">
			[AWAITING_MATCH_INITIALIZATION]
		</div>
	{:else}
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 xl:tw-grid-cols-4 tw-gap-4">
			{#each Object.entries(aggStats) as [playerId, stats] (playerId)}
				<div class="tw-bg-[#020617] tw-border tw-border-[#1e293b] tw-p-4 tw-flex tw-flex-col tw-gap-3 hover:tw-border-[#14b8a6] tw-transition-all tw-duration-150">
					<div class="tw-font-mono tw-text-xs tw-text-[#94a3b8] tw-truncate tw-border-b tw-border-[#1e293b] tw-pb-2">
						ID: {playerId.slice(0, 8)}...
					</div>
					<div class="tw-grid tw-grid-cols-2 tw-gap-2">
						<div class="tw-flex tw-items-center tw-justify-between">
							<span class="tw-font-mono tw-text-[10px] tw-text-[#64748b]">GOAL</span>
							<span class="tw-font-mono tw-text-sm tw-text-[#34d399] tw-font-bold">{stats.goals}</span>
						</div>
						<div class="tw-flex tw-items-center tw-justify-between">
							<span class="tw-font-mono tw-text-[10px] tw-text-[#64748b]">AST</span>
							<span class="tw-font-mono tw-text-sm tw-text-[#14b8a6] tw-font-bold">{stats.assists}</span>
						</div>
						<div class="tw-flex tw-items-center tw-justify-between">
							<span class="tw-font-mono tw-text-[10px] tw-text-[#64748b]">SHT</span>
							<span class="tw-font-mono tw-text-sm tw-text-[#cbd5e1] tw-font-bold">{stats.shots}</span>
						</div>
						<div class="tw-flex tw-items-center tw-justify-between">
							<span class="tw-font-mono tw-text-[10px] tw-text-[#64748b]">SAV</span>
							<span class="tw-font-mono tw-text-sm tw-text-[#38bdf8] tw-font-bold">{stats.saves}</span>
						</div>
					</div>
				</div>
			{/each}
			{#if Object.keys(aggStats).length === 0 && !errorState}
				<div class="tw-col-span-full tw-bg-[#020617] tw-border tw-border-[#1e293b] tw-p-6 tw-text-[#64748b] tw-font-mono tw-text-xs tw-text-center">
					[NO_EVENTS_DETECTED]
				</div>
			{/if}
		</div>

		<div class="tw-mt-4 tw-border-t tw-border-[#334155] tw-pt-4">
			<div class="tw-flex tw-items-center tw-justify-between">
				<span class="tw-font-mono tw-text-xs tw-text-[#64748b]">TOTAL LOGS: {events.length}</span>
				<div class="tw-w-[clamp(100px,20vw,300px)] tw-h-1 tw-bg-[#1e293b]">
					<div class="tw-h-full tw-bg-[#14b8a6] tw-transition-all tw-duration-200" style="width: {Math.min((events.length / 50) * 100, 100)}%;"></div>
				</div>
			</div>
		</div>
	{/if}
</div>
