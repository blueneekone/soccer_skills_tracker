<!--
  CommandCenter.svelte
  ────────────────────
  Coach / Admin high-density data terminal.

  Two-column layout:
  •  Left  70% — ROSTER GRID: live onSnapshot table of all players on the
     coach's team. Columns: Name, Position, Tier, VAN, Last Active, Actions.
  •  Right 30% — MISSION CONSOLE: drill selector, target selector (all /
     by position / specific players), deadline picker, and a [ DEPLOY MISSION ]
     trigger that writes to the `active_missions` Firestore collection.

  Firestore reads
  ───────────────
  Roster: `users` collection, `where('role', '==', 'player')`.
  If a `teamId` prop is supplied the query adds `where('teamId', '==', teamId)`
  for team-scoped coaching. An `onSnapshot` listener provides live updates —
  when a player logs a drill their VAN rating column updates automatically.
  The `$effect` return value is the unsubscribe function (Svelte 5 cleanup).

  Firestore writes
  ────────────────
  Deploy Mission → `addDoc(active_missions, { drillId, targetPlayerIds, ... })`
  Remove Player  → `updateDoc(users/{id}, { teamId: deleteField() })`
                   (removes the player from this team scope; the onSnapshot
                    query then drops the row automatically for teamId queries)

  Optimistic UI
  ─────────────
  Mission deploy: button shows "TRANSMITTING…" while the async write is in
  flight. On success: a 3-second "MISSION DEPLOYED" confirmation. On error:
  a silent console.warn + "TRANSMISSION FAILED" state.
  Remove player: row is opacity-30 immediately; Firestore error reverts it.
