<script lang="ts">
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { db } from '$lib/firebase.js';
	import {
		addDoc,
		collection,
		doc,
		getDoc,
		serverTimestamp,
	} from 'firebase/firestore';
	import { getAttributeSchemaForSport } from '$lib/utils/sport-attributes.js';

	let { teamId = '', sportHint = '' } = $props();

	let rosterNames = $state<string[]>([]);
	let loading = $state(false);
	let err = $state('');
	let playerName = $state('');
	let skillKey = $state('');
	let resultText = $state('');
	let saving = $state(false);
	let okMsg = $state('');

	const sportResolved = $derived.by(() => {
		if (sportHint && String(sportHint).trim()) return String(sportHint).trim();
		const t = teamsStore.teams.find((x) => x.id === teamId);
		if (typeof t?.sport === 'string' && t.sport.trim()) return t.sport.trim();
		return '';
	});

	const schema = $derived(getAttributeSchemaForSport(sportResolved));

	$effect(() => {
		if (!schema.keys.length) return;
		if (!skillKey || !schema.keys.includes(skillKey)) {
			skillKey = schema.keys[0];
		}
	});

	$effect(() => {
		if (!browser || !teamId || !db || !authStore.isAuthenticated) {
			rosterNames = [];
			return;
		}
		let cancelled = false;
		loading = true;
		err = '';
		void (async () => {
			try {
				const rosterSnap = await getDoc(doc(db, 'rosters', teamId));
				const raw =
					rosterSnap.exists() && Array.isArray(rosterSnap.data()?.players) ?
						rosterSnap.data().players
					:	[];
				const list = raw.map((x) => String(x).trim()).filter(Boolean);
				list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
				if (!cancelled) {
					rosterNames = list;
					if (!playerName && list.length) playerName = list[0];
				}
			} catch (e) {
				console.error('[CoachRosterQuickEval] roster', e);
				if (!cancelled) err = 'Could not load roster.';
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	async function submitTrial() {
		okMsg = '';
		const tid = teamId?.trim();
		const player = playerName.trim();
		const skill = skillKey.trim();
		const result = resultText.trim();
		if (!tid || !player || !skill || !result) {
			err = 'Player, attribute slot, and result measurement are required.';
			return;
		}
		const email = authStore.user?.email?.toLowerCase() || '';
		if (!email) {
			err = 'Not signed in.';
			return;
		}
		saving = true;
		err = '';
		try {
			await addDoc(collection(db, 'trials'), {
				player,
				teamId: tid,
				skill,
				result,
				isCoach: true,
				coachEmail: email,
				source: 'coach_roster_quick_log',
				timestamp: serverTimestamp(),
			});
			okMsg = `Observation recorded for ${player} (${skill}: ${result}). Synchronized to squad telemetry.`;
			resultText = '';
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not save observation.';
		} finally {
			saving = false;
		}
	}
</script>

<section
	class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-5 sm:tw-p-6 tw-font-mono tw-text-[#fafafa]"
	style="border-radius: 0px;"
	aria-labelledby="roster-eval-heading"
>
	<div class="tw-border-b tw-border-[#334155] tw-pb-4 tw-mb-5">
		<div class="tw-flex tw-items-center tw-gap-2">
			<span class="tw-w-2.5 tw-h-2.5 tw-bg-[#14b8a6]"></span>
			<h2
				id="roster-eval-heading"
				class="tw-m-0 tw-text-sm sm:tw-text-base tw-font-bold tw-uppercase tw-tracking-widest tw-text-white"
			>
				ROSTER QUICK LOG (TRIALS & BENCHMARKS)
			</h2>
		</div>
		<p class="tw-m-0 tw-mt-1.5 tw-text-xs tw-text-slate-400 tw-font-sans">
			Log coach-verified field trials keyed to active sport taxonomy (
			<strong class="tw-text-[#14b8a6] tw-font-mono">{schema.canonicalKey}</strong>). Stored in the <code class="tw-text-[#daff0a]">trials</code> telemetry stream.
		</p>
	</div>

	{#if loading}
		<div class="tw-p-8 tw-text-center tw-bg-[#080d1a] tw-border tw-border-[#334155]" style="border-radius: 0px;">
			<p class="tw-m-0 tw-text-xs tw-text-slate-400">Loading squad roster…</p>
		</div>
	{:else if err && !rosterNames.length}
		<div class="tw-p-4 tw-bg-rose-950/40 tw-border tw-border-rose-800 tw-text-rose-300 tw-text-xs" role="alert" style="border-radius: 0px;">
			{err}
		</div>
	{:else}
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-4">
			<!-- Player Selection -->
			<label class="md:tw-col-span-4 tw-flex tw-flex-col tw-gap-1.5">
				<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-400">
					SQUAD ATHLETE
				</span>
				<select
					class="tw-bg-[#080d1a] tw-border tw-border-[#334155] tw-text-white tw-px-3 tw-py-2 tw-text-xs tw-font-mono tw-outline-none focus:tw-border-[#14b8a6]"
					style="border-radius: 0px;"
					bind:value={playerName}
				>
					{#each rosterNames as name (name)}
						<option value={name}>{name}</option>
					{/each}
				</select>
			</label>

			<!-- Attribute Slot -->
			<label class="md:tw-col-span-4 tw-flex tw-flex-col tw-gap-1.5">
				<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-400">
					ATTRIBUTE SLOT ({schema.canonicalKey})
				</span>
				<select
					class="tw-bg-[#080d1a] tw-border tw-border-[#334155] tw-text-white tw-px-3 tw-py-2 tw-text-xs tw-font-mono tw-outline-none focus:tw-border-[#14b8a6]"
					style="border-radius: 0px;"
					bind:value={skillKey}
				>
					{#each schema.keys as k, i (k)}
						<option value={k}>{schema.labels[i] ?? k}</option>
					{/each}
				</select>
			</label>

			<!-- Result Input -->
			<label class="md:tw-col-span-4 tw-flex tw-flex-col tw-gap-1.5">
				<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-400">
					RESULT (SCORE, TIME, REPS)
				</span>
				<input
					class="tw-bg-[#080d1a] tw-border tw-border-[#334155] tw-text-white tw-px-3 tw-py-2 tw-text-xs tw-font-mono tw-outline-none focus:tw-border-[#14b8a6] placeholder:tw-text-slate-600"
					style="border-radius: 0px;"
					type="text"
					autocomplete="off"
					placeholder="e.g. 88 / 4.45s / 18/20 reps"
					bind:value={resultText}
				/>
			</label>
		</div>

		{#if err}
			<p class="tw-mt-3 tw-mb-0 tw-text-xs tw-text-rose-400" role="alert">⚠ {err}</p>
		{/if}
		{#if okMsg}
			<p class="tw-mt-3 tw-mb-0 tw-text-xs tw-text-[#14b8a6]" role="status">✓ {okMsg}</p>
		{/if}

		<div class="tw-mt-5 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-border-t tw-border-[#334155] tw-pt-4">
			<button
				type="button"
				class="tw-px-6 tw-py-3 tw-bg-[#14b8a6] hover:tw-bg-[#0d9488] tw-text-black tw-font-bold tw-text-xs tw-uppercase tw-tracking-wider tw-cursor-pointer tw-transition-all active:tw-scale-[0.98] disabled:tw-opacity-50"
				style="border-radius: 0px;"
				disabled={saving || !rosterNames.length}
				onclick={() => void submitTrial()}
			>
				{saving ? 'RECORDING OBSERVATION…' : '⚡ RECORD TRIAL OBSERVATION'}
			</button>

			{#if !rosterNames.length}
				<span class="tw-text-xs tw-text-slate-500">
					Add athletes to this roster in Team Ops before recording trials.
				</span>
			{/if}
		</div>
	{/if}
</section>
