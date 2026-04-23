<script>
	import { page } from '$app/state';
	import { db } from '$lib/firebase.js';
	import {
		collection,
		doc,
		setDoc,
		deleteDoc,
		getDocs,
		query,
		where,
	} from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import {
		clubSportIconClass,
		clubSportAccent,
		normalizeClubSport
	} from '$lib/utils/sport-icon.js';
	import { auth, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { signInWithCustomToken } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import { impersonationStore } from '$lib/stores/impersonation.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import EditOrganizationModal from '$lib/components/admin/EditOrganizationModal.svelte';
	import '$lib/styles/enterprise-console.css';

	const createSportModuleFn = httpsCallable(functions, 'createSportModule');
	const impersonateUserFn   = httpsCallable(functions, 'impersonateUserFn');

	const PAGE_SIZE = 50;

	// ── Typedefs ─────────────────────────────────────────────────────────────────
	/**
	 * @typedef {{
	 *   id: string,
	 *   name?: string,
	 *   sport?: string,
	 *   directorEmail?: string,
	 *   isInfinite?: boolean,
	 *   logoUrl?: string,
	 *   createdAt?: unknown,
	 *   verifiedAddress?: string,
	 *   phoneNumber?: string,
	 *   primaryFacility?: string,
	 *   tier?: string,
	 *   subscriptionTier?: string,
	 * }} Club
	 */

	/**
	 * @typedef {{ status: 'clean' | 'watch' | 'risk' | 'na', total: number, verified: number }} ComplianceHealth
	 */

	// ── Direct Firestore fetch — does NOT depend on teamsStore ───────────────────
	/** @type {Club[]} */
	let clubs = $state([]);
	let clubsLoading = $state(false);
	let clubsErr = $state('');

	/** @type {Map<string, ComplianceHealth>} */
	let complianceMap = $state(new Map());

	$effect(() => {
		// Guard: wait for Firebase Auth init to settle before reading protected collections.
		// Without this, getDocs fires with no token → empty snapshot (the "Aggies FC" bug).
		if (authStore.isLoading || !authStore.isAuthenticated) return;

		let cancelled = false;
		clubsLoading = true;
		clubsErr = '';

		void Promise.all([
			getDocs(collection(db, 'clubs')),
			getDocs(collection(db, 'vpc_requests')),
		])
			.then(([clubsSnap, vpcSnap]) => {
				if (cancelled) return;

			// Build clubs array — NO FILTERING. Every club document, even one missing
			// `sport`, `createdAt`, or `name`, MUST render. Defensive normalization
			// uses optional chaining and fallbacks so the renderer can never crash.
			// This fixes the "Aggies FC disappears" bug.
			/** @type {Club[]} */
			const loaded = [];
			clubsSnap.forEach((d) => {
				const raw = /** @type {Record<string, unknown>} */ (d.data() || {});
				loaded.push({
					id: d.id,
					name:
						typeof raw?.name === 'string' && raw.name.trim()
							? raw.name.trim()
							: undefined,
					sport:
						typeof raw?.sport === 'string' && raw.sport.trim()
							? raw.sport.trim()
							: undefined,
					directorEmail:
						typeof raw?.directorEmail === 'string' && raw.directorEmail.trim()
							? raw.directorEmail.trim()
							: undefined,
					isInfinite: raw?.isInfinite === true,
					tier: typeof raw?.tier === 'string' && raw.tier.trim() ? raw.tier.trim() : undefined,
					subscriptionTier:
						typeof raw?.subscriptionTier === 'string' && raw.subscriptionTier.trim()
							? raw.subscriptionTier.trim()
							: undefined,
					logoUrl:
						typeof raw?.logoUrl === 'string' && raw.logoUrl.trim()
							? raw.logoUrl.trim()
							: undefined,
					createdAt: raw?.createdAt ?? null,
				});
			});
			clubs = loaded.sort((a, b) => (a?.name || a?.id || '').localeCompare(b?.name || b?.id || ''));

				// Build compliance map from vpc_requests
				/** @type {Map<string, { total: number, verified: number }>} */
				const raw = new Map();
				vpcSnap.forEach((d) => {
					const data = d.data();
					const clubId = typeof data.clubId === 'string' ? data.clubId : '';
					if (!clubId) return;
					const existing = raw.get(clubId) ?? { total: 0, verified: 0 };
					existing.total += 1;
					if (data.status === 'approved') existing.verified += 1;
					raw.set(clubId, existing);
				});

				/** @type {Map<string, ComplianceHealth>} */
				const cm = new Map();
				raw.forEach((v, clubId) => {
					const pct = v.total > 0 ? v.verified / v.total : 0;
					/** @type {ComplianceHealth['status']} */
					let status;
					if (pct >= 1) status = 'clean';
					else if (pct >= 0.5) status = 'watch';
					else status = 'risk';
					cm.set(clubId, { status, total: v.total, verified: v.verified });
				});
				complianceMap = cm;
			})
			.catch((e) => {
				if (cancelled) return;
				clubsErr = e instanceof Error ? e.message : 'Could not load organizations.';
			})
			.finally(() => {
				if (!cancelled) clubsLoading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	// ── Search + sport tab + pagination ──────────────────────────────────────────
	let orgSearch = $state('');
	let orgPage   = $state(0);
	/** @type {'all' | 'soccer' | 'basketball' | 'baseball' | 'football' | 'volleyball' | 'hockey' | 'lacrosse' | 'generic'} */
	let activeSportTab = $state('all');

	// ── Strike 2: Enterprise Filter popover (Verification + Region/State) ────
	// Sport tabs are already rendered as a separate tabstrip — we do NOT
	// duplicate them in the popover. The popover owns two orthogonal axes:
	//   1. Verification Status — derived from Google Places demographics
	//      ("Verified" = clubs with both a `verifiedAddress` and
	//      `phoneNumber`; "Pending" = missing one or both).
	//   2. Region / State — parsed out of the `verifiedAddress` string
	//      (last two-letter ALL-CAPS token adjacent to a ZIP).
	let filterOpen          = $state(false);
	/** @type {'all' | 'verified' | 'pending'} */
	let filterVerification  = $state('all');
	/** @type {string[]} Multi-select — empty array means "all states". */
	let filterStates        = $state(/** @type {string[]} */ ([]));
	/** @type {string[]} Multi-select — empty array means "all tiers". */
	let filterTiers         = $state(/** @type {string[]} */ ([]));
	/** @type {HTMLElement | null} */
	let filterRootEl        = $state(null);
	/** Typeahead for the region/state multi-select — keeps 50-state UX fast. */
	let filterRegionQuery   = $state('');

	/** Strike 3 (A2.1) — Subscription tier catalog. Mirrors the pricing
	 *  surface and the Revenue-by-Tier chart on the Overview dashboard. */
	const TIER_OPTIONS = /** @type {const} */ ([
		{ key: 'enterprise', label: 'Enterprise', accent: '#4338ca', icon: 'ph-diamond'      },
		{ key: 'club',       label: 'Club',       accent: '#0ea5e9', icon: 'ph-buildings'    },
		{ key: 'pro',        label: 'Pro',        accent: '#10b981', icon: 'ph-trophy'       },
		{ key: 'starter',    label: 'Starter',    accent: '#f59e0b', icon: 'ph-seedling'     },
		{ key: 'unassigned', label: 'Unassigned', accent: '#71717a', icon: 'ph-question'     },
	]);

	/** Count of non-default filters (used for the pill badge). */
	const filterActiveCount = $derived.by(() => {
		let n = 0;
		if (filterVerification !== 'all') n++;
		if (filterStates.length > 0)      n++;
		if (filterTiers.length > 0)       n++;
		return n;
	});

	function toggleFilter() { filterOpen = !filterOpen; }
	function closeFilter() { filterOpen = false; }

	function resetFilters() {
		filterVerification = 'all';
		filterStates       = [];
		filterTiers        = [];
		filterRegionQuery  = '';
	}

	/**
	 * Strike 3 (A2.1) — Toggle membership of a value in a multi-select
	 * array. Replaces the array reference (not mutates) so Svelte 5 reactivity
	 * stays hot.
	 * @param {string[]} list
	 * @param {string} value
	 * @returns {string[]}
	 */
	function toggleInList(list, value) {
		return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
	}

	/** Global click-outside + Escape handlers are wired while the popover is open. */
	$effect(() => {
		if (!filterOpen) return;
		/** @param {MouseEvent} ev */
		const onDocClick = (ev) => {
			const tgt = /** @type {Node | null} */ (ev.target);
			if (!filterRootEl || !tgt) return;
			if (!filterRootEl.contains(tgt)) closeFilter();
		};
		/** @param {KeyboardEvent} ev */
		const onKey = (ev) => { if (ev.key === 'Escape') closeFilter(); };
		document.addEventListener('mousedown', onDocClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDocClick);
			document.removeEventListener('keydown', onKey);
		};
	});

	/** Sport sub-nav tab definitions (CTO mandate: strict, finite tabstrip). */
	const SPORT_TABS = /** @type {const} */ ([
		{ key: 'all',        label: 'All',        icon: 'ph-squares-four'  },
		{ key: 'soccer',     label: 'Soccer',     icon: 'ph-soccer-ball'   },
		{ key: 'basketball', label: 'Basketball', icon: 'ph-basketball'    },
		{ key: 'volleyball', label: 'Volleyball', icon: 'ph-volleyball'    },
		{ key: 'baseball',   label: 'Baseball',   icon: 'ph-baseball'      },
		{ key: 'football',   label: 'Football',   icon: 'ph-football'      },
		{ key: 'hockey',     label: 'Hockey',     icon: 'ph-ice-skate'     },
		{ key: 'lacrosse',   label: 'Lacrosse',   icon: 'ph-tennis-ball'   },
		{ key: 'generic',    label: 'Other',      icon: 'ph-shield-check'  }
	]);

	$effect(() => {
		void orgSearch;
		void activeSportTab;
		orgPage = 0;
	});

	/** Live counts per sport — reactive so tab badges update on add/delete. */
	const sportCounts = $derived.by(() => {
		/** @type {Record<string, number>} */
		const counts = { all: clubs.length };
		for (const cl of clubs) {
			const k = normalizeClubSport(cl?.sport);
			counts[k] = (counts[k] || 0) + 1;
		}
		return counts;
	});

	/** Sport-filtered list (CTO mandate: Svelte 5 $derived tabbed filter). */
	const clubsBySport = $derived.by(() => {
		if (activeSportTab === 'all') return clubs;
		return clubs.filter((cl) => normalizeClubSport(cl?.sport) === activeSportTab);
	});

	/**
	 * Strike 2 — Derive verification status from demographic fields. A club is
	 * "Verified" once it carries both a Google-Places verified address and a
	 * phone number; anything short of that is "Pending".
	 * @param {Club} cl
	 * @returns {'verified' | 'pending'}
	 */
	function verificationForClub(cl) {
		const hasAddr  = typeof cl?.verifiedAddress === 'string' && cl.verifiedAddress.trim().length > 0;
		const hasPhone = typeof cl?.phoneNumber     === 'string' && cl.phoneNumber.trim().length     > 0;
		return hasAddr && hasPhone ? 'verified' : 'pending';
	}

	/**
	 * Strike 2 — Extract the two-letter US state code from a Google-Places
	 * formatted address. We look for the last ALL-CAPS `AA` token that sits
	 * adjacent to a 5-digit ZIP (e.g. `, TX 77840,` or `TX 77840, USA`).
	 * @param {Club} cl
	 * @returns {string} Uppercase state code, or '' if none could be inferred.
	 */
	function stateForClub(cl) {
		const addr = typeof cl?.verifiedAddress === 'string' ? cl.verifiedAddress : '';
		if (!addr) return '';
		const m = addr.match(/\b([A-Z]{2})\s+\d{5}(?:-\d{4})?\b/);
		return m ? m[1] : '';
	}

	/** Live list of distinct US states present in the club set (for the select). */
	const knownStates = $derived.by(() => {
		/** @type {Set<string>} */
		const s = new Set();
		for (const cl of clubs) {
			const st = stateForClub(cl);
			if (st) s.add(st);
		}
		return Array.from(s).sort();
	});

	/** Subset of `knownStates` that matches the typeahead query. */
	const filteredStateOptions = $derived.by(() => {
		const q = filterRegionQuery.trim().toUpperCase();
		if (!q) return knownStates;
		return knownStates.filter((st) => st.includes(q));
	});

	/**
	 * Strike 3 (A2.1) — Canonicalise a club's subscription tier. Accepts a
	 * `tier` or `subscriptionTier` field on the club doc and normalises into
	 * one of the five tier keys from TIER_OPTIONS. Clubs lacking any tier
	 * metadata fall into 'unassigned' so they are still filterable.
	 * @param {Club} cl
	 * @returns {'enterprise' | 'club' | 'pro' | 'starter' | 'unassigned'}
	 */
	function tierForClub(cl) {
		const raw = (cl && (cl.tier || cl.subscriptionTier)) || '';
		const key = String(raw).toLowerCase().trim();
		if (key === 'enterprise') return 'enterprise';
		if (key === 'club')       return 'club';
		if (key === 'pro')        return 'pro';
		if (key === 'starter')    return 'starter';
		return 'unassigned';
	}

	/**
	 * Table “License” column: promo flag overrides tier label.
	 * @param {Club} cl
	 */
	function licenseMetaForClub(cl) {
		if (cl?.isInfinite === true) {
			return {
				label: 'Promo',
				accent: '#f59e0b',
				icon: 'ph-infinity',
			};
		}
		const key = tierForClub(cl);
		const opt = TIER_OPTIONS.find((t) => t.key === key);
		return {
			label: opt?.label ?? 'Unassigned',
			accent: opt?.accent ?? '#71717a',
			icon: opt?.icon ?? 'ph-question',
		};
	}

	/** Live tier distribution — drives the count chip next to each tier chip. */
	const tierCounts = $derived.by(() => {
		/** @type {Record<string, number>} */
		const counts = { enterprise: 0, club: 0, pro: 0, starter: 0, unassigned: 0 };
		for (const cl of clubs) counts[tierForClub(cl)]++;
		return counts;
	});

	const filteredClubs = $derived.by(() => {
		const q = orgSearch.trim().toLowerCase();
		let base = clubsBySport;
		if (filterVerification !== 'all') {
			base = base.filter((cl) => verificationForClub(cl) === filterVerification);
		}
		if (filterStates.length > 0) {
			const allowed = new Set(filterStates);
			base = base.filter((cl) => {
				const st = stateForClub(cl);
				return st ? allowed.has(st) : false;
			});
		}
		if (filterTiers.length > 0) {
			const allowed = new Set(filterTiers);
			base = base.filter((cl) => allowed.has(tierForClub(cl)));
		}
		if (!q) return base;
		return base.filter((cl) => {
			return (
				(cl.name || '').toLowerCase().includes(q) ||
				cl.id.toLowerCase().includes(q) ||
				(cl.sport || '').toLowerCase().includes(q) ||
				(cl.directorEmail || '').toLowerCase().includes(q)
			);
		});
	});

	const orgTotalPages = $derived(Math.max(1, Math.ceil(filteredClubs.length / PAGE_SIZE)));

	const pagedClubs = $derived.by(() => {
		const start = orgPage * PAGE_SIZE;
		return filteredClubs.slice(start, start + PAGE_SIZE);
	});

	$effect(() => {
		if (orgPage > orgTotalPages - 1) orgPage = Math.max(0, orgTotalPages - 1);
	});

	// ── Compliance badge data ─────────────────────────────────────────────────────
	/** @param {string} clubId */
	function getCompliance(clubId) {
		return complianceMap.get(clubId) ?? null;
	}

	// ── Strike 2: lightweight inline toasts (Stack Sports import stub, etc.) ─
	/** @type {{ id: number, text: string, tone: 'info' | 'ok' | 'warn' }[]} */
	let toasts     = $state([]);
	let toastSeq   = 0;
	/** @param {string} text @param {'info' | 'ok' | 'warn'} [tone] */
	function pushToast(text, tone = 'info') {
		const id = ++toastSeq;
		toasts = [...toasts, { id, text, tone }];
		setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 4500);
	}

	/**
	 * Strike 2 — Stack Sports import entry point. v1 fires a toast + audit
	 * breadcrumb; Sprint 2.9 will swap in the real OAuth handshake.
	 */
	function importViaStackSports() {
		pushToast('Stack Sports OAuth Integration arriving in Sprint 2.9', 'info');
		void logSecurityEvent(
			'CLUB_IMPORT_STACK_SPORTS_INTENT',
			'admin.organizations',
			`Global Admin ${authStore.user?.email || 'unknown'} clicked Stack Sports import.`,
		);
	}

	// ── Add Club form ────────────────────────────────────────────────────────────
	let showAddForm        = $state(false);
	let newClubId          = $state('');
	let newClubName        = $state('');
	/** @type {string} */
	let newClubSport       = $state('soccer');
	/** true when the admin selects "+ Create new sport…" in the sport select */
	let newSportMode       = $state(false);
	let newSportName       = $state('');
	let newSportIcon       = $state('ph-soccer-ball');
	let newClubDir         = $state('');
	// Sprint 2.6.5 — extended demographic / ops fields
	let newClubAddress     = $state('');
	let newClubPhone       = $state('');
	let newClubFacility    = $state('');
	let clubSaving         = $state(false);
	let clubAddErr         = $state('');

	/** Reacts to sport select changes — toggles "new sport" inline panel */
	$effect(() => {
		newSportMode = newClubSport === '__new__';
		if (!newSportMode) { newSportName = ''; newSportIcon = 'ph-soccer-ball'; }
	});

	async function addClub() {
		clubAddErr = '';
		if (!newClubId.trim() || !newClubName.trim()) {
			clubAddErr = 'Club ID and Club Name are required.';
			return;
		}
		if (newSportMode && !newSportName.trim()) {
			clubAddErr = 'Sport name is required when creating a new sport module.';
			return;
		}
		clubSaving = true;
		try {
			const id    = newClubId.trim().toLowerCase();
			const email = newClubDir.trim().toLowerCase();

			// ── Step 1: Provision new sport module if requested ──────────────────
			// If this callable fails, club creation is halted — no partial state written.
			let resolvedSport = newClubSport;
			if (newSportMode) {
				const res = await createSportModuleFn({
					sportName: newSportName.trim(),
					defaultIcon: newSportIcon.trim() || 'ph-soccer-ball',
					courtType: '',
				});
				const data = /** @type {{ ok?: boolean, sportId?: string }} */ (res.data);
				if (!data?.ok || !data.sportId) {
					throw new Error('Sport module server did not confirm creation. Club was NOT created.');
				}
				resolvedSport = data.sportId;
			}

			// ── Step 2: Create the club document (incl. Sprint 2.6.5 demographics) ─
			const ph = newClubPhone.trim();
			if (ph && !/^\+?[0-9\s().\-]{7,20}$/.test(ph)) {
				throw new Error('Phone number looks invalid. Use E.164 (e.g. +15125550100).');
			}
			await setDoc(doc(db, 'clubs', id), {
				id,
				name: newClubName,
				directorEmail: email,
				sport: resolvedSport,
				verifiedAddress: newClubAddress.trim() || '',
				phoneNumber: ph,
				primaryFacility: newClubFacility.trim() || '',
				createdAt: new Date(),
			});
			if (email) {
				await setDoc(doc(db, 'users', email), { role: 'director', clubId: id }, { merge: true });
			}
			await logSecurityEvent('CREATE_CLUB', id, newClubName);

			// ── Reset form ───────────────────────────────────────────────────────
			newClubId     = '';
			newClubName   = '';
			newClubSport  = 'soccer';
			newSportName  = '';
			newSportIcon  = 'ph-soccer-ball';
			newClubDir    = '';
			newClubAddress  = '';
			newClubPhone    = '';
			newClubFacility = '';
			showAddForm  = false;

			// Reload clubs table directly — same defensive normalization as initial load.
			const snap = await getDocs(collection(db, 'clubs'));
			/** @type {Club[]} */
			const reloaded = [];
			snap.forEach((d) => {
				const raw = /** @type {Record<string, unknown>} */ (d.data() || {});
				reloaded.push({
					id: d.id,
					name: typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : undefined,
					sport:
						typeof raw?.sport === 'string' && raw.sport.trim() ? raw.sport.trim() : undefined,
					directorEmail:
						typeof raw?.directorEmail === 'string' && raw.directorEmail.trim()
							? raw.directorEmail.trim()
							: undefined,
					isInfinite: raw?.isInfinite === true,
					tier: typeof raw?.tier === 'string' && raw.tier.trim() ? raw.tier.trim() : undefined,
					subscriptionTier:
						typeof raw?.subscriptionTier === 'string' && raw.subscriptionTier.trim()
							? raw.subscriptionTier.trim()
							: undefined,
					logoUrl:
						typeof raw?.logoUrl === 'string' && raw.logoUrl.trim()
							? raw.logoUrl.trim()
							: undefined,
					createdAt: raw?.createdAt ?? null,
				});
			});
			clubs = reloaded.sort((a, b) =>
				(a?.name || a?.id || '').localeCompare(b?.name || b?.id || ''),
			);
		} catch (e) {
			clubAddErr = e instanceof Error ? e.message : 'Could not create club.';
		} finally {
			clubSaving = false;
		}
	}

	// ── Strike 1 (Agent 2): row action menu + Edit Organization modal ───────
	/** @type {string | null} */
	let openRowMenuId  = $state(null);
	/** @type {Club | null} */
	let editingClub    = $state(null);
	let showEditModal  = $state(false);

	/** @param {string} id */
	function toggleRowMenu(id) {
		openRowMenuId = openRowMenuId === id ? null : id;
	}
	function closeRowMenu() {
		openRowMenuId = null;
	}

	/** Global click-outside + Escape for the row-action menu. */
	$effect(() => {
		if (!openRowMenuId) return;
		/** @param {MouseEvent} ev */
		const onDocClick = (ev) => {
			const tgt = /** @type {Element | null} */ (ev.target);
			if (!tgt) return;
			if (!tgt.closest?.('.orgs3-row-menu') && !tgt.closest?.('.orgs3-row-actions-btn')) {
				closeRowMenu();
			}
		};
		/** @param {KeyboardEvent} ev */
		const onKey = (ev) => { if (ev.key === 'Escape') closeRowMenu(); };
		document.addEventListener('mousedown', onDocClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDocClick);
			document.removeEventListener('keydown', onKey);
		};
	});

	/** @param {Club} cl */
	function openEdit(cl) {
		editingClub = cl;
		showEditModal = true;
		closeRowMenu();
	}

	function closeEdit() {
		showEditModal = false;
		editingClub = null;
	}

	/** Reactivity mandate (P0): patch the local `clubs` array so the UI
	 *  reflects edits immediately without a page reload. */
	/** @param {Club} updated */
	function applyClubPatchLocally(updated) {
		clubs = clubs.map((c) => (c.id === updated.id ? { ...c, ...updated } : c));
	}

	/**
	 * @param {string} id
	 * @param {string} name
	 */
	async function deleteClub(id, name) {
		if (!confirm(`Permanently delete organization "${name}" (${id})? This cannot be undone.`)) return;
		await deleteDoc(doc(db, 'clubs', id));
		await logSecurityEvent('DELETE_CLUB', id, 'Club deleted permanently');
		clubs = clubs.filter((cl) => cl.id !== id);
	}

	// ── Strike 2 (Agent 2) — Login As Director ─────────────────────────────
	// Mirrors the impersonation flow in /admin/users: fire the callable with
	// the director's email, sign the admin into the returned custom token,
	// stamp the workspaceContext with the target clubId so the Director shell
	// lands on the correct scope, and route to the Director dashboard.
	/** @type {string | null} */
	let loginAsDirectorBusyFor = $state(null);
	let loginAsDirectorErr     = $state('');

	/** @param {Club} cl */
	async function loginAsDirector(cl) {
		closeRowMenu();
		loginAsDirectorErr = '';
		const email = (cl?.directorEmail || '').trim().toLowerCase();
		if (!email) {
			loginAsDirectorErr = `${cl.name || cl.id} has no director email on file — assign one before impersonating.`;
			return;
		}
		const ok = confirm(
			`Begin impersonation session as ${email} (Director of ${cl.name || cl.id})?\n\n` +
				'Every action will be attributed to the Director. The session will be written to security_audit.'
		);
		if (!ok) return;

		loginAsDirectorBusyFor = cl.id;
		try {
			const res = await impersonateUserFn({ targetEmail: email });
			const payload = /** @type {{ token?: string, targetUid?: string, targetEmail?: string, targetRole?: string }} */ (
				res.data || {}
			);
			if (!payload.token) throw new Error('Impersonation token missing from response.');

			// Carry the clubId into the shell context BEFORE the auth swap so
			// the Director page hydrates with the correct scope on first paint.
			workspaceContextStore.resetScope();
			workspaceContextStore.setActiveClubId(cl.id);
			workspaceContextStore.setActiveContext('director');

			await signInWithCustomToken(auth, payload.token);
			await impersonationStore.touch();
			await logSecurityEvent(
				'IMPERSONATE_DIRECTOR',
				cl.id,
				`Global Admin ${authStore.user?.email || 'unknown'} started director impersonation for ${email}`,
			);
			await goto(`/director?clubId=${encodeURIComponent(cl.id)}`, { replaceState: true });
		} catch (e) {
			console.error('[admin-organizations] director impersonation failed', e);
			loginAsDirectorErr = e instanceof Error ? e.message : 'Login As Director failed.';
		} finally {
			loginAsDirectorBusyFor = null;
		}
	}

</script>

<div class="orgs3-page">

	<!-- ── Page toolbar (shared .adm-toolbar — enterprise-console.css) ───────── -->
	<div class="adm-toolbar">
		<div class="adm-toolbar__left">
			<h1 class="adm-toolbar__title">Organizations</h1>
			<div class="adm-toolbar__meta">
				<span class="adm-toolbar__sub">Organization &rsaquo; Program &rsaquo; Team &rsaquo; Roster</span>
				<span class="adm-toolbar__count">
					{#if clubsLoading}—{:else}{filteredClubs.length} of {clubs.length}{/if}
				</span>
			</div>
		</div>
		<div class="adm-toolbar__right">
			<div class="adm-search-wrap">
				<i class="ph ph-magnifying-glass adm-search-icon" aria-hidden="true"></i>
				<input
					type="search"
					class="adm-search tw-text-sm"
					bind:value={orgSearch}
					placeholder="Filter organizations…"
					autocomplete="off"
					aria-label="Filter organizations"
				/>
			</div>

			<!-- Strike 1 — Enterprise Filter popover (Status + Sport) -->
			<div class="orgs3-filter" bind:this={filterRootEl}>
				<button
					type="button"
					class="orgs3-filter-btn"
					class:orgs3-filter-btn--active={filterOpen || filterActiveCount > 0}
					aria-haspopup="dialog"
					aria-expanded={filterOpen}
					onclick={toggleFilter}
				>
					<i class="ph ph-funnel" aria-hidden="true"></i>
					<span>Enterprise Filter</span>
					{#if filterActiveCount > 0}
						<span class="orgs3-filter-badge" aria-label="{filterActiveCount} active filters">
							{filterActiveCount}
						</span>
					{/if}
				</button>

				{#if filterOpen}
					<!-- Strike 3 (A2.1) — Enterprise Filter: Tier (multi) +
					     Region/State (multi w/ typeahead) + Verification.
					     Sport filtering intentionally lives in the tabstrip;
					     we never duplicate it here. -->
					<div class="orgs3-filter-pop" role="dialog" aria-label="Enterprise Filter">
						<div class="orgs3-filter-pop__head">
							<span class="orgs3-filter-pop__title">Filter Organizations</span>
							<button
								type="button"
								class="orgs3-filter-pop__close"
								onclick={closeFilter}
								aria-label="Close filter"
							>
								<i class="ph ph-x" aria-hidden="true"></i>
							</button>
						</div>

						<!-- ── Subscription Tier (multi-select) ────────────────── -->
						<fieldset class="orgs3-filter-group">
							<legend class="orgs3-filter-group__legend">
								Subscription Tier
								{#if filterTiers.length > 0}
									<span class="orgs3-filter-group__mini-badge">{filterTiers.length}</span>
								{/if}
							</legend>
							<p class="orgs3-filter-group__hint">
								Pick one or more. Clubs without a tier assignment live under
								<strong>Unassigned</strong>.
							</p>
							<div class="orgs3-filter-chips" role="group" aria-label="Subscription Tier">
								{#each TIER_OPTIONS as tier (tier.key)}
									{@const active = filterTiers.includes(tier.key)}
									{@const count  = tierCounts[tier.key] || 0}
									<button
										type="button"
										role="checkbox"
										aria-checked={active}
										class="orgs3-filter-chip orgs3-filter-chip--multi"
										class:orgs3-filter-chip--active={active}
										onclick={() => (filterTiers = toggleInList(filterTiers, tier.key))}
									>
										<span class="orgs3-filter-chip__dot" style="background:{tier.accent};"></span>
										<i class="ph {tier.icon}" aria-hidden="true"></i>
										<span>{tier.label}</span>
										<span class="orgs3-filter-chip__count">{count}</span>
									</button>
								{/each}
							</div>
						</fieldset>

						<!-- ── Region / State (multi-select w/ typeahead) ────── -->
						<fieldset class="orgs3-filter-group">
							<legend class="orgs3-filter-group__legend">
								Region / State
								{#if filterStates.length > 0}
									<span class="orgs3-filter-group__mini-badge">{filterStates.length}</span>
								{/if}
							</legend>
							<p class="orgs3-filter-group__hint">
								Parsed from the Google-Places verified address. Type to filter
								when the list grows past a handful of states.
							</p>

							{#if knownStates.length === 0}
								<p class="orgs3-filter-group__empty">
									No states detected yet. Add a verified address to a club to
									enable region filtering.
								</p>
							{:else}
								{#if knownStates.length > 6}
									<label class="orgs3-filter-state" for="orgs3-filter-region-q">
										<i class="ph ph-magnifying-glass" aria-hidden="true"></i>
										<input
											id="orgs3-filter-region-q"
											type="search"
											class="orgs3-filter-state__typeahead"
											placeholder="Search states (TX, CA, NY…)"
											autocomplete="off"
											bind:value={filterRegionQuery}
										/>
									</label>
								{/if}

								<div class="orgs3-filter-state-grid" role="group" aria-label="States">
									{#each filteredStateOptions as st (st)}
										{@const active = filterStates.includes(st)}
										<button
											type="button"
											role="checkbox"
											aria-checked={active}
											class="orgs3-filter-state-chip"
											class:orgs3-filter-state-chip--active={active}
											onclick={() => (filterStates = toggleInList(filterStates, st))}
										>
											<i
												class="ph {active ? 'ph-check-square' : 'ph-square'}"
												aria-hidden="true"
											></i>
											{st}
										</button>
									{:else}
										<span class="orgs3-filter-group__empty orgs3-filter-group__empty--inline">
											No states match "{filterRegionQuery}".
										</span>
									{/each}
								</div>
							{/if}
						</fieldset>

						<!-- ── Verification Status ────────────────────────────── -->
						<fieldset class="orgs3-filter-group">
							<legend class="orgs3-filter-group__legend">Verification Status</legend>
							<p class="orgs3-filter-group__hint">
								Clubs with a Google-Places verified address and a phone number
								on file count as <strong>Verified</strong>.
							</p>
							<div class="orgs3-filter-chips" role="radiogroup" aria-label="Verification Status">
								{#each [
									{ key: 'all',       label: 'All',       dot: '#a1a1aa', icon: 'ph-list'         },
									{ key: 'verified',  label: 'Verified',  dot: '#22c55e', icon: 'ph-seal-check'   },
									{ key: 'pending',   label: 'Pending',   dot: '#f59e0b', icon: 'ph-clock'        }
								] as opt (opt.key)}
									<button
										type="button"
										role="radio"
										aria-checked={filterVerification === opt.key}
										class="orgs3-filter-chip"
										class:orgs3-filter-chip--active={filterVerification === opt.key}
										onclick={() => (filterVerification = /** @type {any} */ (opt.key))}
									>
										<span class="orgs3-filter-chip__dot" style="background:{opt.dot};"></span>
										<i class="ph {opt.icon}" aria-hidden="true"></i>
										{opt.label}
									</button>
								{/each}
							</div>
						</fieldset>

						<div class="orgs3-filter-pop__foot">
							<button
								type="button"
								class="orgs3-filter-reset"
								onclick={resetFilters}
								disabled={filterActiveCount === 0}
							>
								Reset
							</button>
							<button
								type="button"
								class="orgs3-filter-apply"
								onclick={closeFilter}
							>
								Done
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- Stack Sports import (secondary integration path). -->
			<button
				type="button"
				class="orgs3-import-btn"
				onclick={importViaStackSports}
				title="Import organizations from Stack Sports"
			>
				<i class="ph ph-cloud-arrow-down" aria-hidden="true"></i>
				Import via Stack Sports API
			</button>

			<button
				type="button"
				class="orgs3-add-btn"
				onclick={() => (showAddForm = !showAddForm)}
				aria-expanded={showAddForm}
			>
				<i class="ph {showAddForm ? 'ph-x' : 'ph-plus'}" aria-hidden="true"></i>
				{showAddForm ? 'Cancel' : 'Add Organization'}
			</button>
		</div>
	</div>

	<!-- Strike 2 — inline toast stack (Stack Sports import, etc.) -->
	{#if toasts.length > 0}
		<div class="orgs3-toasts" role="status" aria-live="polite">
			{#each toasts as t (t.id)}
				<div class="orgs3-toast orgs3-toast--{t.tone}">
					<i
						class="ph {t.tone === 'ok'
							? 'ph-check-circle'
							: t.tone === 'warn'
								? 'ph-warning-circle'
								: 'ph-info'}"
						aria-hidden="true"
					></i>
					<span>{t.text}</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- ── Sprint 2.6.5: sport sub-navigation tab strip ─────────────────────── -->
	<div class="orgs3-tabs" role="tablist" aria-label="Filter by sport">
		{#each SPORT_TABS as tab (tab.key)}
			{@const count = sportCounts[tab.key] ?? 0}
			{@const isActive = activeSportTab === tab.key}
			{#if tab.key === 'all' || count > 0}
				<button
					type="button"
					role="tab"
					aria-selected={isActive}
					class="orgs3-tab"
					class:orgs3-tab--active={isActive}
					data-sport={tab.key}
					onclick={() => (activeSportTab = tab.key)}
				>
					<i class="ph {tab.icon}" aria-hidden="true"></i>
					<span class="orgs3-tab__label">{tab.label}</span>
					<span class="orgs3-tab__count">{count}</span>
				</button>
			{/if}
		{/each}
	</div>

	<!-- ── Inline add form (collapsible) ────────────────────────────────────── -->
	{#if showAddForm}
		<div class="orgs3-add-form">
			{#if clubAddErr}
				<p class="orgs3-flash orgs3-flash--err" role="alert">{clubAddErr}</p>
			{/if}
			<div class="orgs3-add-grid">
				<div class="orgs3-field">
					<label class="orgs3-field-label" for="add-club-id">
						Club ID <span class="orgs3-req" aria-hidden="true">*</span>
					</label>
					<input id="add-club-id" type="text" class="orgs3-input" bind:value={newClubId} placeholder="e.g. aggiesfc" disabled={clubSaving} />
				</div>
				<div class="orgs3-field">
					<label class="orgs3-field-label" for="add-club-name">
						Club Name <span class="orgs3-req" aria-hidden="true">*</span>
					</label>
					<input id="add-club-name" type="text" class="orgs3-input" bind:value={newClubName} placeholder="e.g. Aggie FC" disabled={clubSaving} />
				</div>
				<div class="orgs3-field">
					<label class="orgs3-field-label" for="add-club-sport">Sport</label>
					<select id="add-club-sport" class="orgs3-input" bind:value={newClubSport} disabled={clubSaving}>
						<option value="soccer">Soccer</option>
						<option value="basketball">Basketball</option>
						<option value="baseball">Baseball</option>
						<option value="football">Football</option>
						<option value="volleyball">Volleyball</option>
						<option value="hockey">Hockey</option>
						<option value="lacrosse">Lacrosse</option>
						<option value="generic">Generic</option>
						<option disabled>──────────</option>
						<option value="__new__">+ Create new sport…</option>
					</select>
				</div>
				<div class="orgs3-field">
					<label class="orgs3-field-label" for="add-club-dir">Director Email</label>
					<input id="add-club-dir" type="email" class="orgs3-input" bind:value={newClubDir} placeholder="director@example.com" disabled={clubSaving} />
				</div>
				<div class="orgs3-field">
					<label class="orgs3-field-label" for="add-club-phone">Phone Number</label>
					<input
						id="add-club-phone"
						type="tel"
						class="orgs3-input"
						bind:value={newClubPhone}
						placeholder="+1 (512) 555-0100"
						inputmode="tel"
						autocomplete="tel"
						disabled={clubSaving}
					/>
				</div>
				<div class="orgs3-field orgs3-field--wide">
					<label class="orgs3-field-label" for="add-club-address">
						Verified Address
						<span class="orgs3-places-chip">
							<i class="ph ph-map-pin-line" aria-hidden="true"></i>
							Google Places Autocomplete active
						</span>
					</label>
					<input
						id="add-club-address"
						type="text"
						class="orgs3-input"
						bind:value={newClubAddress}
						placeholder="Start typing a verified street address…"
						autocomplete="street-address"
						disabled={clubSaving}
						data-places-autocomplete="address"
					/>
				</div>
				<div class="orgs3-field orgs3-field--wide">
					<label class="orgs3-field-label" for="add-club-facility">
						Primary Facility
						<span class="orgs3-places-chip">
							<i class="ph ph-buildings" aria-hidden="true"></i>
							Google Places Autocomplete active
						</span>
					</label>
					<input
						id="add-club-facility"
						type="text"
						class="orgs3-input"
						bind:value={newClubFacility}
						placeholder="e.g. Mueller Athletic Complex, Austin TX"
						disabled={clubSaving}
						data-places-autocomplete="establishment"
					/>
				</div>
			</div>

			<!-- ── New Sport inline panel — shown only when "+ Create new sport…" is selected -->
			{#if newSportMode}
				<div class="orgs3-new-sport-panel">
					<div class="orgs3-new-sport-panel__label">
						<i class="ph ph-trophy" aria-hidden="true"></i>
						New Sport Module
						<span class="orgs3-new-sport-panel__sub">
							Provisioned via Cloud Function before the club is saved.
							If this step fails, the club will NOT be created.
						</span>
					</div>
					<div class="orgs3-add-grid orgs3-add-grid--compact">
						<div class="orgs3-field">
							<label class="orgs3-field-label" for="add-sport-name">
								Sport Name <span class="orgs3-req" aria-hidden="true">*</span>
							</label>
							<input
								id="add-sport-name"
								type="text"
								class="orgs3-input"
								bind:value={newSportName}
								placeholder="e.g. Volleyball"
								disabled={clubSaving}
							/>
						</div>
						<div class="orgs3-field">
							<label class="orgs3-field-label" for="add-sport-icon">
								Icon <span class="orgs3-field-label__hint">(Phosphor class)</span>
							</label>
							<input
								id="add-sport-icon"
								type="text"
								class="orgs3-input"
								bind:value={newSportIcon}
								placeholder="ph-volleyball"
								disabled={clubSaving}
							/>
						</div>
					</div>
				</div>
			{/if}

			<button type="button" class="orgs3-submit-btn" onclick={addClub} disabled={clubSaving}>
				{#if clubSaving}
					{newSportMode ? 'Provisioning sport & creating club…' : 'Creating…'}
				{:else}
					+ Register Organization
				{/if}
			</button>
		</div>
	{/if}

	<!-- ── Enterprise DataTable ───────────────────────────────────────────────── -->
	{#if clubsErr}
		<div class="orgs3-err" role="alert">
			<i class="ph ph-warning-circle" aria-hidden="true"></i>
			{clubsErr}
		</div>
	{/if}
	{#if loginAsDirectorErr}
		<div class="orgs3-err" role="alert">
			<i class="ph ph-warning-circle" aria-hidden="true"></i>
			{loginAsDirectorErr}
		</div>
	{/if}

	<div class="orgs3-dt-container">
		<table class="orgs3-dt" aria-label="Organizations">
			<thead class="orgs3-dt__head">
				<tr>
					<th class="orgs3-dt__th orgs3-dt__th--logo" scope="col" aria-label="Logo"></th>
					<th class="orgs3-dt__th" scope="col">Organization</th>
					<th class="orgs3-dt__th" scope="col">Sport</th>
					<th class="orgs3-dt__th orgs3-dt__th--license" scope="col">License</th>
					<th class="orgs3-dt__th" scope="col">Director</th>
					<th class="orgs3-dt__th orgs3-dt__th--center" scope="col">Teams</th>
					<th class="orgs3-dt__th orgs3-dt__th--compliance" scope="col">Compliance</th>
					<th class="orgs3-dt__th orgs3-dt__th--actions" scope="col" aria-label="Actions"></th>
				</tr>
			</thead>
			<tbody>
				{#if clubsLoading}
					<tr>
						<td colspan="8" class="orgs3-dt__td-loading" aria-busy="true">
							<span class="orgs3-spinner" aria-hidden="true"></span>
							Loading organizations…
						</td>
					</tr>
				{:else if pagedClubs.length === 0}
					<tr>
						<td colspan="8" class="orgs3-dt__td-empty">
							{clubs.length === 0 ? 'No organizations registered yet.' : 'No organizations match your filter.'}
						</td>
					</tr>
				{:else}
					{#each pagedClubs as cl (cl.id)}
						{@const compliance = getCompliance(cl.id)}
						{@const teamCount  = teamsStore.teams.filter((t) => t.clubId === cl.id).length}
						{@const accent     = clubSportAccent(cl?.sport)}
						{@const licenseMeta = licenseMetaForClub(cl)}
						<tr class="orgs3-dt__row">
							<!-- Logo (sport-accented chip when no uploaded logo) -->
							<td class="orgs3-dt__td orgs3-dt__td--logo">
								{#if typeof cl.logoUrl === 'string' && cl.logoUrl.trim()}
									<img class="orgs3-logo" src={cl.logoUrl.trim()} alt="" loading="lazy" />
								{:else}
									<span
										class="orgs3-logo-chip"
										style="--sport-fg:{accent.fg}; --sport-glow:{accent.glow}; --sport-ring:{accent.ring};"
										aria-hidden="true"
									>
										<i class="ph {clubSportIconClass(cl.sport ?? 'generic')}"></i>
									</span>
								{/if}
							</td>

							<!-- Name + ID (sport icon lives in Logo + Sport columns only) -->
							<td class="orgs3-dt__td orgs3-dt__td--name">
								<div class="orgs3-org-primary">
									<a class="orgs3-org-link" href="/admin/organizations/{cl?.id ?? ''}">
										<span class="orgs3-org-name-text">
											{cl?.name || cl?.id || 'Unnamed Organization'}
										</span>
									</a>
								</div>
								<span class="orgs3-org-id">{cl?.id ?? ''}</span>
							</td>

							<!-- Sport -->
							<td class="orgs3-dt__td orgs3-dt__td--muted">
								<span class="orgs3-sport-pill" style="--sport-fg:{accent.fg}; --sport-ring:{accent.ring};">
									{accent.label}
								</span>
							</td>

							<!-- License (tier / promo) -->
							<td class="orgs3-dt__td orgs3-dt__td--license">
								<span
									class="orgs3-license-pill"
									style="--lic-accent:{licenseMeta.accent};"
									title={cl?.isInfinite === true ? 'Enterprise / unlimited promo license' : `Subscription: ${licenseMeta.label}`}
								>
									<i class="ph {licenseMeta.icon}" aria-hidden="true"></i>
									{licenseMeta.label}
								</span>
							</td>

							<!-- Director -->
							<td class="orgs3-dt__td orgs3-dt__td--mono orgs3-dt__td--ellipsis">
								{cl?.directorEmail || 'Unassigned'}
							</td>

							<!-- Teams count (Strike 2: header + cell center-aligned) -->
							<td class="orgs3-dt__td orgs3-dt__td--num orgs3-dt__td--center">
								{teamCount}
							</td>

							<!-- Compliance Health -->
							<td class="orgs3-dt__td">
								{#if cl.isInfinite === true && !compliance}
									<span class="orgs3-compliance orgs3-compliance--na" title="Enterprise promo license">
										<span class="orgs3-compliance__dot"></span>
										N/A
									</span>
								{:else if compliance === null}
									<span class="orgs3-compliance orgs3-compliance--clean" title="No minor accounts on record">
										<span class="orgs3-compliance__dot"></span>
										Clean
									</span>
								{:else if compliance.status === 'clean'}
									<span class="orgs3-compliance orgs3-compliance--clean" title="{compliance.verified}/{compliance.total} VPC verified">
										<span class="orgs3-compliance__dot"></span>
										Compliant
									</span>
								{:else if compliance.status === 'watch'}
									<span class="orgs3-compliance orgs3-compliance--watch" title="{compliance.verified}/{compliance.total} VPC verified">
										<span class="orgs3-compliance__dot"></span>
										{compliance.verified}/{compliance.total} verified
									</span>
								{:else}
									<span class="orgs3-compliance orgs3-compliance--risk" title="{compliance.verified}/{compliance.total} VPC verified">
										<span class="orgs3-compliance__dot"></span>
										At Risk
									</span>
								{/if}
							</td>

							<!-- Actions (Strike 1 — unified row dropdown with Edit) -->
							<td class="orgs3-dt__td orgs3-dt__td--actions">
								<div class="orgs3-row-action-wrap">
									<a
										class="orgs3-view-btn"
										href="/admin/organizations/{cl.id}"
										aria-label="View {cl.name || cl.id}"
									>
										View <i class="ph ph-arrow-right" aria-hidden="true"></i>
									</a>
									<button
										type="button"
										class="orgs3-row-actions-btn"
										aria-haspopup="menu"
										aria-expanded={openRowMenuId === cl.id}
										aria-label="Actions for {cl.name || cl.id}"
										onclick={(e) => { e.stopPropagation(); toggleRowMenu(cl.id); }}
									>
										<i class="ph ph-dots-three-vertical" aria-hidden="true"></i>
									</button>
									{#if openRowMenuId === cl.id}
										<div class="orgs3-row-menu" role="menu">
											<button
												type="button"
												role="menuitem"
												class="orgs3-row-menu__item"
												onclick={() => openEdit(cl)}
											>
												<i class="ph ph-pencil-simple" aria-hidden="true"></i>
												Edit Organization
											</button>
											<a
												role="menuitem"
												class="orgs3-row-menu__item"
												href="/admin/organizations/{cl.id}"
												onclick={closeRowMenu}
											>
												<i class="ph ph-arrow-square-out" aria-hidden="true"></i>
												Open Details
											</a>
											<!-- Strike 2 — Login As Director (P0). Disabled when the
											     club has no director email on file. -->
											<button
												type="button"
												role="menuitem"
												class="orgs3-row-menu__item"
												disabled={loginAsDirectorBusyFor === cl.id || !(cl.directorEmail || '').trim()}
												onclick={() => void loginAsDirector(cl)}
											>
												{#if loginAsDirectorBusyFor === cl.id}
													<i class="ph ph-circle-notch orgs3-row-menu__spin" aria-hidden="true"></i>
													Launching session…
												{:else}
													<i class="ph ph-sign-in" aria-hidden="true"></i>
													Login As Director
												{/if}
											</button>
											<button
												type="button"
												role="menuitem"
												class="orgs3-row-menu__item orgs3-row-menu__item--danger"
												onclick={() => { closeRowMenu(); void deleteClub(cl.id, cl.name || cl.id); }}
											>
												<i class="ph ph-trash" aria-hidden="true"></i>
												Delete Organization
											</button>
										</div>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Strike 1 — Edit Organization modal (live $state patch via applyClubPatchLocally). -->
	<EditOrganizationModal
		bind:open={showEditModal}
		club={editingClub}
		onClose={closeEdit}
		onSaved={(updated) => {
			applyClubPatchLocally(updated);
		}}
	/>

	<!-- ── Pagination ─────────────────────────────────────────────────────────── -->
	{#if orgTotalPages > 1}
		<div class="orgs3-pager" role="navigation" aria-label="Organizations pagination">
			<button
				type="button"
				class="orgs3-page-btn"
				disabled={orgPage <= 0}
				onclick={() => (orgPage = Math.max(0, orgPage - 1))}
			>
				← Prev
			</button>
			<span class="orgs3-page-info">
				Page {orgPage + 1} / {orgTotalPages}
				<span class="orgs3-page-count">({filteredClubs.length} results)</span>
			</span>
			<button
				type="button"
				class="orgs3-page-btn"
				disabled={orgPage >= orgTotalPages - 1}
				onclick={() => (orgPage = Math.min(orgTotalPages - 1, orgPage + 1))}
			>
				Next →
			</button>
		</div>
	{/if}


</div>

<style>
	/* ─────────────────────────────────────────────────────────────────────────── */
	/* Enterprise DataTable — zero card wrappers, 1px borders, high-density rows  */
	/* ─────────────────────────────────────────────────────────────────────────── */
	.orgs3-page {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	/* ── Strike 1: Enterprise Filter popover ─────────────────────────── */
	.orgs3-filter {
		position: relative;
		display: inline-flex;
	}

	.orgs3-filter-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 38px;
		padding: 0 14px;
		border-radius: 8px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #fff);
		color: var(--text-primary);
		font: inherit;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.12s ease, border-color 0.12s ease;
	}

	.orgs3-filter-btn:hover,
	.orgs3-filter-btn--active {
		border-color: #4f46e5;
		background: rgba(79, 70, 229, 0.08);
		color: var(--text-primary);
	}

	:global(html.dark) .orgs3-filter-btn {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.10);
		color: #fafafa;
	}

	:global(html.dark) .orgs3-filter-btn:hover,
	:global(html.dark) .orgs3-filter-btn--active {
		background: rgba(124, 58, 237, 0.18);
		border-color: #7c3aed;
	}

	.orgs3-filter-btn i {
		font-size: 0.875rem;
	}

	.orgs3-filter-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 999px;
		background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
		color: #fff;
		font-size: 0.6875rem;
		font-weight: 800;
		line-height: 1;
	}

	.orgs3-filter-pop {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		/* Strike 3 (A2.1) — widened to host the new Tier/Region multi-selects
		   and given a max-height so it never escapes the viewport when an
		   admin has 50 states worth of clubs. */
		width: 380px;
		max-width: calc(100vw - 24px);
		max-height: min(calc(100vh - 120px), 640px);
		overflow-y: auto;
		background: var(--glass-bg, #fff);
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 12px;
		box-shadow: 0 18px 40px -12px rgba(15, 23, 42, 0.18);
		padding: 14px 14px 12px;
		z-index: 80;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	:global(html.dark) .orgs3-filter-pop {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.12);
		box-shadow: 0 18px 40px -12px rgba(0, 0, 0, 0.55);
	}

	.orgs3-filter-pop__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.orgs3-filter-pop__title {
		font-size: 0.8125rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	.orgs3-filter-pop__close {
		width: 26px;
		height: 26px;
		border-radius: 6px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.orgs3-filter-pop__close:hover {
		background: rgba(0, 0, 0, 0.05);
		color: var(--text-primary);
	}

	:global(html.dark) .orgs3-filter-pop__close:hover {
		background: rgba(255, 255, 255, 0.06);
		color: #fafafa;
	}

	.orgs3-filter-group {
		border: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.orgs3-filter-group__legend {
		padding: 0;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	/* Strike 2 — filter group helper copy + empty state */
	.orgs3-filter-group__hint {
		margin: 6px 0 4px;
		font-size: 0.75rem;
		line-height: 1.4;
		color: var(--text-secondary);
	}

	.orgs3-filter-group__empty {
		margin: 6px 0 0;
		font-size: 0.75rem;
		font-style: italic;
		color: var(--text-secondary);
	}

	/* Strike 2 — Region/State select control */
	.orgs3-filter-state {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		min-height: 36px;
		padding: 0 10px;
		border-radius: 8px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #fff);
		color: var(--text-primary);
		box-sizing: border-box;
		transition: border-color 0.12s ease, box-shadow 0.12s ease;
	}

	.orgs3-filter-state:focus-within {
		border-color: var(--brand-primary, #f59e0b);
		box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
	}

	:global(html.dark) .orgs3-filter-state {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.10);
		color: #fafafa;
	}

	.orgs3-filter-state__select {
		flex: 1;
		border: none;
		background: transparent;
		font: inherit;
		font-size: 0.8125rem;
		color: inherit;
		outline: none;
		appearance: none;
		cursor: pointer;
	}

	.orgs3-filter-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.orgs3-filter-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 28px;
		padding: 0 10px;
		border-radius: 999px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #fff);
		color: var(--text-primary);
		font: inherit;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.12s ease, border-color 0.12s ease;
	}

	.orgs3-filter-chip:hover {
		border-color: #a1a1aa;
	}

	.orgs3-filter-chip--active {
		border-color: #4f46e5;
		background: rgba(79, 70, 229, 0.12);
		color: #312e81;
	}

	:global(html.dark) .orgs3-filter-chip {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.10);
		color: #fafafa;
	}

	:global(html.dark) .orgs3-filter-chip--active {
		background: rgba(124, 58, 237, 0.22);
		border-color: #7c3aed;
		color: #fafafa;
	}

	.orgs3-filter-chip__dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		display: inline-block;
	}

	.orgs3-filter-chip__count {
		font-size: 0.6875rem;
		font-weight: 700;
		color: var(--text-secondary);
		background: rgba(0, 0, 0, 0.05);
		padding: 1px 6px;
		border-radius: 999px;
	}

	:global(html.dark) .orgs3-filter-chip__count {
		background: rgba(255, 255, 255, 0.08);
		color: #d4d4d8;
	}

	.orgs3-filter-chip--active .orgs3-filter-chip__count {
		background: rgba(79, 70, 229, 0.18);
		color: #312e81;
	}

	:global(html.dark) .orgs3-filter-chip--active .orgs3-filter-chip__count {
		background: rgba(255, 255, 255, 0.12);
		color: #fafafa;
	}

	/* Strike 3 (A2.1) — Multi-select variants: wider padding, card surface. */
	.orgs3-filter-chip--multi {
		height: 30px;
		padding: 0 10px 0 8px;
	}

	/* Strike 3 (A2.1) — Mini count badge sitting inside a fieldset legend. */
	.orgs3-filter-group__mini-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-left: 6px;
		min-width: 18px;
		height: 18px;
		padding: 0 6px;
		border-radius: 999px;
		background: rgba(79, 70, 229, 0.12);
		color: #312e81;
		font-size: 0.625rem;
		font-weight: 800;
		letter-spacing: 0;
	}

	:global(html.dark) .orgs3-filter-group__mini-badge {
		background: rgba(165, 180, 252, 0.18);
		color: #e0e7ff;
	}

	/* Strike 3 (A2.1) — Region typeahead input inside the state box. */
	.orgs3-filter-state__typeahead {
		flex: 1;
		border: none;
		background: transparent;
		font: inherit;
		font-size: 0.8125rem;
		color: inherit;
		outline: none;
		padding: 6px 0;
		min-width: 0;
	}

	/* Strike 3 (A2.1) — Scrollable grid of region chips so 50 states fit. */
	.orgs3-filter-state-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
		gap: 6px;
		padding: 2px 2px 2px 0;
	}

	.orgs3-filter-state-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		height: 28px;
		padding: 0 8px;
		border-radius: 6px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #fff);
		color: var(--text-primary);
		font: inherit;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		cursor: pointer;
		transition: background 0.1s ease, border-color 0.1s ease, color 0.1s ease;
	}

	.orgs3-filter-state-chip i {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.orgs3-filter-state-chip:hover {
		border-color: #a1a1aa;
	}

	.orgs3-filter-state-chip--active {
		border-color: #4338ca;
		background: rgba(79, 70, 229, 0.12);
		color: #312e81;
	}

	.orgs3-filter-state-chip--active i {
		color: #4338ca;
	}

	:global(html.dark) .orgs3-filter-state-chip {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.10);
		color: #fafafa;
	}

	:global(html.dark) .orgs3-filter-state-chip--active {
		background: rgba(124, 58, 237, 0.25);
		border-color: #a5b4fc;
		color: #fafafa;
	}

	:global(html.dark) .orgs3-filter-state-chip--active i {
		color: #c7d2fe;
	}

	.orgs3-filter-group__empty--inline {
		grid-column: 1 / -1;
		margin: 0;
	}

	.orgs3-filter-pop__foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-top: 4px;
		padding-top: 10px;
		border-top: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .orgs3-filter-pop__foot {
		border-top-color: rgba(255, 255, 255, 0.08);
	}

	.orgs3-filter-reset {
		height: 32px;
		padding: 0 12px;
		border-radius: 8px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary);
		font: inherit;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}

	.orgs3-filter-reset:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.orgs3-filter-reset:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.05);
		color: var(--text-primary);
	}

	:global(html.dark) .orgs3-filter-reset:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.06);
		color: #fafafa;
	}

	.orgs3-filter-apply {
		height: 32px;
		padding: 0 16px;
		border-radius: 8px;
		border: 1px solid #4338ca;
		background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
		color: #fff;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
	}

	.orgs3-filter-apply:hover {
		filter: brightness(1.06);
	}

	/* ── Sprint 2.6.5: Sport sub-navigation tab strip ───────────────── */
	.orgs3-tabs {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 10px 0 12px;
		overflow-x: auto;
		scrollbar-width: thin;
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .orgs3-tabs {
		border-bottom-color: rgba(255, 255, 255, 0.08);
	}

	.orgs3-tab {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		height: 34px;
		padding: 0 12px;
		border-radius: 8px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary);
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
	}

	.orgs3-tab:hover {
		background: rgba(0, 0, 0, 0.04);
		color: var(--text-primary);
	}

	:global(html.dark) .orgs3-tab {
		color: #d4d4d8;
	}

	:global(html.dark) .orgs3-tab:hover {
		background: rgba(255, 255, 255, 0.05);
		color: #fafafa;
	}

	.orgs3-tab i {
		font-size: 0.95rem;
	}

	.orgs3-tab__count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 18px;
		padding: 0 6px;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.06);
		color: var(--text-secondary);
		font-size: 0.7rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	:global(html.dark) .orgs3-tab__count {
		background: rgba(255, 255, 255, 0.08);
		color: #d4d4d8;
	}

	.orgs3-tab--active {
		background: rgba(99, 102, 241, 0.1);
		border-color: rgba(99, 102, 241, 0.25);
		color: #4f46e5;
	}

	.orgs3-tab--active .orgs3-tab__count {
		background: rgba(99, 102, 241, 0.18);
		color: #4338ca;
	}

	:global(html.dark) .orgs3-tab--active {
		background: rgba(168, 85, 247, 0.16);
		border-color: rgba(168, 85, 247, 0.4);
		color: #e9d5ff;
	}

	:global(html.dark) .orgs3-tab--active .orgs3-tab__count {
		background: rgba(168, 85, 247, 0.25);
		color: #fafafa;
	}

	/* Per-sport accent on the tab icon when active */
	.orgs3-tab--active[data-sport="soccer"]     { color: #15803d; border-color: rgba(34, 197, 94, 0.35);  background: rgba(34, 197, 94, 0.08); }
	.orgs3-tab--active[data-sport="basketball"] { color: #c2410c; border-color: rgba(251, 146, 60, 0.35); background: rgba(251, 146, 60, 0.08); }
	.orgs3-tab--active[data-sport="baseball"]   { color: #1d4ed8; border-color: rgba(96, 165, 250, 0.35); background: rgba(96, 165, 250, 0.08); }
	.orgs3-tab--active[data-sport="football"]   { color: #6d28d9; border-color: rgba(167, 139, 250, 0.35); background: rgba(167, 139, 250, 0.08); }
	.orgs3-tab--active[data-sport="volleyball"] { color: #be185d; border-color: rgba(244, 114, 182, 0.35); background: rgba(244, 114, 182, 0.08); }
	.orgs3-tab--active[data-sport="hockey"]     { color: #0369a1; border-color: rgba(56, 189, 248, 0.35); background: rgba(56, 189, 248, 0.08); }
	.orgs3-tab--active[data-sport="lacrosse"]   { color: #a16207; border-color: rgba(250, 204, 21, 0.4);  background: rgba(250, 204, 21, 0.08); }

	:global(html.dark) .orgs3-tab--active[data-sport="soccer"]     { color: #86efac; }
	:global(html.dark) .orgs3-tab--active[data-sport="basketball"] { color: #fdba74; }
	:global(html.dark) .orgs3-tab--active[data-sport="baseball"]   { color: #bfdbfe; }
	:global(html.dark) .orgs3-tab--active[data-sport="football"]   { color: #ddd6fe; }
	:global(html.dark) .orgs3-tab--active[data-sport="volleyball"] { color: #fbcfe8; }
	:global(html.dark) .orgs3-tab--active[data-sport="hockey"]     { color: #bae6fd; }
	:global(html.dark) .orgs3-tab--active[data-sport="lacrosse"]   { color: #fde68a; }

	/* ── Add button ─────────────────────────────────────────────────── */
	.orgs3-add-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 34px;
		padding: 0 14px;
		border-radius: 7px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #fff);
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		cursor: pointer;
		transition: background 0.1s ease, border-color 0.1s ease;
		white-space: nowrap;
	}

	.orgs3-add-btn:hover {
		background: rgba(0, 0, 0, 0.04);
		border-color: rgba(0, 0, 0, 0.18);
	}

	:global(html.dark) .orgs3-add-btn {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.10);
		color: #fafafa;
	}

	/* Strike 2 — Stack Sports premium secondary action. */
	.orgs3-import-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 34px;
		padding: 0 14px;
		border-radius: 7px;
		border: 1px solid rgba(79, 70, 229, 0.35);
		background: linear-gradient(135deg, rgba(79,70,229,0.08), rgba(139,92,246,0.08));
		color: #4338ca;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.12s ease, border-color 0.12s ease, transform 0.08s ease;
		white-space: nowrap;
	}

	.orgs3-import-btn:hover {
		background: linear-gradient(135deg, rgba(79,70,229,0.14), rgba(139,92,246,0.14));
		border-color: rgba(79, 70, 229, 0.6);
	}

	.orgs3-import-btn:active {
		transform: translateY(1px);
	}

	:global(html.dark) .orgs3-import-btn {
		color: #c7d2fe;
		border-color: rgba(129, 140, 248, 0.35);
		background: linear-gradient(135deg, rgba(79,70,229,0.18), rgba(139,92,246,0.18));
	}

	/* Toast stack (Stack Sports import, etc.) */
	.orgs3-toasts {
		position: fixed;
		right: 24px;
		bottom: 24px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		z-index: 9998;
		pointer-events: none;
	}

	.orgs3-toast {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border-radius: 10px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: #ffffff;
		color: var(--text-primary);
		font-size: 0.8125rem;
		font-weight: 600;
		max-width: 380px;
		box-shadow: 0 14px 32px rgba(15, 23, 42, 0.15);
		pointer-events: auto;
	}

	:global(html.dark) .orgs3-toast {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.1);
		color: #fafafa;
	}

	.orgs3-toast--ok   { border-color: rgba(16,185,129,0.35); }
	.orgs3-toast--warn { border-color: rgba(245,158,11,0.4); }
	.orgs3-toast i     { font-size: 1rem; }

	/* ── Inline add form ────────────────────────────────────────────── */
	.orgs3-add-form {
		padding: 16px 0 20px;
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .orgs3-add-form {
		border-bottom-color: rgba(255, 255, 255, 0.08);
	}

	.orgs3-add-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 12px;
		margin-bottom: 14px;
	}

	.orgs3-add-grid--compact { margin-bottom: 0; }

	/* ── New Sport inline panel ─────────────────────────────────────── */
	.orgs3-new-sport-panel {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 14px 16px;
		margin-bottom: 14px;
		border-radius: 8px;
		border: 1px solid rgba(245, 158, 11, 0.3);
		background: rgba(245, 158, 11, 0.04);
	}

	:global(html.dark) .orgs3-new-sport-panel {
		border-color: rgba(245, 158, 11, 0.25);
		background: rgba(245, 158, 11, 0.06);
	}

	.orgs3-new-sport-panel__label {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 0.8125rem;
		font-weight: 700;
		color: #d97706;
		flex-wrap: wrap;
	}

	:global(html.dark) .orgs3-new-sport-panel__label { color: #fbbf24; }

	.orgs3-new-sport-panel__sub {
		font-size: 0.72rem;
		font-weight: 400;
		color: var(--text-secondary);
		width: 100%;
		margin-top: 2px;
		line-height: 1.5;
	}

	.orgs3-field-label__hint {
		font-size: 0.7rem;
		font-weight: 500;
		text-transform: none;
		letter-spacing: 0;
		opacity: 0.75;
	}

	.orgs3-field {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.orgs3-field--wide {
		grid-column: 1 / -1;
	}

	.orgs3-field-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 0.6875rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
	}

	.orgs3-places-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: 999px;
		background: rgba(16, 185, 129, 0.12);
		color: #047857;
		border: 1px solid rgba(16, 185, 129, 0.35);
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: none;
		letter-spacing: 0;
	}

	:global(html.dark) .orgs3-places-chip {
		background: rgba(16, 185, 129, 0.18);
		color: #a7f3d0;
		border-color: #065f46;
	}

	.orgs3-input {
		height: 34px;
		padding: 0 10px;
		border-radius: 7px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #fff);
		font: inherit;
		font-size: 0.8125rem;
		color: var(--text-primary);
		outline: none;
		transition: border-color 0.12s ease;
		box-sizing: border-box;
		width: 100%;
	}

	.orgs3-input:focus { border-color: var(--brand-primary, #f59e0b); }
	.orgs3-input:disabled { opacity: 0.55; cursor: not-allowed; }

	:global(html.dark) .orgs3-input {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.10);
		color: #fafafa;
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
	}

	.orgs3-req { color: var(--danger-red, #b91c1c); margin-left: 2px; }

	.orgs3-submit-btn {
		height: 34px;
		padding: 0 16px;
		border-radius: 7px;
		border: none;
		background: var(--brand-primary, #f59e0b);
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 700;
		color: #0f172a;
		cursor: pointer;
		transition: filter 0.1s ease;
		white-space: nowrap;
	}

	.orgs3-submit-btn:hover:not(:disabled) { filter: brightness(1.06); }
	.orgs3-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	/* ── DataTable container — edge-to-edge ─────────────────────────── */
	.orgs3-dt-container {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		/* No border-radius, no box-shadow — true edge-to-edge */
		border-top: 1px solid var(--border-subtle, #e5e5e5);
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .orgs3-dt-container {
		border-color: rgba(255, 255, 255, 0.07);
	}

	/* ── Table ──────────────────────────────────────────────────────── */
	.orgs3-dt {
		width: 100%;
		min-width: 680px;
		border-collapse: collapse;
		font-size: 0.8125rem; /* text-sm */
		letter-spacing: -0.01em; /* tracking-tight */
	}

	/* Sticky header */
	.orgs3-dt__head {
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.orgs3-dt__th {
		padding: 8px 12px; /* py-2 equivalent */
		text-align: left;
		vertical-align: middle;
		font-size: 0.6875rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-secondary);
		background: var(--surface-subtle, #f9f9f9);
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
		white-space: nowrap;
	}

	:global(html.dark) .orgs3-dt__th {
		background: #0d0d0f;
		border-bottom-color: rgba(255, 255, 255, 0.07);
	}

	.orgs3-dt__th--logo    { width: 44px; padding-left: 16px; vertical-align: middle; }
	.orgs3-dt__th--license { width: 118px; vertical-align: middle; white-space: nowrap; }
	.orgs3-dt__th--compliance { width: 130px; vertical-align: middle; }
	.orgs3-dt__th--actions { width: 96px; text-align: right; padding-right: 16px; vertical-align: middle; }
	/* Strike 2: center-align modifier for the Teams column (header + cell). */
	.orgs3-dt__th--center, .orgs3-dt__td--center { text-align: center; }

	/* Rows */
	.orgs3-dt__row {
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
		transition: background 0.07s ease;
	}

	.orgs3-dt__row:last-child { border-bottom: none; }

	.orgs3-dt__row:hover {
		background: rgba(0, 0, 0, 0.018); /* subtle gray — NO box-shadow */
	}

	:global(html.dark) .orgs3-dt__row {
		border-bottom-color: rgba(255, 255, 255, 0.05);
	}

	:global(html.dark) .orgs3-dt__row:hover {
		background: rgba(255, 255, 255, 0.025);
	}

	.orgs3-dt__row--clickable { cursor: pointer; }

	/* Cells */
	.orgs3-dt__td {
		padding: 8px 12px; /* py-2 px-3 */
		vertical-align: middle;
		color: var(--text-primary);
	}

	.orgs3-dt__td--logo { width: 44px; padding-left: 16px; vertical-align: middle; }
	.orgs3-dt__td--name { vertical-align: middle; }
	.orgs3-dt__td--license { vertical-align: middle; }

	.orgs3-dt__td--muted {
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 180px;
	}

	.orgs3-dt__td--mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.75rem;
	}

	.orgs3-dt__td--ellipsis {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 200px;
	}

	.orgs3-dt__td--num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: var(--text-secondary);
		font-size: 0.8rem;
		font-weight: 600;
	}

	.orgs3-dt__td--num.orgs3-dt__td--center {
		text-align: center;
	}

	.orgs3-dt__td--actions {
		text-align: right;
		padding-right: 16px;
		white-space: nowrap;
	}

	/* Loading / empty states */
	.orgs3-dt__td-loading {
		text-align: center;
		padding: 40px !important;
		color: var(--text-secondary);
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}

	.orgs3-dt__td-empty {
		text-align: center;
		padding: 40px 20px !important;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	/* Loading spinner */
	.orgs3-spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-top-color: var(--brand-primary, #f59e0b);
		animation: orgs3-spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	:global(html.dark) .orgs3-spinner {
		border-color: rgba(255, 255, 255, 0.1);
		border-top-color: var(--brand-primary, #f59e0b);
	}

	@keyframes orgs3-spin { to { transform: rotate(360deg); } }

	/* ── Logo cell ──────────────────────────────────────────────────── */
	.orgs3-logo {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		object-fit: cover;
		border: 1px solid var(--border-subtle, #e5e5e5);
		display: block;
	}

	.orgs3-logo-chip {
		width: 30px;
		height: 30px;
		border-radius: 8px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		color: var(--sport-fg, #6366f1);
		background:
			radial-gradient(120% 120% at 30% 30%, var(--sport-glow, rgba(99,102,241,0.2)) 0%, transparent 70%),
			rgba(0, 0, 0, 0.025);
		border: 1px solid var(--sport-ring, rgba(99, 102, 241, 0.35));
		box-shadow: 0 0 0 3px var(--sport-glow, rgba(99, 102, 241, 0.08));
		transition: transform 0.12s ease, box-shadow 0.12s ease;
	}

	:global(html.dark) .orgs3-logo-chip {
		background:
			radial-gradient(120% 120% at 30% 30%, var(--sport-glow, rgba(99,102,241,0.25)) 0%, transparent 70%),
			rgba(255, 255, 255, 0.03);
	}

	.orgs3-dt__row:hover .orgs3-logo-chip {
		transform: translateY(-1px);
		box-shadow: 0 0 0 3px var(--sport-glow, rgba(99, 102, 241, 0.14));
	}

	/* Name row: org link + id */
	.orgs3-org-primary {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.orgs3-org-link {
		display: block;
		min-width: 0;
		flex: 1 1 auto;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		text-decoration: none;
		transition: color 0.1s ease;
	}

	.orgs3-org-link:hover { color: var(--brand-primary, #d97706); }

	.orgs3-org-name-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 220px;
	}

	.orgs3-sport-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 10px;
		border-radius: 999px;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		color: var(--sport-fg, #525252);
		border: 1px solid var(--sport-ring, rgba(0,0,0,0.1));
		background: transparent;
		white-space: nowrap;
	}

	.orgs3-org-id {
		display: block;
		font-size: 0.7rem;
		font-family: ui-monospace, monospace;
		color: var(--text-secondary);
		margin-top: 1px;
	}

	/* ── Compliance Health column ───────────────────────────────────── */
	.orgs3-compliance {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		white-space: nowrap;
	}

	.orgs3-compliance__dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.orgs3-compliance--clean  { color: #15803d; }
	.orgs3-compliance--clean  .orgs3-compliance__dot { background: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,0.18); }

	.orgs3-compliance--watch  { color: #b45309; }
	.orgs3-compliance--watch  .orgs3-compliance__dot { background: #f59e0b; box-shadow: 0 0 0 2px rgba(245,158,11,0.2); }

	.orgs3-compliance--risk   { color: #b91c1c; }
	.orgs3-compliance--risk   .orgs3-compliance__dot { background: #ef4444; box-shadow: 0 0 0 2px rgba(239,68,68,0.2); animation: orgs3-pulse 2s ease infinite; }

	.orgs3-compliance--na     { color: var(--text-secondary); }
	.orgs3-compliance--na     .orgs3-compliance__dot { background: rgba(0,0,0,0.15); }

	:global(html.dark) .orgs3-compliance--clean  { color: #86efac; }
	:global(html.dark) .orgs3-compliance--watch  { color: #fde68a; }
	:global(html.dark) .orgs3-compliance--risk   { color: #fca5a5; }

	@keyframes orgs3-pulse {
		0%, 100% { box-shadow: 0 0 0 2px rgba(239,68,68,0.2); }
		50%        { box-shadow: 0 0 0 5px rgba(239,68,68,0.05); }
	}

	/* ── Action buttons ─────────────────────────────────────────────── */
	.orgs3-view-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		border-radius: 6px;
		border: 1px solid rgba(245, 158, 11, 0.35);
		color: var(--brand-primary, #d97706);
		font-size: 0.75rem;
		font-weight: 700;
		text-decoration: none;
		transition: background 0.1s ease;
		white-space: nowrap;
	}

	.orgs3-view-btn:hover { background: rgba(245, 158, 11, 0.07); }

	:global(html.dark) .orgs3-view-btn {
		color: #fbbf24;
		border-color: rgba(245, 158, 11, 0.3);
	}

	.orgs3-del-btn {
		background: none;
		border: none;
		padding: 4px 7px;
		border-radius: 5px;
		cursor: pointer;
		color: rgba(0, 0, 0, 0.28);
		font-size: 0.85rem;
		transition: color 0.1s ease, background 0.1s ease;
		margin-left: 4px;
	}

	.orgs3-del-btn:hover {
		color: var(--danger-red, #b91c1c);
		background: rgba(185, 28, 28, 0.06);
	}

	:global(html.dark) .orgs3-del-btn { color: rgba(255, 255, 255, 0.25); }

	/* ── Strike 1: row action dropdown (kebab menu) ──────────────────── */
	.orgs3-row-action-wrap {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.orgs3-row-actions-btn {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.orgs3-row-actions-btn:hover {
		background: rgba(0, 0, 0, 0.05);
		color: var(--text-primary);
	}

	:global(html.dark) .orgs3-row-actions-btn {
		color: #d4d4d8;
	}

	:global(html.dark) .orgs3-row-actions-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #fafafa;
	}

	.orgs3-row-menu {
		position: absolute;
		right: 0;
		top: calc(100% + 6px);
		min-width: 200px;
		background: #ffffff;
		border: 1px solid #e4e4e7;
		border-radius: 10px;
		box-shadow: 0 14px 34px -10px rgba(15, 23, 42, 0.22);
		padding: 6px;
		z-index: 60;
		display: flex;
		flex-direction: column;
	}

	:global(html.dark) .orgs3-row-menu {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.12);
		box-shadow: 0 14px 34px -10px rgba(0, 0, 0, 0.55);
	}

	.orgs3-row-menu__item {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border-radius: 6px;
		border: none;
		background: transparent;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-primary);
		text-align: left;
		text-decoration: none;
		cursor: pointer;
	}

	/* Strike 2 — row menu spinner for async actions (Login As Director) */
	.orgs3-row-menu__spin {
		display: inline-block;
		animation: orgs3-spin 0.9s linear infinite;
	}
	@keyframes orgs3-spin {
		to { transform: rotate(360deg); }
	}

	.orgs3-row-menu__item[disabled] {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.orgs3-row-menu__item i {
		font-size: 1rem;
		color: var(--text-secondary);
	}

	.orgs3-row-menu__item:hover {
		background: rgba(0, 0, 0, 0.05);
	}

	:global(html.dark) .orgs3-row-menu__item {
		color: #fafafa;
	}

	:global(html.dark) .orgs3-row-menu__item:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.orgs3-row-menu__item--danger {
		color: #b91c1c;
	}

	.orgs3-row-menu__item--danger i {
		color: #b91c1c;
	}

	.orgs3-row-menu__item--danger:hover {
		background: rgba(185, 28, 28, 0.08);
	}

	:global(html.dark) .orgs3-row-menu__item--danger {
		color: #fca5a5;
	}

	:global(html.dark) .orgs3-row-menu__item--danger i {
		color: #fca5a5;
	}

	/* ── Pagination ─────────────────────────────────────────────────── */
	.orgs3-pager {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 12px 0;
		border-top: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .orgs3-pager {
		border-top-color: rgba(255, 255, 255, 0.07);
	}

	.orgs3-page-btn {
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 600;
		padding: 5px 14px;
		border-radius: 6px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #fff);
		cursor: pointer;
		color: var(--text-primary);
		transition: background 0.1s ease;
	}

	.orgs3-page-btn:hover:not(:disabled) { background: rgba(0, 0, 0, 0.04); }
	.orgs3-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

	:global(html.dark) .orgs3-page-btn {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.1);
	}

	.orgs3-page-info {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.orgs3-page-count { font-size: 0.75rem; opacity: 0.8; margin-left: 4px; }

	/* ── Error state ────────────────────────────────────────────────── */
	.orgs3-err {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 0;
		color: var(--danger-red, #b91c1c);
		font-size: 0.875rem;
		font-weight: 600;
	}

	/* ── Flash ──────────────────────────────────────────────────────── */
	.orgs3-flash {
		margin: 0 0 10px;
		padding: 10px 12px;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.orgs3-flash--err {
		background: rgba(185, 28, 28, 0.08);
		color: var(--danger-red, #991b1b);
		border: 1px solid rgba(185, 28, 28, 0.3);
	}
</style>
