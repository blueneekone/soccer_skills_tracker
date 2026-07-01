<script lang="ts">
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

	// ── License entitlement ──────────────────────────────────────────────────────
	/** @type {Record<string, unknown> | null} */
	let entitlement = $state(null);
	let entitlementLoading = $state(false);

	$effect(() => {
		const id = ctx.clubId;
		if (!id) return;
		let cancelled = false;
		entitlementLoading = true;
		void getDoc(doc(db, 'license_entitlements', id))
			.then((snap) => {
				if (cancelled) return;
				entitlement = snap.exists() ? /** @type {Record<string,unknown>} */ (snap.data()) : null;
			})
			.catch((e) => console.error('[clubDetail] entitlement', e))
			.finally(() => { if (!cancelled) entitlementLoading = false; });
		return () => { cancelled = true; };
	});

	// ── Inline club edit ─────────────────────────────────────────────────────────
	/** @type {'soccer'|'basketball'|'baseball'|'football'|'volleyball'|'hockey'|'lacrosse'|'generic'} */
	let editSport = $state('soccer');
	let editInfinite = $state(false);
	let editSaving = $state(false);
	let editErr = $state('');
	let editSuccess = $state('');

	const ALLOWED_SPORTS = ['soccer','basketball','baseball','football','volleyball','hockey','lacrosse','generic'];

	$effect(() => {
		const cl = ctx.clubDoc;
		if (!cl) return;
		const s = typeof cl.sport === 'string' && cl.sport.trim()
			? cl.sport.trim().toLowerCase()
			: 'soccer';
		editSport = /** @type {typeof editSport} */ (ALLOWED_SPORTS.includes(s) ? s : 'generic');
		editInfinite = cl.isInfinite === true;
		editErr = '';
		editSuccess = '';
	});

	async function saveClubEdit() {
		if (!ctx.clubId) return;
		editSaving = true;
		editErr = '';
		editSuccess = '';
		try {
			await setDoc(
				doc(db, 'clubs', ctx.clubId),
				{ sport: editSport, isInfinite: editInfinite === true },
				{ merge: true },
			);
			await logSecurityEvent(
				'ADMIN_EDIT_CLUB',
				ctx.clubId,
				`sport=${editSport}; infinite=${editInfinite}`,
			);
			await teamsStore.load('super_admin', { scope: 'admin_full', routePath: page.url.pathname });
			editSuccess = 'Changes saved.';
		} catch (e) {
			editErr = e instanceof Error ? e.message : 'Could not save changes.';
		} finally {
			editSaving = false;
		}
	}

	async function deleteCurrentClub() {
		if (!ctx.clubId || !ctx.clubDoc) return;
		const name = String(ctx.clubDoc.name || ctx.clubId);
		if (!confirm(`WARNING: Permanently delete organization "${name}" (${ctx.clubId})? This cannot be undone.`)) return;
		await deleteDoc(doc(db, 'clubs', ctx.clubId));
		await logSecurityEvent('DELETE_CLUB', ctx.clubId, 'Club deleted permanently');
		goto('/admin/organizations');
	}

	// ── Assign Director ──────────────────────────────────────────────────────────
	let assignDirEmail = $state('');
	let assignDirSaving = $state(false);
	let assignDirErr = $state('');
	let assignDirOk = $state('');

	async function assignDirector() {
		if (!assignDirEmail.trim() || !ctx.clubId) {
			assignDirErr = 'Enter a valid director email.';
			return;
		}
		const email = assignDirEmail.trim().toLowerCase();
		assignDirSaving = true;
		assignDirErr = '';
		assignDirOk = '';
		try {
			await setDoc(doc(db, 'clubs', ctx.clubId), { directorEmail: email }, { merge: true });
			await setDoc(doc(db, 'users', email), { role: 'director', clubId: ctx.clubId }, { merge: true });
			await logSecurityEvent('ASSIGN_DIRECTOR', email, `Club ID: ${ctx.clubId}`);
			assignDirOk = `${email} is now director of this organization.`;
			assignDirEmail = '';
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
		if (!ctx.clubId) return;
		licenseErr = '';
		licenseOk = '';
		licenseBusy = true;
		try {
			const res = await generateLicenseFn({
				clubId: ctx.clubId,
				licenseType,
				maxSeats: Number(licenseMaxSeats) || 10,
				durationMonths: Number(licenseDurationMonths) || 12,
			});
			const data = res.data as { ok?: boolean; licenseKey?: string } | undefined;
			if (data?.ok && data.licenseKey) {
				licenseOk = `License created: ${data.licenseKey}`;
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
	/**
	 * @param {unknown} raw
	 */
	function formatCreatedAt(raw) {
		if (!raw) return '—';
		if (typeof raw === 'object' && raw !== null && 'toDate' in raw) {
			const fn = /** @type {Record<string, unknown>} */ (raw)['toDate'];
			if (typeof fn === 'function') {
				try {
					const d = /** @type {() => Date} */ (fn).call(raw);
					return d instanceof Date ? d.toLocaleString() : '—';
				} catch { return '—'; }
			}
		}
		if (raw instanceof Date) return raw.toLocaleString();
		return '—';
	}

	/**
	 * @param {Record<string, unknown> | null} ent
	 */
	function licenseUsedCount(ent) {
		if (!ent) return { used: 0, limit: 0, pct: 0 };
		const lim = typeof ent.seats_limit === 'number' ? ent.seats_limit : 0;
		const a   = typeof ent.active_seats === 'number' ? ent.active_seats : 0;
		const r   = typeof ent.reserved_seats === 'number' ? ent.reserved_seats : 0;
		const used = a + r;
		const pct  = lim > 0 ? Math.min(100, (used / lim) * 100) : 0;
		return { used, limit: lim, pct };
	}

	/**
	 * @param {number} pct
	 */
	function licenseStressClass(pct) {
		if (pct > 90) return 'cd-gauge__fill--crit';
		if (pct > 70) return 'cd-gauge__fill--warn';
		return 'cd-gauge__fill--ok';
	}

	const teamsCount = $derived(
		teamsStore.teams.filter((t) => t.clubId === ctx.clubId).length,
	);
</script>

<div class="cd-page">

	{#if ctx.clubLoading}
		<div class="cd-loading">Loading organization…</div>
	{:else if ctx.clubErr}
		<div class="cd-err" role="alert">
			<Icon name={"status.warning-circle" as IconName} />
			{ctx.clubErr}
			<a href="/admin/organizations" class="cd-err__back">← Back to Organizations</a>
		</div>
	{:else if ctx.clubDoc}

		<!-- ── Club identity header ────────────────────────────────────────────── -->
		<div class="cd-identity">
			{#if typeof ctx.clubDoc.logoUrl === 'string' && ctx.clubDoc.logoUrl.trim()}
				<img
					class="cd-identity__logo"
					src={ctx.clubDoc.logoUrl.trim()}
					alt=""
					loading="lazy"
				/>
			{:else}
				<div class="cd-identity__logo-fallback" aria-hidden="true">
					<Icon name={"org.building" as IconName} />
				</div>
			{/if}
			<div class="cd-identity__text">
				<h1 class="cd-identity__name">{ctx.clubDoc.name || ctx.clubId}</h1>
				<span class="cd-identity__id">{ctx.clubId}</span>
				{#if ctx.clubDoc.isInfinite === true}
					<span class="cd-identity__promo">∞ PROMO LICENSE</span>
				{/if}
			</div>
		</div>

		<!-- ── Info bento row ─────────────────────────────────────────────────── -->
		<div class="cd-bento">
			<div class="cd-bento__card">
				<span class="cd-bento__label">Sport</span>
				<span class="cd-bento__value">{ctx.clubDoc.sport || '—'}</span>
			</div>
			<div class="cd-bento__card">
				<span class="cd-bento__label">Director</span>
				<span class="cd-bento__value cd-bento__value--mono">{ctx.clubDoc.directorEmail || '—'}</span>
			</div>
			<div class="cd-bento__card">
				<span class="cd-bento__label">Teams</span>
				<span class="cd-bento__value">{teamsCount}</span>
			</div>
			<div class="cd-bento__card">
				<span class="cd-bento__label">Created</span>
				<span class="cd-bento__value">{formatCreatedAt(ctx.clubDoc.createdAt)}</span>
			</div>
		</div>

		<!-- ── Strike 2: Operations & Contact (Google-Places demographics) ────── -->
		<div class="card">
			<div class="card-header">
				<Icon name={"sys.map-pin" as IconName} /> Operations &amp; Contact
			</div>
			<div class="card-body">
				<div class="cd-ops">
					<div class="cd-ops__row">
						<span class="cd-ops__label">
							<Icon name={"sys.map-pin" as IconName} />
							Verified Address
						</span>
						{#if typeof ctx.clubDoc.verifiedAddress === 'string' && ctx.clubDoc.verifiedAddress.trim()}
							<span class="cd-ops__value">{ctx.clubDoc.verifiedAddress}</span>
						{:else}
							<span class="cd-ops__value cd-ops__value--missing">
								No verified address on file. Edit the organization to add one via Google Places.
							</span>
						{/if}
					</div>
					<div class="cd-ops__row">
						<span class="cd-ops__label">
							<Icon name={"comm.phone" as IconName} />
							Phone Number
						</span>
						{#if typeof ctx.clubDoc.phoneNumber === 'string' && ctx.clubDoc.phoneNumber.trim()}
							<a class="cd-ops__value cd-ops__value--link" href={`tel:${ctx.clubDoc.phoneNumber}`}>
								{ctx.clubDoc.phoneNumber}
							</a>
						{:else}
							<span class="cd-ops__value cd-ops__value--missing">No phone number on file.</span>
						{/if}
					</div>
					<div class="cd-ops__row">
						<span class="cd-ops__label">
							<Icon name={"sport.soccer" as IconName} />
							Primary Facility
						</span>
						{#if typeof ctx.clubDoc.primaryFacility === 'string' && ctx.clubDoc.primaryFacility.trim()}
							<span class="cd-ops__value">{ctx.clubDoc.primaryFacility}</span>
						{:else}
							<span class="cd-ops__value cd-ops__value--missing">No primary facility assigned.</span>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- ── Licensing & Entitlement ────────────────────────────────────────── -->
		<div class="card border-gold">
			<div class="card-header bg-gold-header">
				<Icon name={"sys.credit-card" as IconName} /> Licensing & Entitlement
			</div>
			<div class="card-body">
				{#if ctx.clubDoc.isInfinite === true}
				<p class="cd-license__infinite">
					<Icon name={"sys.infinity" as IconName} />
						This organization has an infinite / promotional license — no seat cap enforcement.
					</p>
				{:else if entitlementLoading}
					<p class="text-sm-sub">Loading entitlement…</p>
				{:else if entitlement}
					{@const u = licenseUsedCount(entitlement)}
					<div class="cd-license__block">
						<div class="cd-license__row">
							<span>Stripe Customer ID</span>
							<code class="cd-license__mono">{typeof entitlement.stripe_customer_id === 'string' && entitlement.stripe_customer_id.trim() ? entitlement.stripe_customer_id : '—'}</code>
						</div>
						<div class="cd-license__row">
							<span>Stripe Subscription ID</span>
							<code class="cd-license__mono">{typeof entitlement.stripe_subscription_id === 'string' && entitlement.stripe_subscription_id.trim() ? entitlement.stripe_subscription_id : '—'}</code>
						</div>
						{#if u.limit > 0}
							<div class="cd-license__row cd-license__row--gauge">
								<span>Seat utilization</span>
								<div class="cd-gauge" title="Seats used vs licensed cap">
									<div class="cd-gauge__track">
										<div
											class="cd-gauge__fill {licenseStressClass(u.pct)}"
											style="--gauge-fill:{u.pct}%;"
										></div>
									</div>
									<span class="cd-gauge__label">{u.used} / {u.limit} seats ({Math.round(u.pct)}%)</span>
								</div>
							</div>
						{:else}
							<p class="text-sm-sub">No seat cap configured yet.</p>
						{/if}
					</div>
				{:else}
					<p class="text-sm-sub">No entitlement document found for this organization.</p>
				{/if}

				<hr class="cd-divider" />

				<p class="cd-section-heading">Generate New License</p>
				{#if licenseErr}
					<p class="cd-flash cd-flash--err" role="alert">{licenseErr}</p>
				{/if}
				{#if licenseOk}
					<p class="cd-flash cd-flash--ok">{licenseOk}</p>
				{/if}
				<div class="cd-license__gen-grid">
					<div>
						<label for="cd-lic-type">License type</label>
						<select id="cd-lic-type" bind:value={licenseType} disabled={licenseBusy}>
							<option value="subscription">Monthly subscription</option>
							<option value="trial">Free trial</option>
						</select>
					</div>
					<div>
						<label for="cd-lic-seats">Seat limit</label>
						<input id="cd-lic-seats" type="number" min="1" bind:value={licenseMaxSeats} disabled={licenseBusy} />
					</div>
					<div>
						<label for="cd-lic-months">Duration (months)</label>
						<input id="cd-lic-months" type="number" min="1" max="120" bind:value={licenseDurationMonths} disabled={licenseBusy} />
					</div>
				</div>
				<button
					type="button"
					class="btn-primary btn-gold"
					disabled={licenseBusy}
					onclick={onGenerateLicense}
				>
					{licenseBusy ? 'Generating…' : 'Generate license'}
				</button>
			</div>
		</div>

		<!-- ── Edit organization ──────────────────────────────────────────────── -->
		<div class="card">
			<div class="card-header">
				<Icon name={"action.edit" as IconName} /> Edit Organization
			</div>
			<div class="card-body">
				{#if editErr}
					<p class="cd-flash cd-flash--err" role="alert">{editErr}</p>
				{/if}
				{#if editSuccess}
					<p class="cd-flash cd-flash--ok">{editSuccess}</p>
				{/if}
				<label class="cd-edit-label" for="cd-edit-sport">Sport</label>
				<select id="cd-edit-sport" bind:value={editSport} disabled={editSaving} class="cd-edit-select">
					<option value="soccer">Soccer</option>
					<option value="basketball">Basketball</option>
					<option value="baseball">Baseball</option>
					<option value="football">Football</option>
					<option value="volleyball">Volleyball</option>
					<option value="hockey">Hockey</option>
					<option value="lacrosse">Lacrosse</option>
					<option value="generic">Generic</option>
				</select>

				<div class="cd-edit-toggle">
					<label class="cd-edit-toggle__label" for="cd-edit-infinite">
						Grant Infinite License (Promo)
					</label>
					<input
						id="cd-edit-infinite"
						type="checkbox"
						bind:checked={editInfinite}
						disabled={editSaving}
						class="cd-edit-toggle__check"
					/>
				</div>
				<p class="text-sm-sub">
					Bypasses Stripe billing and seat-cap enforcement for all connected clients.
				</p>

				<button
					type="button"
					class="btn-primary"
					onclick={saveClubEdit}
					disabled={editSaving}
				>
					{editSaving ? 'Saving…' : 'Save changes'}
				</button>
			</div>
		</div>

		<!-- ── Assign Director ────────────────────────────────────────────────── -->
		<div class="card">
			<div class="card-header">
				<Icon name={"user.settings" as IconName} /> Assign Director
			</div>
			<div class="card-body">
				{#if assignDirErr}
					<p class="cd-flash cd-flash--err" role="alert">{assignDirErr}</p>
				{/if}
				{#if assignDirOk}
					<p class="cd-flash cd-flash--ok">{assignDirOk}</p>
				{/if}
				<div class="cd-assign-row">
					<input
						type="email"
						bind:value={assignDirEmail}
						placeholder="director@example.com"
						disabled={assignDirSaving}
						class="m-0 flex-1"
					/>
					<button
						type="button"
						class="btn-primary"
						onclick={assignDirector}
						disabled={assignDirSaving}
					>
						{assignDirSaving ? 'Saving…' : 'Assign Director Role'}
					</button>
				</div>
			</div>
		</div>

		<!-- ── Danger zone ─────────────────────────────────────────────────────── -->
		<div class="cd-danger">
			<p class="cd-danger__label">
				<Icon name={"status.warning" as IconName} />
				Danger Zone
			</p>
			<p class="cd-danger__hint">
				Permanently deletes this organization and all associated metadata. Teams and player
				records must be cleaned up separately. This action cannot be undone.
			</p>
			<button
				type="button"
				class="btn-secondary cd-danger__btn"
				onclick={deleteCurrentClub}
			>
				<Icon name={"action.delete" as IconName} />
				Delete organization "{ctx.clubDoc.name || ctx.clubId}"
			</button>
		</div>

	{/if}

</div>

<style>
	.cd-page {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* ── Loading / error states ─────────────────────────────────────── */
	.cd-loading {
		padding: 40px;
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.cd-err {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 20px;
		background: rgba(185, 28, 28, 0.08);
		border: 1px solid rgba(185, 28, 28, 0.3);
		border-radius: 14px;
		color: var(--danger-red, #b91c1c);
		font-weight: 600;
		flex-wrap: wrap;
	}

	.cd-err__back {
		margin-left: auto;
		font-size: 0.85rem;
		color: var(--text-secondary);
		text-decoration: none;
	}

	/* ── Identity header ─────────────────────────────────────────────── */
	.cd-identity {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.cd-identity__logo {
		width: 56px;
		height: 56px;
		border-radius: 14px;
		object-fit: cover;
		border: 1px solid var(--border-subtle, #e5e5e5);
		flex-shrink: 0;
	}

	.cd-identity__logo-fallback {
		width: 56px;
		height: 56px;
		border-radius: 14px;
		background: rgba(99, 102, 241, 0.12);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.6rem;
		color: #6366f1;
		flex-shrink: 0;
	}

	.cd-identity__text {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.cd-identity__name {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: -0.04em;
		color: var(--text-primary);
	}

	.cd-identity__id {
		font-size: 0.78rem;
		color: var(--text-secondary);
		font-family: ui-monospace, monospace;
	}

	.cd-identity__promo {
		display: inline-flex;
		align-items: center;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.04em;
		padding: 4px 8px;
		border-radius: 999px;
		color: #78350f;
		background: linear-gradient(135deg, #fde68a 0%, #fbbf24 55%, #d97706 100%);
		border: 1px solid rgba(180, 83, 9, 0.35);
		width: fit-content;
	}

	/* ── Bento info row ──────────────────────────────────────────────── */
	.cd-bento {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 12px;
	}

	.cd-bento__card {
		display: flex;
		flex-direction: column;
		gap: 5px;
		padding: 14px 16px;
		background: var(--surface-subtle, #fafafa);
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 12px;
	}

	:global(html.dark) .cd-bento__card {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.cd-bento__label {
		font-size: 0.68rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
	}

	.cd-bento__value {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.cd-bento__value--mono {
		font-family: ui-monospace, monospace;
		font-size: 0.78rem;
	}

	/* ── Strike 2: Operations & Contact block ───────────────────────── */
	.cd-ops {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.cd-ops__row {
		display: grid;
		grid-template-columns: 200px 1fr;
		align-items: start;
		gap: 16px;
		padding: 12px 14px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 12px;
		background: var(--surface-subtle, #fafafa);
	}

	:global(html.dark) .cd-ops__row {
		border-color: rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
	}

	.cd-ops__label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.cd-ops__value {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 1.45;
		word-break: break-word;
	}

	.cd-ops__value--missing {
		font-style: italic;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.cd-ops__value--link {
		color: #4f46e5;
		text-decoration: none;
	}

	.cd-ops__value--link:hover {
		text-decoration: underline;
	}

	:global(html.dark) .cd-ops__value--link {
		color: #a5b4fc;
	}

	@media (max-width: 640px) {
		.cd-ops__row {
			grid-template-columns: 1fr;
			gap: 6px;
		}
	}

	/* ── License block ───────────────────────────────────────────────── */
	.cd-license__infinite {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		padding: 14px;
		background: rgba(245, 158, 11, 0.08);
		border: 1px solid rgba(245, 158, 11, 0.3);
		border-radius: 10px;
		color: #d97706;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.cd-license__block {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.cd-license__row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		font-size: 0.85rem;
		color: var(--text-secondary);
		flex-wrap: wrap;
	}

	.cd-license__row--gauge {
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
	}

	.cd-license__mono {
		font-family: ui-monospace, monospace;
		font-size: 0.78rem;
		color: var(--text-primary);
		background: var(--surface-subtle, #f4f4f5);
		padding: 2px 6px;
		border-radius: 4px;
		word-break: break-all;
	}

	:global(html.dark) .cd-license__mono {
		background: rgba(255, 255, 255, 0.07);
	}

	.cd-gauge {
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 100%;
	}

	.cd-gauge__track {
		height: 8px;
		border-radius: 999px;
		background: rgba(15, 23, 42, 0.1);
		overflow: hidden;
	}

	:global(html.dark) .cd-gauge__track {
		background: rgba(255, 255, 255, 0.1);
	}

	.cd-gauge__fill {
		width: var(--gauge-fill, 0%);
		height: 100%;
		border-radius: 999px;
		transition: width 0.2s ease;
	}

	.cd-gauge__fill--ok   { background: #22c55e; }
	.cd-gauge__fill--warn { background: #f59e0b; }
	.cd-gauge__fill--crit { background: #ef4444; }

	.cd-gauge__label {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.cd-license__gen-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 16px;
		margin-bottom: 14px;
	}

	/* ── Edit section ─────────────────────────────────────────────── */
	.cd-edit-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
		margin-bottom: 6px;
	}

	.cd-edit-select {
		width: 100%;
		padding: 10px 12px;
		border-radius: 8px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--surface-subtle, #fafafa);
		font: inherit;
		color: var(--text-primary);
		box-sizing: border-box;
		margin-bottom: 14px;
	}

	:global(html.dark) .cd-edit-select {
		border-color: rgba(255, 255, 255, 0.12);
		background: #09090b;
	}

	.cd-edit-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 10px;
		background: var(--surface-subtle, #fafafa);
		margin-bottom: 8px;
	}

	:global(html.dark) .cd-edit-toggle {
		border-color: rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
	}

	.cd-edit-toggle__label {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-primary);
		flex: 1;
		cursor: pointer;
	}

	.cd-edit-toggle__check {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		cursor: pointer;
	}

	/* ── Assign director ─────────────────────────────────────────── */
	.cd-assign-row {
		display: flex;
		gap: 10px;
		align-items: center;
		flex-wrap: wrap;
	}

	/* ── Danger zone ─────────────────────────────────────────────── */
	.cd-danger {
		padding: 20px;
		border: 1px dashed rgba(220, 38, 38, 0.4);
		border-radius: 14px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.cd-danger__label {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--danger-red, #b91c1c);
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.cd-danger__hint {
		margin: 0;
		font-size: 0.82rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.cd-danger__btn {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 10px 16px;
		font-weight: 600;
		font-size: 0.88rem;
	}

	/* ── Dividers ──────────────────────────────────────────────────── */
	.cd-divider {
		border: none;
		border-top: 1px solid var(--border-subtle, #e5e5e5);
		margin: 14px 0;
	}

	:global(html.dark) .cd-divider {
		border-top-color: rgba(255, 255, 255, 0.08);
	}

	.cd-section-heading {
		margin: 0 0 12px;
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
	}

	/* ── Flash messages ────────────────────────────────────────────── */
	.cd-flash {
		margin: 0 0 12px;
		padding: 12px 14px;
		border-radius: 12px;
		font-weight: 700;
		font-size: 0.9rem;
	}

	.cd-flash--ok {
		background: rgba(4, 120, 87, 0.12);
		color: var(--success-green, #047857);
		border: 1px solid rgba(4, 120, 87, 0.35);
	}

	.cd-flash--err {
		background: rgba(185, 28, 28, 0.1);
		color: var(--danger-red, #991b1b);
		border: 1px solid rgba(185, 28, 28, 0.35);
	}

	:global(html.dark) .cd-flash--ok {
		color: #a7f3d0;
		border-color: rgba(52, 211, 153, 0.4);
		background: rgba(52, 211, 153, 0.1);
	}

	:global(html.dark) .cd-flash--err {
		color: #fecaca;
		border-color: rgba(248, 113, 113, 0.35);
		background: rgba(127, 29, 29, 0.25);
	}

	/* ── Misc ────────────────────────────────────────────────────── */
	.btn-secondary {
		background: none;
		border: 1px solid var(--border-strong, rgba(220,38,38,0.4));
		border-radius: 8px;
		cursor: pointer;
		color: var(--danger-red, #b91c1c);
	}

	.btn-secondary:hover {
		background: rgba(185, 28, 28, 0.08);
	}
</style>
