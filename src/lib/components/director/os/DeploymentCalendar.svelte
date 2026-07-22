<script lang="ts">
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
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	/**
	 * @typedef {{ id: string; title?: string; kind?: string; startsAt?: unknown; endsAt?: unknown; facilityId?: string; teamIds?: string[] }} CalRow
	 */

	let { clubId = '', canManage = true, embedded = false } = $props();

	/** @param {string | undefined} k */
	function kindBadgeClass(k) {
		const v = typeof k === 'string' ? k.toLowerCase() : '';
		if (v === 'match') return 'dep-badge dep-badge--match';
		if (v === 'tournament') return 'dep-badge dep-badge--tournament';
		return 'dep-badge dep-badge--practice';
	}

	/** @param {string | undefined} k */
	function kindAccent(k) {
		const v = typeof k === 'string' ? k.toLowerCase() : '';
		if (v === 'match') return 'dep-kind--match';
		if (v === 'tournament') return 'dep-kind--tournament';
		return 'dep-kind--practice';
	}

	let rows = $state(/** @type {CalRow[]} */ ([]));
	let facilities = $state(/** @type {Array<{ id: string; name: string }>} */ ([]));
	/** @type {Record<string, { status?: string; lockReason?: string }>} */
	let weatherStatusByFacility = $state({});
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
	/** When true, visibility is `club` and Epic 4.5 comms trigger may broadcast to families. */
	let announceToTeams = $state(true);

	const clubTeams = $derived(
		teamsStore.teams.filter((t) => t.clubId === clubId),
	);

	const selectedFacilityWeatherLocked = $derived.by(() => {
		if (!facilityId) return false;
		return weatherStatusByFacility[facilityId]?.status === 'locked';
	});

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
			weatherStatusByFacility = {};
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
		const wq = query(
			collection(db, 'field_weather_status'),
			where('clubId', '==', clubId),
		);
		const unsubWeather = onSnapshot(
			wq,
			(snap) => {
				/** @type {Record<string, { status?: string; lockReason?: string }>} */
				const map = {};
				for (const d of snap.docs) {
					const data = d.data();
					map[d.id] = {
						status: typeof data.status === 'string' ? data.status : undefined,
						lockReason:
							typeof data.lockReason === 'string' ? data.lockReason : undefined,
					};
				}
				weatherStatusByFacility = map;
			},
			(e) => console.error('[DeploymentCalendar] weather status', e),
		);
		return () => {
			unsub();
			unsubFac();
			unsubWeather();
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
		announceToTeams = true;
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
		const weather = weatherStatusByFacility[facilityId];
		if (weather?.status === 'locked') {
			saveErr =
				weather.lockReason ||
				'This facility is weather-locked. Choose another location or wait for clear status.';
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
				visibility: announceToTeams ? 'club' : 'staff_only',
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

{#snippet depCalHead()}
	<div class="tw-flex tw-shrink-0 tw-flex-wrap tw-items-start tw-justify-between tw-gap-3 tw-border-b tw-border-slate-800/90 tw-bg-slate-950/60 tw-px-4 tw-py-3 tw-backdrop-blur-sm">
		<div>
			<h4
				id="dep-cal-head"
				class="tw-m-0 tw-text-[11px] tw-font-black tw-uppercase tw-tracking-[0.18em] tw-text-slate-400"
			>
				Tactical deployments
			</h4>
			<p class="tw-m-0 tw-mt-1 tw-text-[11px] tw-leading-relaxed tw-text-slate-500">
				Live logistics matrix ·
				<code class="tw-rounded tw-bg-black/50 tw-px-1 tw-py-0.5 tw-font-mono tw-text-[10px] tw-text-emerald-400/85"
					>deployment_calendar_entries</code
				>
			</p>
		</div>
		{#if canManage}
			<button
				type="button"
				class="tw-inline-flex tw-shrink-0 tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-emerald-500/40 tw-bg-emerald-950/35 tw-px-3 tw-py-2 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-emerald-300 tw-shadow-[0_0_20px_rgba(52,211,153,0.12)] tw-transition hover:tw-border-emerald-400/60 hover:tw-bg-emerald-950/60 hover:tw-shadow-[0_0_28px_rgba(52,211,153,0.18)]"
				onclick={openModal}
			>
				<Icon name="status.circle-plus" />
				New deployment
			</button>
		{/if}
	</div>
{/snippet}

{#snippet depCalBody()}
	{#if !clubId}
		<p class="tw-m-0 tw-p-4 tw-text-xs tw-text-red-400">No club scope.</p>
	{:else if loading}
		<p class="tw-m-0 tw-p-4 tw-text-sm tw-text-slate-500">Loading logistics feed…</p>
	{:else if listErr}
		<p class="tw-m-0 tw-p-4 tw-text-sm tw-text-red-400">{listErr}</p>
	{:else if rows.length === 0}
		<div
			class="tw-mx-3 tw-my-4 tw-rounded-xl tw-border tw-border-dashed tw-border-slate-700/80 tw-bg-black/25 tw-px-4 tw-py-10 tw-text-center"
		>
			<p class="tw-m-0 tw-text-sm tw-font-semibold tw-tracking-tight tw-text-slate-200">
				No deployments scheduled
			</p>
			<p class="tw-mt-2 tw-m-0 tw-text-xs tw-leading-relaxed tw-text-slate-500">
				Practice, match, and tournament windows appear here for audit and field coordination.
			</p>
		</div>
	{:else}
		<div class="dep-cal-list tw-flex tw-flex-col tw-gap-2 tw-p-3 tw-pb-4">
			{#each rows as row (row.id)}
				<article
					class="dep-cal-card group tw-relative tw-flex tw-min-h-[88px] tw-flex-col tw-gap-1.5 tw-overflow-hidden tw-rounded-xl tw-border tw-border-slate-800/90 tw-bg-gradient-to-br tw-from-slate-950/90 tw-to-slate-900/70 tw-p-3 tw-pl-4 tw-shadow-inner tw-transition tw-duration-200 hover:tw-bg-slate-800/50 hover:tw-shadow-[0_8px_32px_rgba(0,0,0,0.35)] {kindAccent(
						row.kind,
					)}"
				>
					<div
						class="dep-cal-card__accent tw-pointer-events-none tw-absolute tw-inset-y-0 tw-left-0 tw-w-1 tw-rounded-l-xl tw-opacity-90"
						aria-hidden="true"
					></div>
					<p
						class="tw-m-0 tw-text-[13px] tw-font-semibold tw-leading-snug tw-tracking-tight tw-text-slate-100"
					>
						{typeof row.title === 'string' ? row.title : 'Deployment'}
					</p>
					<p class="tw-m-0 tw-font-mono tw-text-[11px] tw-tabular-nums tw-tracking-tight tw-text-slate-400">
						{formatStart(row.startsAt)}
					</p>
					<div
						class="tw-mt-auto tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.08em]"
					>
						<span class={kindBadgeClass(row.kind)}>{kindLabel(row.kind)}</span>
						{#if row.facilityId}
							<span
								class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-border tw-border-emerald-500/25 tw-bg-emerald-950/40 tw-px-2 tw-py-0.5 tw-font-semibold tw-normal-case tw-tracking-normal tw-text-emerald-300/95"
								title={facilityLabel(row.facilityId)}
							>
							<Icon name="sys.map-pin" class="tw-text-emerald-400/90" />
							{facilityLabel(row.facilityId)}
							</span>
						{/if}
						{#if row.teamIds && row.teamIds[0]}
							<span
								class="tw-rounded-md tw-border tw-border-cyan-500/25 tw-bg-cyan-950/35 tw-px-2 tw-py-0.5 tw-font-semibold tw-normal-case tw-tracking-normal tw-text-cyan-300/90"
							>
								{teamLabel(row.teamIds[0])}
							</span>
						{/if}
					</div>
					<p class="tw-m-0 tw-font-mono tw-text-[9px] tw-text-slate-600 tw-truncate" title={row.id}>
						OP {row.id.slice(0, 8)}…
					</p>
				</article>
			{/each}
		</div>
	{/if}
{/snippet}

{#if embedded}
	<div
		class="tw-flex tw-h-full tw-min-h-0 tw-flex-col tw-overflow-hidden tw-text-slate-100"
		aria-labelledby="dep-cal-head"
	>
		{@render depCalHead()}
		<div class="tw-min-h-0 tw-flex-1 tw-overflow-y-auto tw-overflow-x-hidden">
			{@render depCalBody()}
		</div>
	</div>
{:else}
	<section
		class="tw-mb-4 tw-rounded-xl tw-border tw-border-slate-700/80 tw-bg-slate-950 tw-p-4 tw-shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
		aria-labelledby="dep-cal-head"
	>
		{@render depCalHead()}
		<div class="tw-mt-3">
			{@render depCalBody()}
		</div>
	</section>
{/if}

<style>
	.dep-cal-card.dep-kind--practice .dep-cal-card__accent {
		background: linear-gradient(180deg, #34d399 0%, #059669 100%);
		box-shadow: 0 0 16px rgba(52, 211, 153, 0.42);
	}

	.dep-cal-card.dep-kind--match .dep-cal-card__accent {
		background: linear-gradient(180deg, #fb923c 0%, #ea580c 100%);
		box-shadow: 0 0 16px rgba(251, 146, 60, 0.38);
	}

	.dep-cal-card.dep-kind--tournament .dep-cal-card__accent {
		background: linear-gradient(180deg, #c4b5fd 0%, #7c3aed 100%);
		box-shadow: 0 0 16px rgba(167, 139, 250, 0.35);
	}

	.dep-badge {
		display: inline-flex;
		align-items: center;
		border-radius: 6px;
		padding: 3px 9px;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		border: 1px solid transparent;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	.dep-badge--practice {
		color: #6ee7b7;
		background: rgba(6, 78, 59, 0.55);
		border-color: rgba(52, 211, 153, 0.38);
	}

	.dep-badge--match {
		color: #fdba74;
		background: rgba(124, 45, 18, 0.55);
		border-color: rgba(251, 146, 60, 0.42);
	}

	.dep-badge--tournament {
		color: #ddd6fe;
		background: rgba(76, 29, 149, 0.48);
		border-color: rgba(167, 139, 250, 0.42);
	}
</style>

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
					<Icon name="sys.close" size={18} />
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
						{#each facilities as f (f.id)}
							<option value={f.id} disabled={weatherStatusByFacility[f.id]?.status === 'locked'}>
								{f.name}{weatherStatusByFacility[f.id]?.status === 'locked' ? ' (weather locked)' : ''}
							</option>
						{/each}
					</select>
					{#if selectedFacilityWeatherLocked}
						<p class="tw-m-0 tw-text-[10px] tw-font-semibold tw-text-amber-400" role="status">
							Weather lock active — scheduling blocked for this facility.
						</p>
					{/if}
				</label>

				<label class="tw-flex tw-cursor-pointer tw-items-start tw-gap-2 tw-rounded-lg tw-border tw-border-slate-800 tw-bg-black/20 tw-px-3 tw-py-2">
					<input
						type="checkbox"
						class="tw-mt-0.5"
						bind:checked={announceToTeams}
					/>
					<span class="tw-flex tw-flex-col tw-gap-0.5">
						<span class="tw-text-xs tw-font-semibold tw-text-slate-200">
							Announce to team families
						</span>
						<span class="tw-text-[10px] tw-leading-relaxed tw-text-slate-500">
							Safe-Comms broadcast when scheduled (staff-only entries skip family notify).
						</span>
					</span>
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
