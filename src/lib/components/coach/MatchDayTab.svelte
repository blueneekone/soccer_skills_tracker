<script>
	import { db, functions } from '$lib/firebase.js';
	import {
		collection,
		doc,
		getDoc,
		getDocs,
		query,
		where,
	} from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import EligibilityBadge from '$lib/components/coach/EligibilityBadge.svelte';

	let { teamId = '', canOverride = false } = $props();

	const directorOverrideEligibility = httpsCallable(
		functions,
		'directorOverrideEligibility',
	);

	let loading = $state(false);
	let loadError = $state('');
	/** @type {Array<{ name: string, jersey: string, emailLower: string, eligibility: object | null, docId: string | null }>} */
	let rows = $state([]);
	let overrideBusy = $state(/** @type {string | null} */ (null));

	function normName(s) {
		return String(s || '')
			.trim()
			.toLowerCase();
	}

	function reasonLabel(code) {
		const m = {
			identity_unverified: 'Identity not verified',
			safesport_not_verified: 'SafeSport not verified',
			concussion_not_verified: 'Concussion clearance not verified',
			governing_body_not_clear: 'Governing body not clear',
			vpc_not_satisfied: 'VPC not satisfied',
		};
		return m[code] || code;
	}

	function pickEligibility(name, emailLower, list) {
		const nn = normName(name);
		if (emailLower) {
			const byEmail = list.find((e) => e.emailKey === emailLower);
			if (byEmail) return byEmail;
		}
		const byName = list.find(
			(e) => e.displayName && normName(e.displayName) === nn,
		);
		if (byName) return byName;
		return null;
	}

	$effect(() => {
		let cancelled = false;
		const tid = teamId;
		if (!tid) {
			rows = [];
			return;
		}
		loading = true;
		loadError = '';
		(async () => {
			try {
				const [rosterSnap, eligSnap, linkSnap] = await Promise.all([
					getDoc(doc(db, 'rosters', tid)),
					getDocs(
						query(
							collection(db, 'player_eligibility'),
							where('teamId', '==', tid),
						),
					),
					getDocs(
						query(
							collection(db, 'player_lookup'),
							where('teamId', '==', tid),
						),
					),
				]);
				if (cancelled) return;

				const rosterNames = rosterSnap.exists()
					? rosterSnap.data().players || []
					: [];
				const jerseys = rosterSnap.exists()
					? rosterSnap.data().jerseys || {}
					: {};

				/** @type {Record<string, string>} */
				const nameToEmail = {};
				linkSnap.forEach((d) => {
					const data = d.data();
					const pn = data.playerName;
					if (typeof pn === 'string' && pn.trim()) {
						nameToEmail[pn.trim().toLowerCase()] = d.id;
					}
				});

				const eligList = eligSnap.docs.map((d) => ({
					id: d.id,
					...d.data(),
				}));

				const built = rosterNames.map((name) => {
					const emailLower =
						nameToEmail[normName(name)] || '';
					const elig = pickEligibility(name, emailLower, eligList);
					return {
						name,
						jersey: jerseys[name] ? String(jerseys[name]) : '',
						emailLower,
						eligibility: elig
							? {
									safeSportVerified: elig.safeSportVerified,
									concussionClearanceVerified:
										elig.concussionClearanceVerified,
									vpcSatisfied: elig.vpcSatisfied,
									identityVerified: elig.identityVerified,
									governingBodyStatus: elig.governingBodyStatus,
									eligible: elig.eligible,
									ineligibilityReasons: elig.ineligibilityReasons,
								}
							: null,
						docId: elig ? elig.id : null,
					};
				});
				built.sort((a, b) => a.name.localeCompare(b.name));
				rows = built;
			} catch (e) {
				console.error(e);
				if (!cancelled) {
					loadError = e?.message || 'Failed to load match day data.';
					rows = [];
				}
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	const eligibleCount = $derived(
		rows.filter((r) => r.eligibility?.eligible === true).length,
	);

	/**
	 * @param {string | null} docId
	 * @param {Record<string, boolean>} patch
	 */
	async function runOverride(docId, patch) {
		if (!docId) return;
		overrideBusy = docId;
		loadError = '';
		try {
			await directorOverrideEligibility({
				eligibilityDocId: docId,
				...patch,
			});
			const tid = teamId;
			const eligSnap = await getDocs(
				query(
					collection(db, 'player_eligibility'),
					where('teamId', '==', tid),
				),
			);
			const eligList = eligSnap.docs.map((d) => ({
				id: d.id,
				...d.data(),
			}));
			rows = rows.map((r) => {
				if (r.docId !== docId) return r;
				const emailLower = r.emailLower;
				const elig = pickEligibility(r.name, emailLower, eligList);
				return {
					...r,
					eligibility: elig
						? {
								safeSportVerified: elig.safeSportVerified,
								concussionClearanceVerified:
									elig.concussionClearanceVerified,
								vpcSatisfied: elig.vpcSatisfied,
								identityVerified: elig.identityVerified,
								governingBodyStatus: elig.governingBodyStatus,
								eligible: elig.eligible,
								ineligibilityReasons: elig.ineligibilityReasons,
							}
						: null,
					docId: elig ? elig.id : null,
				};
			});
		} catch (e) {
			console.error(e);
			loadError = e?.message || 'Override failed.';
		} finally {
			overrideBusy = null;
		}
	}
</script>

<div class="matchday-root">
	<div class="bento-section matchday-bento">
		<div class="card matchday-stat-card">
			<div class="card-header matchday-card-header">Match Day snapshot</div>
			<div class="card-body matchday-card-body">
				<p class="matchday-lede">
					Roster compliance from Affinity webhook data. Rows highlight
					eligible athletes and list gaps.
				</p>
				<div class="matchday-stat-grid">
					<div class="matchday-stat-pill">
						<span class="matchday-stat-label">Eligible</span>
						<span class="matchday-stat-val matchday-stat-val--ok"
							>{eligibleCount}</span
						>
					</div>
					<div class="matchday-stat-pill">
						<span class="matchday-stat-label">On roster</span>
						<span class="matchday-stat-val">{rows.length}</span>
					</div>
				</div>
			</div>
		</div>

		<div class="card matchday-stat-card">
			<div class="card-header matchday-card-header">Quick guide</div>
			<div class="card-body matchday-card-body">
				<ul class="matchday-tips">
					<li>
						<strong>Identity:</strong> yellow warning when email and external
						ID are both missing on the eligibility record.
					</li>
					<li>
						<strong>VPC:</strong> minors need verified parental consent in
						their user profile.
					</li>
					{#if canOverride}
						<li>
							<strong>Director:</strong> use overrides only for documented
							exceptions; all changes are audited.
						</li>
					{/if}
				</ul>
			</div>
		</div>
	</div>

	{#if loadError}
		<div class="card matchday-error-card">
			<div class="card-body">{loadError}</div>
		</div>
	{/if}

	<div class="card matchday-roster-card bento-span-full">
		<div class="card-header matchday-card-header">
			<span>Roster & eligibility</span>
		</div>
		<div class="card-body matchday-roster-body">
			{#if loading}
				<p class="matchday-empty">Loading…</p>
			{:else if rows.length === 0}
				<p class="matchday-empty">No players on this roster yet.</p>
			{:else}
				<ul class="matchday-list">
					{#each rows as r (r.name)}
						<li
							class="matchday-row"
							class:matchday-row--eligible={r.eligibility?.eligible ===
								true}
							class:matchday-row--ineligible={r.eligibility?.eligible !==
								true}
						>
							<div class="matchday-row-main">
								<div class="matchday-name-block">
									<strong class="matchday-name">
										{#if r.jersey}
											<span class="matchday-jersey">#{r.jersey}</span>
										{/if}
										{r.name}
									</strong>
									{#if r.eligibility?.eligible === true}
										<span class="matchday-status matchday-status--ok"
											>Eligible</span
										>
									{:else}
										<span class="matchday-status matchday-status--no"
											>Not eligible</span
										>
									{/if}
								</div>
								<EligibilityBadge eligibility={r.eligibility} />
								{#if r.eligibility?.ineligibilityReasons?.length}
									<ul class="matchday-reasons">
										{#each r.eligibility.ineligibilityReasons as code, i (i)}
											<li>{reasonLabel(code)}</li>
										{/each}
									</ul>
								{/if}
							</div>

							{#if canOverride && r.docId}
								<div class="matchday-director">
									<span class="matchday-director-title"
										>Director override</span
									>
									<label class="matchday-toggle">
										<input
											type="checkbox"
											checked={r.eligibility?.safeSportVerified === true}
											disabled={overrideBusy === r.docId}
											onchange={(e) =>
												runOverride(r.docId, {
													safeSportVerified: e.currentTarget.checked,
												})}
										/>
										SafeSport verified
									</label>
									<label class="matchday-toggle">
										<input
											type="checkbox"
											checked={r.eligibility?.concussionClearanceVerified ===
												true}
											disabled={overrideBusy === r.docId}
											onchange={(e) =>
												runOverride(r.docId, {
													concussionClearanceVerified:
														e.currentTarget.checked,
												})}
										/>
										Concussion verified
									</label>
									<label class="matchday-toggle">
										<input
											type="checkbox"
											checked={r.eligibility?.identityVerified === true}
											disabled={overrideBusy === r.docId}
											onchange={(e) =>
												runOverride(r.docId, {
													identityVerified: e.currentTarget.checked,
												})}
										/>
										Identity verified
									</label>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</div>

<style>
	.matchday-root {
		width: 100%;
		box-sizing: border-box;
	}

	.matchday-bento {
		margin-bottom: clamp(16px, 3vw, 24px);
	}

	.matchday-card-header {
		padding-bottom: clamp(12px, 2vw, 16px);
		margin-bottom: clamp(12px, 2vw, 16px);
	}

	.matchday-card-body {
		padding-top: 0;
	}

	.matchday-stat-card {
		padding: var(--spacing-fluid);
	}

	.matchday-lede {
		margin: 0;
		font-size: clamp(0.88rem, 2.5vw, 0.95rem);
		color: var(--text-secondary);
		line-height: 1.55;
	}

	.matchday-stat-grid {
		display: flex;
		flex-wrap: wrap;
		gap: clamp(12px, 2.5vw, 16px);
		margin-top: clamp(14px, 2.5vw, 20px);
	}

	.matchday-stat-pill {
		flex: 1 1 120px;
		min-width: 0;
		padding: clamp(12px, 2.5vw, 16px);
		border-radius: var(--radius-premium);
		background: var(--surface-subtle);
		border: 1px solid var(--glass-border);
	}

	.matchday-stat-label {
		display: block;
		font-size: 0.78rem;
		font-weight: 800;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.matchday-stat-val {
		display: block;
		font-size: clamp(1.6rem, 5vw, 2rem);
		font-weight: 900;
		color: var(--text-primary);
		margin-top: 4px;
	}

	.matchday-stat-val--ok {
		color: var(--success-green);
	}

	.matchday-tips {
		margin: 0;
		padding-left: clamp(18px, 3vw, 22px);
		font-size: clamp(0.86rem, 2.4vw, 0.92rem);
		color: var(--text-secondary);
		line-height: 1.55;
	}

	.matchday-tips li + li {
		margin-top: clamp(8px, 1.5vw, 10px);
	}

	.matchday-error-card {
		border-color: rgba(153, 27, 27, 0.35);
		margin-bottom: clamp(16px, 3vw, 24px);
	}

	.matchday-roster-card {
		padding: var(--spacing-fluid);
	}

	.matchday-roster-body {
		padding-top: 0;
	}

	.matchday-empty {
		margin: 0;
		color: var(--text-secondary);
		font-weight: 600;
	}

	.matchday-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: clamp(14px, 2.5vw, 18px);
	}

	.matchday-row {
		display: flex;
		flex-direction: column;
		gap: clamp(12px, 2vw, 16px);
		padding: var(--spacing-fluid);
		border-radius: var(--radius-premium);
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		-webkit-backdrop-filter: blur(20px) saturate(160%);
		backdrop-filter: blur(20px) saturate(160%);
		box-shadow: var(--shadow-premium);
	}

	@media (min-width: 720px) {
		.matchday-row {
			flex-direction: row;
			align-items: flex-start;
			justify-content: space-between;
		}
	}

	.matchday-row--eligible {
		border-color: rgba(4, 120, 87, 0.45);
		box-shadow:
			0 12px 32px -12px rgba(4, 120, 87, 0.25),
			inset 0 1px 1px rgba(255, 255, 255, 0.82);
	}

	.matchday-row--ineligible {
		border-color: rgba(153, 27, 27, 0.22);
		opacity: 0.97;
	}

	.matchday-row-main {
		flex: 1 1 auto;
		min-width: 0;
	}

	.matchday-name-block {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: clamp(8px, 2vw, 12px);
	}

	.matchday-name {
		font-size: clamp(1rem, 3vw, 1.12rem);
	}

	.matchday-jersey {
		color: var(--text-secondary);
		margin-right: 6px;
	}

	.matchday-status {
		font-size: 0.72rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 4px 10px;
		border-radius: var(--radius-premium);
		border: 1px solid var(--border-strong);
	}

	.matchday-status--ok {
		background: rgba(4, 120, 87, 0.12);
		color: #065f46;
		border-color: rgba(4, 120, 87, 0.35);
	}

	.matchday-status--no {
		background: rgba(15, 23, 42, 0.06);
		color: var(--text-secondary);
	}

	.matchday-reasons {
		margin: clamp(8px, 1.5vw, 10px) 0 0;
		padding-left: clamp(18px, 3vw, 22px);
		font-size: clamp(0.8rem, 2.2vw, 0.88rem);
		color: var(--danger-red);
		font-weight: 600;
	}

	.matchday-director {
		flex: 0 0 auto;
		padding: clamp(12px, 2vw, 14px);
		border-radius: var(--radius-premium);
		border: 1px dashed var(--border-strong);
		background: rgba(255, 255, 255, 0.5);
		min-width: min(100%, 220px);
	}

	:global(html.dark) .matchday-director {
		background: rgba(15, 23, 42, 0.35);
	}

	.matchday-director-title {
		display: block;
		font-size: 0.72rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		margin-bottom: 10px;
	}

	.matchday-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.82rem;
		font-weight: 700;
		cursor: pointer;
		margin-top: 8px;
	}

	.matchday-toggle input {
		width: auto;
		margin: 0;
	}
</style>
