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
	import { buildCoachRosterDisplayNames } from '$lib/coach/rosterDisplayDedupe.js';

	const DISPATCH_INTEL = {
		title: 'DISPATCH PROTOCOL',
		instructions: [
			'1. Generate your 6-character code.',
			'2. Text this code to your team parents.',
			'3. Parents create an account, sign the COPPA waiver, and enter this code to instantly drop their player onto your roster.',
		],
	};

	let { teamId = '', teams = [], showLiveTelemetry = true } = $props();

	/** Isolates one bench-side logging session (new UUID when `teamId` changes). */
	let activeMatchId = $state('');
	let matchSessionTeamId = $state('');

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
					snap.forEach((d) => liveEvents.push({ id: d.id, ...d.data() }));
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

<!-- ── SQUAD UPTIME — aggregate readiness ticker (Epic 1.2 bento HUD) ─────── -->
<div class="hud-telemetry-root bento-grid bento-grid--12col bento-grid--liquid tw-w-full tw-min-w-0 tw-grid tw-grid-cols-1 lg:tw-grid-cols-12">
<section
	class="tw-col-span-full hud-telemetry-panel tw-backdrop-blur-3xl tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),_0_0_30px_rgba(20, 184, 166,0.08)] tw-border-[#14b8a6]/25"
	aria-label="Squad uptime"
>
	<div class="hud-telemetry-uptime__grid">
		<div class="hud-telemetry-uptime__label">
			<p class="tw-font-mono tw-text-[10px] tw-font-black tw-uppercase tw-tracking-[0.3em] tw-text-[#14b8a6]/85 tw-m-0">
				<span class="tw-inline-block tw-h-2 tw-w-2 tw-animate-pulse tw-rounded-full tw-bg-[#14b8a6] tw-shadow-[0_0_8px_rgba(20, 184, 166,0.95)] tw-mr-2 tw-align-middle"></span>
				SQUAD UPTIME · LIVE TICKER
			</p>
		</div>
		<div class="hud-telemetry-uptime__score">
			<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35 tw-font-mono">READINESS SCORE</span>
			<span class="tw-text-3xl tw-font-black tw-tabular-nums tw-text-[#14b8a6] tw-drop-shadow-[0_0_12px_rgba(20, 184, 166,0.55)] tw-font-mono">{squadUptimePct}%</span>
		</div>
		<div class="hud-telemetry-uptime__bar">
			<div class="hud-telemetry-uptime__bar-fill" style="width: {squadUptimePct}%;"></div>
		</div>
	</div>
</section>

<!-- ── Readiness Matrix (glassmorphic SIEM grid) ──────────────────────────── -->
<section
	class="tw-col-span-full hud-telemetry-panel"
	aria-labelledby="readiness-matrix-title"
>
	<div class="hud-telemetry-matrix__head">
		<div class="hud-telemetry-matrix__title">
			<h2
				id="readiness-matrix-title"
				class="tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-[0.2em] tw-text-[#14b8a6] tw-m-0"
			>
				<span class="tw-inline-block tw-h-2 tw-w-2 tw-animate-pulse tw-rounded-full tw-bg-[#14b8a6] tw-shadow-[0_0_8px_rgba(20, 184, 166,0.8)] tw-mr-2 tw-align-middle"></span>
				READINESS MATRIX · {readinessMatrixLabel}
			</h2>
		</div>
		<div class="hud-telemetry-matrix__stats">
			<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35">
				COMBAT READY <span class="tw-ml-1 tw-tabular-nums tw-text-[#14b8a6]">{rmReady}</span>
			</span>
			<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35">
				CONSENT PENDING <span class="tw-ml-1 tw-tabular-nums tw-text-[#ff003c]">{rmConsent}</span>
			</span>
			<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35">
				OFFLINE <span class="tw-ml-1 tw-tabular-nums tw-text-white/50">{rmOffline}</span>
			</span>
			<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35">
				INJURY RISK <span class="tw-ml-1 tw-tabular-nums tw-text-[#ff003c]">{rmAtRisk}</span>
			</span>
		</div>
	</div>

	{#if loading}
		<p class="tw-font-mono tw-text-[11px] tw-uppercase tw-tracking-widest tw-text-white/40 tw-m-0 tw-py-4">
			Loading roster…
		</p>
	{:else if readinessRoster.length === 0}
		<p class="tw-font-mono tw-text-[11px] tw-uppercase tw-tracking-widest tw-text-white/40 tw-m-0 tw-py-4">
			No athletes on roster — ingest below or
			<a class="tw-text-[#14b8a6] tw-underline tw-underline-offset-2" href="/coach/logistics?tab=roster"
				>import CSV on Team Ops</a
			>.
		</p>
	{:else}
		<div class="bento-grid bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12">
			{#each readinessRoster as p (p.id)}
				{@const staminaFill = Math.max(0, Math.min(1, p.stamina / 100))}
				<article
					class="tw-col-span-1 md:tw-col-span-6 lg:tw-col-span-3 hud-readiness-card hud-telemetry-panel"
					role="button"
					tabindex="0"
					onclick={() => openDrawer(p.rosterKey)}
					onkeydown={(e) => e.key === 'Enter' && openDrawer(p.rosterKey)}
				>
					<div class="hud-readiness-card__ring hud-telemetry-avatar">
						
					</div>
					<div class="hud-readiness-card__meta">
						<p class="tw-font-mono tw-text-[10px] tw-font-black tw-uppercase tw-tracking-wider tw-text-white tw-m-0">{p.name}</p>
						<p class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6] tw-m-0">{p.position} · #{p.number}</p>
						<p class="tw-font-mono tw-text-[10px] tw-uppercase tw-tracking-widest tw-m-0" style="color: {p.status === 'READY' ? '#14b8a6' : p.status === 'INJURY RISK' ? '#ff003c' : '#666'}">{p.status}</p>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</section>
</div>


