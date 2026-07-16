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
	class="w-full space-y-4 font-mono"
	style="
		background: rgba(0, 8, 20, 0.95);
		border: 1px solid rgba(0, 255, 255, 0.15);
		border-radius: 4px;
		padding: 1.25rem;
	"
>
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<div class="w-1.5 h-1.5 rounded-full bg-cyan-400" style="box-shadow: 0 0 6px #14b8a6;"></div>
			<span class="text-xs tracking-widest" style="color: rgba(0,255,255,0.7);">FACILITY SCHEDULER</span>
		</div>
		{#if isChecking}
			<span class="text-xs animate-pulse" style="color: rgba(0,255,255,0.4);">PROBING...</span>
		{:else if availStatus === 'available'}
			<span class="text-xs" style="color: #2dd4bf;">■ AVAILABLE</span>
		{:else if availStatus === 'conflict'}
			<span class="text-xs" style="color: #ff4060; text-shadow: 0 0 8px #ff4060;">■ CONFLICT</span>
		{/if}
	</div>

	<!-- ── RESOURCE UNAVAILABLE BANNER ────────────────────────────────────── -->
	{#if availStatus === 'conflict'}
		<div
			class="relative overflow-hidden rounded-sm p-3 space-y-2"
			style="
				background: rgba(255, 40, 64, 0.06);
				border: 1px solid rgba(255, 64, 96, {glitchActive ? '0.9' : '0.5'});
				box-shadow: 0 0 {glitchActive ? '30px' : '12px'} rgba(255,64,96,{glitchActive ? '0.25' : '0.1'});
				transition: all 0.1s;
				transform: translateX({glitchActive ? (Math.random() > 0.5 ? 1 : -1) : 0}px);
			"
		>
			<!-- Diagonal stripe overlay -->
			<div class="absolute inset-0 pointer-events-none" style="
				background: repeating-linear-gradient(
					-45deg,
					transparent,
					transparent 8px,
					rgba(255,64,96,0.03) 8px,
					rgba(255,64,96,0.03) 9px
				);
			"></div>

			<div class="flex items-center gap-2">
				<span class="text-sm font-bold tracking-widest" style="color: #ff4060; text-shadow: 0 0 12px rgba(255,64,96,0.7);">
					⚠ RESOURCE UNAVAILABLE
				</span>
			</div>

			{#each conflicts as c}
				<div
					class="px-2 py-1.5 rounded-sm text-xs space-y-0.5"
					style="background: rgba(255,64,96,0.06); border-left: 2px solid rgba(255,64,96,0.4);"
				>
					<div class="font-bold" style="color: rgba(255,150,160,0.9);">{c.label}</div>
					<div style="color: rgba(255,100,120,0.6);">
						{msToHHMM(c.startMs)} – {msToHHMM(c.endMs)}
						{#if c.teamId}<span class="ml-2 opacity-60">· {c.teamId}</span>{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Facility selector -->
	{#if loadingFacilities}
		<div class="h-8 flex items-center">
			<span class="text-xs animate-pulse" style="color: rgba(0,255,255,0.4);">LOADING FACILITIES...</span>
		</div>
	{:else if facilities.length === 0}
		<div class="text-xs" style="color: rgba(255,200,100,0.6);">
			No active facilities configured. Ask a Director to add facilities.
		</div>
	{:else}
		<div class="space-y-1">
			<label class="text-xs tracking-widest" style="color: rgba(0,255,255,0.5);">PITCH / FACILITY</label>
			<select
				bind:value={selectedFacilityId}
				class="w-full px-3 py-2 text-xs bg-transparent outline-none cursor-pointer"
				style="
					border: 1px solid rgba(0,255,255,0.2);
					border-radius: 2px;
					color: #14b8a6;
					background: rgba(0,255,255,0.02);
				"
			>
				{#each facilities as f}
					<option value={f.facilityId} style="background: #000e1a; color: #14b8a6;">
						{f.name} · {f.pitchType}{f.capacity ? ` · cap ${f.capacity}` : ''}
					</option>
				{/each}
			</select>
		</div>
	{/if}

	<!-- Date and time row -->
	<div class="grid grid-cols-3 gap-3">
		<div class="space-y-1">
			<label class="text-xs tracking-widest" style="color: rgba(0,255,255,0.5);">DATE</label>
			<input
				type="date"
				bind:value={date}
				class="w-full px-2 py-2 text-xs bg-transparent outline-none"
				style="border: 1px solid rgba(0,255,255,0.2); border-radius: 2px; color: #14b8a6; colorscheme: dark;"
				min={todayISO()}
			/>
		</div>
		<div class="space-y-1">
			<label class="text-xs tracking-widest" style="color: rgba(0,255,255,0.5);">START</label>
			<input
				type="time"
				bind:value={startTime}
				class="w-full px-2 py-2 text-xs bg-transparent outline-none"
				style="border: 1px solid rgba(0,255,255,0.2); border-radius: 2px; color: #14b8a6; colorscheme: dark;"
			/>
		</div>
		<div class="space-y-1">
			<label class="text-xs tracking-widest" style="color: rgba(0,255,255,0.5);">END</label>
			<input
				type="time"
				bind:value={endTime}
				class="w-full px-2 py-2 text-xs bg-transparent outline-none"
				style="border: 1px solid rgba(0,255,255,0.2); border-radius: 2px; color: #14b8a6; colorscheme: dark;"
			/>
		</div>
	</div>

	{#if isValidTimeBlock}
		<div class="text-xs" style="color: rgba(0,255,255,0.35);">
			DURATION: {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m
		</div>
	{:else if startMs > 0}
		<div class="text-xs" style="color: rgba(255,180,80,0.7);">⚠ End time must be after start time.</div>
	{/if}

	<!-- Event details -->
	<div class="space-y-1">
		<label class="text-xs tracking-widest" style="color: rgba(0,255,255,0.5);">EVENT LABEL</label>
		<input
			type="text"
			bind:value={label}
			placeholder="e.g. U14 Training Block"
			class="w-full px-3 py-2 text-xs bg-transparent outline-none"
			style="border: 1px solid rgba(0,255,255,0.2); border-radius: 2px; color: #14b8a6;"
			onfocus={(e) => (e.currentTarget.style.borderColor = 'rgba(0,255,255,0.5)')}
			onblur={(e) => (e.currentTarget.style.borderColor = 'rgba(0,255,255,0.2)')}
		/>
	</div>

	<div class="space-y-1">
		<label class="text-xs tracking-widest" style="color: rgba(0,255,255,0.5);">EVENT TYPE</label>
		<div class="flex gap-2">
			{#each (['practice', 'fixture', 'other'] as const) as et}
				<button
					onclick={() => (eventType = et)}
					class="flex-1 py-1.5 text-xs tracking-wider capitalize transition-all"
					style="
						border: 1px solid {eventType === et ? 'rgba(0,255,255,0.5)' : 'rgba(0,255,255,0.15)'};
						background: {eventType === et ? 'rgba(0,255,255,0.1)' : 'transparent'};
						color: {eventType === et ? '#14b8a6' : 'rgba(0,255,255,0.4)'};
						border-radius: 2px;
					"
				>{et}</button>
			{/each}
		</div>
	</div>

	<!-- Errors / success -->
	{#if bookError}
		<div class="px-3 py-2 text-xs" style="background: rgba(255,64,96,0.08); border: 1px solid rgba(255,64,96,0.3); color: #ff4060;">
			⚠ {bookError}
		</div>
	{/if}
	{#if checkError}
		<div class="px-3 py-2 text-xs" style="color: rgba(255,200,100,0.6);">⚠ {checkError}</div>
	{/if}
	{#if bookSuccess}
		<div class="px-3 py-2 text-xs" style="background: rgba(45, 212, 191,0.06); border: 1px solid rgba(45, 212, 191,0.3); color: #2dd4bf;">
			✓ BOOKING CONFIRMED · ID: {bookSuccess.slice(0, 8).toUpperCase()}
		</div>
	{/if}

	<!-- Book button -->
	<button
		onclick={handleBook}
		disabled={isBooking || availStatus === 'conflict' || !isValidTimeBlock || !label.trim() || !selectedFacilityId}
		class="w-full py-2.5 text-xs font-bold tracking-widest transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
		style="
			background: {availStatus === 'conflict' ? 'rgba(255,64,96,0.08)' : 'rgba(0,255,255,0.08)'};
			border: 1px solid {availStatus === 'conflict' ? 'rgba(255,64,96,0.4)' : 'rgba(0,255,255,0.4)'};
			color: {availStatus === 'conflict' ? '#ff4060' : '#14b8a6'};
			border-radius: 2px;
		"
		onmouseenter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = availStatus === 'conflict' ? 'rgba(255,64,96,0.14)' : 'rgba(0,255,255,0.14)'; }}
		onmouseleave={(e) => { e.currentTarget.style.background = availStatus === 'conflict' ? 'rgba(255,64,96,0.08)' : 'rgba(0,255,255,0.08)'; }}
	>
		{#if isBooking}[ LOCKING TIME BLOCK... ]
		{:else if availStatus === 'conflict'}[ RESOURCE UNAVAILABLE ]
		{:else}[ BOOK FACILITY ]{/if}
	</button>
</div>
