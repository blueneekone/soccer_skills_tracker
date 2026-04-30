<script>
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

	let rosterNames = $state(/** @type {string[]} */ ([]));
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
		if (!browser || !teamId) {
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
				console.error('[CoachTrialBuilder] roster', e);
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
			err = 'Player, skill slot, and result are required.';
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
				source: 'coach_trial_builder',
				timestamp: serverTimestamp(),
			});
			okMsg = 'Trial logged. Player stats sync on the next dossier refresh.';
			resultText = '';
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not save trial.';
		} finally {
			saving = false;
		}
	}
</script>

<div
	class="ctb tw-rounded-2xl tw-border tw-border-cyan-500/25 tw-bg-slate-950/70 tw-p-6 tw-text-slate-100"
>
	<div class="tw-mb-4 tw-flex tw-flex-wrap tw-items-end tw-justify-between tw-gap-3">
		<div>
			<h2 class="tw-m-0 tw-text-lg tw-font-black tw-uppercase tw-tracking-wide tw-text-cyan-300">
				Trial builder
			</h2>
			<p class="tw-m-0 tw-mt-1 tw-max-w-prose tw-text-sm tw-text-slate-400">
				Log coach-verified scores keyed to your sport&apos;s attribute slots (
				<strong>{schema.canonicalKey}</strong>). Stored as structured trial rows — no media uploads.
			</p>
		</div>
	</div>

	{#if loading}
		<p class="tw-m-0 tw-font-mono tw-text-xs tw-text-slate-500">Loading roster…</p>
	{:else if err && !rosterNames.length}
		<p class="tw-m-0 tw-text-sm tw-text-amber-300">{err}</p>
	{:else}
		<div class="tw-grid tw-gap-4 md:tw-grid-cols-2">
			<label class="tw-flex tw-flex-col tw-gap-2">
				<span class="tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500">
					Player
				</span>
				<select class="tw-rounded-xl tw-border tw-border-slate-700 tw-bg-slate-900 tw-p-3 tw-font-semibold" bind:value={playerName}>
					{#each rosterNames as name (name)}
						<option value={name}>{name}</option>
					{/each}
				</select>
			</label>
			<label class="tw-flex tw-flex-col tw-gap-2">
				<span class="tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500">
					Attribute slot
				</span>
				<select class="tw-rounded-xl tw-border tw-border-slate-700 tw-bg-slate-900 tw-p-3 tw-font-semibold" bind:value={skillKey}>
					{#each schema.keys as k, i (k)}
						<option value={k}>{schema.labels[i] ?? k}</option>
					{/each}
				</select>
			</label>
			<label class="tw-flex tw-flex-col tw-gap-2 md:tw-col-span-2">
				<span class="tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500">
					Result (numeric, fraction e.g. 17/20, or label)
				</span>
				<input
					class="tw-rounded-xl tw-border tw-border-slate-700 tw-bg-slate-900 tw-p-3 tw-font-mono tw-text-sm"
					type="text"
					autocomplete="off"
					placeholder="e.g. 82 / 88 / 17/20"
					bind:value={resultText}
				/>
			</label>
		</div>

		{#if err}
			<p class="tw-mt-3 tw-mb-0 tw-text-sm tw-text-amber-300" role="alert">{err}</p>
		{/if}
		{#if okMsg}
			<p class="tw-mt-3 tw-mb-0 tw-text-sm tw-text-emerald-300" role="status">{okMsg}</p>
		{/if}

		<div class="tw-mt-5 tw-flex tw-flex-wrap tw-gap-3">
			<button
				type="button"
				class="tw-rounded-xl tw-bg-cyan-600 tw-px-5 tw-py-3 tw-text-sm tw-font-black tw-uppercase tw-tracking-wide tw-text-white hover:tw-bg-cyan-500 disabled:tw-opacity-50"
				disabled={saving || !rosterNames.length}
				onclick={() => void submitTrial()}
			>
				{saving ? 'Saving…' : 'Record trial'}
			</button>
			{#if !rosterNames.length}
				<span class="tw-self-center tw-text-xs tw-font-semibold tw-text-slate-500">
					Add athletes to this roster before logging trials.
				</span>
			{/if}
		</div>
	{/if}
</div>
