<script>
	import { db, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import ActionInbox from '$lib/components/shell/ActionInbox.svelte';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import '$lib/styles/enterprise-console.css';

	/**
	 * @typedef {object} RegistrarRosterRow
	 * @property {string} key
	 * @property {string} playerName
	 * @property {string} teamId
	 * @property {string} teamLabel
	 * @property {string} statsDocId
	 * @property {string | null} email
	 * @property {string | null} ageGroup
	 * @property {string} dobLabel
	 * @property {boolean} guardianLinked
	 * @property {string} waiverLabel
	 * @property {'ok' | 'bad' | 'warn' | 'muted'} waiverKind
	 * @property {string} passportLabel
	 * @property {'ok' | 'bad' | 'warn' | 'muted'} passportKind
	 */

	const transferPlayer = httpsCallable(functions, 'registrarTransferPlayer');
	const secureAddPlayer = httpsCallable(functions, 'secureAddPlayer');
	const secureRemovePlayer = httpsCallable(functions, 'secureRemovePlayer');

	const clubId = $derived.by(() => {
		const role = authStore.role;
		const raw = typeof authStore.userProfile?.clubId === 'string' ?
			authStore.userProfile.clubId.trim() :
			'';
		if (raw) return raw;
		if (role === 'super_admin') {
			const a = workspaceContextStore.activeClubId?.trim();
			if (a) return a;
			const first = teamsStore.clubs[0]?.id;
			if (first) return first;
		}
		return '';
	});
	const clubTeams = $derived(
		clubId ? teamsStore.teams.filter((t) => t.clubId === clubId) : []
	);
	const scopeTeams = $derived(clubTeams);

	let addName = $state('');
	let addEmail = $state('');
	let addTeamId = $state('');
	let rosterTeamId = $state('');
	let linkedRows = $state([]);
	let rosterNames = $state([]);
	let rosterLoading = $state(false);
	let xferEmail = $state('');
	let xferTeamId = $state('');
	let xferMsg = $state('');
	let xferErr = $state('');
	let xferBusy = $state(false);
	let addMsg = $state('');
	let addErr = $state('');
	let addBusy = $state(false);

	/** @type {RegistrarRosterRow[]} */
	let complianceRows = $state([]);
	let tableLoading = $state(false);
	let tableErr = $state('');

	const xferTeamChoices = $derived(clubTeams);

	$effect(() => {
		if (scopeTeams.length && !addTeamId) addTeamId = scopeTeams[0].id;
		if (scopeTeams.length && !rosterTeamId) rosterTeamId = scopeTeams[0].id;
	});

	/**
	 * @param {string} teamName
	 */
	function parseAgeFromTeamName(teamName) {
		if (!teamName) return null;
		const m = String(teamName).match(/\bU\s*(\d{1,2})\b/i);
		return m ? `U${m[1]}` : null;
	}

	/**
	 * @param {Record<string, Record<string, unknown>>} ps
	 * @param {string} name
	 */
	function resolveStatsDocId(name, ps) {
		if (ps[name]) return name;
		const id = Object.keys(ps).find((k) => ps[k]?.playerName === name);
		return id || name;
	}

	/**
	 * @param {unknown} v
	 */
	function formatDocDate(v) {
		if (v == null || v === '') return '—';
		if (typeof v === 'object' && v !== null && 'toDate' in v && typeof v.toDate === 'function') {
			try {
				return v.toDate().toLocaleDateString();
			} catch {
				return '—';
			}
		}
		if (typeof v === 'string') {
			const d = Date.parse(v);
			return Number.isNaN(d) ? '—' : new Date(d).toLocaleDateString();
		}
		return '—';
	}

	/**
	 * @param {Record<string, unknown> | null} passportData
	 */
	function passportCell(passportData) {
		if (!passportData) return { label: 'Not on file', kind: 'muted' };
		const cs = /** @type {string} */ (passportData.clearanceStatus || 'CLEARED');
		if (cs === 'RED_CARD') return { label: 'Expired', kind: 'bad' };
		if (cs === 'PENDING_SAFESPORT') return { label: 'Pending', kind: 'warn' };
		return { label: 'Verified', kind: 'ok' };
	}

	/**
	 * @param {Record<string, unknown> | null} passportData
	 */
	function waiverCell(passportData) {
		if (!passportData) return { label: '—', kind: 'muted' };
		if (passportData.hasSignedWaiver === true) return { label: 'Signed', kind: 'ok' };
		return { label: 'Missing', kind: 'bad' };
	}

	/**
	 * @param {string[]} emails
	 */
	async function fetchPassportUserCache(emails) {
		/** @type {Record<string, Record<string, unknown>>} */
		const passports = {};
		/** @type {Record<string, Record<string, unknown>>} */
		const users = {};
		await Promise.all(
			emails.map(async (em) => {
				const [p, u] = await Promise.all([
					getDoc(doc(db, 'passports', em)),
					getDoc(doc(db, 'users', em))
				]);
				if (p.exists()) passports[em] = p.data();
				if (u.exists()) users[em] = u.data();
			})
		);
		return { passports, users };
	}

	/**
	 * @param {Array<{ id: string; name?: string }>} teams
	 */
	async function loadComplianceTable(teams) {
		/** @type {RegistrarRosterRow[]} */
		const out = [];
		for (const t of teams) {
			const teamId = t.id;
			const teamLabel = (typeof t.name === 'string' && t.name.trim()) || teamId;
			const ageGroup = parseAgeFromTeamName(teamLabel);
			const [statsSnap, rosterSnap, linkSnap] = await Promise.all([
				getDocs(query(collection(db, 'player_stats'), where('teamId', '==', teamId))),
				getDoc(doc(db, 'rosters', teamId)),
				getDocs(query(collection(db, 'player_lookup'), where('teamId', '==', teamId)))
			]);

			/** @type {Record<string, Record<string, unknown>>} */
			const playerStats = {};
			statsSnap.forEach((d) => {
				playerStats[d.id] = d.data();
			});

			/** @type {Record<string, string>} */
			const nameToEmail = {};
			linkSnap.forEach((d) => {
				const data = d.data();
				if (typeof data.playerName === 'string' && data.playerName.trim()) {
					nameToEmail[data.playerName.trim()] = d.id;
				}
			});

			const rosterList = rosterSnap.exists() ? rosterSnap.data().players || [] : [];
			const combined = new Set([...rosterList, ...Object.keys(playerStats)]);
			const sorted = Array.from(combined).sort((a, b) => a.localeCompare(b));

			const emails = [...new Set(Object.values(nameToEmail))];
			const cache = await fetchPassportUserCache(emails);

			for (const playerName of sorted) {
				const em = nameToEmail[playerName] || null;
				const statsId = resolveStatsDocId(playerName, playerStats);
				const passportData = em ? cache.passports[em] ?? null : null;
				const userData = em ? cache.users[em] ?? null : null;
				const dobRaw = passportData?.dateOfBirth ?? userData?.dateOfBirth ?? null;
				const pc = passportCell(
					passportData && typeof passportData === 'object' ? passportData : null
				);
				const wc = waiverCell(
					passportData && typeof passportData === 'object' ? passportData : null
				);
				out.push({
					key: `${teamId}::${playerName}`,
					playerName,
					teamId,
					teamLabel,
					statsDocId,
					email: em,
					ageGroup,
					dobLabel: formatDocDate(dobRaw),
					guardianLinked: Boolean(em),
					waiverLabel: wc.label,
					waiverKind: wc.kind,
					passportLabel: pc.label,
					passportKind: pc.kind
				});
			}
		}
		out.sort((a, b) => {
			const c = a.teamLabel.localeCompare(b.teamLabel);
			if (c !== 0) return c;
			return a.playerName.localeCompare(b.playerName);
		});
		return out;
	}

	$effect(() => {
		const teams = scopeTeams;
		if (!teams.length) {
			complianceRows = [];
			return;
		}
		let cancelled = false;
		tableLoading = true;
		tableErr = '';
		void loadComplianceTable(teams)
			.then((rows) => {
				if (!cancelled) complianceRows = rows;
			})
			.catch((e) => {
				if (!cancelled) {
					tableErr = e instanceof Error ? e.message : 'Could not load roster.';
					console.error('[registrar]', e);
				}
			})
			.finally(() => {
				if (!cancelled) tableLoading = false;
			});
		return () => {
			cancelled = true;
		};
	});

	/**
	 * @param {RegistrarRosterRow} row
	 */
	function openRow(row) {
		enterprisePlayerDrawer.open(
			{
				id: row.key,
				displayName: row.playerName,
				teamId: row.teamId,
				teamLabel: row.teamLabel,
				statsDocId: row.statsDocId,
				playerEmail: row.email,
				jersey: null,
				ageGroup: row.ageGroup,
				position: null,
				status: row.email ? 'active' : 'pending',
				lastActiveLabel: '—',
				source: 'registrar'
			},
			{
				editProfile: () => {
					if (row.email) window.location.href = `mailto:${row.email}`;
				}
			},
			{ focusCompliance: true }
		);
	}

	async function loadRosterContext() {
		if (!rosterTeamId) return;
		rosterLoading = true;
		addErr = '';
		try {
			const [rosterSnap, linkSnap] = await Promise.all([
				getDoc(doc(db, 'rosters', rosterTeamId)),
				getDocs(query(collection(db, 'player_lookup'), where('teamId', '==', rosterTeamId)))
			]);
			rosterNames = rosterSnap.exists() ? [...(rosterSnap.data().players || [])].sort() : [];
			linkedRows = [];
			linkSnap.forEach((d) => linkedRows.push({ id: d.id, ...d.data() }));
			linkedRows.sort((a, b) => (a.playerName || '').localeCompare(b.playerName || ''));
		} catch (e) {
			console.error(e);
			addErr = 'Could not load roster.';
		} finally {
			rosterLoading = false;
		}
	}

	$effect(() => {
		if (rosterTeamId) loadRosterContext();
	});

	async function addPlayerInvite() {
		addErr = '';
		addMsg = '';
		const name = addName.trim().replace(/\s+/g, ' ');
		const email = addEmail.trim().toLowerCase();
		if (!name || !addTeamId) {
			addErr = 'Player name and team are required.';
			return;
		}
		addBusy = true;
		try {
			const res = await secureAddPlayer({
				teamId: addTeamId,
				playerName: name,
				...(email ? { playerEmail: email } : {})
			});
			const data = res.data;
			if (data?.duplicate) {
				addMsg = 'That player is already on this team roster.';
			} else {
				addMsg = email
					? 'Player added to roster and login invite saved.'
					: 'Player added to roster (no email invite).';
			}
			addName = '';
			addEmail = '';
			await loadRosterContext();
		} catch (e) {
			addErr = e instanceof Error ? e.message : 'Save failed.';
		} finally {
			addBusy = false;
		}
	}

	async function removeFromRoster(name) {
		if (!rosterTeamId || !confirm(`Remove ${name} from this roster view?`)) return;
		addErr = '';
		try {
			const normalized = name.trim().replace(/\s+/g, ' ');
			const res = await secureRemovePlayer({
				teamId: rosterTeamId,
				playerName: normalized
			});
			const data = res.data;
			if (data?.notFound) {
				addErr =
					'That player was not on this roster. It may have been updated elsewhere.';
			}
			await loadRosterContext();
		} catch (e) {
			addErr = e instanceof Error ? e.message : 'Remove failed.';
		}
	}

	async function runTransfer() {
		xferErr = '';
		xferMsg = '';
		const pe = xferEmail.trim().toLowerCase();
		if (!pe || !xferTeamId) {
			xferErr = 'Player email and destination team are required.';
			return;
		}
		xferBusy = true;
		try {
			const res = await transferPlayer({ playerEmail: pe, targetTeamId: xferTeamId });
			const data = res.data;
			if (data?.noop) {
				xferMsg = 'Player already on that team.';
			} else {
				xferMsg = `Moved ${data?.playerName || pe} — rosters and records updated.`;
			}
			xferEmail = '';
			if (rosterTeamId) await loadRosterContext();
		} catch (e) {
			const err = /** @type {{ message?: string }} */ (e);
			xferErr = err?.message || 'Transfer failed.';
		} finally {
			xferBusy = false;
		}
	}
</script>

<div class="ec-page ec-registrar">
	<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6">
		<div class="tw-flex tw-flex-col tw-gap-6 xl:tw-col-span-8">
			<div class="registrar-portal-title">
				{#if clubId}
					<ClubLogoMark size="lg" />
				{/if}
				<h2 class="ec-registrar__title">Registrar workspace</h2>
			</div>
			<p class="ec-registrar__lede">
				Compliance-first roster: passports, waivers, and guardian linkage for every player slot in your
				club. Row actions open Household &amp; compliance in the player drawer for doc review.
			</p>

			<ActionInbox clubId={clubId || ''} teamId="" />

			<div class="ec-panel ec-registrar__table-panel">
				<div class="ec-registrar__table-head">Club roster — compliance</div>
				{#if tableErr}
					<p class="ec-registrar__muted" role="alert">{tableErr}</p>
				{:else if tableLoading}
					<p class="ec-registrar__muted">Loading roster…</p>
				{:else if complianceRows.length === 0}
					<p class="ec-registrar__muted">No teams or players found for this scope.</p>
				{:else}
					<div class="ec-table-wrap">
						<table class="ec-table ec-table--dense">
							<thead>
								<tr>
									<th>Player name</th>
									<th>DOB</th>
									<th>Guardian linked</th>
									<th>Waiver status</th>
									<th>Passport status</th>
								</tr>
							</thead>
							<tbody>
								{#each complianceRows as row (row.key)}
									<tr
										class="ec-table__row-click"
										onclick={() => openRow(row)}
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												openRow(row);
											}
										}}
										role="button"
										tabindex="0"
									>
										<td class="ec-table__strong">
											<div>{row.playerName}</div>
											<div class="ec-registrar__team-inline">{row.teamLabel}</div>
										</td>
										<td>{row.dobLabel}</td>
										<td>
											{#if row.guardianLinked}
												<span class="reg-chip reg-chip--ok">Linked</span>
											{:else}
												<span class="reg-chip reg-chip--bad">Not linked</span>
											{/if}
										</td>
										<td>
											<span class="reg-chip reg-chip--{row.waiverKind}">{row.waiverLabel}</span>
										</td>
										<td>
											<span class="reg-chip reg-chip--{row.passportKind}">{row.passportLabel}</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>

		<div class="tw-flex tw-flex-col tw-gap-6 xl:tw-col-span-4">
			<div class="ec-panel ec-registrar-side">
				<div class="ec-registrar-side__head">Add player</div>
				<div class="ec-registrar-side__body">
					<label class="ec-registrar__label" for="add-team">Team</label>
					<select id="add-team" class="ec-registrar__input" bind:value={addTeamId}>
						{#each scopeTeams as t}
							<option value={t.id}>{t.name || t.id}</option>
						{/each}
					</select>

					<label class="ec-registrar__label" for="add-name">Player name</label>
					<input id="add-name" class="ec-registrar__input" type="text" bind:value={addName} />

					<label class="ec-registrar__label" for="add-email">Player / parent email (optional)</label>
					<input id="add-email" class="ec-registrar__input" type="email" bind:value={addEmail} />

					{#if addErr}
						<div class="auth-error-msg" role="alert">{addErr}</div>
					{/if}
					{#if addMsg}
						<p class="ec-registrar__ok" role="status">{addMsg}</p>
					{/if}

					<button
						class="ec-registrar__btn primary-btn btn-orange"
						type="button"
						onclick={addPlayerInvite}
						disabled={addBusy}
					>
						{addBusy ? 'Saving…' : 'Add to roster'}
					</button>
				</div>
			</div>

			<div class="ec-panel ec-registrar-side">
				<div class="ec-registrar-side__head">Transfer player</div>
				<div class="ec-registrar-side__body">
					<p class="ec-registrar__hint">
						Secure server move — rosters, invites, and club assignment stay aligned.
					</p>
					<label class="ec-registrar__label" for="xfer-email">Player login email</label>
					<input id="xfer-email" class="ec-registrar__input" type="email" bind:value={xferEmail} />

					<label class="ec-registrar__label" for="xfer-team">Destination team</label>
					<select id="xfer-team" class="ec-registrar__input" bind:value={xferTeamId}>
						<option value="">Select team…</option>
						{#each xferTeamChoices as t}
							<option value={t.id}>{t.name || t.id} ({t.clubId})</option>
						{/each}
					</select>

					{#if xferErr}
						<div class="auth-error-msg" role="alert">{xferErr}</div>
					{/if}
					{#if xferMsg}
						<p class="ec-registrar__ok" role="status">{xferMsg}</p>
					{/if}

					<button
						class="ec-registrar__btn primary-btn btn-orange"
						type="button"
						onclick={runTransfer}
						disabled={xferBusy}
					>
						{xferBusy ? 'Transferring…' : 'Run transfer'}
					</button>
				</div>
			</div>

			<div class="ec-panel ec-registrar-side">
				<div class="ec-registrar-side__head">Roster names & invites</div>
				<div class="ec-registrar-side__body">
					<label class="ec-registrar__label" for="roster-team">Team</label>
					<select id="roster-team" class="ec-registrar__input" bind:value={rosterTeamId}>
						{#each scopeTeams as t}
							<option value={t.id}>{t.name || t.id}</option>
						{/each}
					</select>

					{#if rosterLoading}
						<p class="ec-registrar__muted">Loading…</p>
					{:else}
						<h3 class="ec-registrar__sub">Linked logins</h3>
						{#if linkedRows.length === 0}
							<p class="ec-registrar__muted">No email invites for this team.</p>
						{:else}
							<ul class="ec-registrar__plain">
								{#each linkedRows as row}
									<li><strong>{row.playerName}</strong> — {row.id}</li>
								{/each}
							</ul>
						{/if}

						<h3 class="ec-registrar__sub">Roster names</h3>
						{#if rosterNames.length === 0}
							<p class="ec-registrar__muted">Empty roster.</p>
						{:else}
							<ul class="ec-registrar__plain">
								{#each rosterNames as n}
									<li class="ec-registrar__li-row">
										<span>{n}</span>
										<button
											type="button"
											class="danger-outline"
											onclick={() => removeFromRoster(n)}
										>
											Remove
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.ec-registrar__title {
		margin: 0;
		font-size: clamp(1.25rem, 2.5vw, 1.5rem);
		font-weight: 800;
	}

	.registrar-portal-title {
		display: flex;
		align-items: center;
		gap: clamp(10px, 2vw, 16px);
		flex-wrap: wrap;
	}

	.ec-registrar__lede {
		margin: 0;
		max-width: 44rem;
		font-size: 0.95rem;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.ec-registrar__team-inline {
		margin-top: 2px;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.ec-registrar__table-panel {
		padding: 0;
		overflow: hidden;
	}

	.ec-registrar__table-head {
		padding: 10px 14px;
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		background: #ffffff;
	}

	:global(html.dark) .ec-registrar__table-head {
		border-bottom-color: rgba(255, 255, 255, 0.08);
		background: #09090b;
	}

	.ec-registrar__muted {
		margin: 0;
		padding: 14px;
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	.ec-table--dense td,
	.ec-table--dense th {
		font-size: 12px;
		padding: 8px 10px;
	}

	.reg-chip {
		display: inline-block;
		font-size: 11px;
		font-weight: 700;
		padding: 2px 8px;
		border-radius: 999px;
		line-height: 1.25;
	}

	.reg-chip--ok {
		background: rgba(4, 120, 87, 0.12);
		color: #047857;
	}
	.reg-chip--warn {
		background: rgba(180, 83, 9, 0.15);
		color: #b45309;
	}
	.reg-chip--bad {
		background: rgba(185, 28, 28, 0.12);
		color: #b91c1c;
	}
	.reg-chip--muted {
		background: rgba(0, 0, 0, 0.06);
		color: var(--text-secondary);
	}
	:global(html.dark) .reg-chip--muted {
		background: rgba(255, 255, 255, 0.08);
	}

	.ec-registrar-side {
		padding: 0;
		overflow: hidden;
	}
	.ec-registrar-side__head {
		padding: 10px 14px;
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		background: #ffffff;
	}
	:global(html.dark) .ec-registrar-side__head {
		border-bottom-color: rgba(255, 255, 255, 0.08);
		background: #09090b;
	}
	.ec-registrar-side__body {
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		background: #fafafa;
	}
	:global(html.dark) .ec-registrar-side__body {
		background: #0c0c0e;
	}
	.ec-registrar__label {
		font-weight: 800;
		font-size: 0.82rem;
	}
	.ec-registrar__input {
		width: 100%;
		box-sizing: border-box;
		padding: 10px 12px;
		border-radius: 12px;
		border: 1px solid var(--glass-border, rgba(0, 0, 0, 0.12));
		font: inherit;
		background: var(--glass-bg, #fff);
		color: inherit;
	}
	.ec-registrar__btn {
		align-self: flex-start;
	}
	.ec-registrar__ok {
		margin: 0;
		color: var(--success-green, #047857);
		font-weight: 700;
		font-size: 0.88rem;
	}
	.ec-registrar__hint {
		margin: 0;
		font-size: 0.82rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}
	.ec-registrar__sub {
		margin: 8px 0 4px;
		font-size: 0.9rem;
		font-weight: 800;
	}
	.ec-registrar__plain {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 0.88rem;
	}
	.ec-registrar__li-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		padding: 8px 10px;
		border-radius: 10px;
		border: 1px solid var(--glass-border, rgba(0, 0, 0, 0.1));
	}
	.danger-outline {
		background: transparent;
		border: 1px solid var(--danger-red, #b91c1c);
		color: var(--danger-red, #b91c1c);
		font-weight: 700;
		padding: 4px 10px;
		border-radius: 10px;
		cursor: pointer;
		font: inherit;
		font-size: 0.82rem;
	}
</style>
