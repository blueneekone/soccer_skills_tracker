<script>
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { db, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import {
		addDoc,
		collection,
		doc,
		getDoc,
		getDocs,
		onSnapshot,
		query,
		where,
		orderBy,
		updateDoc,
		serverTimestamp,
	} from 'firebase/firestore';
	import Swal from 'sweetalert2';
	import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
	import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import LiveTelemetrySection from '$lib/components/coach/LiveTelemetrySection.svelte';
	import IntelModal from '$lib/components/ui/IntelModal.svelte';

	const DISPATCH_INTEL = {
		title: 'DISPATCH PROTOCOL',
		instructions: [
			'1. Generate your 6-character code.',
			'2. Text this code to your team parents.',
			'3. Parents create an account, sign the COPPA waiver, and enter this code to instantly drop their player onto your roster.',
		],
	};

	let { teamId = '', teams = [] } = $props();

	const secureAddPlayer = httpsCallable(functions, 'secureAddPlayer');
	const secureRemovePlayer = httpsCallable(functions, 'secureRemovePlayer');
	const secureUpdateJersey = httpsCallable(functions, 'secureUpdateJersey');
	const verifyVideoTrial = httpsCallable(functions, 'verifyVideoTrial');

	const currentTeam = $derived(teams.find((t) => t.id === teamId));

	/** Roster + stats */
	/** @type {Record<string, Record<string, unknown>>} */
	let playerStats = $state({});
	/** @type {string[]} */
	let players = $state([]);
	/** @type {Record<string, string>} */
	let jerseys = $state({});
	/** @type {Record<string, string>} */
	let nameToEmail = $state(/** @type {Record<string, string>} */ ({}));
	let linkedPlayers = $state(/** @type {Set<string>} */ (new Set()));
	let loading = $state(false);
	let addSaving = $state(false);
	let removeBusy = $state(false);
	/** Roster load generation — avoid stale `loading` / state when `teamId` changes mid-flight. */
	let rosterLoadGen = 0;
	/** Trial/eval async generation — drop stale results when `teamId` changes. */
	let signalsLoadGen = 0;

	/** @type {string | null} */
	let removingName = $state(null);
	/** @type {{ type: 'error' | 'success' | 'info'; text: string } | null} */
	let feedback = $state(null);
	/** Strike 26: team invite for parent-driven roster dispatch */
	let teamInviteCode = $state('');
	let inviteBusy = $state(false);
	let addName = $state('');
	let addEmail = $state('');
	let addJersey = $state('');

	/** @type {Array<Record<string, unknown> & { id: string }>} */
	let vpcItems = $state([]);
	let vpcLoading = $state(true);
	let vpcErr = $state('');
	let busyVpcId = $state('');

	/** @type {Array<Record<string, unknown> & { id: string }>} */
	let trialRows = $state([]);
	/** @type {Array<Record<string, unknown> & { id: string }>} */
	let evalRows = $state([]);

	/**
	 * Link column: linked + valid users doc; unlinked roster names stay unverified.
	 * @type {Record<string, 'compliant' | 'unverified'>}
	 */
	let complianceByPlayer = $state({});

	/**
	 * @param {Record<string, string>} em
	 * @param {string} name
	 */
	function linkedDocIdForPlayerName(em, name) {
		if (em[name] != null) return em[name];
		if (typeof name === 'string') {
			const t = name.trim();
			if (t !== name && em[t] != null) return em[t];
		}
		return undefined;
	}

	/** `users/*` keys are lowercased emails; other ids pass through. */
	function usersCollectionKey(id) {
		const s = String(id).trim();
		if (!s) return s;
		return s.includes('@') ? s.toLowerCase() : s;
	}

	/**
	 * @param {unknown} e
	 * @returns {boolean}
	 */
	function isFirestorePermissionError(e) {
		if (!e || typeof e !== 'object') return false;
		const o = /** @type {Record<string, unknown>} */ (e);
		if (String(o.code || '') === 'permission-denied') return true;
		const msg = String(o.message || '');
		return /insufficient|missing or insufficient permissions/i.test(msg);
	}

	/**
	 * Minimal `DocumentSnapshot`-shaped object so roster iteration keeps working.
	 * @param {string} emailKey
	 */
	function restrictedUserSnapshotPlaceholder(emailKey) {
		return {
			exists: () => true,
			id: emailKey,
			/** @returns {Record<string, unknown>} */
			data: () => ({
				email: emailKey,
				playerName: 'Restricted Operative',
				isRestricted: true,
				role: 'parent',
			}),
		};
	}

	/**
	 * @param {string} key
	 * @returns {Promise<import('firebase/firestore').DocumentSnapshot | ReturnType<typeof restrictedUserSnapshotPlaceholder>>}
	 */
	async function getUserDocOrRestrictedPlaceholder(key) {
		try {
			return await getDoc(doc(db, 'users', key));
		} catch (e) {
			if (isFirestorePermissionError(e)) {
				console.warn(
					`[SquadTelemetry] users/${key}: missing or insufficient permissions (restricted placeholder)`,
				);
			} else {
				console.error(`[SquadTelemetry] users/${key}`, e);
			}
			return restrictedUserSnapshotPlaceholder(key);
		}
	}

	/**
	 * @param {string} [overrideTeamId] When passed from the `$effect` untrack run, use this id for the whole load (avoids racing reactive `teamId`).
	 */
	const loadRoster = async (overrideTeamId) => {
		const tid = typeof overrideTeamId === 'string' && overrideTeamId ? overrideTeamId : teamId;
		if (!tid) {
			loading = false;
			return;
		}
		const myGen = ++rosterLoadGen;
		loading = true;
		try {
			// Concurrency: never fail the whole load on a single rejected request; user fetches use allSettled below.
			const settled = await Promise.allSettled([
				getDocs(query(collection(db, 'player_stats'), where('teamId', '==', tid))),
				getDoc(doc(db, 'rosters', tid)),
				getDocs(query(collection(db, 'player_lookup'), where('teamId', '==', tid))),
				getDoc(doc(db, 'teams', tid)),
			]);

			/** @type {import('firebase/firestore').QuerySnapshot | null} */
			let statsSnap = null;
			if (settled[0].status === 'fulfilled') {
				statsSnap = settled[0].value;
			} else {
				console.error('[SquadTelemetry] player_stats', settled[0].reason);
			}

			/** @type {import('firebase/firestore').DocumentSnapshot | null} */
			let rosterSnap = null;
			if (settled[1].status === 'fulfilled') {
				rosterSnap = settled[1].value;
			} else {
				console.error('[SquadTelemetry] rosters', settled[1].reason);
			}

			/** @type {import('firebase/firestore').QuerySnapshot | null} */
			let linkSnap = null;
			if (settled[2].status === 'fulfilled') {
				linkSnap = settled[2].value;
			} else {
				console.error('[SquadTelemetry] player_lookup', settled[2].reason);
			}

			/** @type {import('firebase/firestore').DocumentSnapshot | null} */
			let teamSnap = null;
			if (settled[3].status === 'fulfilled') {
				teamSnap = settled[3].value;
			} else {
				console.error('[SquadTelemetry] teams', settled[3].reason);
			}

			if (teamSnap?.exists()) {
				const ic = teamSnap.data()?.inviteCode;
				teamInviteCode = typeof ic === 'string' && ic.trim() ? ic.trim() : '';
			} else {
				teamInviteCode = '';
			}

			playerStats = {};
			if (statsSnap) {
				statsSnap.forEach((d) => {
					playerStats[d.id] = d.data();
				});
			}

			const rosterNames = Array.isArray(rosterSnap?.data()?.players) ? rosterSnap.data().players : [];
			jerseys =
				rosterSnap?.exists() && typeof rosterSnap.data()?.jerseys === 'object' && rosterSnap.data().jerseys
					? /** @type {Record<string, string>} */ (rosterSnap.data().jerseys)
					: {};

			linkedPlayers = new Set();
			const em = /** @type {Record<string, string>} */ ({});
			if (linkSnap) {
				linkSnap.forEach((d) => {
					const data = d.data();
					if (typeof data.playerName === 'string' && data.playerName.trim()) {
						linkedPlayers.add(data.playerName);
						em[data.playerName.trim()] = d.id;
					}
				});
			}
			nameToEmail = em;

			const combined = new Set([...rosterNames, ...Object.keys(playerStats), ...Object.keys(em)]);

			/** @type {string[]} */
			const userDocKeys = [
				...new Set(
					Object.values(em)
						.map((x) => (typeof x === 'string' ? usersCollectionKey(x) : ''))
						.filter(Boolean),
				),
			];

			const userSnaps =
				userDocKeys.length === 0 ?
					[]
				:	await Promise.all(userDocKeys.map((key) => getUserDocOrRestrictedPlaceholder(key)));

			/** @type {Record<string, import('firebase/firestore').DocumentSnapshot | ReturnType<typeof restrictedUserSnapshotPlaceholder>>} */
			const userSnapByEmail = {};
			for (let i = 0; i < userDocKeys.length; i++) {
				const key = userDocKeys[i];
				const sn = userSnaps[i];
				if (sn && sn.exists()) {
					userSnapByEmail[key] = sn;
				}
			}

			/** @type {string[]} */
			const nextPlayers = [];
			for (const rawName of combined) {
				const name = typeof rawName === 'string' ? rawName : String(rawName);
				nextPlayers.push(name);
			}
			nextPlayers.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
			players = nextPlayers;

			/** @type {Record<string, 'compliant' | 'unverified'>} */
			const nextCompliance = {};
			for (const name of nextPlayers) {
				const linkId = linkedDocIdForPlayerName(em, name);
				nextCompliance[name] = linkId != null ? 'compliant' : 'unverified';
			}
			complianceByPlayer = nextCompliance;
		} catch (e) {
			console.error('[SquadTelemetry] roster', e);
			teamInviteCode = '';
			feedback = { type: 'error', text: 'Roster load failed.' };
		} finally {
			if (myGen === rosterLoadGen) {
				loading = false;
			}
		}
	};

	function genDispatchInvite() {
		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
		let s = '';
		for (let i = 0; i < 6; i++) {
			s += chars[Math.floor(Math.random() * chars.length)];
		}
		return `${s.slice(0, 2)}-${s.slice(2)}`;
	}

	async function generateTeamDispatchCode() {
		if (!teamId || inviteBusy) return;
		inviteBusy = true;
		feedback = null;
		try {
			const code = genDispatchInvite();
			await updateDoc(doc(db, 'teams', teamId), {
				inviteCode: code,
				updatedAt: serverTimestamp(),
			});
			teamInviteCode = code;
			feedback = { type: 'success', text: 'Team dispatch code issued.' };
		} catch (e) {
			console.error(e);
			feedback = { type: 'error', text: 'Could not save dispatch code.' };
		} finally {
			inviteBusy = false;
		}
	}

	$effect(() => {
		const currentTeamId = teamId;
		untrack(() => {
			if (!currentTeamId) {
				loading = false;
				players = [];
				playerStats = {};
				complianceByPlayer = {};
				return;
			}
			void loadRoster(currentTeamId);
		});
	});

	$effect(() => {
		const currentTeamId = teamId;
		/** @type {(() => void) | undefined} */
		let unsub;
		untrack(() => {
			if (!browser || !currentTeamId) {
				vpcItems = [];
				vpcLoading = false;
				return;
			}
			vpcLoading = true;
			const q = query(
				collection(db, 'trial_scores'),
				where('teamId', '==', currentTeamId),
				where('status', '==', 'pending_verification'),
				orderBy('submittedAt', 'desc'),
			);
			unsub = onSnapshot(
				q,
				(s) => {
					vpcItems = [];
					s.forEach((d) => vpcItems.push({ id: d.id, ...d.data() }));
					vpcLoading = false;
				},
				() => {
					vpcErr = 'VPC queue could not be subscribed.';
					vpcLoading = false;
				},
			);
		});
		return () => {
			if (unsub) unsub();
		};
	});

	$effect(() => {
		const currentTeamId = teamId;
		untrack(() => {
			const gen = ++signalsLoadGen;
			if (!currentTeamId) {
				trialRows = [];
				evalRows = [];
				return;
			}
			void (async () => {
				/** @type {typeof trialRows} */
				let nextTrials = [];
				/** @type {typeof evalRows} */
				let nextEvals = [];
				try {
					const tSnap = await getDocs(
						query(collection(db, 'trials'), where('teamId', '==', currentTeamId)),
					);
					const tr = [];
					tSnap.forEach((d) => tr.push({ id: d.id, ...d.data() }));
					tr.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
					nextTrials = tr.slice(0, 8);
				} catch (e) {
					console.error(e);
				}
				try {
					const eSnap = await getDocs(
						query(collection(db, 'evaluations'), where('teamId', '==', currentTeamId)),
					);
					const er = [];
					eSnap.forEach((d) => er.push({ id: d.id, ...d.data() }));
					er.sort((a, b) => {
						const ta = a.timestamp?.seconds || 0;
						const tb = b.timestamp?.seconds || 0;
						return tb - ta;
					});
					nextEvals = er.slice(0, 6);
				} catch (e) {
					console.error(e);
				}
				if (gen !== signalsLoadGen) return;
				trialRows = nextTrials;
				evalRows = nextEvals;
			})();
		});
	});

	function showSeatHardLockModal() {
		Swal.fire({
			title: 'Roster seats at capacity',
			html: '<p>Contact your <strong>Director</strong> to add licensed seats.</p>',
			icon: 'warning',
			confirmButtonText: 'OK',
		});
	}

	function mapCallableErrorToMessage(code, message) {
		if (code === 'functions/resource-exhausted' || code === 'resource-exhausted') {
			return 'SEAT_CAP';
		}
		if (code === 'functions/failed-precondition' || code === 'failed-precondition') {
			return message || 'Precondition failed.';
		}
		return message || 'Request failed.';
	}

	/**
	 * @param {Record<string, Record<string, unknown>>} ps
	 * @param {string} name
	 */
	function resolveStatsId(name, ps) {
		if (ps[name]) return name;
		const id = Object.keys(ps).find((k) => (ps[k]?.playerName) === name);
		return id || name;
	}

	function addPlayer() {
		feedback = null;
		const rawName = addName.trim();
		if (!rawName) {
			feedback = { type: 'error', text: 'Name required.' };
			return;
		}
		if (!teamId) return;
		const normalized = rawName.replace(/\s+/g, ' ');
		const emailTrim = addEmail.trim().toLowerCase();
		const jerseyStr =
			addJersey !== '' && addJersey != null && String(addJersey).trim() !== ''
				? String(addJersey).trim().slice(0, 16)
				: '';
		void (async () => {
			addSaving = true;
			try {
				const res = await secureAddPlayer({
					teamId,
					playerName: normalized,
					...(emailTrim ? { playerEmail: emailTrim } : {}),
					...(jerseyStr ? { jersey: jerseyStr } : {}),
				});
				const data = res.data;
				if (data?.duplicate) {
					feedback = { type: 'info', text: 'Already on roster.' };
					return;
				}
				await loadRoster();
				addName = '';
				addEmail = '';
				addJersey = '';
				feedback = { type: 'success', text: 'Athlete ingested.' };
			} catch (err) {
				const code = /** @type {{ code?: string }} */ (err).code || '';
				const msg = /** @type {{ message?: string }} */ (err).message || '';
				const m = mapCallableErrorToMessage(code, msg);
				if (m === 'SEAT_CAP') {
					showSeatHardLockModal();
					return;
				}
				feedback = { type: 'error', text: m };
			} finally {
				addSaving = false;
			}
		})();
	}

	function removePlayer(name) {
		if (!confirm(`Remove ${name}?`)) return;
		void (async () => {
			removeBusy = true;
			removingName = name;
			try {
				await secureRemovePlayer({ teamId, playerName: name.trim() });
				await loadRoster();
				feedback = { type: 'success', text: 'Removed.' };
			} catch (e) {
				feedback = { type: 'error', text: 'Remove failed.' };
			} finally {
				removeBusy = false;
				removingName = null;
			}
		})();
	}

	/**
	 * @param {string} name Roster display name
	 */
	async function editPlayerProfile(name) {
		if (!teamId || !name) return;
		const curJersey =
			jerseys[name] != null && String(jerseys[name]).trim() ?
				String(jerseys[name]).trim()
			:	'';
		const normalizedName = name.replace(/\s+/g, ' ');
		const result = await Swal.fire({
			title: 'Update jersey number',
			input: 'text',
			inputLabel: 'Jersey number',
			inputValue: curJersey,
			showCancelButton: true,
			confirmButtonText: 'Save',
			cancelButtonText: 'Cancel',
			background: '#05050a',
			color: '#fafafa',
			inputValidator: (v) =>
				v != null && String(v).length > 16 ? 'Use at most 16 characters.' : undefined,
		});
		if (!result.isConfirmed) return;
		enterprisePlayerDrawer.close();
		try {
			await secureUpdateJersey({
				teamId,
				playerName: normalizedName,
				jersey: String(result.value ?? '').trim(),
			});
			await loadRoster();
			feedback = { type: 'success', text: 'Jersey updated.' };
		} catch (err) {
			const code = /** @type {{ code?: string }} */ (err).code || '';
			const msg = /** @type {{ message?: string }} */ (err).message || '';
			feedback = { type: 'error', text: mapCallableErrorToMessage(code, msg) };
		}
	}

	/**
	 * @param {string} name Roster display name
	 */
	async function initiateDropRequest(name) {
		enterprisePlayerDrawer.close();
		const result = await Swal.fire({
			title: 'Official Drop Request',
			html:
				'<p style="text-align:left;color:rgba(250,250,250,0.88);margin:0 0 14px;font-size:0.9rem;">Dropping a player requires Director approval. Provide your required drop note below.</p>',
			input: 'textarea',
			showCancelButton: true,
			confirmButtonText: 'Submit request',
			background: '#05050a',
			color: '#fafafa',
			inputValidator: (value) => {
				if (!value || String(value).trim().length < 10) {
					return 'Enter at least 10 characters.';
				}
				return undefined;
			},
		});
		if (!result.isConfirmed || result.value == null) return;
		const reason = String(result.value).trim();
		try {
			await addDoc(collection(db, 'roster_drop_requests'), {
				teamId,
				playerName: name,
				reason,
				status: 'pending',
				requestedAt: serverTimestamp(),
			});
			await Swal.fire({
				icon: 'success',
				title: 'Drop request sent to Director.',
				background: '#05050a',
				color: '#fafafa',
			});
		} catch {
			feedback = { type: 'error', text: 'Could not submit drop request.' };
		}
	}

	function openDrawer(p) {
		const statsId = resolveStatsId(p, playerStats);
		const em = nameToEmail[p] || null;
		enterprisePlayerDrawer.open(
			{
				id: `${teamId}_${p}`,
				displayName: p,
				teamId,
				teamLabel: currentTeam?.name || teamId,
				statsDocId: statsId,
				playerEmail: em,
				jersey:
					jerseys[p] != null && String(jerseys[p]).trim() ? String(jerseys[p]) : null,
				ageGroup: null,
				position: null,
				status: 'active',
				lastActiveLabel: '—',
				source: 'coach',
			},
			{
				editProfile: () => void editPlayerProfile(p),
				removeFromRoster: () => void initiateDropRequest(p),
			},
		);
	}

	/**
	 * @param {string} id
	 * @param {'approve' | 'reject'} d
	 */
	function vpcAct(id, d) {
		if (!id || busyVpcId) return;
		void (async () => {
			busyVpcId = id;
			try {
				await verifyVideoTrial({ scoreId: id, decision: d });
			} catch (e) {
				console.error(e);
			} finally {
				busyVpcId = '';
			}
		})();
	}

	/**
	 * @param {unknown} t
	 */
	function fmtTime(t) {
		try {
			if (t && typeof t === 'object' && 'toDate' in t && typeof t.toDate === 'function') {
				return t.toDate().toLocaleString();
			}
		} catch {
			/* */
		}
		return '—';
	}

	const signalCount = $derived(vpcItems.length + trialRows.length);
</script>

<div class="stw" data-region="squad-telemetry">
	<header class="stw__hud">
		<div>
			<p class="stw__eyebrow">Project Phoenix · Pillar 1</p>
			<h1 class="stw__title">Squad telemetry</h1>
			<p class="stw__meta">Team scoping · {currentTeam?.name || teamId || '—'}</p>
		</div>
		<div class="stw__stats">
			<div class="stw__pill">
				<span class="stw__eyebrow">Roster</span>
				<span class="stw__mono stw__cyber">{players.length}</span>
			</div>
			<div class="stw__pill" class:stw__pill--alert={vpcItems.length > 0}>
				<span class="stw__eyebrow">VPC pending</span>
				<span class="stw__mono stw__orange">{vpcItems.length}</span>
			</div>
			<div class="stw__pill">
				<span class="stw__eyebrow">Field signals</span>
				<span class="stw__mono stw__green">{signalCount}</span>
			</div>
		</div>
	</header>

	<LiveTelemetrySection
		teamId={teamId}
		players={players}
		getStatsId={(p) => resolveStatsId(p, playerStats)}
		onCommitted={loadRoster}
	/>

	<section
		class="stw__dispatch tw-mb-4 tw-rounded-lg tw-border tw-border-cyan-500/35 tw-bg-black/50 tw-px-3 tw-py-3 sm:tw-px-4"
		aria-labelledby="stw-dispatch"
	>
		<div class="tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
			<div class="tw-min-w-0">
				<p id="stw-dispatch" class="stw__eyebrow tw-mb-1 tw-text-cyan-400/90">Strike 26 · Team dispatch</p>
				<p class="stw__meta tw-m-0 tw-text-xs tw-text-white/60">
					Parents enter this code when provisioning an operative to link the account to this squad.
				</p>
			</div>
			<div
				class="tw-flex tw-flex-col tw-items-stretch tw-gap-2 sm:tw-min-w-[14rem] sm:tw-items-end"
			>
				<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-end tw-gap-2">
					<IntelModal
						title={DISPATCH_INTEL.title}
						instructions={DISPATCH_INTEL.instructions}
					/>
					{#if teamInviteCode}
						<div
							class="stw__mono tw-flex tw-min-h-[2.75rem] tw-select-all tw-items-center tw-justify-center tw-rounded tw-border tw-border-cyan-500/40 tw-bg-[#05050a] tw-px-3 tw-py-2 tw-text-base tw-font-bold tw-tracking-widest tw-text-cyan-300"
							title="Team invite code"
						>
							{teamInviteCode}
						</div>
					{:else}
						<button
							type="button"
							class="tw-min-h-[2.75rem] tw-rounded tw-border tw-border-cyan-500/50 tw-bg-cyan-950/30 tw-px-4 tw-font-mono tw-text-[0.65rem] tw-font-extrabold tw-uppercase tw-tracking-[0.2em] tw-text-cyan-300 tw-shadow-[0_0_18px_rgba(34,211,238,0.12)] tw-transition hover:tw-border-cyan-400/70 hover:tw-bg-cyan-900/25 disabled:tw-opacity-50"
							disabled={!teamId || inviteBusy}
							onclick={generateTeamDispatchCode}
						>
							{inviteBusy ? 'Issuing…' : 'Generate dispatch code'}
						</button>
					{/if}
				</div>
			</div>
		</div>
	</section>

	{#if feedback}
		<p
			class="stw__feedback"
			class:stw__feedback--err={feedback.type === 'error'}
			class:stw__feedback--ok={feedback.type === 'success'}
		>
			{feedback.text}
		</p>
	{/if}

	<div class="stw__grid">
		<section class="stw__panel" aria-labelledby="stw-roster">
			<div class="stw__panelhead">
				<h2 id="stw-roster" class="stw__h2">Roster &amp; XP</h2>
			</div>
			<div class="stw__add">
				<input class="stw__inp" type="text" placeholder="Name" bind:value={addName} />
				<input class="stw__inp" type="email" placeholder="Email (opt)" bind:value={addEmail} />
				<input class="stw__inp stw__inp--sm" type="text" placeholder="#" bind:value={addJersey} />
				<button type="button" class="stw__btn" disabled={addSaving} onclick={addPlayer}>Ingest</button>
			</div>
			<div class="stw__tablewrap">
				<table class="stw__table" aria-label="Roster and levels">
					<thead>
						<tr>
							<th scope="col">Athlete</th>
							<th scope="col">Lvl</th>
							<th scope="col">XP</th>
							<th scope="col">#</th>
							<th scope="col">Link</th>
						</tr>
					</thead>
					<tbody>
						{#if loading}
							<tr><td colspan="5" class="stw__muted">Loading roster…</td></tr>
						{:else if players.length === 0}
							<tr><td colspan="5" class="stw__muted">No athletes on file.</td></tr>
						{:else}
							{#each players as p (p)}
								{@const sid = resolveStatsId(p, playerStats)}
								{@const rowLabel =
									typeof playerStats[sid]?.playerName === 'string'
										? String(playerStats[sid].playerName)
										: p}
								{@const copa = complianceByPlayer[p] ?? 'unverified'}
								<tr
									class="stw__row"
									role="button"
									tabindex="0"
									onclick={() => openDrawer(p)}
									onkeydown={(e) => e.key === 'Enter' && openDrawer(p)}
								>
									<td class="stw__mono">{rowLabel}</td>
									<td class="stw__mono stw__cyber">
										{getLevelProgressFromTotalXp(
											Math.max(
												0,
												typeof playerStats[sid]?.total_xp === 'number'
													? /** @type {number} */ (playerStats[sid].total_xp)
													: 0,
											),
										).level}
									</td>
									<td class="stw__mono">
										{Math.max(
											0,
											Math.floor(
												Number(
													playerStats[sid]?.total_xp,
												) || 0,
											),
										).toLocaleString()}
									</td>
									<td class="stw__mono">
										{jerseys[p] != null && String(jerseys[p]).trim() ? jerseys[p] : '—'}
									</td>
									<td
										class="stw__mono"
										class:stw__green={copa === 'compliant' && (linkedPlayers.has(rowLabel) || linkedPlayers.has(p))}
									>
										{#if linkedPlayers.has(rowLabel) || linkedPlayers.has(p)}
											LIVE
										{:else}
											—
										{/if}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</section>

		<section class="stw__panel" aria-labelledby="stw-signals">
			<div class="stw__panelhead">
				<h2 id="stw-signals" class="stw__h2">Open signals</h2>
			</div>

			<div class="stw__subhead">VPC (video compliance)</div>
			{#if vpcLoading}
				<p class="stw__muted">Subscribing to queue…</p>
			{:else if vpcErr}
				<p class="stw__err">{vpcErr}</p>
			{:else if vpcItems.length === 0}
				<p class="stw__muted">No pending verifications.</p>
			{:else}
				<ul class="stw__list">
					{#each vpcItems as v (v.id)}
						<li class="stw__li">
							<div class="stw__lirow">
								<span class="stw__mono">{String(v.playerName ?? 'Player')}</span>
								<span class="stw__muted2">{fmtTime(v.submittedAt)}</span>
							</div>
							<div class="stw__liact">
								<button
									type="button"
									class="stw__mini stw__mini--ok"
									disabled={busyVpcId === v.id}
									onclick={() => vpcAct(/** @type {string} */(v.id), 'approve')}
								>OK</button>
								<button
									type="button"
									class="stw__mini stw__mini--no"
									disabled={busyVpcId === v.id}
									onclick={() => vpcAct(/** @type {string} */(v.id), 'reject')}
								>NO</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="stw__subhead">Field trials (recent)</div>
			{#if trialRows.length === 0}
				<p class="stw__muted">No recent trials.</p>
			{:else}
				<ul class="stw__list stw__list--dense">
					{#each trialRows as t (t.id)}
						<li class="stw__mono stw__tiny">
							{String(t.player ?? '—')} · {String(t.type ?? t.skill ?? 'trial')}
						</li>
					{/each}
				</ul>
			{/if}

			<div class="stw__subhead">Evaluations (latest)</div>
			{#if evalRows.length === 0}
				<p class="stw__muted">No evaluation rows.</p>
			{:else}
				<ul class="stw__list stw__list--dense">
					{#each evalRows as e (e.id)}
						<li class="stw__mono stw__tiny">
							{String(e.player ?? '—')} · {String(e.skill ?? '—')} · {String(e.score ?? '—')}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>

<style>
	.stw {
		--st-bg: #000;
		--st-panel: #05050a;
		--st-line: rgba(255, 255, 255, 0.1);
		--st-c: #00d4ff;
		--st-g: #39ff14;
		--st-o: #ff6b00;
		background: var(--st-bg);
		color: #fafafa;
		min-width: 0;
	}

	.stw__hud {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.25rem 0 1.25rem;
		border-bottom: 1px solid var(--st-line);
	}

	.stw__eyebrow {
		margin: 0 0 0.25rem;
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.45);
	}

	.stw__title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.stw__meta {
		margin: 0.4rem 0 0;
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.45);
	}

	.stw__stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: stretch;
	}

	.stw__pill {
		min-width: 6.5rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--st-line);
		background: var(--st-panel);
	}

	.stw__pill--alert {
		border-color: rgba(255, 107, 0, 0.45);
		box-shadow: 0 0 14px rgba(255, 107, 0, 0.12);
	}

	.stw__mono {
		font-family: ui-monospace, Menlo, Consolas, monospace;
	}

	.stw__cyber {
		color: var(--st-c);
	}
	.stw__orange {
		color: var(--st-o);
	}
	.stw__green {
		color: var(--st-g);
	}

	.stw__grid {
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
		margin-top: 1rem;
	}

	@media (max-width: 960px) {
		.stw__grid {
			grid-template-columns: 1fr;
		}
	}

	.stw__panel {
		border: 1px solid var(--st-line);
		background: var(--st-panel);
		padding: 1rem;
		min-width: 0;
	}

	.stw__h2 {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.stw__add {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 0.75rem 0;
	}

	.stw__inp {
		flex: 1 1 120px;
		min-width: 0;
		background: #000;
		border: 1px solid var(--st-line);
		color: #fff;
		padding: 0.4rem 0.5rem;
		font-size: 0.75rem;
	}

	.stw__inp--sm {
		max-width: 3.5rem;
	}

	.stw__btn {
		padding: 0.4rem 0.75rem;
		font-size: 0.65rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		background: #000;
		border: 1px solid rgba(0, 212, 255, 0.45);
		color: #fff;
		cursor: pointer;
	}

	.stw__tablewrap {
		overflow: auto;
		max-height: min(60vh, 480px);
		border: 1px solid var(--st-line);
	}

	.stw__table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.72rem;
	}

	.stw__table th,
	.stw__table td {
		padding: 0.4rem 0.5rem;
		border-bottom: 1px solid var(--st-line);
		text-align: left;
	}

	.stw__table th {
		font-size: 0.55rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.45);
	}

	.stw__row {
		cursor: pointer;
	}
	.stw__row:hover {
		background: rgba(0, 212, 255, 0.05);
	}

	.stw__muted {
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.8rem;
	}
	.stw__muted2 {
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.35);
	}

	.stw__feedback {
		margin: 0.5rem 0 0;
		font-size: 0.75rem;
	}
	.stw__feedback--err {
		color: #fca5a5;
	}
	.stw__feedback--ok {
		color: #86efac;
	}

	.stw__subhead {
		margin: 0.9rem 0 0.4rem;
		font-size: 0.55rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(0, 212, 255, 0.7);
	}

	.stw__list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.stw__li {
		padding: 0.4rem 0;
		border-bottom: 1px solid var(--st-line);
	}
	.stw__lirow {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.stw__liact {
		display: flex;
		gap: 0.35rem;
		margin-top: 0.35rem;
	}
	.stw__mini {
		font-size: 0.6rem;
		font-weight: 800;
		padding: 0.2rem 0.45rem;
		border: 1px solid var(--st-line);
		background: #000;
		color: #fff;
		cursor: pointer;
	}
	.stw__mini--ok {
		border-color: rgba(57, 255, 20, 0.4);
	}
	.stw__mini--no {
		border-color: rgba(255, 107, 0, 0.4);
	}

	.stw__list--dense .stw__tiny {
		padding: 0.2rem 0;
	}
	.stw__tiny {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.stw__err {
		color: #fca5a5;
		font-size: 0.75rem;
	}
</style>