-->
<script>
	import { browser } from '$app/environment';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { TIER_DEFINITIONS } from '$lib/states/ArmoryEngine.svelte';
	import {
		addDoc,
		collection,
		deleteField,
		getDocs,
		onSnapshot,
		query,
		serverTimestamp,
		updateDoc,
		where,
		doc,
		orderBy,
	} from 'firebase/firestore';

	// ── Drill catalogue (mirrors ProvingGrounds DRILLS) ───────────────────
	const DRILL_CATALOG = [
		{ id: 'sprint-30m',         label: '30M SPRINT',            statKey: 'PAC' },
		{ id: 'accel-test',         label: 'ACCELERATION TEST',      statKey: 'ACC' },
		{ id: 'shuttle-5-10-5',     label: '5-10-5 SHUTTLE',         statKey: 'AGI' },
		{ id: 'stamina-protocol',   label: 'STAMINA PROTOCOL',       statKey: 'STM' },
		{ id: 'broad-jump',         label: 'STANDING BROAD JUMP',    statKey: 'POW' },
		{ id: 'combine-composite',  label: 'COMBINE COMPOSITE',      statKey: 'VAN' },
	];

	// ── Props ─────────────────────────────────────────────────────────────
	/**
	 * @type {{
	 *   teamId?: string;
	 *   class?: string;
	 * }}
	 */
	let { teamId = undefined, class: extraClass = '' } = $props();

	// ── Roster state ──────────────────────────────────────────────────────
	/**
	 * @typedef {{
	 *   id: string;
	 *   playerName?: string;
	 *   position?: string;
	 *   role?: string;
	 *   teamId?: string;
	 *   email?: string;
	 *   lastActivityDate?: string | { toDate: () => Date };
	 *   armory?: {
	 *     totalXP?: number;
	 *     stats?: { PAC?: string; ACC?: string; AGI?: string; STM?: string; POW?: string; VAN?: string };
	 *   };
	 *   _removing?: boolean;
	 * }} RosterPlayer
	 */

	/** @type {RosterPlayer[]} */
	let roster = $state([]);
	let rosterLoading = $state(true);
	/** @type {string | null} */
	let rosterError = $state(null);

	// ── Mission console state ─────────────────────────────────────────────
	let selectedDrillId = $state('');
	/** @type {'all' | 'position' | 'specific'} */
	let targetMode = $state('all');
	let targetPosition = $state('');
	/** @type {string[]} */
	let selectedPlayerIds = $state([]);
	let missionDeadline = $state('');
	/** @type {'idle' | 'deploying' | 'success' | 'error'} */
	let deployState = $state('idle');

	// ── Remove-player confirm guard ───────────────────────────────────────
	/** @type {string | null} */
	let confirmRemoveId = $state(null);

	// ── Derived ───────────────────────────────────────────────────────────

	/** Distinct player positions for the "By Position" filter. */
	const positions = $derived(
		[...new Set(roster.map((p) => p.position || '').filter(Boolean))].sort()
	);

	/** IDs that will be written into the active_mission document. */
	const missionTargetIds = $derived.by(() => {
		if (targetMode === 'all') return roster.map((p) => p.id);
		if (targetMode === 'position') {
			return roster
				.filter((p) => (p.position ?? '') === targetPosition)
				.map((p) => p.id);
		}
		return selectedPlayerIds;
	});

	/** Guard: form is only submittable when all required fields are filled. */
	const canDeploy = $derived(
		selectedDrillId !== '' &&
			missionDeadline !== '' &&
			missionTargetIds.length > 0 &&
			deployState === 'idle'
	);

	/** @type {Record<string, import('$lib/household/rosterGuardianEnrich.js').GuardianMeta>} */
	let guardianByEmail = $state({});

	// ── Guardian denorm from player_lookup ────────────────────────────────
	$effect(() => {
		if (!browser) return;
		const emails = roster
			.map((p) => (typeof p.email === 'string' && p.email ? p.email : p.id))
			.filter(Boolean);
		if (emails.length === 0) {
			guardianByEmail = {};
			return;
		}
		let cancelled = false;
		void (async () => {
			const { fetchGuardiansFromPlayerLookup } = await import(
				'$lib/household/fetchPlayerLookupGuardians.js'
			);
			const map = await fetchGuardiansFromPlayerLookup(db, emails);
			if (!cancelled) {
				guardianByEmail = Object.fromEntries(map);
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	/**
	 * @param {RosterPlayer} player
	 */
	function guardianLine(player) {
		const em = (typeof player.email === 'string' && player.email ? player.email : player.id).toLowerCase();
		const meta = guardianByEmail[em];
		if (!meta || meta.parentEmails.length === 0) return 'Unlinked';
		return meta.parentEmails.join(', ');
	}

	/**
	 * @param {RosterPlayer} player
	 */
	function vpcLine(player) {
		const em = (typeof player.email === 'string' && player.email ? player.email : player.id).toLowerCase();
		const meta = guardianByEmail[em];
		const s = meta?.vpcStatus || '';
		if (s === 'verified') return 'Verified';
		if (s === 'pending_parent' || s === 'pending') return 'Pending';
		return '—';
	}

	// ── Firestore roster listener ─────────────────────────────────────────
	$effect(() => {
		if (!browser) return;

		rosterLoading = true;
		rosterError = null;

		let constraints = [where('role', '==', 'player')];
		if (teamId) constraints.push(where('teamId', '==', teamId));

		const q = query(collection(db, 'users'), ...constraints);

		const unsub = onSnapshot(
			q,
			(snap) => {
				roster = snap.docs.map((d) => ({
					id: d.id,
					.../** @type {RosterPlayer} */ (d.data()),
				}));
				rosterLoading = false;
			},
			(err) => {
				console.warn('[CommandCenter] Roster listener error:', err);
				rosterError = err.message ?? 'Unknown Firestore error';
				rosterLoading = false;
			},
		);

		// Svelte 5 $effect cleanup — called when effect re-runs or component unmounts.
		return unsub;
	});

	// ── Auto-reset deploy state ───────────────────────────────────────────
	$effect(() => {
		if (deployState === 'idle') return;
		const t = setTimeout(() => {
			deployState = 'idle';
		}, 3000);
		return () => clearTimeout(t);
	});

	// ── Helpers ───────────────────────────────────────────────────────────

	/**
	 * Derive the ArmoryTier for a player from their armory.totalXP (or 0).
	 * @param {RosterPlayer} player
	 */
	function tierForPlayer(player) {
		const xp = player.armory?.totalXP ?? 0;
		return (
			[...TIER_DEFINITIONS].reverse().find((t) => xp >= t.floor) ?? TIER_DEFINITIONS[0]
		);
	}

	/**
	 * Format a `lastActivityDate` string (YYYY-MM-DD) or Firestore Timestamp
	 * into a compact relative label.
	 * @param {string | { toDate: () => Date } | undefined} val
	 */
	function formatLastActive(val) {
		if (!val) return '—';
		let d;
		if (typeof val === 'string') {
			// Avoid timezone offset shifting the date by anchoring to noon UTC.
			d = new Date(val.length === 10 ? val + 'T12:00:00Z' : val);
		} else if (typeof val === 'object' && typeof val.toDate === 'function') {
			d = val.toDate();
		} else {
			return '—';
		}
		if (isNaN(d.getTime())) return '—';
		const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
		if (diffDays < 0) return 'UPCOMING';
		if (diffDays === 0) return 'TODAY';
		if (diffDays === 1) return '1D AGO';
		if (diffDays < 30) return `${diffDays}D AGO`;
		if (diffDays < 365) return `${Math.floor(diffDays / 30)}MO AGO`;
		return `${Math.floor(diffDays / 365)}YR AGO`;
	}

	/** Toggle a specific player in/out of the `selectedPlayerIds` list. */
	function togglePlayer(/** @type {string} */ id) {
		if (selectedPlayerIds.includes(id)) {
			selectedPlayerIds = selectedPlayerIds.filter((x) => x !== id);
		} else {
			selectedPlayerIds = [...selectedPlayerIds, id];
		}
	}

	/**
	 * First click → enter confirm state (auto-cancels after 3 s).
	 * Second click → execute remove.
	 * @param {string} playerId
	 */
	function handleRemoveClick(playerId) {
		if (confirmRemoveId === playerId) {
			// Confirmed — execute
			confirmRemoveId = null;
			executeRemove(playerId);
		} else {
			confirmRemoveId = playerId;
			setTimeout(() => {
				if (confirmRemoveId === playerId) confirmRemoveId = null;
			}, 3000);
		}
	}

	/** Optimistic remove: dims the row immediately; reverts on Firestore failure. */
	async function executeRemove(/** @type {string} */ playerId) {
		// Optimistic: mark the row as "removing"
		roster = roster.map((p) => (p.id === playerId ? { ...p, _removing: true } : p));

		try {
			await updateDoc(doc(db, 'users', playerId), { teamId: deleteField() });
			// onSnapshot will automatically drop this row from a teamId-scoped query.
			// For unscoped queries remove the row locally as well:
			if (!teamId) {
				roster = roster.filter((p) => p.id !== playerId);
			}
		} catch (err) {
			console.warn('[CommandCenter] Remove player failed:', err);
			// Revert optimistic update
			roster = roster.map((p) => (p.id === playerId ? { ...p, _removing: false } : p));
		}
	}

	/** Deploy a mission: write to `active_missions` collection. */
	async function deployMission() {
		if (!canDeploy) return;
		const drill = DRILL_CATALOG.find((d) => d.id === selectedDrillId);
		if (!drill) return;

		deployState = 'deploying';

		try {
			await addDoc(collection(db, 'active_missions'), {
				drillId: drill.id,
				drillLabel: drill.label,
				drillStatKey: drill.statKey,
				coachId: authStore.user?.email ?? authStore.user?.uid ?? 'unknown',
				teamId: teamId ?? null,
				targetMode,
				targetPlayerIds: missionTargetIds,
				deadline: new Date(missionDeadline),
				status: 'active',
				createdAt: serverTimestamp(),
			});

			deployState = 'success';
			// Reset form fields
			selectedDrillId = '';
			targetMode = 'all';
			targetPosition = '';
			selectedPlayerIds = [];
			missionDeadline = '';
		} catch (err) {
			console.warn('[CommandCenter] Mission deploy failed:', err);
			deployState = 'error';
		}
	}
</script>

<div class="cc-shell {extraClass}">

	<!-- ── PAGE HEADER ─────────────────────────────────────────────────── -->
	<div class="cc-page-header">
		<div>
			<p class="tw-text-[8px] tw-uppercase tw-tracking-[0.5em] tw-text-white/25">
				VANGUARD SYSTEM · COACH CLEARANCE
			</p>
			<h1 class="tw-mt-0.5 tw-text-[13px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-white">
				COMMAND CENTER
				<span class="tw-text-white/25">·</span>
				OPERATIONAL CONTROL
			</h1>
		</div>
		<div class="tw-flex tw-items-center tw-gap-4 tw-text-[9px] tw-font-mono tw-text-white/30 tw-tracking-[0.25em]">
			{#if rosterLoading}
				<span class="cc-pulse">SYNCING ROSTER…</span>
			{:else if rosterError}
				<span class="tw-text-[#ff4444]">⚠ SYNC ERROR</span>
			{:else}
				<span>{roster.length} OPERATIVES ONLINE</span>
			{/if}
		</div>
	</div>

	<!-- ── TWO-COLUMN BODY ─────────────────────────────────────────────── -->
	<div class="tw-flex tw-flex-col lg:tw-flex-row tw-gap-0 tw-min-h-0 tw-flex-1">

		<!-- ─────────────────────────────────────────────────────────────── -->
		<!-- LEFT 70%: ROSTER GRID                                          -->
		<!-- ─────────────────────────────────────────────────────────────── -->
		<section class="cc-roster-pane">
			<div class="tw-px-5 tw-py-3 tw-border-b tw-border-white/6 tw-flex tw-items-center tw-justify-between">
				<p class="tw-text-[8px] tw-uppercase tw-tracking-[0.42em] tw-text-white/30">
					ROSTER GRID · {roster.length} OPERATIVE{roster.length !== 1 ? 'S' : ''}
				</p>
				<span class="cc-live-dot" aria-label="Live connection active"></span>
			</div>

			<!-- Roster table -->
			<div class="tw-overflow-x-auto tw-overflow-y-auto">
				{#if rosterLoading}
					<!-- Skeleton rows -->
					<div class="tw-p-8 tw-space-y-3">
						{#each Array(4) as _, i (i)}
							<div
								class="tw-h-8 tw-rounded tw-bg-white/4 tw-animate-pulse"
								style:opacity={1 - i * 0.15}
							></div>
						{/each}
					</div>
				{:else if rosterError}
					<div class="tw-p-10 tw-text-center tw-text-[10px] tw-text-white/30 tw-font-mono tw-uppercase tw-tracking-widest">
						<p class="tw-text-[#ff4444] tw-mb-2">⚠ ROSTER SYNC FAILURE</p>
						<p class="tw-text-[8px] tw-text-white/20">{rosterError}</p>
					</div>
				{:else if roster.length === 0}
					<div class="tw-p-10 tw-text-center tw-font-mono">
						<p class="tw-text-[42px] tw-text-white/8 tw-mb-3">⊘</p>
						<p class="tw-text-[10px] tw-uppercase tw-tracking-[0.4em] tw-text-white/25">NO OPERATIVES ASSIGNED</p>
						<p class="tw-mt-1 tw-text-[8px] tw-tracking-[0.2em] tw-text-white/15">
							{teamId ? 'No players are assigned to this team.' : 'No player accounts found.'}
						</p>
					</div>
				{:else}
					<table class="cc-table tw-w-full">
						<thead>
							<tr>
								<th>OPERATIVE</th>
								<th>GUARDIAN</th>
								<th>VPC</th>
								<th>POSITION</th>
								<th>TIER</th>
								<th class="tw-text-[#14b8a6]/50">VAN</th>
								<th>LAST ACTIVE</th>
								<th class="tw-text-right">ACTIONS</th>
							</tr>
						</thead>
						<tbody>
							{#each roster as player (player.id)}
								{@const tier = tierForPlayer(player)}
								{@const van = player.armory?.stats?.VAN ?? '—'}
								{@const isRemoving = player._removing === true}
								{@const isConfirming = confirmRemoveId === player.id}
								<tr
									class="cc-row"
									class:cc-row--removing={isRemoving}
								>
									<!-- Name -->
									<td class="cc-td-name">
										<span class="tw-text-white/85 tw-font-semibold">
											{player.playerName ?? player.id}
										</span>
										<span class="tw-block tw-text-[8px] tw-text-white/25 tw-tracking-[0.15em] tw-mt-0.5 tw-uppercase">
											{player.id}
										</span>
									</td>

									<!-- Guardian -->
									<td class="tw-text-[10px] tw-text-white/50 tw-font-mono tw-max-w-[140px] tw-truncate" title={guardianLine(player)}>
										<span class:tw-text-[#ff6666]={guardianLine(player) === 'Unlinked'}>
											{guardianLine(player)}
										</span>
									</td>

									<!-- VPC -->
									<td class="tw-text-[10px] tw-uppercase tw-tracking-widest">
										<span class:tw-text-emerald-400={vpcLine(player) === 'Verified'}
											class:tw-text-amber-400={vpcLine(player) === 'Pending'}>
											{vpcLine(player)}
										</span>
									</td>

									<!-- Position -->
									<td class="tw-text-white/45 tw-uppercase tw-tracking-widest">
										{player.position ?? '—'}
									</td>

									<!-- Tier badge -->
									<td>
										<span
											class="cc-tier-badge"
											style:color={tier.accent}
											style:border-color="{tier.accent}40"
											style:background="{tier.accent}0e"
										>
											{tier.label}
										</span>
									</td>

									<!-- VAN rating (cyan hero column) -->
									<td>
										<span
											class="tw-font-bold tw-tabular-nums"
											class:cc-van-active={van !== '—'}
											style:color={van !== '—' ? '#14b8a6' : 'rgba(255,255,255,0.2)'}
											style:filter={van !== '—' ? 'drop-shadow(0 0 6px rgba(20, 184, 166,0.6))' : 'none'}
										>
											{van}
										</span>
									</td>

									<!-- Last active -->
									<td class="tw-text-white/35 tw-tabular-nums tw-tracking-[0.12em]">
										{formatLastActive(player.lastActivityDate)}
									</td>

									<!-- Actions -->
									<td class="tw-text-right tw-whitespace-nowrap">
										<div class="tw-inline-flex tw-items-center tw-gap-2">
											<!-- Edit profile link -->
											<a
												href="/admin/users/{player.id}"
												class="cc-btn-primary cc-btn-primary--edit"
												title="Edit profile"
												aria-label="Edit {player.playerName ?? player.id}"
											>
												✎
											</a>
											<!-- Remove player -->
											<button
												class="cc-btn-primary"
												class:cc-btn-primary--remove={!isConfirming}
												class:cc-btn-primary--confirm={isConfirming}
												onclick={() => handleRemoveClick(player.id)}
												disabled={isRemoving}
												title={isConfirming ? 'Click again to confirm' : 'Remove from team'}
												aria-label={isConfirming ? 'Confirm remove' : 'Remove player'}
											>
												{#if isRemoving}
													⌛
												{:else if isConfirming}
													CONFIRM?
												{:else}
													⊗
												{/if}
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		</section>

		<!-- ─────────────────────────────────────────────────────────────── -->
		<!-- RIGHT 30%: MISSION CONSOLE                                     -->
		<!-- ─────────────────────────────────────────────────────────────── -->
		<aside class="cc-mission-pane">
			<div class="tw-px-5 tw-py-3 tw-border-b tw-border-white/6">
				<p class="tw-text-[8px] tw-uppercase tw-tracking-[0.42em] tw-text-white/30">
					MISSION CONSOLE · DIRECTIVE AUTHORING
				</p>
			</div>

			<form
				class="tw-p-5 tw-space-y-6"
				onsubmit={(e) => { e.preventDefault(); deployMission(); }}
			>
				<!-- ── SELECT DRILL ──────────────────────────────────── -->
				<div class="cc-form-group">
					<label for="cc-drill" class="cc-label">SELECT DRILL</label>
					<select id="cc-drill" bind:value={selectedDrillId} class="cc-select">
						<option value="" disabled>— CHOOSE PROTOCOL —</option>
						{#each DRILL_CATALOG as drill (drill.id)}
							<option value={drill.id}>{drill.label}</option>
						{/each}
					</select>
					{#if selectedDrillId}
						{@const drill = DRILL_CATALOG.find(d => d.id === selectedDrillId)}
						<p class="tw-mt-1.5 tw-text-[8px] tw-tracking-[0.2em] tw-text-white/25 tw-uppercase">
							WRITES → <span class="tw-text-[#14b8a6]/60">{drill?.statKey}</span> METRIC
						</p>
					{/if}
				</div>

				<!-- ── TARGET OPERATIVES ─────────────────────────────── -->
				<div class="cc-form-group">
					<p class="cc-label">TARGET OPERATIVES</p>

					<!-- Mode selector -->
					<div class="tw-flex tw-gap-1 tw-mb-3" role="group" aria-label="Target mode">
						{#each [
							{ value: 'all', label: 'ENTIRE ROSTER' },
							{ value: 'position', label: 'BY POSITION' },
							{ value: 'specific', label: 'SPECIFIC' },
						] as mode (mode.value)}
							<button
								type="button"
								class="cc-mode-btn"
								class:cc-mode-btn--active={targetMode === mode.value}
								onclick={() => { targetMode = /** @type {'all' | 'position' | 'specific'} */ (mode.value); }}
							>
								{mode.label}
							</button>
						{/each}
					</div>

					<!-- Position sub-selector -->
					{#if targetMode === 'position'}
						<select bind:value={targetPosition} class="cc-select cc-select--sm">
							<option value="" disabled>— CHOOSE POSITION —</option>
							{#each positions as pos (pos)}
								<option value={pos}>{pos}</option>
							{/each}
							{#if positions.length === 0}
								<option value="" disabled>No positions found</option>
							{/if}
						</select>
					{/if}

					<!-- Specific player checklist -->
					{#if targetMode === 'specific'}
						<div class="cc-player-checklist">
							{#each roster as p (p.id)}
								<label class="cc-check-row">
									<input
										type="checkbox"
										class="cc-checkbox"
										checked={selectedPlayerIds.includes(p.id)}
										onchange={() => togglePlayer(p.id)}
									/>
									<span class="tw-text-[10px] tw-text-white/65 tw-tracking-[0.15em]">
										{p.playerName ?? p.id}
									</span>
									{#if p.position}
										<span class="tw-ml-auto tw-text-[8px] tw-text-white/25 tw-uppercase tw-tracking-widest">
											{p.position}
										</span>
									{/if}
								</label>
							{/each}
							{#if roster.length === 0}
								<p class="tw-text-[9px] tw-text-white/25 tw-text-center tw-py-4 tw-uppercase tw-tracking-widest">
									No operatives loaded
								</p>
							{/if}
						</div>
					{/if}

					<!-- Target count summary -->
					<p class="tw-mt-2 tw-text-[8px] tw-uppercase tw-tracking-[0.28em] tw-text-white/25">
						{missionTargetIds.length} OPERATIVE{missionTargetIds.length !== 1 ? 'S' : ''} TARGETED
					</p>
				</div>

				<!-- ── DEADLINE ──────────────────────────────────────── -->
				<div class="cc-form-group">
					<label for="cc-deadline" class="cc-label">MISSION DEADLINE</label>
					<input
						id="cc-deadline"
						type="date"
						bind:value={missionDeadline}
						min={new Date().toISOString().slice(0, 10)}
						class="cc-input"
					/>
				</div>

				<!-- ── DEPLOY BUTTON ─────────────────────────────────── -->
				<div class="tw-pt-2">
					<button
						type="submit"
						class="cc-deploy-btn"
						class:cc-deploy-btn--ready={canDeploy}
						class:cc-deploy-btn--deploying={deployState === 'deploying'}
						class:cc-deploy-btn--success={deployState === 'success'}
						class:cc-deploy-btn--error={deployState === 'error'}
						disabled={!canDeploy || deployState !== 'idle'}
					>
						{#if deployState === 'deploying'}
							⌛ &nbsp;TRANSMITTING…
						{:else if deployState === 'success'}
							◉ &nbsp;MISSION DEPLOYED
						{:else if deployState === 'error'}
							⚠ &nbsp;TRANSMISSION FAILED
						{:else}
							[ &nbsp;DEPLOY MISSION&nbsp; ]
						{/if}
					</button>

					<!-- Pre-flight checklist -->
					<ul class="tw-mt-3 tw-space-y-1.5 tw-text-[8px] tw-font-mono tw-tracking-[0.2em] tw-text-white/25">
						<li class={selectedDrillId ? 'tw-text-[#14b8a6]/50' : ''}>
							{selectedDrillId ? '◉' : '○'} DRILL SELECTED
						</li>
						<li class={missionTargetIds.length > 0 ? 'tw-text-[#14b8a6]/50' : ''}>
							{missionTargetIds.length > 0 ? '◉' : '○'} TARGETS LOCKED ({missionTargetIds.length})
						</li>
						<li class={missionDeadline ? 'tw-text-[#14b8a6]/50' : ''}>
							{missionDeadline ? '◉' : '○'} DEADLINE SET
						</li>
					</ul>
				</div>
			</form>
		</aside>

	</div>
</div>

<style>
	/* ── Shell ─────────────────────────────────────────────────────────── */
	.cc-shell {
		display: flex;
		flex-direction: column;
		background: rgba(1, 4, 9, 0.8);
		backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		border: 1px solid var(--vanguard-border);
		border-radius: var(--vanguard-radius);
		box-shadow: var(--vanguard-elev-2);
		overflow: hidden;
		min-height: 520px;
		font-family: ui-monospace, 'SFMono-Regular', monospace;
		color: white;
	}

	/* ── Page header ───────────────────────────────────────────────────── */
	.cc-page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px 14px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		flex-shrink: 0;
	}

	/* ── Pane layout ───────────────────────────────────────────────────── */
	.cc-roster-pane {
		display: flex;
		flex-direction: column;
		flex: 1;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		min-height: 0;
		overflow: hidden;
	}

	@media (min-width: 1024px) {
		.cc-roster-pane {
			border-bottom: none;
			border-right: 1px solid rgba(255, 255, 255, 0.06);
			/* ~70% width */
			flex: 7;
		}
	}

	.cc-mission-pane {
		flex-shrink: 0;
		overflow-y: auto;
		background: rgba(0, 0, 0, 0.2);
	}

	@media (min-width: 1024px) {
		.cc-mission-pane {
			/* ~30% width */
			flex: 3;
			max-width: 320px;
		}
	}

	/* ── Live dot ──────────────────────────────────────────────────────── */
	.cc-live-dot {
		display: inline-block;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #14b8a6;
		box-shadow: 0 0 8px #14b8a6;
		animation: cc-pulse-dot 2s ease-in-out infinite;
	}

	@keyframes cc-pulse-dot {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	/* ── Scanning pulse text ────────────────────────────────────────────── */
	.cc-pulse {
		animation: cc-text-pulse 1.4s ease-in-out infinite;
	}

	@keyframes cc-text-pulse {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 0.8; }
	}

	/* ── Table ─────────────────────────────────────────────────────────── */
	.cc-table {
		border-collapse: collapse;
	}

	.cc-table thead tr {
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.cc-table th {
		padding: 10px 16px;
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.38em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.28);
		text-align: left;
		white-space: nowrap;
	}

	.cc-table td {
		padding: 12px 16px;
		font-size: 11px;
		letter-spacing: 0.08em;
		color: rgba(255, 255, 255, 0.6);
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		vertical-align: middle;
	}

	/* ── Table rows ────────────────────────────────────────────────────── */
	.cc-row {
		transition: background 0.12s ease, opacity 0.2s ease;
	}

	.cc-row:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.cc-row--removing {
		opacity: 0.25;
		pointer-events: none;
	}

	/* ── Name cell ─────────────────────────────────────────────────────── */
	.cc-td-name {
		max-width: 200px;
	}

	/* ── Tier badge ────────────────────────────────────────────────────── */
	.cc-tier-badge {
		display: inline-block;
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.25em;
		text-transform: uppercase;
		padding: 2px 7px;
		border-radius: 3px;
		border: 1px solid;
	}

	/* ── Action buttons ────────────────────────────────────────────────── */
	.cc-btn-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: transparent;
		font-size: 12px;
		cursor: pointer;
		transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
		color: rgba(255, 255, 255, 0.35);
		text-decoration: none;
	}

	.cc-btn-primary--edit:hover {
		color: #14b8a6;
		border-color: rgba(20, 184, 166, 0.4);
		background: rgba(20, 184, 166, 0.08);
	}

	.cc-btn-primary--remove {
		color: rgba(255, 255, 255, 0.25);
	}

	.cc-btn-primary--remove:hover {
		color: #ff4444;
		border-color: rgba(255, 68, 68, 0.4);
		background: rgba(255, 68, 68, 0.08);
	}

	.cc-btn-primary--confirm {
		font-size: 7px;
		letter-spacing: 0.12em;
		width: auto;
		padding: 0 8px;
		color: #ff4444;
		border-color: rgba(255, 68, 68, 0.5);
		background: rgba(255, 68, 68, 0.1);
		animation: cc-text-pulse 0.8s ease-in-out infinite;
	}

	/* ── Mission console form ───────────────────────────────────────────── */
	.cc-form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.cc-label {
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.42em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.3);
	}

	.cc-select,
	.cc-input {
		width: 100%;
		background: rgba(10, 14, 20, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		padding: 8px 10px;
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.7);
		font-family: inherit;
		outline: none;
		cursor: pointer;
		transition: border-color 0.15s ease;
		appearance: none;
		/* Custom caret for select */
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath fill='rgba(255,255,255,0.25)' d='M0 0l4 5 4-5z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 10px center;
		padding-right: 28px;
	}

	.cc-input {
		background-image: none;
		padding-right: 10px;
		color-scheme: dark;
	}

	.cc-select:focus,
	.cc-input:focus {
		border-color: rgba(20, 184, 166, 0.4);
	}

	.cc-select option {
		background: #0a0e14;
		color: white;
		letter-spacing: 0;
		text-transform: none;
	}

	.cc-select--sm {
		font-size: 9px;
		padding: 6px 28px 6px 10px;
	}

	/* ── Target mode buttons ───────────────────────────────────────────── */
	.cc-mode-btn {
		flex: 1;
		padding: 5px 6px;
		font-family: inherit;
		font-size: 7px;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		background: transparent;
		color: rgba(255, 255, 255, 0.3);
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.cc-mode-btn:hover {
		border-color: rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.5);
	}

	.cc-mode-btn--active {
		color: #14b8a6;
		border-color: rgba(20, 184, 166, 0.45);
		background: rgba(20, 184, 166, 0.08);
	}

	/* ── Player checklist ──────────────────────────────────────────────── */
	.cc-player-checklist {
		max-height: 180px;
		overflow-y: auto;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.2);
	}

	.cc-check-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 7px 10px;
		cursor: pointer;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		transition: background 0.1s ease;
	}

	.cc-check-row:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.cc-check-row:last-child {
		border-bottom: none;
	}

	.cc-checkbox {
		width: 12px;
		height: 12px;
		accent-color: #14b8a6;
		cursor: pointer;
		flex-shrink: 0;
	}

	/* ── Deploy button ─────────────────────────────────────────────────── */
	.cc-deploy-btn {
		width: 100%;
		padding: 14px 20px;
		font-family: inherit;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.35em;
		text-transform: uppercase;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		background: transparent;
		color: rgba(255, 255, 255, 0.2);
		cursor: not-allowed;
		transition: all 0.18s ease;
	}

	.cc-deploy-btn--ready {
		color: #ff2a2a;
		border-color: #ff2a2a;
		background: transparent;
		cursor: pointer;
	}

	.cc-deploy-btn--ready:hover {
		background: rgba(255, 42, 42, 0.12);
		box-shadow:
			0 0 20px rgba(255, 42, 42, 0.18),
			inset 0 0 20px rgba(255, 42, 42, 0.04);
	}

	.cc-deploy-btn--deploying {
		color: rgba(255, 42, 42, 0.6);
		border-color: rgba(255, 42, 42, 0.4);
		cursor: not-allowed;
		animation: cc-text-pulse 1s ease-in-out infinite;
	}

	.cc-deploy-btn--success {
		color: #2dd4bf;
		border-color: rgba(45, 212, 191, 0.5);
		background: rgba(45, 212, 191, 0.06);
		box-shadow: 0 0 20px rgba(45, 212, 191, 0.1);
		cursor: default;
	}

	.cc-deploy-btn--error {
		color: #ff4444;
		border-color: rgba(255, 68, 68, 0.4);
		background: rgba(255, 68, 68, 0.05);
		cursor: default;
	}

	/* ── Reduced motion ─────────────────────────────────────────────────── */
	@media (prefers-reduced-motion: reduce) {
		.cc-live-dot,
		.cc-pulse,
		.cc-btn-primary--confirm,
		.cc-deploy-btn--deploying {
			animation: none;
		}
	}
</style>
