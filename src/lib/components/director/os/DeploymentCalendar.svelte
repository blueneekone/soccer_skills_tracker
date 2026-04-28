<script>
	import { browser } from '$app/environment';
	import { db } from '$lib/firebase.js';
	import {
		addDoc,
		collection,
		onSnapshot,
		orderBy,
		query,
		serverTimestamp,
		Timestamp,
		where,
	} from 'firebase/firestore';
	import { teamsStore } from '$lib/stores/teams.svelte.js';

	/**
	 * @typedef {{ id: string; title?: string; kind?: string; startsAt?: unknown; endsAt?: unknown; facilityId?: string; teamIds?: string[] }} CalRow
	 */

	let { clubId = '', canManage = true } = $props();

	let rows = $state(/** @type {CalRow[]} */ ([]));
	let facilities = $state(/** @type {Array<{ id: string; name: string }>} */ ([]));
	let loading = $state(true);
	let listErr = $state(/** @type {string | null} */ (null));

	let modalOpen = $state(false);
	let saving = $state(false);
	let saveErr = $state('');
	let eventKind = $state('practice');
	let startsLocal = $state('');
	let endsLocal = $state('');
	let teamId = $state('');
	let facilityId = $state('');

	const clubTeams = $derived(
		teamsStore.teams.filter((t) => t.clubId === clubId),
	);

	const kindLabels = [
		{ value: 'practice', label: 'Practice' },
		{ value: 'match', label: 'Match' },
		{ value: 'tournament', label: 'Tournament' },
	];

	$effect(() => {
		if (!browser || !clubId) {
			loading = false;
			rows = [];
			facilities = [];
			return;
		}
		loading = true;
		listErr = null;
		const q = query(
			collection(db, 'deployment_calendar_entries'),
			where('clubId', '==', clubId),
			orderBy('startsAt', 'desc'),
		);
		const unsub = onSnapshot(
			q,
			(snap) => {
				rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
				loading = false;
			},
			(e) => {
				console.error('[DeploymentCalendar]', e);
				listErr =
					e && typeof e === 'object' && 'message' in e ?
						String(/** @type {{ message?: string }} */ (e).message)
					:	'Could not load deployment calendar.';
				loading = false;
				rows = [];
			},
		);
		const fq = collection(db, 'clubs', clubId, 'facilities');
		const unsubFac = onSnapshot(
			fq,
			(snap) => {
				facilities = snap.docs.map((d) => {
					const x = d.data();
					return {
						id: d.id,
						name: typeof x.name === 'string' ? x.name : d.id,
					};
				});
				facilities.sort((a, b) => a.name.localeCompare(b.name));
			},
			(e) => console.error('[DeploymentCalendar] facilities', e),
		);
		return () => {
			unsub();
			unsubFac();
		};
	});

	function openModal() {
		saveErr = '';
		const now = new Date();
		now.setMinutes(0, 0, 0);
		const end = new Date(now.getTime() + 90 * 60 * 1000);
		startsLocal = toLocalInput(now);
		endsLocal = toLocalInput(end);
		teamId = clubTeams[0]?.id ?? '';
		facilityId = facilities[0]?.id ?? '';
		eventKind = 'practice';
		modalOpen = true;
	}

	function closeModal() {
		modalOpen = false;
	}

	/** @param {Date} d */
	function toLocalInput(d) {
		const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	/** @param {string} s */
	function parseLocalInput(s) {
		const d = new Date(s);
		return Number.isNaN(d.getTime()) ? null : d;
	}

	function formatStart(raw) {
		if (!raw) return '—';
		try {
			if (raw?.toDate && typeof raw.toDate === 'function') {
				return raw.toDate().toLocaleString();
			}
			if (typeof raw === 'object' && raw !== null && 'seconds' in raw) {
				const sec = /** @type {{ seconds: number }} */ (raw).seconds;
				return new Date(sec * 1000).toLocaleString();
			}
		} catch {
			/* ignore */
		}
		return String(raw);
	}

	function kindLabel(k) {
		const x = kindLabels.find((o) => o.value === k);
		return x?.label ?? k ?? '—';
	}

	function facilityLabel(fid) {
		if (!fid) return '—';
		const f = facilities.find((x) => x.id === fid);
		return f?.name ?? fid;
	}

	function teamLabel(tid) {
		if (!tid) return '—';
		const t = clubTeams.find((x) => x.id === tid);
		return t?.name ?? tid;
	}

	async function submitDeployment() {
		if (!canManage || !clubId) return;
		saveErr = '';
		const startD = parseLocalInput(startsLocal);
		const endD = endsLocal.trim() ? parseLocalInput(endsLocal) : null;
		if (!startD) {
			saveErr = 'Enter a valid start date/time.';
			return;
		}
		if (endD && endD <= startD) {
			saveErr = 'End time must be after start.';
			return;
		}
		if (!teamId) {
			saveErr = 'Select a team.';
			return;
		}
		if (!facilityId) {
			saveErr = 'Select a facility location.';
			return;
		}
		const tName = teamLabel(teamId);
		const fName = facilityLabel(facilityId);
		const title = `${kindLabel(eventKind)} · ${tName} · ${fName}`.slice(0, 500);
		saving = true;
		try {
			await addDoc(collection(db, 'deployment_calendar_entries'), {
				clubId,
				title,
				kind: eventKind,
				startsAt: Timestamp.fromDate(startD),
				...(endD ? { endsAt: Timestamp.fromDate(endD) } : {}),
				facilityId,
				teamIds: [teamId],
				visibility: 'club',
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			});
			closeModal();
		} catch (e) {
			saveErr =
				e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ?
					String(/** @type {{ message?: string }} */ (e).message)
				:	String(e);
		} finally {
			saving = false;
		}
	}
</script>

<section
	class="tw-rounded-xl tw-border tw-border-slate-700/80 tw-bg-slate-950 tw-p-4 tw-mb-4 tw-shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
	aria-labelledby="dep-cal-head"
>
	<div class="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3 tw-mb-3">
		<div>
			<h4
				id="dep-cal-head"
				class="tw-m-0 tw-text-sm tw-font-black tw-uppercase tw-tracking-[0.12em] tw-text-slate-300"
			>
				Tactical deployment calendar
			</h4>
			<p class="tw-m-0 tw-mt-1 tw-text-xs tw-leading-relaxed tw-text-slate-500">
				Logistics & scheduling matrix —
				<code class="tw-rounded tw-bg-black/40 tw-px-1 tw-py-0.5 tw-text-[10px] tw-text-emerald-400/90"
					>deployment_calendar_entries</code
				>
			</p>
		</div>
		{#if canManage}
			<button
				type="button"
				class="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-emerald-500/35 tw-bg-emerald-950/40 tw-px-3 tw-py-2 tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-text-emerald-300 tw-transition hover:tw-border-emerald-400/55 hover:tw-bg-emerald-950/70"
				onclick={openModal}
			>
				<i class="ph ph-plus-circle tw-text-base" aria-hidden="true"></i>
				New deployment
			</button>
		{/if}
	</div>

	{#if !clubId}
		<p class="tw-m-0 tw-text-xs tw-text-red-400">No club scope.</p>
	{:else if loading}
		<p class="tw-m-0 tw-text-sm tw-text-slate-500">Loading logistics feed…</p>
	{:else if listErr}
		<p class="tw-m-0 tw-text-sm tw-text-red-400">{listErr}</p>
	{:else if rows.length === 0}
		<div
			class="tw-rounded-lg tw-border tw-border-dashed tw-border-slate-700 tw-bg-black/30 tw-px-4 tw-py-10 tw-text-center"
		>
			<p class="tw-m-0 tw-text-sm tw-font-semibold tw-text-slate-200">No deployments scheduled</p>
			<p class="tw-mt-2 tw-m-0 tw-text-xs tw-text-slate-500">
				Practice, match, and tournament windows appear here for audit and field coordination.
			</p>
		</div>
	{:else}
		<div
			class="tw-grid tw-gap-px tw-overflow-hidden tw-rounded-lg tw-border tw-border-slate-800 tw-bg-slate-800/80"
			style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));"
		>
			{#each rows as row (row.id)}
				<article
					class="tw-bg-slate-950 tw-p-3 tw-min-h-[96px] tw-flex tw-flex-col tw-gap-1 tw-border tw-border-transparent hover:tw-border-slate-700/90"
				>
					<p class="tw-m-0 tw-text-[13px] tw-font-bold tw-leading-snug tw-text-slate-100">
						{typeof row.title === 'string' ? row.title : 'Deployment'}
					</p>
					<p class="tw-m-0 tw-text-[11px] tw-font-mono tw-tabular-nums tw-text-slate-400">
						{formatStart(row.startsAt)}
					</p>
					<div class="tw-mt-auto tw-flex tw-flex-wrap tw-gap-2 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wide">
						<span class="tw-rounded tw-bg-slate-900 tw-px-1.5 tw-py-0.5 tw-text-slate-400">
							{kindLabel(row.kind)}
						</span>
						{#if row.facilityId}
							<span
								class="tw-rounded tw-bg-black/50 tw-px-1.5 tw-py-0.5 tw-text-emerald-400/90"
								title={facilityLabel(row.facilityId)}
							>
								📍 {facilityLabel(row.facilityId)}
							</span>
						{/if}
						{#if row.teamIds && row.teamIds[0]}
							<span class="tw-rounded tw-bg-black/50 tw-px-1.5 tw-py-0.5 tw-text-cyan-400/85">
								{teamLabel(row.teamIds[0])}
							</span>
						{/if}
					</div>
					<p class="tw-m-0 tw-text-[10px] tw-font-mono tw-text-slate-600 tw-truncate" title={row.id}>
						ID {row.id}
					</p>
				</article>
			{/each}
		</div>
	{/if}
</section>

{#if modalOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="tw-fixed tw-inset-0 tw-z-[100] tw-flex tw-items-center tw-justify-center tw-bg-black/70 tw-p-4 tw-backdrop-blur-sm"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && closeModal()}
	>
		<div
			class="tw-w-full tw-max-w-md tw-rounded-xl tw-border tw-border-slate-700 tw-bg-slate-950 tw-p-5 tw-shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="dep-modal-title"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="tw-flex tw-items-start tw-justify-between tw-gap-2 tw-mb-4">
				<h2 id="dep-modal-title" class="tw-m-0 tw-text-base tw-font-black tw-text-slate-100">
					New deployment
				</h2>
				<button
					type="button"
					class="tw-rounded-lg tw-p-1 tw-text-slate-500 hover:tw-bg-slate-900 hover:tw-text-slate-300"
					onclick={closeModal}
					aria-label="Close"
				>
					<i class="ph ph-x tw-text-lg" aria-hidden="true"></i>
				</button>
			</div>

			<div class="tw-flex tw-flex-col tw-gap-3">
				<label class="tw-flex tw-flex-col tw-gap-1">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500"
						>Event type</span
					>
					<select
						class="tw-rounded-lg tw-border tw-border-slate-700 tw-bg-black/40 tw-px-3 tw-py-2 tw-text-sm tw-text-slate-100"
						bind:value={eventKind}
					>
						{#each kindLabels as k}
							<option value={k.value}>{k.label}</option>
						{/each}
					</select>
				</label>

				<label class="tw-flex tw-flex-col tw-gap-1">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500"
						>Starts</span
					>
					<input
						type="datetime-local"
						class="tw-rounded-lg tw-border tw-border-slate-700 tw-bg-black/40 tw-px-3 tw-py-2 tw-text-sm tw-text-slate-100"
						bind:value={startsLocal}
					/>
				</label>

				<label class="tw-flex tw-flex-col tw-gap-1">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500"
						>Ends <span class="tw-font-normal tw-text-slate-600">(optional)</span></span
					>
					<input
						type="datetime-local"
						class="tw-rounded-lg tw-border tw-border-slate-700 tw-bg-black/40 tw-px-3 tw-py-2 tw-text-sm tw-text-slate-100"
						bind:value={endsLocal}
					/>
				</label>

				<label class="tw-flex tw-flex-col tw-gap-1">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500"
						>Assigned team</span
					>
					<select
						class="tw-rounded-lg tw-border tw-border-slate-700 tw-bg-black/40 tw-px-3 tw-py-2 tw-text-sm tw-text-slate-100"
						bind:value={teamId}
					>
						<option value="">Select team…</option>
						{#each clubTeams as t}
							<option value={t.id}>{t.name}</option>
						{/each}
					</select>
				</label>

				<label class="tw-flex tw-flex-col tw-gap-1">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500"
						>Location (facility)</span
					>
					<select
						class="tw-rounded-lg tw-border tw-border-slate-700 tw-bg-black/40 tw-px-3 tw-py-2 tw-text-sm tw-text-slate-100"
						bind:value={facilityId}
					>
						<option value="">Select facility…</option>
						{#each facilities as f}
							<option value={f.id}>{f.name}</option>
						{/each}
					</select>
				</label>

				{#if saveErr}
					<p class="tw-m-0 tw-text-xs tw-font-semibold tw-text-red-400" role="alert">{saveErr}</p>
				{/if}

				<div class="tw-flex tw-justify-end tw-gap-2 tw-pt-2">
					<button
						type="button"
						class="tw-rounded-lg tw-border tw-border-slate-700 tw-bg-transparent tw-px-4 tw-py-2 tw-text-xs tw-font-bold tw-uppercase tw-tracking-wide tw-text-slate-400 hover:tw-bg-slate-900"
						onclick={closeModal}
					>
						Cancel
					</button>
					<button
						type="button"
						class="tw-rounded-lg tw-border tw-border-emerald-500/40 tw-bg-emerald-950/50 tw-px-4 tw-py-2 tw-text-xs tw-font-black tw-uppercase tw-tracking-wide tw-text-emerald-300 hover:tw-bg-emerald-950 disabled:tw-opacity-50"
						disabled={saving}
						onclick={() => void submitDeployment()}
					>
						{saving ? 'Saving…' : 'Schedule'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
