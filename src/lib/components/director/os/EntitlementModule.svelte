<script>
	import { db } from '$lib/firebase.js';
	import { doc, onSnapshot } from 'firebase/firestore';

	let { clubId = '' } = $props();

	let loading = $state(true);
	let err = $state(/** @type {string | null} */ (null));
	let activeSeats = $state(0);
	let reservedSeats = $state(0);
	let seatsLimit = $state(0);

	$effect(() => {
		if (!clubId) {
			loading = false;
			err = 'No club scope on your profile.';
			activeSeats = 0;
			reservedSeats = 0;
			seatsLimit = 0;
			return;
		}
		loading = true;
		err = null;
		const unsub = onSnapshot(
			doc(db, 'license_entitlements', clubId),
			(snap) => {
				loading = false;
				if (!snap.exists()) {
					activeSeats = 0;
					reservedSeats = 0;
					seatsLimit = 0;
					err = 'No license entitlement document yet. Generate a club license in Admin.';
					return;
				}
				err = null;
				const d = snap.data();
				activeSeats = typeof d.active_seats === 'number' ? d.active_seats : 0;
				reservedSeats = typeof d.reserved_seats === 'number' ? d.reserved_seats : 0;
				seatsLimit = typeof d.seats_limit === 'number' ? d.seats_limit : 0;
			},
			(e) => {
				console.error('[EntitlementModule]', e);
				loading = false;
				err = e instanceof Error ? e.message : 'Could not load entitlements.';
			}
		);
		return () => unsub();
	});

	const usedPct = $derived(
		seatsLimit > 0
			? Math.min(100, ((activeSeats + reservedSeats) / seatsLimit) * 100)
			: 0
	);

	const stress = $derived(
		seatsLimit <= 0 ? 'low' : usedPct >= 90 ? 'high' : usedPct >= 70 ? 'medium' : 'low'
	);

	const segActive = $derived(seatsLimit > 0 ? (activeSeats / seatsLimit) * 100 : 0);
	const segReserved = $derived(seatsLimit > 0 ? (reservedSeats / seatsLimit) * 100 : 0);
	const segAvail = $derived(Math.max(0, 100 - segActive - segReserved));
</script>

<div class="tw-flex tw-flex-col tw-gap-4">
	<div class="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3 dir-ent-label-row">
		<div>
			<h3 class="tw-m-0 tw-text-lg tw-font-extrabold tw-tracking-tight" style="color: var(--text-primary);">
				License seats
			</h3>
			<p class="tw-m-0 tw-text-sm tw-mt-1" style="color: var(--text-secondary);">
				Active roster seats, pending coach holds, and remaining capacity.
			</p>
		</div>
		{#if !loading && !err && seatsLimit > 0}
			<span
				class="tw-tabular-nums tw-text-sm tw-font-bold tw-rounded-lg tw-px-3 tw-py-1"
				style="background: rgba(15,23,42,0.06); color: var(--text-primary);"
			>
				{activeSeats} active · {reservedSeats} reserved · {seatsLimit} cap
			</span>
		{/if}
	</div>

	{#if loading}
		<div
			class="tw-h-3 tw-rounded-full tw-animate-pulse"
			style="background: rgba(15,23,42,0.1);"
			aria-hidden="true"
		></div>
	{:else if err}
		<p class="tw-m-0 tw-text-sm" style="color: var(--danger-red);" role="alert">{err}</p>
	{:else if seatsLimit <= 0}
		<p class="tw-m-0 tw-text-sm" style="color: var(--text-secondary);">
			Seat limit is not set yet. Contact your platform administrator.
		</p>
	{:else}
		<div
			class="dir-ent-track dir-ent-track--segments"
			style="display: grid; grid-template-columns: {segActive}% {segReserved}% {segAvail}%;"
			aria-label="Seat usage by segment"
		>
			<div class="dir-ent-seg dir-ent-seg--active" data-stress={stress}></div>
			<div class="dir-ent-seg dir-ent-seg--reserved"></div>
			<div class="dir-ent-seg dir-ent-seg--empty"></div>
		</div>
		<p class="tw-m-0 tw-text-xs tw-font-medium" style="color: var(--muted-slate);">
			<span class="tw-inline-flex tw-items-center tw-gap-1 tw-mr-3"
				><span class="dir-ent-legend dir-ent-legend--active"></span> Active</span
			>
			<span class="tw-inline-flex tw-items-center tw-gap-1 tw-mr-3"
				><span class="dir-ent-legend dir-ent-legend--reserved"></span> Reserved</span
			>
			<span class="tw-inline-flex tw-items-center tw-gap-1"
				><span class="dir-ent-legend dir-ent-legend--empty"></span> Available</span
			>
		</p>
		<p class="tw-m-0 tw-text-xs tw-font-medium" style="color: var(--muted-slate);">
			{#if stress === 'high'}
				Critical: active plus pending invites are near capacity.
			{:else if stress === 'medium'}
				Approaching limit — plan capacity with your registrar team.
			{:else}
				Healthy headroom across licensed seats.
			{/if}
		</p>
	{/if}
</div>
