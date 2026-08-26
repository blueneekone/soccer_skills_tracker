<script lang="ts">
	/**
	 * FacilityScheduler.svelte — Pitch Collision Avoidance UI
	 * ─────────────────────────────────────────────────────────
	 * High-contrast Tactical SIEM facility booking console.
	 * Displays live pitch availability probing, instant conflict detection,
	 * and zero-leak transactional booking.
	 */

	import { onMount } from 'svelte';
	import { httpsCallable } from 'firebase/functions';
	import { functions } from '$lib/firebase.js';

	interface Facility {
		facilityId: string;
		name: string;
		pitchType: string;
		capacity: number | null;
	}

	interface ConflictEntry {
		bookingId: string;
		label: string;
		startMs: number;
		endMs: number;
		teamId: string | null;
	}

	interface Props {
		teamId?: string;
		onbooked?: (bookingId: string) => void;
	}

	let { teamId = '', onbooked }: Props = $props();

	const fns = functions;

	let facilities = $state<Facility[]>([]);
	let selectedFacilityId = $state('');
	let date = $state(todayISO());
	let startTime = $state('09:00');
	let endTime = $state('10:30');
	let label = $state('');
	let eventType = $state<'fixture' | 'practice' | 'other'>('practice');

	let isChecking = $state(false);
	let isBooking = $state(false);
	let loadingFacilities = $state(true);

	type AvailStatus = 'unknown' | 'available' | 'conflict' | 'error';
	let availStatus = $state<AvailStatus>('unknown');
	let conflicts = $state<ConflictEntry[]>([]);
	let checkError = $state<string | null>(null);
	let bookError = $state<string | null>(null);
	let bookSuccess = $state<string | null>(null);

	const startMs = $derived(dateTimeToMs(date, startTime));
	const endMs = $derived(dateTimeToMs(date, endTime));
	const durationMinutes = $derived(Math.max(0, Math.round((endMs - startMs) / 60000)));
	const isValidTimeBlock = $derived(endMs > startMs + 5 * 60000);

	const selectedFacility = $derived(
		facilities.find((f) => f.facilityId === selectedFacilityId) ?? null,
	);

	function todayISO(): string {
		return new Date().toISOString().slice(0, 10);
	}

	function dateTimeToMs(d: string, t: string): number {
		return new Date(`${d}T${t}:00`).getTime();
	}

	function msToHHMM(ms: number): string {
		const d = new Date(ms);
		return d.toTimeString().slice(0, 5);
	}

	onMount(async () => {
		try {
			const listFn = httpsCallable<object, { facilities: Facility[] }>(fns, 'listFacilities');
			const res = await listFn({});
			facilities = res.data.facilities;
			if (facilities.length > 0) selectedFacilityId = facilities[0].facilityId;
		} catch {
			checkError = 'Could not load facilities.';
		} finally {
			loadingFacilities = false;
		}
	});

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		const _a = selectedFacilityId, _b = date, _c = startTime, _d = endTime;
		if (!_a || !_b || !_c || !_d) return;

		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			void checkAvailability();
		}, 300);
	});

	async function checkAvailability() {
		if (!selectedFacilityId || !isValidTimeBlock) {
			availStatus = 'unknown';
			conflicts = [];
			return;
		}

		isChecking = true;
		checkError = null;

		try {
			const checkFn = httpsCallable<
				object,
				{ available: boolean; conflicts: ConflictEntry[] }
			>(fns, 'checkFacilityAvailability');
			const res = await checkFn({
				facilityId: selectedFacilityId,
				date,
				startMs,
				endMs,
			});
			if (res.data.available) {
				availStatus = 'available';
				conflicts = [];
			} else {
				availStatus = 'conflict';
				conflicts = res.data.conflicts ?? [];
			}
		} catch (err: unknown) {
			availStatus = 'error';
			checkError = err instanceof Error ? err.message : 'Availability probe failed.';
		} finally {
			isChecking = false;
		}
	}

	async function handleBook() {
		if (!selectedFacilityId || !isValidTimeBlock || !label.trim()) return;
		isBooking = true;
		bookError = null;
		bookSuccess = null;

		try {
			const bookFn = httpsCallable<
				object,
				{ bookingId: string }
			>(fns, 'bookFacility');
			const res = await bookFn({
				facilityId: selectedFacilityId,
				date,
				startMs,
				endMs,
				label: label.trim(),
				eventType,
				teamId: teamId || null,
			});
			bookSuccess = res.data.bookingId;
			onbooked?.(res.data.bookingId);
			label = '';
			availStatus = 'unknown';
		} catch (err: unknown) {
			const code = (err as { code?: string }).code;
			if (code === 'functions/already-exists') {
				availStatus = 'conflict';
				bookError = 'COLLISION DETECTED in transaction: ' + (err instanceof Error ? err.message : 'Time block is occupied.');
			} else {
				bookError = err instanceof Error ? err.message : 'Booking failed.';
			}
		} finally {
			isBooking = false;
		}
	}
