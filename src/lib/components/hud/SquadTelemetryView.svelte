<script lang="ts">
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
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

	let { teamId = '', teams = [], showLiveTelemetry = true }: { teamId?: string; teams?: any[]; showLiveTelemetry?: boolean } = $props();

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
		if (a === 'goal') return 'tw-text-[#34d399]';
		if (a === 'tackle' || a === 'deflection') return 'tw-text-[#fbbf24]';
		if (a === 'assist') return 'tw-text-[#14b8a6]';
		if (a === 'shot') return 'tw-text-slate-300';
		if (a === 'save') return 'tw-text-[#38bdf8]';
		return 'tw-text-purple-400';
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
	class="bento-span-12 tw-col-span-1 lg:tw-col-span-12 hud-telemetry-panel tw-backdrop-blur-3xl tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),_0_0_30px_rgba(20, 184, 166,0.08)] tw-border-[#14b8a6]/25"
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
	class="bento-span-12 tw-col-span-1 lg:tw-col-span-12 hud-telemetry-panel"
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
					class="bento-span-3 tw-col-span-1 lg:tw-col-span-3 hud-readiness-card hud-telemetry-panel"
					role="button"
					tabindex="0"
					onclick={() => openDrawer(p.rosterKey)}
					onkeydown={(e) => e.key === 'Enter' && openDrawer(p.rosterKey)}
				>
					<div class="hud-readiness-card__ring hud-telemetry-avatar">
						<HudSeededRingCanvas
							uid={p.id}
							size={64}
							fill={staminaFill}
							strokeColor="#14b8a6"
							showAvatar={true}
							avatarSeed={p.name}
							showCenter={false}
						/>
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

