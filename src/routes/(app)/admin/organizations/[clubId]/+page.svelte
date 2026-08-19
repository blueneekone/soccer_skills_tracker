<script lang="ts">
	import { untrack } from 'svelte';
	import { clubSportIconToken } from '$lib/utils/sport-icon.js';
	import { page } from '$app/state';
	import { db, functions } from '$lib/firebase.js';
	import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import '$lib/styles/enterprise-console.css';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { ADMIN_CLUB_CTX_KEY, type AdminClubCtx } from './adminClubCtx.js';

	const generateLicenseFn = httpsCallable(functions, 'generateLicense');

	const ctx = getContext<AdminClubCtx>(ADMIN_CLUB_CTX_KEY);
	const clubDoc = $derived(ctx.clubDoc);
	const clubId = $derived(ctx.clubId);

	// ── License entitlement ──────────────────────────────────────────────────────
	let entitlement = $state<Record<string, unknown> | null>(null);
	let entitlementLoading = $state(false);

	$effect(() => {
		const id = clubId;
		if (!id) return;
		let cancelled = false;
		entitlementLoading = true;
		void getDoc(doc(db, 'license_entitlements', id))
			.then((snap) => {
				if (cancelled) return;
				entitlement = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
			})
			.catch((e) => console.error('[clubDetail] entitlement', e))
			.finally(() => { if (!cancelled) entitlementLoading = false; });
		return () => { cancelled = true; };
	});

	// ── Inline club edit ─────────────────────────────────────────────────────────
	let editSport = $state<'soccer'|'basketball'|'baseball'|'football'|'volleyball'|'hockey'|'lacrosse'|'generic'>('soccer');
	let editInfinite = $state(false);
	let editSaving = $state(false);
	let editErr = $state('');
	let editSuccess = $state('');

	const ALLOWED_SPORTS = ['soccer','basketball','baseball','football','volleyball','hockey','lacrosse','generic'];

	$effect(() => {
		const cl = clubDoc;
		if (!cl) return;
		const s = typeof cl.sport === 'string' && cl.sport.trim()
			? cl.sport.trim().toLowerCase()
			: 'soccer';
		editSport = (ALLOWED_SPORTS.includes(s) ? s : 'generic') as typeof editSport;
		editInfinite = cl.isInfinite === true;
		editErr = '';
		editSuccess = '';
	});

	async function saveClubEdit() {
		if (!clubId) return;
		editSaving = true;
		editErr = '';
		editSuccess = '';
		try {
			await setDoc(
				doc(db, 'clubs', clubId),
				{ sport: editSport, isInfinite: editInfinite === true },
				{ merge: true },
			);
			await logSecurityEvent(
				'ADMIN_EDIT_CLUB',
				clubId,
				`sport=${editSport}; infinite=${editInfinite}`,
			);
			await teamsStore.load('super_admin', { scope: 'admin_full', routePath: page.url.pathname });
			editSuccess = 'Changes saved.';
			setTimeout(() => { editSuccess = ''; }, 4000);
		} catch (e) {
			editErr = e instanceof Error ? e.message : 'Could not save changes.';
		} finally {
			editSaving = false;
		}
	}

	// ── Assign Director ──────────────────────────────────────────────────────────
	let assignDirEmail = $state('');
	let assignDirSaving = $state(false);
	let assignDirErr = $state('');
	let assignDirOk = $state('');

	async function assignDirector() {
		if (!assignDirEmail.trim() || !clubId) {
			assignDirErr = 'Enter a valid director email.';
			return;
		}
		const email = assignDirEmail.trim().toLowerCase();
		assignDirSaving = true;
		assignDirErr = '';
		assignDirOk = '';
		try {
			await setDoc(doc(db, 'clubs', clubId), { directorEmail: email }, { merge: true });
			await setDoc(doc(db, 'users', email), { role: 'director', clubId: clubId }, { merge: true });
			await logSecurityEvent('ASSIGN_DIRECTOR', email, `Club ID: ${clubId}`);
			assignDirOk = `${email} is now director of this organization.`;
			assignDirEmail = '';
			setTimeout(() => { assignDirOk = ''; }, 4000);
			await teamsStore.load('super_admin', { scope: 'admin_full', routePath: page.url.pathname });
		} catch (e) {
			assignDirErr = e instanceof Error ? e.message : 'Assignment failed.';
		} finally {
			assignDirSaving = false;
		}
	}

	// ── Generate License ─────────────────────────────────────────────────────────
	let licenseType = $state('subscription');
	let licenseMaxSeats = $state(10);
	let licenseDurationMonths = $state(12);
	let licenseBusy = $state(false);
	let licenseErr = $state('');
	let licenseOk = $state('');

	async function onGenerateLicense() {
		if (!clubId) return;
		licenseErr = '';
		licenseOk = '';
		licenseBusy = true;
		try {
			const res = await generateLicenseFn({
				clubId: clubId,
				licenseType,
				maxSeats: Number(licenseMaxSeats) || 10,
				durationMonths: Number(licenseDurationMonths) || 12,
			});
			const data = res.data as { ok?: boolean; licenseKey?: string } | undefined;
			if (data?.ok && data.licenseKey) {
				licenseOk = `License created: ${data.licenseKey}`;
				setTimeout(() => { licenseOk = ''; }, 6000);
				licenseType = 'subscription';
				licenseMaxSeats = 10;
				licenseDurationMonths = 12;
			} else {
				licenseErr = 'Server did not return a license key.';
			}
		} catch (e) {
			licenseErr = e instanceof Error ? e.message : 'License generation failed.';
		} finally {
			licenseBusy = false;
		}
	}

	// ── Helpers ──────────────────────────────────────────────────────────────────
	function formatCreatedAt(raw: unknown) {
		if (!raw) return '—';
		if (typeof raw === 'object' && raw !== null && 'toDate' in raw) {
			const fn = (raw as Record<string, unknown>)['toDate'];
			if (typeof fn === 'function') {
				try {
					const d = (fn as () => Date).call(raw);
					return d instanceof Date ? d.toLocaleString() : '—';
				} catch { return '—'; }
			}
		}
		if (raw instanceof Date) return raw.toLocaleString();
		return '—';
	}

	function licenseUsedCount(ent: Record<string, unknown> | null) {
		if (!ent) return { used: 0, limit: 0, pct: 0 };
		const lim = typeof ent.seats_limit === 'number' ? ent.seats_limit : 0;
		const a   = typeof ent.active_seats === 'number' ? ent.active_seats : 0;
		const r   = typeof ent.reserved_seats === 'number' ? ent.reserved_seats : 0;
		const used = a + r;
		const pct  = lim > 0 ? Math.min(100, (used / lim) * 100) : 0;
		return { used, limit: lim, pct };
	}

	function licenseStressClass(pct: number) {
		if (pct > 90) return 'cd-gauge__fill--crit';
		if (pct > 70) return 'cd-gauge__fill--warn';
		return 'cd-gauge__fill--ok';
	}

	const teamsCount = $derived(
		teamsStore.teams.filter((t) => t.clubId === clubId).length,
	);

	let deleteModalOpen = $state(false);
	let deleteConfirmStep = $state(0);
	let deleteExecuting = $state(false);

	function handleDeleteRequest() {
		deleteConfirmStep = 1;
		deleteModalOpen = true;
	}

	function advanceDelete() {
		if (deleteConfirmStep === 1) deleteConfirmStep = 2;
	}

	async function executeDeletion() {
		if (!clubId || !clubDoc) return;
		deleteExecuting = true;
		try {
			await deleteDoc(doc(db, 'clubs', clubId));
			await logSecurityEvent('DELETE_CLUB', clubId, 'Club deleted permanently');
			untrack(() => { goto('/admin/organizations'); });
		} catch (e) {
			console.error(e);
			deleteExecuting = false;
			deleteModalOpen = false;
		}
	}
