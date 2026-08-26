<script lang="ts">
	/**
	 * FacilityScheduler.svelte — Pitch Collision Avoidance UI
	 * ─────────────────────────────────────────────────────────
	 * Embeds into the War Room scheduling board.  Displays a facility picker,
	 * time-block selector with live availability probing, and a glowing red
	 * "RESOURCE UNAVAILABLE" overlay when a 409 conflict is detected.
	 *
	 * CONFLICT DETECTION FLOW
	 * ────────────────────────
	 *  User selects facility + date + time
	 *  → checkFacilityAvailability CF (debounced, non-mutating)
	 *  → if conflict: show RESOURCE UNAVAILABLE banner with conflicting events
	 *  → "BOOK FACILITY" triggers bookFacility CF (transactional)
	 *  → if 409 inside transaction: show COLLISION DETECTED error
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

	// ── State ─────────────────────────────────────────────────────────────────

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

	// Glitch animation for conflict banner
	let glitchActive = $state(false);
	let glitchInterval: ReturnType<typeof setInterval> | null = null;

	// ── Derived ───────────────────────────────────────────────────────────────

	const startMs = $derived(dateTimeToMs(date, startTime));
	const endMs = $derived(dateTimeToMs(date, endTime));
	const durationMinutes = $derived(Math.max(0, Math.round((endMs - startMs) / 60000)));
	const isValidTimeBlock = $derived(endMs > startMs + 5 * 60000);

	const selectedFacility = $derived(
		facilities.find((f) => f.facilityId === selectedFacilityId) ?? null,
	);

	// ── Helpers ───────────────────────────────────────────────────────────────

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

	// ── Load facilities ───────────────────────────────────────────────────────

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

	// ── Debounced availability check ──────────────────────────────────────────

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		// Re-run whenever any of these change
		const _a = selectedFacilityId, _b = date, _c = startTime, _d = endTime;
		if (!_a || !_b || !_c || !_d) return;

		if (debounceTimer) clearTimeout(debounceTimer);
		availStatus = 'unknown';
		conflicts = [];
		checkError = null;

		debounceTimer = setTimeout(() => {
			if (isValidTimeBlock && selectedFacilityId) checkAvailability();
		}, 600);
	});

	function triggerGlitch() {
		glitchActive = true;
		if (glitchInterval) clearInterval(glitchInterval);
		glitchInterval = setInterval(() => { glitchActive = !glitchActive; }, 120);
		setTimeout(() => {
			if (glitchInterval) clearInterval(glitchInterval);
			glitchActive = false;
		}, 1400);
	}

	// ── Availability probe ────────────────────────────────────────────────────

	async function checkAvailability() {
		isChecking = true;
		try {
			const checkFn = httpsCallable<
				object,
				{ available: boolean; facilityName: string; conflicts: ConflictEntry[] }
			>(fns, 'checkFacilityAvailability');
			const res = await checkFn({ facilityId: selectedFacilityId, date, startMs, endMs });
			availStatus = res.data.available ? 'available' : 'conflict';
			conflicts = res.data.conflicts;
			if (availStatus === 'conflict') triggerGlitch();
		} catch (err: unknown) {
			availStatus = 'error';
			checkError = err instanceof Error ? err.message : 'Availability check failed.';
		} finally {
			isChecking = false;
		}
	}

	// ── Book facility ─────────────────────────────────────────────────────────

	async function handleBook() {
		if (!label.trim()) { bookError = 'Event label is required.'; return; }
		if (!isValidTimeBlock) { bookError = 'End time must be after start time.'; return; }
		if (availStatus === 'conflict') { bookError = 'Cannot book a conflicted time slot.'; return; }

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
			// Reset form
			label = '';
			availStatus = 'unknown';
		} catch (err: unknown) {
			const code = (err as { code?: string }).code;
			if (code === 'functions/already-exists') {
				// 409 Conflict from the transactional check
				availStatus = 'conflict';
				triggerGlitch();
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
	class="tw-w-full tw-space-y-4 tw-font-mono tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-lg tw-p-5 tw-shadow-lg"
>
	<!-- Header -->
	<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-3">
		<div class="tw-flex tw-items-center tw-gap-2">
			<div class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-[#14b8a6] tw-shadow-[0_0_8px_#14b8a6]"></div>
			<span class="tw-text-xs tw-font-bold tw-tracking-widest tw-text-[#14b8a6] tw-uppercase">PITCH RADAR PROBE</span>
		</div>
		{#if isChecking}
			<span class="tw-text-xs tw-text-[#14b8a6] tw-animate-pulse">[ PROBING RADAR... ]</span>
		{:else if availStatus === 'available'}
			<span class="tw-text-xs tw-font-bold tw-text-[#34d399]">[ ■ AVAILABLE · CLEAR TO BOOK ]</span>
		{:else if availStatus === 'conflict'}
			<span class="tw-text-xs tw-font-bold tw-text-[#f87171]">[ ⚠ COLLISION DETECTED ]</span>
		{/if}
	</div>

	<!-- ── RESOURCE UNAVAILABLE BANNER ────────────────────────────────────── -->
	{#if availStatus === 'conflict'}
		<div
			class="tw-relative tw-overflow-hidden tw-rounded-lg tw-p-4 tw-space-y-2 tw-bg-[#f87171]/10 tw-border tw-border-[#f87171] tw-transition-all"
			style="box-shadow: 0 0 {glitchActive ? '20px' : '8px'} rgba(248, 113, 113, 0.2);"
		>
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-text-xs tw-font-black tw-tracking-widest tw-text-[#f87171] tw-uppercase">
					⚠ PITCH COLLISION — RESOURCE OCCUPIED
				</span>
			</div>

			{#each conflicts as c}
				<div class="tw-p-2.5 tw-rounded tw-bg-[#020617] tw-border-l-4 tw-border-[#f87171] tw-text-xs">
					<div class="tw-font-bold tw-text-[#fafafa]">{c.label}</div>
					<div class="tw-text-[#94a3b8] tw-mt-0.5">
						{msToHHMM(c.startMs)} – {msToHHMM(c.endMs)}
						{#if c.teamId}<span class="tw-ml-2 tw-text-[#14b8a6]">· {c.teamId}</span>{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Facility selector -->
	{#if loadingFacilities}
		<div class="tw-h-8 tw-flex tw-items-center">
			<span class="tw-text-xs tw-text-[#94a3b8] tw-animate-pulse">Loading pitch facilities…</span>
		</div>
	{:else if facilities.length === 0}
		<div class="tw-text-xs tw-text-[#f59e0b] tw-p-3 tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded">
			No active pitch facilities configured for this club yet.
		</div>
	{:else}
		<div class="tw-space-y-1">
			<label for="fs-pitch" class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-[#94a3b8] tw-uppercase">SELECT FACILITY / PITCH</label>
			<select
				id="fs-pitch"
				bind:value={selectedFacilityId}
				class="tw-w-full tw-px-3 tw-py-2 tw-text-xs tw-bg-[#020617] tw-border tw-border-[#334155] focus:tw-border-[#14b8a6] tw-rounded-md tw-text-[#fafafa] tw-outline-none tw-cursor-pointer"
			>
				{#each facilities as f}
					<option value={f.facilityId}>
						{f.name} · {f.pitchType}{f.capacity ? ` · cap ${f.capacity}` : ''}
					</option>
				{/each}
			</select>
		</div>
	{/if}

	<!-- Date and time row -->
	<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-3 tw-gap-3">
		<div class="tw-space-y-1">
			<label for="fs-date" class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-[#94a3b8] tw-uppercase">DATE</label>
			<input
				id="fs-date"
				type="date"
				bind:value={date}
				class="tw-w-full tw-px-3 tw-py-2 tw-text-xs tw-bg-[#020617] tw-border tw-border-[#334155] focus:tw-border-[#14b8a6] tw-rounded-md tw-text-[#fafafa] tw-outline-none"
				min={todayISO()}
			/>
		</div>
		<div class="tw-space-y-1">
			<label for="fs-start" class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-[#94a3b8] tw-uppercase">START TIME</label>
			<input
				id="fs-start"
				type="time"
				bind:value={startTime}
				class="tw-w-full tw-px-3 tw-py-2 tw-text-xs tw-bg-[#020617] tw-border tw-border-[#334155] focus:tw-border-[#14b8a6] tw-rounded-md tw-text-[#fafafa] tw-outline-none"
			/>
		</div>
		<div class="tw-space-y-1">
			<label for="fs-end" class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-[#94a3b8] tw-uppercase">END TIME</label>
			<input
				id="fs-end"
				type="time"
				bind:value={endTime}
				class="tw-w-full tw-px-3 tw-py-2 tw-text-xs tw-bg-[#020617] tw-border tw-border-[#334155] focus:tw-border-[#14b8a6] tw-rounded-md tw-text-[#fafafa] tw-outline-none"
			/>
		</div>
	</div>

	{#if isValidTimeBlock}
		<div class="tw-text-[11px] tw-text-[#14b8a6] tw-font-bold">
			DURATION: {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m
		</div>
	{:else if startMs > 0}
		<div class="tw-text-[11px] tw-text-[#f59e0b]">⚠ End time must be after start time.</div>
	{/if}

	<!-- Event details -->
	<div class="tw-space-y-1">
		<label for="fs-event" class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-[#94a3b8] tw-uppercase">EVENT LABEL</label>
		<input
			id="fs-event"
			type="text"
			bind:value={label}
			placeholder="e.g. U14 Tactical Training Block"
			class="tw-w-full tw-px-3 tw-py-2 tw-text-xs tw-bg-[#020617] tw-border tw-border-[#334155] focus:tw-border-[#14b8a6] tw-rounded-md tw-text-[#fafafa] tw-outline-none"
		/>
	</div>

	<div class="tw-space-y-1">
		<div class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-[#94a3b8] tw-uppercase">BLOCK TYPE</div>
		<div class="tw-grid tw-grid-cols-3 tw-gap-2">
			{#each (['practice', 'fixture', 'other'] as const) as et}
				<button
					type="button"
					onclick={() => (eventType = et)}
					class="tw-py-2 tw-text-xs tw-font-bold tw-tracking-wider tw-capitalize tw-transition-all tw-rounded-md tw-border"
					style={eventType === et
						? 'border-color: #14b8a6; background: rgba(20, 184, 166, 0.2); color: #2dd4bf;'
						: 'border-color: #334155; background: #020617; color: #94a3b8;'}
				>{et}</button>
			{/each}
		</div>
	</div>

	<!-- Errors / success -->
	{#if bookError}
		<div class="tw-px-3 tw-py-2 tw-text-xs tw-bg-[#f87171]/10 tw-border tw-border-[#f87171] tw-text-[#f87171] tw-rounded">
			⚠ {bookError}
		</div>
	{/if}
	{#if checkError}
		<div class="tw-px-3 tw-py-2 tw-text-xs tw-text-[#f59e0b] tw-p-2 tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded">⚠ {checkError}</div>
	{/if}
	{#if bookSuccess}
		<div class="tw-px-3 tw-py-2 tw-text-xs tw-bg-[#34d399]/10 tw-border tw-border-[#34d399] tw-text-[#34d399] tw-rounded">
			✓ BOOKING CONFIRMED · RESERVATION ID: {bookSuccess.slice(0, 8).toUpperCase()}
		</div>
	{/if}

	<!-- Book button -->
	<button
		type="button"
		onclick={handleBook}
		disabled={isBooking || availStatus === 'conflict' || !isValidTimeBlock || !label.trim() || !selectedFacilityId}
		class="tw-w-full tw-py-3 tw-text-xs tw-font-bold tw-tracking-widest tw-transition-all tw-duration-200 disabled:tw-opacity-30 disabled:tw-cursor-not-allowed tw-rounded-md tw-border"
		style={availStatus === 'conflict'
			? 'background: rgba(248, 113, 113, 0.15); border-color: #f87171; color: #f87171;'
			: 'background: rgba(20, 184, 166, 0.15); border-color: #14b8a6; color: #14b8a6;'}
	>
		{#if isBooking}[ LOCKING TIME BLOCK... ]
		{:else if availStatus === 'conflict'}[ RESOURCE OCCUPIED — CHOOSE ANOTHER SLOT ]
		{:else}[ CONFIRM PITCH RESERVATION ]{/if}
	</button>
</div>
