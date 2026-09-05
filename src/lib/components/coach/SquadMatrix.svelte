<script lang="ts">
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import HudSeededRingCanvas from '$lib/components/hud/HudSeededRingCanvas.svelte';
	import '$lib/styles/hud-telemetry.css';
	import { db, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import {
		addDoc,
		collection,
		doc,
		getDoc,
		getDocs,
		limit,
		onSnapshot,
		query,
		where,
		orderBy,
		updateDoc,
		serverTimestamp,
	} from 'firebase/firestore';
	import Swal from 'sweetalert2';
	import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
	import LiveTelemetrySection from '$lib/components/coach/LiveTelemetrySection.svelte';
	import IntelModal from '$lib/components/ui/IntelModal.svelte';
	import AthleteQuickStatsModal from './AthleteQuickStatsModal.svelte';
	import { buildCoachRosterDisplayNames } from '$lib/coach/rosterDisplayDedupe.js';

	const DISPATCH_INTEL = {
		title: 'DISPATCH PROTOCOL',
		instructions: [
			'1. Generate your 6-character code.',
			'2. Text this code to your team parents.',
			'3. Parents create an account, sign the COPPA waiver, and enter this code to instantly drop their player onto your roster.',
		],
	};

	let { teamId = '', teams = [], showLiveTelemetry = true, selectedPlayerId = 'ALL', onSelectPlayer = undefined } = $props();

	/** Isolates one bench-side logging session (new UUID when `teamId` changes). */
	let activeMatchId = $state('');
	let matchSessionTeamId = $state('');
	let quickModalPlayer = $state<any | null>(null);

	/** Real-time rows from `teams/{teamId}/telemetry_events` (Firestore snapshot stream). */
	/** @type {Array<Record<string, unknown> & { id: string }>} */
	let liveEvents = $state([]);
	let liveEventsError = $state('');

	$effect(() => {
		if (!browser) return;
		const tid = teamId;
		if (!tid) {
			activeMatchId = '';
			matchSessionTeamId = '';
			return;
		}
		if (tid !== matchSessionTeamId) {
			matchSessionTeamId = tid;
			activeMatchId =
				typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ?
					crypto.randomUUID()
				:	`m_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
		}
	});

	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated) return;
		const tid = teamId;
		const mid = activeMatchId;
		/** @type {undefined | (() => void)} */
		let unsub;
		untrack(() => {
			if (!browser || !tid || !mid) {
				liveEvents = [];
				liveEventsError = '';
				return;
			}
			liveEventsError = '';
			const q = query(
				collection(db, 'teams', tid, 'telemetry_events'),
				where('matchId', '==', mid),
				orderBy('timestamp', 'desc'),
				limit(100),
			);
			unsub = onSnapshot(
				q,
				(snap) => {
					liveEvents = [];
					snap.forEach((d) => { liveEvents = [...liveEvents, { id: d.id, ...d.data() }]; });
				},
				(e) => {
					console.error('[SquadTelemetry] telemetry_events', e);
					liveEventsError =
						'Live feed unavailable — deploy Firestore index for telemetry_events (matchId + timestamp).';
				},
			);
		});
		return () => {
			if (unsub) unsub();
		};
	});

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
    if (!db || !authStore.isAuthenticated) return;
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
	const loadRoster = async (overrideTeamId?: string) => {
		if (!db || !authStore.isAuthenticated) return;
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
				getDocs(query(collection(db, 'users'), where('teamId', '==', tid))),
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

			/** @type {import('firebase/firestore').QuerySnapshot | null} */
			let usersSnap = null;
			if (settled[4].status === 'fulfilled') {
				usersSnap = settled[4].value;
			} else {
				console.error('[SquadTelemetry] users', settled[4].reason);
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

			const userDocs = usersSnap ?
				usersSnap.docs.map((d) => ({ id: d.id, data: d.data() }))
			:	[];

			const nextPlayers = buildCoachRosterDisplayNames({
				userDocs,
				rosterNames,
				statsKeys: Object.keys(playerStats),
				statsByKey: playerStats,
				linkedNameToEmail: em,
			});
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
		if (authStore.isLoading || !authStore.isAuthenticated) return;
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
		if (authStore.isLoading || !authStore.isAuthenticated) return;
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
					s.forEach((d) => { vpcItems = [...vpcItems, { id: d.id, ...d.data() }]; });
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
		if (authStore.isLoading || !authStore.isAuthenticated) return;
		const currentTeamId = teamId;
		untrack(() => {
			const gen = ++signalsLoadGen;
			if (!currentTeamId) {
				trialRows = [];
				evalRows = [];
				return;
			}
			void (async () => {
				if (!db || !authStore.isAuthenticated) return;
				/** @type {typeof trialRows} */
				let nextTrials = [];
				/** @type {typeof evalRows} */
				let nextEvals = [];
				try {
					const tSnap = await getDocs(
						query(collection(db, 'trials'), where('teamId', '==', currentTeamId)),
					);
					let tr: any[] = [];
					tSnap.forEach((d) => { tr = [...tr, { id: d.id, ...d.data() }]; });
					tr.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
					nextTrials = tr.slice(0, 8);
				} catch (e) {
					console.error(e);
				}
				try {
					const eSnap = await getDocs(
						query(collection(db, 'evaluations'), where('teamId', '==', currentTeamId)),
					);
					let er: any[] = [];
					eSnap.forEach((d) => { er = [...er, { id: d.id, ...d.data() }]; });
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

	/**
	 * @param {unknown} pid
	 */
	function rosterLabelForTelemetry(pid) {
		const sid = String(pid ?? '').trim();
		if (!sid) return '—';
		for (const name of players) {
			if (resolveStatsId(name, playerStats) === sid) return name;
		}
		return sid.length > 18 ? `${sid.slice(0, 16)}…` : sid;
	}

	/**
	 * @param {Record<string, unknown> & { id: string }} ev
	 */
	function telemetryRowTone(ev) {
		const a = String(ev.action || '').toLowerCase();
		if (a === 'goal') return 'stw__tel-line--goal';
		if (a === 'tackle' || a === 'deflection') return 'stw__tel-line--tackle';
		if (a === 'assist') return 'stw__tel-line--assist';
		if (a === 'shot') return 'stw__tel-line--shot';
		if (a === 'save') return 'stw__tel-line--save';
		return 'stw__tel-line--misc';
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
				const data = res.data as { duplicate?: boolean } | undefined;
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
		onSelectPlayer?.(statsId || p, p);
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

	function handleCardClick(p: { name: string; rosterKey: string }) {
		quickModalPlayer = p;
	}

	function isPlayerSelected(p: { name: string; rosterKey: string }) {
		if (!selectedPlayerId || selectedPlayerId === 'ALL') return false;
		const target = selectedPlayerId.trim().toLowerCase();
		const pName = p.name.toLowerCase();
		const rKey = p.rosterKey.toLowerCase();
		return target === pName || target === rKey || target.includes(pName) || pName.includes(target);
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

	/** Lowercase names with pending VPC verification (trial_scores queue). */
	const vpcPendingNameKeys = $derived.by(() => {
		/** @type {Set<string>} */
		const keys = new Set();
		for (const v of vpcItems) {
			const n = typeof v.playerName === 'string' ? v.playerName.trim().toLowerCase() : '';
			if (n) keys.add(n);
		}
		return keys;
	});

	/**
	 * Live readiness rows from roster — no mock operatives.
	 * @typedef {'READY' | 'OFFLINE' | 'INJURY RISK'} ReadinessStatus
	 */
	const readinessRoster = $derived.by(() => {
		const pending = vpcPendingNameKeys;
		return players.map((name) => {
			const sid = resolveStatsId(name, playerStats);
			const stats = playerStats[sid] ?? {};
			const rowLabel =
				typeof stats.playerName === 'string' && stats.playerName.trim() ?
					stats.playerName.trim()
				:	name;
			const isLinked = linkedPlayers.has(name) || linkedPlayers.has(rowLabel);
			const hasVpcPending =
				pending.has(name.toLowerCase()) || pending.has(rowLabel.toLowerCase());
			const vpcApproved = isLinked && !hasVpcPending;

			/** @type {ReadinessStatus} */
			let status = 'OFFLINE';
			if (isLinked) {
				const lookupSt =
					typeof stats.status === 'string' ? stats.status.trim().toUpperCase() : '';
				status =
					lookupSt === 'INJURED' || lookupSt === 'INJURY RISK' ? 'INJURY RISK' : 'READY';
			}

			const jersey = jerseys[name];
			const number =
				jersey != null && String(jersey).trim() ? String(jersey).trim() : '—';
			const position =
				typeof stats.position === 'string' && stats.position.trim() ?
					stats.position.trim().toUpperCase().slice(0, 4)
				:	'—';

			return {
				id: sid,
				rosterKey: name,
				name: rowLabel,
				number,
				position,
				stamina: isLinked ? 75 : 0,
				hr: 0,
				vpc_approved: vpcApproved,
				status,
			};
		});
	});

	const rmReady = $derived(readinessRoster.filter((p) => p.status === 'READY').length);
	const rmConsent = $derived(readinessRoster.filter((p) => !p.vpc_approved).length);
	const rmOffline = $derived(readinessRoster.filter((p) => p.status === 'OFFLINE').length);
	const rmAtRisk = $derived(readinessRoster.filter((p) => p.status === 'INJURY RISK').length);
	const squadUptimePct = $derived(
		readinessRoster.length === 0 ?
			0
		:	Math.round((rmReady / readinessRoster.length) * 100),
	);
	const readinessMatrixLabel = $derived(
		typeof currentTeam?.name === 'string' && currentTeam.name.trim() ?
			currentTeam.name.trim().toUpperCase()
		:	'SQUAD',
	);
</script>

<!-- ── SQUAD UPTIME — live ticker ─────── -->
<div class="tw-w-full tw-flex tw-flex-col tw-gap-4">
	<section
		class="vanguard-panel tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-xl tw-p-4 tw-shadow-2xl"
		aria-label="Squad uptime"
	>
		<div class="tw-flex tw-flex-col lg:tw-flex-row lg:tw-items-center tw-justify-between tw-gap-4">
			<!-- Live Indicator & Title -->
			<div class="tw-flex tw-items-center tw-gap-3">
				<span class="tw-relative tw-flex tw-h-3 tw-w-3">
					<span class="tw-animate-ping tw-absolute tw-inline-flex tw-h-full tw-w-full tw-rounded-full tw-bg-[#14b8a6] tw-opacity-75"></span>
					<span class="tw-relative tw-inline-flex tw-rounded-full tw-h-3 tw-w-3 tw-bg-[#14b8a6]"></span>
				</span>
				<div>
					<div class="tw-flex tw-items-center tw-gap-2">
						<span class="tw-font-mono tw-text-xs tw-font-black tw-tracking-[0.2em] tw-text-[#14b8a6] tw-uppercase">
							SQUAD UPTIME · LIVE TICKER
						</span>
						<span class="tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6]/40 tw-text-[#14b8a6] tw-text-[9px] tw-font-mono tw-px-1.5 tw-py-0.5 tw-rounded">
							SIEM v2
						</span>
					</div>
					<p class="tw-font-mono tw-text-[11px] tw-text-slate-400 tw-m-0 tw-mt-0.5">
						Real-time readiness telemetry for {readinessMatrixLabel}
					</p>
				</div>
			</div>

			<!-- Score & Status Chips -->
			<div class="tw-flex tw-flex-wrap tw-items-center tw-gap-4">
				<!-- Big tabular readiness percentage -->
				<div class="tw-flex tw-items-baseline tw-gap-2 tw-bg-[#020617] tw-border tw-border-[#334155] tw-px-3 tw-py-1.5 tw-rounded-lg">
					<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-400">
						READINESS SCORE
					</span>
					<span class="tw-font-mono tw-text-2xl tw-font-black tw-tabular-nums tw-text-[#daff0a] tw-drop-shadow-[0_0_8px_rgba(218,255,10,0.4)]">
						{squadUptimePct}%
					</span>
				</div>

				<!-- Telemetry Status Badges -->
				<div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
					<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-px-2 tw-py-1 tw-rounded tw-bg-[#14b8a6]/15 tw-border tw-border-[#14b8a6]/40 tw-text-[#14b8a6]">
						● COMBAT READY: <span class="tw-text-white tw-ml-1">{rmReady}</span>
					</span>
					<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-px-2 tw-py-1 tw-rounded tw-bg-[#f59e0b]/15 tw-border tw-border-[#f59e0b]/40 tw-text-[#f59e0b]">
						⏳ CONSENT PENDING: <span class="tw-text-white tw-ml-1">{rmConsent}</span>
					</span>
					<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-px-2 tw-py-1 tw-rounded tw-bg-slate-800 tw-border tw-border-slate-700 tw-text-slate-400">
						○ OFFLINE: <span class="tw-text-white tw-ml-1">{rmOffline}</span>
					</span>
					{#if rmAtRisk > 0}
						<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-px-2 tw-py-1 tw-rounded tw-bg-[#ef4444]/15 tw-border tw-border-[#ef4444]/40 tw-text-[#ef4444]">
							⚠ INJURY RISK: <span class="tw-text-white tw-ml-1">{rmAtRisk}</span>
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Horizontal Telemetry Progress Bar -->
		<div class="tw-w-full tw-h-2 tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-full tw-overflow-hidden tw-mt-3">
			<div
				class="tw-h-full tw-bg-gradient-to-r tw-from-[#14b8a6] tw-to-[#daff0a] tw-transition-all tw-duration-500"
				style="width: {squadUptimePct}%;"
			></div>
		</div>
	</section>

	<!-- ── Readiness Matrix SIEM Section ──────────────────────────── -->
	<section
		class="vanguard-panel tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-xl tw-p-5 tw-shadow-2xl"
		aria-labelledby="readiness-matrix-title"
	>
		<div class="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-3 tw-border-b tw-border-[#334155] tw-pb-3 tw-mb-4">
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-inline-block tw-h-2 tw-w-2 tw-rounded-full tw-bg-[#14b8a6] tw-shadow-[0_0_8px_#14b8a6]"></span>
				<h2
					id="readiness-matrix-title"
					class="tw-font-mono tw-text-xs tw-font-black tw-uppercase tw-tracking-[0.2em] tw-text-[#14b8a6] tw-m-0"
				>
					READINESS MATRIX · {readinessMatrixLabel}
				</h2>
			</div>
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-font-mono tw-text-[11px] tw-text-[#daff0a] tw-bg-[#daff0a]/10 tw-border tw-border-[#daff0a]/30 tw-px-2 tw-py-0.5">
					↓ Click card → athlete quick stats modal · [✎ Edit Profile] opens drawer
				</span>
			</div>
		</div>

		{#if loading}
			<div class="tw-py-8 tw-text-center">
				<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-animate-pulse tw-m-0">
					Loading squad readiness matrix…
				</p>
			</div>
		{:else if readinessRoster.length === 0}
			<div class="tw-border tw-border-dashed tw-border-slate-800 tw-p-8 tw-text-center tw-bg-[#020617] tw-rounded-lg">
				<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-m-0">
					No athletes on roster —
					<a class="tw-text-[#14b8a6] tw-underline tw-underline-offset-2" href="/coach/logistics?tab=roster">
						import CSV on Team Ops
					</a>.
				</p>
			</div>
		{:else}
			<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 md:tw-grid-cols-3 lg:tw-grid-cols-4 xl:tw-grid-cols-6 tw-gap-3">
				{#each readinessRoster as p (p.id)}
					{@const active = isPlayerSelected(p)}
					<div
						class="tw-group tw-relative tw-flex tw-flex-col tw-justify-between tw-rounded-lg tw-p-3.5 tw-transition-all tw-duration-150 tw-cursor-pointer tw-select-none {active ? 'tw-bg-[#0f172a] tw-border-2 tw-border-[#daff0a] tw-shadow-[0_0_18px_rgba(218,255,10,0.25)]' : 'tw-bg-[#020617] tw-border tw-border-[#334155] hover:tw-border-[#14b8a6] hover:tw-bg-[#0b1329]'}"
						role="button"
						tabindex="0"
						onclick={() => handleCardClick(p)}
						onkeydown={(e) => e.key === 'Enter' && handleCardClick(p)}
					>
						<!-- Top: Jersey, Position, and Edit Action -->
						<div class="tw-flex tw-items-center tw-justify-between tw-gap-2">
							<div class="tw-flex tw-items-center tw-gap-1.5">
								<span class="tw-font-mono tw-text-xs tw-font-black tw-px-1.5 tw-py-0.5 tw-rounded {active ? 'tw-bg-[#daff0a] tw-text-black' : 'tw-bg-slate-800 tw-text-[#daff0a]'}">
									#{p.number}
								</span>
								<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-text-[#14b8a6] tw-bg-[#14b8a6]/10 tw-px-1.5 tw-py-0.5 tw-rounded tw-border tw-border-[#14b8a6]/30">
									{p.position}
								</span>
							</div>

							<!-- Edit Profile Button (ONLY this opens the drawer) -->
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									openDrawer(p.rosterKey);
								}}
								class="tw-bg-[#0f172a] hover:tw-bg-slate-700 tw-border tw-border-slate-700 hover:tw-border-[#14b8a6] tw-text-slate-300 hover:tw-text-white tw-font-mono tw-text-[10px] tw-px-2.5 tw-py-1 tw-rounded tw-transition-colors tw-cursor-pointer"
								title="Edit profile in drawer"
							>
								✎ Edit Profile
							</button>
						</div>

						<!-- Middle: Athlete Name & Status -->
						<div class="tw-my-3">
							<h3 class="tw-font-mono tw-text-xs tw-font-black tw-text-white tw-tracking-wide tw-m-0 tw-truncate" title={p.name}>
								{p.name}
							</h3>
							<div class="tw-flex tw-items-center tw-gap-1.5 tw-mt-1.5">
								{#if p.status === 'READY'}
									<span class="tw-inline-block tw-h-1.5 tw-w-1.5 tw-rounded-full tw-bg-[#14b8a6] tw-shadow-[0_0_6px_#14b8a6]"></span>
									<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-text-[#14b8a6] tw-uppercase">Combat Ready</span>
								{:else if p.status === 'INJURY RISK'}
									<span class="tw-inline-block tw-h-1.5 tw-w-1.5 tw-rounded-full tw-bg-[#ef4444] tw-shadow-[0_0_6px_#ef4444]"></span>
									<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-text-[#ef4444] tw-uppercase">Injury Risk</span>
								{:else}
									<span class="tw-inline-block tw-h-1.5 tw-w-1.5 tw-rounded-full tw-bg-slate-500"></span>
									<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase">
										{!p.vpc_approved ? 'VPC Pending' : 'Offline'}
									</span>
								{/if}
							</div>
						</div>

						<!-- Bottom: Telemetry / Stamina Indicator -->
						<div class="tw-pt-2 tw-border-t tw-border-slate-800/80 tw-flex tw-items-center tw-justify-between">
							{#if active}
								<span class="tw-font-mono tw-text-[9px] tw-font-black tw-text-[#daff0a] tw-tracking-widest tw-uppercase tw-animate-pulse">
									● ACTIVE RADAR
								</span>
							{:else}
								<span class="tw-font-mono tw-text-[9px] tw-text-slate-500 tw-uppercase tw-tracking-wider">
									STAMINA: {p.stamina}%
								</span>
							{/if}
							<span class="tw-font-mono tw-text-[9px] tw-text-[#14b8a6] group-hover:tw-translate-x-0.5 tw-transition-transform">
								SELECT →
							</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<AthleteQuickStatsModal
	isOpen={!!quickModalPlayer}
	player={quickModalPlayer}
	statsDoc={quickModalPlayer ? playerStats[resolveStatsId(quickModalPlayer.rosterKey || quickModalPlayer.name, playerStats)] : null}
	onClose={() => (quickModalPlayer = null)}
	onOpenEditProfile={() => {
		const p = quickModalPlayer;
		quickModalPlayer = null;
		if (p) openDrawer(p.rosterKey || p.name);
	}}
/>