</script>

<div class="tw-flex tw-flex-col tw-gap-6 tw-w-full">
	{#if ctx.clubLoading}
		<div class="tw-p-10 tw-text-center tw-text-[#A1A1AA] tw-font-mono tw-text-xs">Loading organization…</div>
	{:else if ctx.clubErr}
		<div class="tw-flex tw-items-center tw-gap-2 tw-p-4 tw-bg-[#1E293B] tw-border tw-border-[#ef4444] tw-text-[#ef4444] tw-font-mono tw-text-xs tw-font-bold" role="alert">
			<Icon name={"status.warning-circle" as IconName} />
			<span>{ctx.clubErr}</span>
			<a href="/admin/organizations" class="tw-ml-auto tw-text-[#A1A1AA] tw-text-xs hover:tw-text-[#FAFAFA]">← Back to Organizations</a>
		</div>
	{:else if clubDoc}

		<!-- ── Club identity header ────────────────────────────────────────────── -->
		<div class="tw-flex tw-items-center tw-gap-4">
			{#if typeof clubDoc.logoUrl === 'string' && clubDoc.logoUrl.trim()}
				<img class="tw-w-14 tw-h-14 tw-object-cover tw-border tw-border-[#334155] tw-shrink-0" src={clubDoc.logoUrl.trim()} alt="" loading="lazy" />
			{:else}
				<div class="tw-w-14 tw-h-14 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-center tw-text-2xl tw-text-[#14b8a6] tw-shrink-0" aria-hidden="true">
					<Icon name={"org.building" as IconName} />
				</div>
			{/if}
			<div class="tw-flex tw-flex-col tw-gap-1 tw-min-w-0">
				<h1 class="tw-m-0 tw-text-2xl tw-font-extrabold tw-tracking-tight tw-text-[#FAFAFA]">{clubDoc.name || clubId}</h1>
				<div class="tw-flex tw-items-center tw-gap-3">
					<span class="tw-text-xs tw-text-[#94a3b8] tw-font-mono">{clubId}</span>
					{#if clubDoc.isInfinite === true}
						<span class="tw-inline-flex tw-items-center tw-text-[10px] tw-font-mono tw-font-bold tw-tracking-wider tw-px-2 tw-py-0.5 tw-text-[#020617] tw-bg-[#fbbf24] tw-uppercase">∞ Promo License</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- ── Info bento row ─────────────────────────────────────────────────── -->
		<div class="tw-grid tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-4">
			<div class="tw-flex tw-flex-col tw-gap-1 tw-p-4 tw-bg-[#0f172a] tw-border tw-border-[#334155]">
				<span class="tw-text-[10px] tw-font-mono tw-font-bold tw-uppercase tw-tracking-wider tw-text-[#94A3B8]">Sport</span>
				<span class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#FAFAFA] tw-uppercase tw-truncate">{clubDoc.sport || '—'}</span>
			</div>
			<div class="tw-flex tw-flex-col tw-gap-1 tw-p-4 tw-bg-[#0f172a] tw-border tw-border-[#334155]">
				<span class="tw-text-[10px] tw-font-mono tw-font-bold tw-uppercase tw-tracking-wider tw-text-[#94A3B8]">Director</span>
				<span class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#FAFAFA] tw-truncate">{clubDoc.directorEmail || '—'}</span>
			</div>
			<div class="tw-flex tw-flex-col tw-gap-1 tw-p-4 tw-bg-[#0f172a] tw-border tw-border-[#334155]">
				<span class="tw-text-[10px] tw-font-mono tw-font-bold tw-uppercase tw-tracking-wider tw-text-[#94A3B8]">Teams</span>
				<span class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#FAFAFA] tw-tabular-nums tw-truncate">{teamsCount}</span>
			</div>
			<div class="tw-flex tw-flex-col tw-gap-1 tw-p-4 tw-bg-[#0f172a] tw-border tw-border-[#334155]">
				<span class="tw-text-[10px] tw-font-mono tw-font-bold tw-uppercase tw-tracking-wider tw-text-[#94A3B8]">Created</span>
				<span class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#FAFAFA] tw-tabular-nums tw-truncate">{formatCreatedAt(clubDoc.createdAt)}</span>
			</div>
		</div>

		<!-- ── Operations & Contact ───────────────────────── -->
		<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155]">
			<div class="tw-bg-[#020617] tw-px-5 tw-py-3.5 tw-border-b tw-border-[#334155] tw-flex tw-items-center tw-gap-2 tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider">
				<Icon name={"sys.map-pin" as IconName} size={14} class="tw-text-[#14b8a6]" /> Operations & Contact
			</div>
			<div class="tw-p-5 tw-flex tw-flex-col tw-gap-3">
				<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-[200px_1fr] tw-gap-4 tw-p-3.5 tw-bg-[#020617] tw-border tw-border-[#334155]">
					<span class="tw-inline-flex tw-items-center tw-gap-2 tw-text-xs tw-font-mono tw-font-bold tw-tracking-wider tw-uppercase tw-text-[#94A3B8]">
						<Icon name={"sys.map-pin" as IconName} size={14} /> Verified Address
					</span>
					{#if typeof clubDoc.verifiedAddress === 'string' && clubDoc.verifiedAddress.trim()}
						<span class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#FAFAFA]">{clubDoc.verifiedAddress}</span>
					{:else}
						<span class="tw-text-xs tw-font-mono tw-text-[#64748b]">No verified address on file.</span>
					{/if}
				</div>
				<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-[200px_1fr] tw-gap-4 tw-p-3.5 tw-bg-[#020617] tw-border tw-border-[#334155]">
					<span class="tw-inline-flex tw-items-center tw-gap-2 tw-text-xs tw-font-mono tw-font-bold tw-tracking-wider tw-uppercase tw-text-[#94A3B8]">
						<Icon name={"comm.phone" as IconName} size={14} /> Phone Number
					</span>
					{#if typeof clubDoc.phoneNumber === 'string' && clubDoc.phoneNumber.trim()}
						<a class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#14b8a6] hover:tw-underline" href={`tel:${clubDoc.phoneNumber}`}>{clubDoc.phoneNumber}</a>
					{:else}
						<span class="tw-text-xs tw-font-mono tw-text-[#64748b]">No phone number on file.</span>
					{/if}
				</div>
				<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-[200px_1fr] tw-gap-4 tw-p-3.5 tw-bg-[#020617] tw-border tw-border-[#334155]">
					<span class="tw-inline-flex tw-items-center tw-gap-2 tw-text-xs tw-font-mono tw-font-bold tw-tracking-wider tw-uppercase tw-text-[#94A3B8]">
						<Icon name={clubSportIconToken(String(clubDoc?.sport || '')) as IconName} size={14} /> Primary Facility
					</span>
					{#if typeof clubDoc.primaryFacility === 'string' && clubDoc.primaryFacility.trim()}
						<span class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#FAFAFA]">{clubDoc.primaryFacility}</span>
					{:else}
						<span class="tw-text-xs tw-font-mono tw-text-[#64748b]">No primary facility assigned.</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- ── Licensing & Entitlement Bento ────────────────────────────────────────── -->
		<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155]">
			<div class="tw-bg-[#020617] tw-px-5 tw-py-3.5 tw-border-b tw-border-[#334155] tw-flex tw-items-center tw-gap-2 tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider">
				<Icon name={"sys.credit-card" as IconName} size={14} class="tw-text-[#14b8a6]" /> Licensing & Entitlement
			</div>
			<div class="tw-p-5">
				{#if clubDoc.isInfinite === true}
					<p class="tw-flex tw-items-center tw-gap-2 tw-p-3.5 tw-bg-[#020617] tw-border tw-border-[#fbbf24]/50 tw-text-[#fbbf24] tw-font-mono tw-text-xs tw-font-bold tw-m-0 tw-mb-5">
						<Icon name={"sys.infinity" as IconName} size={14} />
						This organization has an infinite / promotional license — no seat cap enforcement.
					</p>
				{:else if entitlementLoading}
					<p class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-mb-5">Loading entitlement…</p>
				{:else if entitlement}
					{@const u = licenseUsedCount(entitlement)}
					<div class="tw-flex tw-flex-col tw-gap-3.5 tw-mb-5">
						<div class="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-flex-wrap">
							<span class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-uppercase">Stripe Customer ID</span>
							<code class="tw-font-mono tw-text-xs tw-text-[#FAFAFA] tw-bg-[#020617] tw-border tw-border-[#334155] tw-px-2 tw-py-1">{typeof entitlement.stripe_customer_id === 'string' && entitlement.stripe_customer_id.trim() ? entitlement.stripe_customer_id : '—'}</code>
						</div>
						<div class="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-flex-wrap">
							<span class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-uppercase">Stripe Subscription ID</span>
							<code class="tw-font-mono tw-text-xs tw-text-[#FAFAFA] tw-bg-[#020617] tw-border tw-border-[#334155] tw-px-2 tw-py-1">{typeof entitlement.stripe_subscription_id === 'string' && entitlement.stripe_subscription_id.trim() ? entitlement.stripe_subscription_id : '—'}</code>
						</div>
						<div class="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-flex-wrap">
							<span class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-uppercase">Expiration Date</span>
							<span class="tw-font-mono tw-tabular-nums tw-text-xs tw-font-bold tw-text-[#FAFAFA]">{formatCreatedAt(entitlement.current_period_end || entitlement.expires_at || entitlement.expiration_date)}</span>
						</div>
						{#if u.limit > 0}
							<div class="tw-flex tw-flex-col tw-gap-2 tw-mt-2">
								<span class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-uppercase">Seat Utilization</span>
								<div class="tw-flex tw-flex-col tw-gap-1 tw-w-full">
									<div class="tw-h-2 tw-bg-[#020617] tw-border tw-border-[#334155] tw-overflow-hidden">
										<div class="tw-h-full tw-transition-all tw-duration-200 {licenseStressClass(u.pct)}" style="width: {u.pct}%;"></div>
									</div>
									<span class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-tabular-nums">{u.used} / {u.limit} seats ({Math.round(u.pct)}%)</span>
								</div>
							</div>
						{:else}
							<p class="tw-text-xs tw-font-mono tw-text-[#64748b]">No seat cap configured yet.</p>
						{/if}
					</div>
				{:else}
					<p class="tw-text-xs tw-font-mono tw-text-[#64748b] tw-mb-5">No entitlement document found for this organization.</p>
				{/if}

				<hr class="tw-border-t tw-border-[#334155] tw-my-5" />

				<h3 class="tw-text-xs tw-font-mono tw-font-bold tw-uppercase tw-tracking-wider tw-text-[#94A3B8] tw-mb-3">Generate New License</h3>
				{#if licenseErr}
					<p class="tw-p-3 tw-mb-3 tw-bg-[#1E293B] tw-border tw-border-[#ef4444] tw-text-[#ef4444] tw-font-mono tw-text-xs tw-font-bold" role="alert">{licenseErr}</p>
				{/if}
				{#if licenseOk}
					<p class="tw-p-3 tw-mb-3 tw-bg-[#1E293B] tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-font-bold">{licenseOk}</p>
				{/if}
				<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4 tw-mb-4">
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#94A3B8] tw-uppercase" for="cd-lic-type">License Type</label>
						<select id="cd-lic-type" bind:value={licenseType} disabled={licenseBusy} class="tw-w-full tw-px-3 tw-py-2 tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none">
							<option value="subscription">Monthly subscription</option>
							<option value="trial">Free trial</option>
						</select>
					</div>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#94A3B8] tw-uppercase" for="cd-lic-seats">Seat Limit</label>
						<input id="cd-lic-seats" type="number" min="1" bind:value={licenseMaxSeats} disabled={licenseBusy} class="tw-w-full tw-px-3 tw-py-2 tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none" />
					</div>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#94A3B8] tw-uppercase" for="cd-lic-months">Duration (months)</label>
						<input id="cd-lic-months" type="number" min="1" max="120" bind:value={licenseDurationMonths} disabled={licenseBusy} class="tw-w-full tw-px-3 tw-py-2 tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none" />
					</div>
				</div>
				<button
					type="button"
					class="v-toolbar-btn tw-border-[#14b8a6] tw-text-[#14b8a6] hover:tw-bg-[#14b8a6]/10"
					disabled={licenseBusy}
					onclick={onGenerateLicense}
				>
					{licenseBusy ? 'Generating…' : 'Generate License'}
				</button>
			</div>
		</div>

		<!-- ── Edit organization ──────────────────────────────────────────────── -->
		<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155]">
			<div class="tw-bg-[#020617] tw-px-5 tw-py-3.5 tw-border-b tw-border-[#334155] tw-flex tw-items-center tw-gap-2 tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider">
				<Icon name={"action.edit" as IconName} size={14} class="tw-text-[#14b8a6]" /> Edit Organization
			</div>
			<div class="tw-p-5">
				{#if editErr}
					<p class="tw-p-3 tw-mb-4 tw-bg-[#1E293B] tw-border tw-border-[#ef4444] tw-text-[#ef4444] tw-font-mono tw-text-xs tw-font-bold" role="alert">{editErr}</p>
				{/if}
				{#if editSuccess}
					<p class="tw-p-3 tw-mb-4 tw-bg-[#1E293B] tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-font-bold">{editSuccess}</p>
				{/if}

				<div class="tw-flex tw-flex-col tw-gap-4 tw-mb-5">
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label class="tw-text-xs tw-font-mono tw-font-bold tw-uppercase tw-tracking-wider tw-text-[#94A3B8]" for="cd-edit-sport">Sport</label>
						<select id="cd-edit-sport" bind:value={editSport} disabled={editSaving} class="tw-w-full tw-px-3 tw-py-2 tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none">
							<option value="soccer">Soccer</option>
							<option value="basketball">Basketball</option>
							<option value="baseball">Baseball</option>
							<option value="football">Football</option>
							<option value="volleyball">Volleyball</option>
							<option value="hockey">Hockey</option>
							<option value="lacrosse">Lacrosse</option>
							<option value="generic">Generic</option>
						</select>
					</div>

					<div class="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-p-4 tw-border tw-border-[#334155] tw-bg-[#020617]">
						<div class="tw-flex tw-flex-col">
							<label class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#FAFAFA] tw-cursor-pointer" for="cd-edit-infinite">
								Grant Infinite License (Promo)
							</label>
							<span class="tw-text-[11px] tw-font-mono tw-text-[#94A3B8] tw-mt-1">Bypasses Stripe billing and seat-cap enforcement for all connected clients.</span>
						</div>
						<input
							id="cd-edit-infinite"
							type="checkbox"
							bind:checked={editInfinite}
							disabled={editSaving}
							class="tw-w-4 tw-h-4 tw-cursor-pointer"
						/>
					</div>
				</div>

				<button
					type="button"
					class="v-toolbar-btn tw-border-[#14b8a6] tw-text-[#14b8a6] hover:tw-bg-[#14b8a6]/10"
					onclick={saveClubEdit}
					disabled={editSaving}
				>
					{editSaving ? 'Saving…' : 'Save Changes'}
				</button>
			</div>
		</div>

		<!-- ── Assign Director ────────────────────────────────────────────────── -->
		<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155]">
			<div class="tw-bg-[#020617] tw-px-5 tw-py-3.5 tw-border-b tw-border-[#334155] tw-flex tw-items-center tw-gap-2 tw-text-[#FAFAFA] tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider">
				<Icon name={"user.settings" as IconName} size={14} class="tw-text-[#14b8a6]" /> Assign Director
			</div>
			<div class="tw-p-5">
				{#if assignDirErr}
					<p class="tw-p-3 tw-mb-4 tw-bg-[#1E293B] tw-border tw-border-[#ef4444] tw-text-[#ef4444] tw-font-mono tw-text-xs tw-font-bold" role="alert">{assignDirErr}</p>
				{/if}
				{#if assignDirOk}
					<p class="tw-p-3 tw-mb-4 tw-bg-[#1E293B] tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-font-bold">{assignDirOk}</p>
				{/if}
				<div class="tw-flex tw-items-center tw-gap-3 tw-flex-wrap">
					<input
						type="email"
						bind:value={assignDirEmail}
						placeholder="director@example.com"
						disabled={assignDirSaving}
						class="tw-flex-1 tw-min-w-0 tw-px-3 tw-py-2 tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none"
					/>
					<button
						type="button"
						class="v-toolbar-btn tw-border-[#14b8a6] tw-text-[#14b8a6] hover:tw-bg-[#14b8a6]/10"
						onclick={assignDirector}
						disabled={assignDirSaving}
					>
						{assignDirSaving ? 'Saving…' : 'Assign Director Role'}
					</button>
				</div>
			</div>
		</div>

		<!-- ── Danger zone ─────────────────────────────────────────────────────── -->
		<div class="tw-p-5 tw-border tw-border-[#ef4444]/40 tw-bg-[#0f172a] tw-flex tw-flex-col tw-gap-3">
			<p class="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-xs tw-font-mono tw-font-bold tw-tracking-wider tw-uppercase tw-text-[#ef4444]">
				<Icon name={"status.warning" as IconName} size={14} /> Danger Zone
			</p>
			<p class="tw-m-0 tw-text-xs tw-font-mono tw-text-[#94A3B8]">
				Permanently deletes this organization and all associated metadata. Teams and player
				records must be cleaned up separately. This action cannot be undone.
			</p>
			<button
				type="button"
				class="v-toolbar-btn tw-border-rose-500/40 tw-text-rose-400 hover:tw-border-rose-500 hover:tw-bg-rose-500/10 tw-w-fit"
				onclick={handleDeleteRequest}
			>
				<Icon name={"action.delete" as IconName} size={14} />
				Delete Organization "{clubDoc.name || clubId}"
			</button>
		</div>

		{#if deleteModalOpen}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-black/80 tw-backdrop-blur-sm tw-p-4"
				onclick={() => { if (!deleteExecuting) deleteModalOpen = false; }}
			>
				<div
					class="tw-w-[440px] tw-max-w-[90vw] tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-6 tw-flex tw-flex-col tw-gap-4"
					onclick={(e) => e.stopPropagation()}
				>
					{#if deleteConfirmStep === 1}
						<p class="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-xs tw-font-mono tw-font-bold tw-tracking-wider tw-uppercase tw-text-[#fbbf24]">
							<Icon name={"status.warning" as IconName} size={14} /> Initial Warning
						</p>
						<h2 class="tw-m-0 tw-text-base tw-font-extrabold tw-text-[#FAFAFA]">Delete Organization?</h2>
						<p class="tw-m-0 tw-text-xs tw-font-mono tw-text-[#94A3B8]">
							You are about to permanently delete <span class="tw-text-[#FAFAFA] tw-font-bold">"{ctx.clubDoc?.name || ctx.clubId}"</span>. This will destroy the organization metadata.
						</p>
						<div class="tw-flex tw-items-center tw-justify-end tw-gap-3 tw-mt-3 tw-pt-3 tw-border-t tw-border-[#334155]">
							<button type="button" class="v-toolbar-btn" onclick={() => deleteModalOpen = false}>Cancel</button>
							<button type="button" class="v-toolbar-btn tw-border-amber-500 tw-text-amber-400 hover:tw-bg-amber-500/10" onclick={advanceDelete}>Yes, proceed</button>
						</div>
					{:else if deleteConfirmStep === 2}
						<p class="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-xs tw-font-mono tw-font-bold tw-tracking-wider tw-uppercase tw-text-[#ef4444]">
							<Icon name={"status.warning" as IconName} size={14} /> Final Warning
						</p>
						<h2 class="tw-m-0 tw-text-base tw-font-extrabold tw-text-[#FAFAFA]">Absolute Certainty Required</h2>
						<p class="tw-m-0 tw-text-xs tw-font-mono tw-text-[#94A3B8]">
							This is a destructive action that cannot be undone. Are you absolutely certain you want to annihilate this organization?
						</p>
						<div class="tw-flex tw-items-center tw-justify-end tw-gap-3 tw-mt-3 tw-pt-3 tw-border-t tw-border-[#334155]">
							<button type="button" class="v-toolbar-btn" disabled={deleteExecuting} onclick={() => deleteModalOpen = false}>Cancel</button>
							<button type="button" class="v-toolbar-btn tw-border-rose-500 tw-text-rose-400 hover:tw-bg-rose-500/10" disabled={deleteExecuting} onclick={executeDeletion}>
								{deleteExecuting ? 'Deleting…' : 'Delete Permanently'}
							</button>
						</div>
					{/if}
				</div>
			</div>
		{/if}

	{/if}
</div>
