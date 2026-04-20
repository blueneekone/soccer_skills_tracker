<script>
	import { goto } from '$app/navigation';
	import { db, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
	import Swal from 'sweetalert2';
	import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
	import '$lib/styles/enterprise-console.css';

	let { teamId = '', teams = [] } = $props();

	const secureAddPlayer = httpsCallable(functions, 'secureAddPlayer');
	const secureRemovePlayer = httpsCallable(functions, 'secureRemovePlayer');

	/** Roster display name → player_lookup doc id (email lower) */
	let nameToEmail = $state(/** @type {Record<string, string>} */ ({}));

	let players = $state([]);
	let playerStats = $state({});
	let jerseys = $state({});
	let linkedPlayers = $state(new Set());
	let loading = $state(false);
	let addSaving = $state(false);
	let removeBusy = $state(false);
	/** @type {string | null} */
	let removingName = $state(null);
	/** @type {{ type: 'error' | 'success' | 'info'; text: string } | null} */
	let feedback = $state(null);
	let addName = $state('');
	let addEmail = $state('');
	let addJersey = $state('');
	let totalReps = $state(0);

	const currentTeam = $derived(teams.find((t) => t.id === teamId));

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
	 * @param {Record<string, unknown> | undefined} stats
	 */
	function formatLastActiveLabel(stats) {
		if (!stats) return '—';
		const la = stats.lastActive;
		if (la && typeof la === 'object' && 'toDate' in la && typeof la.toDate === 'function') {
			try {
				return la.toDate().toLocaleDateString();
			} catch {
				/* fall through */
			}
		}
		if (stats.last_training_utc) return String(stats.last_training_utc);
		return '—';
	}

	const loadRoster = async () => {
		if (!teamId) return;
		loading = true;
		try {
			const [statsSnap, rosterSnap, linkSnap] = await Promise.all([
				getDocs(query(collection(db, 'player_stats'), where('teamId', '==', teamId))),
				getDoc(doc(db, 'rosters', teamId)),
				getDocs(query(collection(db, 'player_lookup'), where('teamId', '==', teamId)))
			]);

			playerStats = {};
			statsSnap.forEach((d) => {
				playerStats[d.id] = d.data();
			});

			const rosterNames = rosterSnap.exists() ? rosterSnap.data().players || [] : [];
			jerseys = rosterSnap.exists() ? rosterSnap.data().jerseys || {} : {};

			linkedPlayers = new Set();
			const emailMap = {};
			linkSnap.forEach((d) => {
				const data = d.data();
				if (typeof data.playerName === 'string' && data.playerName.trim()) {
					linkedPlayers.add(data.playerName);
					emailMap[data.playerName.trim()] = d.id;
				}
			});
			nameToEmail = emailMap;

			const combined = new Set([...rosterNames, ...Object.keys(playerStats)]);
			players = Array.from(combined).sort();
			totalReps = players.reduce((s, p) => s + (playerStats[p]?.totalMins || 0), 0);
		} catch (e) {
			console.error('[RosterTab] loadRoster:', e);
			feedback = {
				type: 'error',
				text: 'Could not load roster. Check your connection and try Refresh.'
			};
		} finally {
			loading = false;
		}
	};

	$effect(() => {
		if (teamId) loadRoster();
	});

	function showSeatHardLockModal() {
		Swal.fire({
			title: 'Roster seats at capacity',
			html:
				'<p style="margin:0;font-size:clamp(0.9rem, 2.5vw, 1.05rem);line-height:1.5;">Your organization has used all licensed roster seats. Contact your <strong>Director</strong> to upgrade the club license.</p>',
			icon: 'warning',
			iconColor: '#b45309',
			confirmButtonText: 'Understood',
			allowOutsideClick: false,
			allowEscapeKey: true,
			focusConfirm: true,
			customClass: {
				popup: 'swal-liquid-hardlock',
				confirmButton: 'swal-liquid-hardlock__btn'
			},
			buttonsStyling: false,
			backdrop: 'rgba(15, 23, 42, 0.72)'
		});
	}

	function mapCallableErrorToMessage(code, message) {
		if (code === 'functions/already-exists' || code === 'already-exists') {
			return (
				message ||
				'That email is already linked to a player on another team.'
			);
		}
		if (code === 'functions/failed-precondition' || code === 'failed-precondition') {
			if (message === 'team-full' || message.includes('team-full')) {
				return (
					'This team roster quota is full. Ask your Director to allocate more seats ' +
					'from the club license pool (Teams → seat management).'
				);
			}
			return (
				message ||
				'Club license is not configured yet. Contact your platform administrator.'
			);
		}
		if (code === 'functions/invalid-argument' || code === 'invalid-argument') {
			return message || 'Invalid input. Check the name and email and try again.';
		}
		if (code === 'functions/permission-denied' || code === 'permission-denied') {
			return (
				message ||
				'You do not have permission to change this team roster.'
			);
		}
		if (code === 'functions/unauthenticated' || code === 'unauthenticated') {
			return 'Sign in required.';
		}
		return message || 'Could not update roster. Try again or contact support.';
	}

	function normalizePlayerName(s) {
		return s.trim().replace(/\s+/g, ' ');
	}

	const addPlayer = async () => {
		feedback = null;
		const rawName = addName.trim();
		if (!rawName) {
			feedback = { type: 'error', text: 'Enter a player name.' };
			return;
		}
		if (!teamId) {
			feedback = { type: 'error', text: 'Select a team first.' };
			return;
		}

		const normalizedName = rawName.replace(/\s+/g, ' ');
		const emailTrim = addEmail.trim().toLowerCase();
		const jerseyStr =
			addJersey !== '' && addJersey !== null && String(addJersey).trim() !== ''
				? String(addJersey).trim().slice(0, 16)
				: '';

		addSaving = true;
		try {
			const res = await secureAddPlayer({
				teamId,
				playerName: normalizedName,
				...(emailTrim ? { playerEmail: emailTrim } : {}),
				...(jerseyStr ? { jersey: jerseyStr } : {})
			});
			const data = res.data;

			if (data?.duplicate) {
				feedback = {
					type: 'info',
					text: 'That player name is already on this team roster.'
				};
				return;
			}

			if (!players.includes(normalizedName)) {
				players = [...players, normalizedName].sort();
			}
			jerseys = jerseyStr
				? { ...jerseys, [normalizedName]: jerseyStr }
				: { ...jerseys };
			if (emailTrim) {
				linkedPlayers = new Set([...linkedPlayers, normalizedName]);
			}

			addName = '';
			addEmail = '';
			addJersey = '';
			feedback = { type: 'success', text: 'Player added.' };
		} catch (err) {
			const code = /** @type {{ code?: string }} */ (err).code || '';
			const msg = /** @type {{ message?: string }} */ (err).message || '';

			if (code === 'functions/resource-exhausted' || code === 'resource-exhausted') {
				showSeatHardLockModal();
				return;
			}

			feedback = {
				type: 'error',
				text: mapCallableErrorToMessage(code, msg)
			};
			console.error('[RosterTab] secureAddPlayer:', code, msg);
		} finally {
			addSaving = false;
		}
	};

	const removePlayer = async (name) => {
		if (!confirm(`Remove ${name}?`)) return;
		if (!teamId) {
			feedback = { type: 'error', text: 'Select a team first.' };
			return;
		}
		feedback = null;
		const normalized = normalizePlayerName(name);
		removeBusy = true;
		removingName = normalized;
		try {
			const res = await secureRemovePlayer({
				teamId,
				playerName: normalized
			});
			const data = res.data;

			if (data?.notFound) {
				feedback = {
					type: 'info',
					text:
						'That player was not on this roster. It may have been updated elsewhere — refreshed from the server.'
				};
				await loadRoster();
				return;
			}

			players = players.filter((p) => p !== normalized);
			jerseys = Object.fromEntries(
				Object.entries(jerseys).filter(([k]) => k !== normalized)
			);
			linkedPlayers = new Set(
				[...linkedPlayers].filter((n) => n !== normalized)
			);
			totalReps = players.reduce(
				(s, p) => s + (playerStats[p]?.totalMins || 0),
				0
			);
			feedback = { type: 'success', text: 'Player removed.' };
		} catch (err) {
			const code = /** @type {{ code?: string }} */ (err).code || '';
			const msg = /** @type {{ message?: string }} */ (err).message || '';
			feedback = {
				type: 'error',
				text: mapCallableErrorToMessage(code, msg)
			};
			console.error('[RosterTab] secureRemovePlayer:', code, msg);
		} finally {
			removeBusy = false;
			removingName = null;
		}
	};

	/**
	 * @param {string} p
	 */
	function openPlayerDrawer(p) {
		const statsId = resolveStatsDocId(p, playerStats);
		const stats = playerStats[statsId];
		const em = nameToEmail[p] || null;
		const teamNm = currentTeam?.name || '';

		enterprisePlayerDrawer.open(
			{
				id: `${teamId}_${p}`,
				displayName: p,
				teamId,
				teamLabel: teamNm || teamId,
				statsDocId: statsId,
				playerEmail: em,
				jersey: jerseys[p] != null && String(jerseys[p]).trim() ? String(jerseys[p]) : null,
				ageGroup: parseAgeFromTeamName(teamNm),
				position: null,
				status: linkedPlayers.has(p) ? 'active' : 'pending',
				lastActiveLabel: formatLastActiveLabel(stats),
				source: 'coach',
			},
			{
				assignDrill: () => {
					enterprisePlayerDrawer.close();
					goto('/coach?tab=plan');
				},
				editProfile: () => {
					if (em) window.location.href = `mailto:${em}`;
				},
				removeFromRoster: async () => {
					await removePlayer(p);
					enterprisePlayerDrawer.close();
				},
			}
		);
	}
</script>

<div class="roster-tab">
	<div class="bento-section">
		<div class="card">
			<div class="card-header roster-overview-header">Roster Overview</div>
			<div class="card-body">
				<div class="roster-stats-box">
					<div class="text-center">
						<b>Active Players</b><br />
						<span class="roster-stat-val active">{players.length}</span>
					</div>
					<div class="text-center">
						<b>Total Minutes</b><br />
						<span class="roster-stat-val reps">{totalReps}</span>
					</div>
				</div>

				<label for="roster-add-name">Manual Add Player</label>
				{#if feedback}
					<p
						class="roster-feedback roster-feedback--{feedback.type}"
						role={feedback.type === 'error' ? 'alert' : 'status'}
					>
						{feedback.text}
					</p>
				{/if}
				<div class="input-row">
					<input
						id="roster-add-name"
						type="text"
						bind:value={addName}
						placeholder="Player Name"
						class="flex-1"
						disabled={addSaving || removeBusy}
						autocomplete="off"
					/>
					<input
						type="number"
						bind:value={addJersey}
						placeholder="#"
						class="w-50"
						disabled={addSaving || removeBusy}
					/>
				</div>
				<input
					type="email"
					bind:value={addEmail}
					placeholder="Athlete login email (optional; required for SafeSport messaging)"
					disabled={addSaving || removeBusy}
					autocomplete="off"
				/>
				<button
					class="secondary-btn w-100"
					onclick={addPlayer}
					disabled={addSaving || removeBusy || !teamId}
				>
					{addSaving ? 'Adding…' : '+ Add Player'}
				</button>
			</div>
		</div>

		<div class="card">
			<div class="card-header">
				<span>Team Roster</span>
				<button
					type="button"
					class="action-btn"
					onclick={loadRoster}
					disabled={loading || removeBusy}
				>
					↻ Refresh
				</button>
			</div>
			<div class="card-body p-0">
				{#if loading}
					<div class="session-empty">Loading...</div>
				{:else if players.length === 0}
					<div class="session-empty">No players found.</div>
				{:else}
					<div class="ec-table-wrap roster-ec-table">
						<table class="ec-table">
							<thead>
								<tr>
									<th>Player</th>
									<th>Age group</th>
									<th>Position</th>
									<th>Status</th>
									<th>Last active</th>
								</tr>
							</thead>
							<tbody>
								{#each players as p (p)}
									{@const statsId = resolveStatsDocId(p, playerStats)}
									{@const st = playerStats[statsId]}
									<tr
										class="ec-table__row-click"
										onclick={() => openPlayerDrawer(p)}
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												openPlayerDrawer(p);
											}
										}}
										role="button"
										tabindex="0"
									>
										<td class="ec-table__strong">
											{jerseys[p] ? `#${jerseys[p]} ` : ''}{p}
										</td>
										<td>{parseAgeFromTeamName(currentTeam?.name || '') || '—'}</td>
										<td class="ec-muted">—</td>
										<td>
											{#if linkedPlayers.has(p)}
												<span class="ec-pill ec-pill--ok">Active</span>
											{:else}
												<span class="ec-pill ec-pill--muted">Pending</span>
											{/if}
										</td>
										<td class="ec-muted">{formatLastActiveLabel(st)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.roster-stats-box {
		display: flex;
		gap: 20px;
		justify-content: space-around;
		padding: 16px;
		background: rgba(15, 23, 42, 0.05);
		border-radius: 12px;
		margin-bottom: 16px;
	}
	.roster-stat-val {
		font-size: 2rem;
		font-weight: 900;
		display: block;
	}
	.roster-stat-val.active {
		color: var(--success-green);
	}
	.roster-stat-val.reps {
		color: var(--text-primary);
	}
	.roster-feedback {
		margin: 0 0 12px;
		padding: clamp(0.5rem, 2vw, 0.75rem) clamp(0.65rem, 2vw, 0.85rem);
		border-radius: clamp(0.45rem, 1.5vw, 0.65rem);
		font-size: clamp(0.8rem, 2.1vw, 0.9rem);
		line-height: 1.45;
	}
	.roster-feedback--error {
		background: rgba(220, 38, 38, 0.1);
		color: var(--danger-red, #b91c1c);
		border: 1px solid rgba(220, 38, 38, 0.25);
	}
	.roster-feedback--success {
		background: rgba(22, 163, 74, 0.12);
		color: var(--success-green, #15803d);
		border: 1px solid rgba(22, 163, 74, 0.28);
	}
	.roster-feedback--info {
		background: rgba(59, 130, 246, 0.1);
		color: var(--text-secondary, #334155);
		border: 1px solid rgba(59, 130, 246, 0.22);
	}
	.player-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px var(--spacing-fluid);
		border-bottom: 1px solid rgba(15, 23, 42, 0.05);
	}
	.player-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.player-mins {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-secondary);
	}
	.delete-btn {
		background: none;
		border: 1px solid var(--border-strong);
		border-radius: 6px;
		cursor: pointer;
		color: var(--danger-red);
		padding: 2px 8px;
		font-size: 0.85rem;
	}
	input {
		margin-bottom: 10px;
	}
</style>