</script>

<div
	class="tw-w-full tw-space-y-5 tw-font-mono tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-6 tw-shadow-2xl"
	style="border-radius: 0px;"
>
	<!-- Header with Radar Probe Indicator -->
	<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-4">
		<div class="tw-flex tw-items-center tw-gap-3">
			<span class="tw-w-2.5 tw-h-2.5 tw-bg-[#14b8a6] tw-shadow-[0_0_10px_#14b8a6]"></span>
			<div>
				<h3 class="tw-text-xs tw-font-black tw-tracking-widest tw-text-white tw-uppercase tw-m-0">
					PITCH RADAR PROBE & RESERVATION
				</h3>
				<span class="tw-text-[10px] tw-text-slate-400 tw-uppercase">FACILITY COLLISION AVOIDANCE</span>
			</div>
		</div>

		<div>
			{#if isChecking}
				<span class="tw-text-xs tw-font-bold tw-text-[#14b8a6] tw-animate-pulse">PROBING SENSORS…</span>
			{:else if availStatus === 'available'}
				<span class="tw-text-xs tw-font-bold tw-text-emerald-400 tw-bg-emerald-950/60 tw-border tw-border-emerald-500 tw-px-2.5 tw-py-1">
					● AVAILABLE · CLEAR TO BOOK
				</span>
			{:else if availStatus === 'conflict'}
				<span class="tw-text-xs tw-font-bold tw-text-rose-400 tw-bg-rose-950/60 tw-border tw-border-rose-500 tw-px-2.5 tw-py-1">
					⚠ COLLISION DETECTED
				</span>
			{/if}
		</div>
	</div>

	<!-- RESOURCE UNAVAILABLE / CONFLICT BANNER -->
	{#if availStatus === 'conflict'}
		<div class="tw-p-4 tw-bg-rose-950/40 tw-border tw-border-rose-500 tw-space-y-3">
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-text-xs tw-font-black tw-tracking-widest tw-text-rose-400 tw-uppercase">
					⚠ RESOURCE UNAVAILABLE — CONFLICTING BOOKINGS DETECTED
				</span>
			</div>
			{#each conflicts as c}
				<div class="tw-p-3 tw-bg-[#020617] tw-border-l-4 tw-border-rose-500 tw-text-xs">
					<div class="tw-font-bold tw-text-white">{c.label}</div>
					<div class="tw-text-slate-400 tw-mt-1">
						{msToHHMM(c.startMs)} – {msToHHMM(c.endMs)}
						{#if c.teamId}<span class="tw-ml-2 tw-text-[#14b8a6]">· Team: {c.teamId}</span>{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Facility Selection -->
	{#if loadingFacilities}
		<div class="tw-h-10 tw-flex tw-items-center tw-text-xs tw-text-slate-400 tw-animate-pulse">
			Loading facility ground stations…
		</div>
	{:else if facilities.length === 0}
		<div class="tw-text-xs tw-text-[#fbbf24] tw-p-3 tw-bg-[#020617] tw-border tw-border-[#334155]">
			No active pitch facilities configured for this club yet.
		</div>
	{:else}
		<div class="tw-space-y-1.5">
			<label for="fs-pitch" class="tw-block tw-text-[11px] tw-font-bold tw-text-slate-300 tw-uppercase tw-tracking-wider">
				TARGET PITCH / FACILITY
			</label>
			<select
				id="fs-pitch"
				bind:value={selectedFacilityId}
				class="tw-w-full tw-px-3.5 tw-py-2.5 tw-text-xs tw-bg-[#020617] tw-border tw-border-[#334155] focus:tw-border-[#14b8a6] tw-text-white tw-outline-none"
				style="border-radius: 0px;"
			>
				{#each facilities as f}
					<option value={f.facilityId}>
						{f.name} · {f.pitchType}{f.capacity ? ` · Cap: ${f.capacity}` : ''}
					</option>
				{/each}
			</select>
		</div>
	{/if}

	<!-- Date and Time 3-Column Grid -->
	<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-3 tw-gap-3">
		<div class="tw-space-y-1.5">
			<label for="fs-date" class="tw-block tw-text-[11px] tw-font-bold tw-text-slate-300 tw-uppercase">
				DATE
			</label>
			<input
				id="fs-date"
				type="date"
				bind:value={date}
				class="tw-w-full tw-px-3.5 tw-py-2.5 tw-text-xs tw-bg-[#020617] tw-border tw-border-[#334155] focus:tw-border-[#14b8a6] tw-text-white tw-outline-none"
				style="border-radius: 0px;"
				min={todayISO()}
			/>
		</div>

		<div class="tw-space-y-1.5">
			<label for="fs-start" class="tw-block tw-text-[11px] tw-font-bold tw-text-slate-300 tw-uppercase">
				START TIME
			</label>
			<input
				id="fs-start"
				type="time"
				bind:value={startTime}
				class="tw-w-full tw-px-3.5 tw-py-2.5 tw-text-xs tw-bg-[#020617] tw-border tw-border-[#334155] focus:tw-border-[#14b8a6] tw-text-white tw-outline-none"
				style="border-radius: 0px;"
			/>
		</div>

		<div class="tw-space-y-1.5">
			<label for="fs-end" class="tw-block tw-text-[11px] tw-font-bold tw-text-slate-300 tw-uppercase">
				END TIME
			</label>
			<input
				id="fs-end"
				type="time"
				bind:value={endTime}
				class="tw-w-full tw-px-3.5 tw-py-2.5 tw-text-xs tw-bg-[#020617] tw-border tw-border-[#334155] focus:tw-border-[#14b8a6] tw-text-white tw-outline-none"
				style="border-radius: 0px;"
			/>
		</div>
	</div>

	{#if isValidTimeBlock}
		<div class="tw-text-xs tw-text-[#14b8a6] tw-font-bold">
			TOTAL DURATION: {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m
		</div>
	{:else if startMs > 0}
		<div class="tw-text-xs tw-text-[#fbbf24]">⚠ End time must be after start time.</div>
	{/if}

	<!-- Event Label -->
	<div class="tw-space-y-1.5">
		<label for="fs-event" class="tw-block tw-text-[11px] tw-font-bold tw-text-slate-300 tw-uppercase">
			SESSION / FIXTURE LABEL
		</label>
		<input
			id="fs-event"
			type="text"
			bind:value={label}
			placeholder="e.g. U14 Tactical Shape & High Press Workshop"
			class="tw-w-full tw-px-3.5 tw-py-2.5 tw-text-xs tw-bg-[#020617] tw-border tw-border-[#334155] focus:tw-border-[#14b8a6] tw-text-white tw-outline-none placeholder:tw-text-slate-600"
			style="border-radius: 0px;"
		/>
	</div>

	<!-- Block Type Segmented Selector -->
	<div class="tw-space-y-1.5">
		<span class="tw-block tw-text-[11px] tw-font-bold tw-text-slate-300 tw-uppercase">
			SESSION TYPE
		</span>
		<div class="tw-grid tw-grid-cols-3 tw-gap-2">
			{#each (['practice', 'fixture', 'other'] as const) as et}
				<button
					type="button"
					onclick={() => (eventType = et)}
					class="tw-py-2.5 tw-text-xs tw-font-bold tw-tracking-wider tw-uppercase tw-transition-all tw-border {eventType === et ? 'tw-bg-[#14b8a6]/20 tw-border-[#14b8a6] tw-text-[#14b8a6]' : 'tw-bg-[#020617] tw-border-[#334155] tw-text-slate-400 hover:tw-border-slate-400'}"
					style="border-radius: 0px;"
				>
					{et === 'practice' ? 'PRACTICE' : et === 'fixture' ? 'MATCH FIXTURE' : 'WORKSHOP'}
				</button>
			{/each}
		</div>
	</div>

	<!-- Errors / Success Feedback -->
	{#if bookError}
		<div class="tw-p-3 tw-bg-rose-950/60 tw-border tw-border-rose-500 tw-text-rose-300 tw-text-xs tw-font-bold">
			⚠ {bookError}
		</div>
	{/if}
	{#if checkError}
		<div class="tw-p-3 tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#fbbf24] tw-text-xs">
			⚠ {checkError}
		</div>
	{/if}
	{#if bookSuccess}
		<div class="tw-p-3 tw-bg-emerald-950/60 tw-border tw-border-emerald-500 tw-text-emerald-300 tw-text-xs tw-font-bold">
			✓ BOOKING CONFIRMED · RESERVATION ID: {bookSuccess.slice(0, 8).toUpperCase()}
		</div>
	{/if}

	<!-- Primary CTA (Action Gold #fbbf24) -->
	<button
		type="button"
		onclick={handleBook}
		disabled={isBooking || availStatus === 'conflict' || !isValidTimeBlock || !label.trim() || !selectedFacilityId}
		class="tw-w-full tw-py-3.5 tw-bg-[#fbbf24] hover:tw-bg-[#f59e0b] tw-text-black tw-text-xs tw-font-black tw-tracking-widest tw-uppercase tw-transition-all active:tw-scale-[0.99] disabled:tw-opacity-40 disabled:tw-cursor-not-allowed tw-shadow-[0_0_15px_rgba(251,191,36,0.3)]"
		style="border-radius: 0px;"
	>
		{#if isBooking}LOCKING TIME BLOCK IN DATABASE…
		{:else if availStatus === 'conflict'}RESOURCE OCCUPIED — CHOOSE ANOTHER TIME SLOT
		{:else}⚡ CONFIRM PITCH RESERVATION{/if}
	</button>
</div>