<div class="tw-mt-8 bento-grid bento-grid--12col bento-grid--liquid tw-w-full tw-grid-cols-1 lg:tw-grid-cols-12" data-region="squad-telemetry">
	<header class="bento-cell coach-os-panel bento-span-12 tw-col-span-1 lg:tw-col-span-12 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4 tw-p-5 tw-border-b-0">
		<div class="tw-flex tw-flex-col">
			<p class="tw-m-0 tw-font-mono tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35">Project Phoenix · Pillar 1</p>
			<h1 class="tw-m-0 tw-font-mono tw-text-lg tw-font-black tw-uppercase tw-tracking-[0.15em] tw-text-white tw-mt-1">Squad telemetry</h1>
			<p class="tw-m-0 tw-mt-1 tw-font-mono tw-text-[10px] tw-text-[#14b8a6]/80 tw-uppercase">Team scoping · {currentTeam?.name || teamId || '—'}</p>
		</div>
		<div class="tw-flex tw-flex-wrap tw-gap-3 tw-items-stretch">
			<div class="tw-px-4 tw-py-2 tw-bg-[#05050a] tw-border tw-border-white/10 tw-flex tw-flex-col tw-gap-1">
				<span class="tw-font-mono tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35">Roster</span>
				<span class="tw-font-mono tw-text-lg tw-font-black tw-text-[#14b8a6]">{players.length}</span>
			</div>
			<div class="tw-px-4 tw-py-2 tw-bg-[#05050a] tw-border tw-border-white/10 tw-flex tw-flex-col tw-gap-1 {vpcItems.length > 0 ? 'tw-border-[#ff003c]/40 tw-shadow-[0_0_14px_rgba(255,0,60,0.12)]' : ''}">
				<span class="tw-font-mono tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35">VPC pending</span>
				<span class="tw-font-mono tw-text-lg tw-font-black {vpcItems.length > 0 ? 'tw-text-[#ff003c]' : 'tw-text-[#14b8a6]'}">{vpcItems.length}</span>
			</div>
			<div class="tw-px-4 tw-py-2 tw-bg-[#05050a] tw-border tw-border-white/10 tw-flex tw-flex-col tw-gap-1">
				<span class="tw-font-mono tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35">Field signals</span>
				<span class="tw-font-mono tw-text-lg tw-font-black tw-text-[#34d399]">{signalCount}</span>
			</div>
		</div>
	</header>

	{#if showLiveTelemetry}
		<div class="bento-span-12 tw-col-span-1 lg:tw-col-span-12 tw-min-w-0">
			<LiveTelemetrySection
				teamId={teamId}
				matchId={activeMatchId}
				players={players}
				getStatsId={(p) => resolveStatsId(p, playerStats)}
				onCommitted={loadRoster}
			/>
		</div>
		{#if teamId && activeMatchId}
			<section class="bento-cell coach-os-panel bento-span-12 tw-col-span-1 lg:tw-col-span-12 tw-p-0 tw-overflow-hidden tw-border-[#14b8a6]/20" aria-labelledby="stw-tel-feed-title">
				<div class="tw-flex tw-flex-wrap tw-items-baseline tw-justify-between tw-gap-2 tw-px-5 tw-py-3 tw-bg-[#05050a] tw-border-b tw-border-white/5">
					<h2 id="stw-tel-feed-title" class="tw-m-0 tw-font-mono tw-text-[10px] tw-font-black tw-uppercase tw-tracking-[0.2em] tw-text-[#34d399]">LIVE FEED · SOCKET</h2>
					<p class="tw-m-0 tw-font-mono tw-text-[9px] tw-text-white/40 tw-uppercase">
						Session <span>{activeMatchId.slice(0, 10)}…</span>
					</p>
				</div>
				<div class="tw-p-4 tw-font-mono tw-text-xs tw-leading-relaxed" role="log" aria-live="polite" aria-relevant="additions">
					{#if liveEventsError}
						<p class="tw-text-[#fca5a5] tw-m-0 tw-py-1">{liveEventsError}</p>
					{:else if liveEvents.length === 0}
						<p class="tw-text-white/40 tw-m-0 tw-py-1">Awaiting pitch taps…</p>
					{:else}
						{#each liveEvents as ev (ev.id)}
							<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-[7.5rem_5rem_2.25rem_1fr] tw-gap-1 sm:tw-gap-2 tw-py-1.5 tw-border-b tw-border-white/5 tw-text-white/80 last:tw-border-0">
								<span class="tw-text-[10px] tw-text-white/40">{fmtTime(ev.timestamp)}</span>
								<span class="tw-font-bold {telemetryRowTone(ev)}">{String(ev.action ?? '—').toUpperCase()}</span>
								<span class="tw-text-right tw-text-white/60">+{Math.round(Number(ev.points) || 0)}</span>
								<span class="tw-text-white/90 tw-truncate">{rosterLabelForTelemetry(ev.playerId)}</span>
							</div>
						{/each}
					{/if}
				</div>
			</section>
		{/if}
	{/if}

	<section
		class="bento-cell coach-os-panel bento-span-12 tw-col-span-1 lg:tw-col-span-12 tw-p-5 tw-border-[#14b8a6]/30"
		aria-labelledby="stw-dispatch"
	>
		<div class="tw-flex tw-flex-col tw-gap-4 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
			<div class="tw-min-w-0">
				<p id="stw-dispatch" class="tw-m-0 tw-font-mono tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#14b8a6]/90">Strike 26 · Team dispatch</p>
				<p class="tw-m-0 tw-mt-1 tw-font-mono tw-text-xs tw-text-white/60 tw-max-w-2xl">
					Parents enter this code when provisioning an operative to link the account to this squad.
				</p>
			</div>
			<div
				class="tw-flex tw-flex-col tw-items-stretch tw-gap-2 sm:tw-min-w-[14rem] sm:tw-items-end"
			>
				<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-end tw-gap-3">
					<IntelModal
						title={DISPATCH_INTEL.title}
						instructions={DISPATCH_INTEL.instructions}
					/>
					{#if teamInviteCode}
						<div
							class="tw-font-mono tw-flex tw-min-h-[2.75rem] tw-select-all tw-items-center tw-justify-center tw-border tw-border-[#14b8a6]/40 tw-bg-[#000000] tw-px-4 tw-py-2 tw-text-lg tw-font-black tw-tracking-[0.2em] tw-text-[#14b8a6]"
							title="Team invite code"
						>
							{teamInviteCode}
						</div>
					{:else}
						<button
							type="button"
							class="tw-min-h-[2.75rem] tw-border tw-border-[#14b8a6]/50 tw-bg-[#14b8a6]/10 tw-px-5 tw-font-mono tw-text-[10px] tw-font-black tw-uppercase tw-tracking-[0.2em] tw-text-[#14b8a6] tw-shadow-[0_0_20px_rgba(20,184,166,0.15)] tw-transition hover:tw-border-[#14b8a6]/80 hover:tw-bg-[#14b8a6]/20 disabled:tw-opacity-50"
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
		<div class="bento-span-12 tw-col-span-1 lg:tw-col-span-12">
			<p
				class="tw-m-0 tw-p-3 tw-font-mono tw-text-xs tw-border {feedback.type === 'error' ? 'tw-border-[#fca5a5] tw-text-[#fca5a5] tw-bg-[#fca5a5]/10' : feedback.type === 'success' ? 'tw-border-[#34d399] tw-text-[#34d399] tw-bg-[#34d399]/10' : 'tw-border-[#38bdf8] tw-text-[#38bdf8] tw-bg-[#38bdf8]/10'}"
			>
				{feedback.text}
			</p>
		</div>
	{/if}

	<section class="bento-cell coach-os-panel bento-span-12 tw-col-span-1 lg:tw-col-span-8 tw-p-5 tw-flex tw-flex-col" aria-labelledby="stw-roster">
		<header class="tw-mb-4 tw-border-b tw-border-white/10 tw-pb-3">
			<h2 id="stw-roster" class="tw-m-0 tw-font-mono tw-text-xs tw-font-black tw-uppercase tw-tracking-[0.2em] tw-text-white">Roster</h2>
		</header>
		
		<div class="tw-flex tw-flex-wrap tw-gap-2 tw-mb-2">
			<input class="tw-flex-1 tw-min-w-[120px] tw-bg-[#000] tw-border tw-border-white/10 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-outline-none focus:tw-border-[#14b8a6]" type="text" placeholder="Name" bind:value={addName} />
			<input class="tw-flex-1 tw-min-w-[120px] tw-bg-[#000] tw-border tw-border-white/10 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-outline-none focus:tw-border-[#14b8a6]" type="email" placeholder="Email (opt)" bind:value={addEmail} />
			<input class="tw-w-[4rem] tw-bg-[#000] tw-border tw-border-white/10 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-outline-none focus:tw-border-[#14b8a6]" type="text" placeholder="#" bind:value={addJersey} />
			<button type="button" class="coach-os-action-chip tw-cursor-pointer disabled:tw-opacity-50" disabled={addSaving} onclick={addPlayer}>INGEST</button>
		</div>
		
		<p class="tw-m-0 tw-mb-4 tw-font-mono tw-text-[10px]">
			<a class="tw-text-[#14b8a6] tw-underline tw-underline-offset-2 hover:tw-text-[#34d399]" href="/coach/logistics?tab=roster">Import CSV on Team Ops →</a>
		</p>
		
		<div class="tw-border tw-border-white/10 tw-overflow-x-auto">
			<table class="tw-w-full tw-text-left tw-border-collapse tw-font-mono tw-text-xs" aria-label="Roster">
				<thead>
					<tr class="tw-border-b tw-border-white/10 tw-bg-[#000]">
						<th scope="col" class="tw-p-3 tw-font-normal tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-white/40">Athlete</th>
						<th scope="col" class="tw-p-3 tw-font-normal tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-white/40">#</th>
						<th scope="col" class="tw-p-3 tw-font-normal tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-white/40">Link</th>
					</tr>
				</thead>
				<tbody>
					{#if loading}
						<tr><td colspan="3" class="tw-p-3 tw-text-white/40">Loading roster…</td></tr>
					{:else if players.length === 0}
						<tr><td colspan="3" class="tw-p-3 tw-text-white/40">No athletes on file.</td></tr>
					{:else}
						{#each players as p (p)}
							{@const sid = resolveStatsId(p, playerStats)}
							{@const rowLabel =
								typeof playerStats[sid]?.playerName === 'string'
									? String(playerStats[sid].playerName)
									: p}
							{@const copa = complianceByPlayer[p] ?? 'unverified'}
							<tr
								class="tw-border-b tw-border-white/5 tw-cursor-pointer hover:tw-bg-[#14b8a6]/5 tw-transition-colors last:tw-border-0"
								role="button"
								tabindex="0"
								onclick={() => openDrawer(p)}
								onkeydown={(e) => e.key === 'Enter' && openDrawer(p)}
							>
								<td class="tw-p-3 tw-text-white/90">{rowLabel}</td>
								<td class="tw-p-3 tw-text-white/60">
									{jerseys[p] != null && String(jerseys[p]).trim() ? jerseys[p] : '—'}
								</td>
								<td
									class="tw-p-3 tw-font-bold {copa === 'compliant' && (linkedPlayers.has(rowLabel) || linkedPlayers.has(p)) ? 'tw-text-[#34d399]' : 'tw-text-white/30'}"
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

	<section class="bento-cell coach-os-panel bento-span-12 tw-col-span-1 lg:tw-col-span-4 tw-p-5 tw-flex tw-flex-col" aria-labelledby="stw-signals">
		<header class="tw-mb-4 tw-border-b tw-border-white/10 tw-pb-3">
			<h2 id="stw-signals" class="tw-m-0 tw-font-mono tw-text-xs tw-font-black tw-uppercase tw-tracking-[0.2em] tw-text-white">Open signals</h2>
		</header>

		<div class="tw-mt-2 tw-mb-2 tw-font-mono tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-[0.15em] tw-text-[#14b8a6]">VPC (video compliance)</div>
		{#if vpcLoading}
			<p class="tw-m-0 tw-font-mono tw-text-[10px] tw-text-white/40">Subscribing to queue…</p>
		{:else if vpcErr}
			<p class="tw-m-0 tw-font-mono tw-text-[10px] tw-text-[#fca5a5]">{vpcErr}</p>
		{:else if vpcItems.length === 0}
			<p class="tw-m-0 tw-font-mono tw-text-[10px] tw-text-white/40">No pending verifications.</p>
		{:else}
			<ul class="tw-m-0 tw-p-0 tw-list-none">
				{#each vpcItems as v (v.id)}
					<li class="tw-py-2 tw-border-b tw-border-white/5 last:tw-border-0">
						<div class="tw-flex tw-justify-between tw-gap-2">
							<span class="tw-font-mono tw-text-xs tw-text-white/90">{String(v.playerName ?? 'Player')}</span>
							<span class="tw-font-mono tw-text-[9px] tw-text-white/40">{fmtTime(v.submittedAt)}</span>
						</div>
						<div class="tw-flex tw-gap-2 tw-mt-2">
							<button
								type="button"
								class="tw-px-3 tw-py-1 tw-border tw-border-[#34d399]/40 tw-bg-[#000] tw-text-white tw-font-mono tw-text-[9px] tw-font-bold tw-cursor-pointer disabled:tw-opacity-50"
								disabled={busyVpcId === v.id}
								onclick={() => vpcAct(/** @type {string} */(v.id), 'approve')}
							>OK</button>
							<button
								type="button"
								class="tw-px-3 tw-py-1 tw-border tw-border-[#ff003c]/40 tw-bg-[#000] tw-text-white tw-font-mono tw-text-[9px] tw-font-bold tw-cursor-pointer disabled:tw-opacity-50"
								disabled={busyVpcId === v.id}
								onclick={() => vpcAct(/** @type {string} */(v.id), 'reject')}
							>NO</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		<div class="tw-mt-6 tw-mb-2 tw-font-mono tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-[0.15em] tw-text-[#14b8a6]">Field trials (recent)</div>
		{#if trialRows.length === 0}
			<p class="tw-m-0 tw-font-mono tw-text-[10px] tw-text-white/40">No recent trials.</p>
		{:else}
			<ul class="tw-m-0 tw-p-0 tw-list-none">
				{#each trialRows as t (t.id)}
					<li class="tw-py-1 tw-font-mono tw-text-[10px] tw-text-white/70">
						{String(t.player ?? '—')} · {String(t.type ?? t.skill ?? 'trial')}
					</li>
				{/each}
			</ul>
		{/if}

		<div class="tw-mt-6 tw-mb-2 tw-font-mono tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-[0.15em] tw-text-[#14b8a6]">Evaluations (latest)</div>
		{#if evalRows.length === 0}
			<p class="tw-m-0 tw-font-mono tw-text-[10px] tw-text-white/40">No evaluation rows.</p>
		{:else}
			<ul class="tw-m-0 tw-p-0 tw-list-none">
				{#each evalRows as e (e.id)}
					<li class="tw-py-1 tw-font-mono tw-text-[10px] tw-text-white/70">
						{String(e.player ?? '—')} · {String(e.skill ?? '—')} · {String(e.score ?? '—')}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>


