import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { untrack } from 'svelte';
import { httpsCallable } from 'firebase/functions';
import {
	doc,
	getDoc,
	updateDoc,
	writeBatch,
} from 'firebase/firestore';
import { db, functions, auth } from '$lib/firebase.js';
import { lockBody, unlockBody } from '$lib/utils/modalLock.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import type { HouseholdOperativeRow } from '$lib/types/household.js';
import {
	buildEnrichedOperativeRows,
	loadHouseholdOperativeRows,
} from '$lib/parent/householdOperatives.js';
import {
	fetchHouseholdClearance,
	guardsPassForHouseholdLoad,
	normalizeHouseholdId,
	shouldClearLoadBusy,
} from '$lib/parent/loadHouseholdClearance.js';

export class HouseholdEngine {
	private readonly parentSignCoppaWaiver = httpsCallable(functions, 'parentSignCoppaWaiver');
	private readonly parentProvisionOperative = httpsCallable(functions, 'parentProvisionOperative');
	private readonly parentLinkOperativeToTeam = httpsCallable(functions, 'parentLinkOperativeToTeam');
	private readonly parentReconcileHousehold = httpsCallable(functions, 'parentReconcileHousehold');
	private readonly generatePlayerOTP = httpsCallable(functions, 'generatePlayerOTP');
    private readonly parentInviteCoParent = httpsCallable(functions, 'parentInviteCoParent');

	householdId = $state('');
	coppaAt = $state<any>(null);
	coppaSigned = $state(false);
	loadErr = $state('');
	loadBusy = $state(false);
	
	private clearanceFetchGeneration = 0;
	private clearanceLastFetchHid = '';
	
	actionBusy = $state(false);
	actErr = $state('');

	childName = $state('');
	operativeCallsign = $state('');
	lastDispatch = $state('');
	teamDispatchCode = $state('');

	operativeRows = $state<HouseholdOperativeRow[]>([]);
	otpGenBusyKey = $state<string | null>(null);
	gtActionBusyKey = $state<string | null>(null);
	linkTeamCodes = $state<Record<string, string>>({});
	linkTeamBusyKey = $state<string | null>(null);

	otpDialog = $state<false | { code: string; expiresAt: number; displayName: string }>(false);
	otpCountdownTick = $state(0);
	copyFeedback = $state(false);

    coParentEmail = $state('');
    coParentBusy = $state(false);
    coParentErr = $state('');

    get role() { return authStore.role; }
    get profile() { return authStore.userProfile; }
    get userEmail() { return (authStore.user?.email || '').toLowerCase(); }
    get clearanceHid() { return normalizeHouseholdId(this.profile?.householdId); }
    get clearanceLoadReady() { 
        return guardsPassForHouseholdLoad({
            browser,
            authLoading: authStore.isLoading,
            userEmail: this.userEmail,
        });
    }

	get otpSecondsLeft() {
		const dialog = this.otpDialog;
		if (dialog === false) return 0;
		void this.otpCountdownTick;
		return Math.max(0, Math.ceil((dialog.expiresAt - Date.now()) / 1000));
	}

	get otpCountdownLabel() {
		const s = this.otpSecondsLeft;
		const m = Math.floor(s / 60);
		const r = s % 60;
		return `${m}:${r.toString().padStart(2, '0')}`;
	}

    init() {
        $effect(() => {
            if (!browser) return;
            if (this.otpDialog === false) return;
            lockBody();
            return () => unlockBody();
        });

        $effect(() => {
            if (!browser) return;
            if (!this.otpDialog) return;
            const id = setInterval(() => {
                this.otpCountdownTick = Date.now();
            }, 1000);
            return () => clearInterval(id);
        });

        $effect(() => {
            if (browser && !authStore.isLoading && authStore.isAuthenticated) {
                if (this.role !== 'parent') {
                    untrack(() => {
                        goto('/parent/vpc', { replaceState: true });
                    });
                }
            }
        });

        $effect(() => {
            const hid = this.clearanceHid;
            const ready = this.clearanceLoadReady;

            if (!ready || !hid) {
                this.loadBusy = false;
                return;
            }

            const gen = untrack(() => {
                const g = ++this.clearanceFetchGeneration;
                if (hid !== this.clearanceLastFetchHid) {
                    this.loadErr = '';
                    this.clearanceLastFetchHid = hid;
                }
                this.loadBusy = true;
                return g;
            });

            let cancelled = false;

            void (async () => {
                try {
                    try {
                        await this.parentReconcileHousehold({});
                    } catch {
                        // non-fatal
                    }
                    if (!db) return;
                    const result = await fetchHouseholdClearance(db, hid);
                    if (cancelled || gen !== this.clearanceFetchGeneration) return;
                    this.householdId = result.householdId;
                    this.coppaSigned = result.coppaSigned;
                    this.coppaAt = result.coppaAt;
                    this.operativeRows = result.operativeRows;
                    this.loadErr = result.loadErr;
                } catch (e) {
                    if (cancelled || gen !== this.clearanceFetchGeneration) return;
                    this.loadErr = e instanceof Error ? e.message : 'Read failed';
                } finally {
                    if (shouldClearLoadBusy(!cancelled && gen === this.clearanceFetchGeneration)) {
                        this.loadBusy = false;
                    }
                }
            })();

            return () => {
                cancelled = true;
            };
        });
    }

	async refreshHouseholdOperatives() {
		if (!db || !authStore.isAuthenticated) return;
		this.operativeRows = await loadHouseholdOperativeRows(db, this.householdId);
	}

	async approveGamertagForRow(row: HouseholdOperativeRow) {
		this.actErr = '';
		if (!this.coppaSigned) {
			this.actErr = 'Sign the waiver before approving a Gamertag change.';
			return;
		}
		const em = row.email;
		if (!em.endsWith('@operative.local') || !row.pendingGamertag) return;
		if (row.gamertagChangesLeft <= 0) {
			this.actErr = 'No gamertag changes remaining for this operative.';
			return;
		}
		this.gtActionBusyKey = em;
		try {
            if (!db) return;
			const uref = doc(db, 'users', em);
			const snap = await getDoc(uref);
			if (!snap.exists()) {
				throw new Error('Operative profile not found.');
			}
			const d = snap.data() || {};
			const pending = typeof d.pendingGamertag === 'string' ? d.pendingGamertag.trim() : '';
			if (!pending) {
				throw new Error('No pending request.');
			}
			const left = typeof d.gamertagChangesLeft === 'number' ? d.gamertagChangesLeft : 3;
			if (left <= 0) {
				throw new Error('No changes remaining.');
			}
			const nextLeft = left - 1;
			const batch = writeBatch(db);
			batch.update(uref, {
				gamertag: pending,
				playerName: pending,
				pendingGamertag: null,
				gamertagChangesLeft: nextLeft,
			});
			const plref = doc(db, 'player_lookup', em);
			const pls = await getDoc(plref);
			if (pls.exists()) {
				batch.update(plref, { playerName: pending });
			}
			await batch.commit();
			await this.refreshHouseholdOperatives();
		} catch (e: any) {
			this.actErr = e?.message || 'Approve failed';
		} finally {
			this.gtActionBusyKey = null;
		}
	}

	async denyGamertagForRow(row: HouseholdOperativeRow) {
		this.actErr = '';
		if (!this.coppaSigned) {
			this.actErr = 'Sign the waiver before updating gamertag requests.';
			return;
		}
		const em = row.email;
		if (!em.endsWith('@operative.local') || !row.pendingGamertag) return;
		this.gtActionBusyKey = em;
		try {
            if (!db) return;
			await updateDoc(doc(db, 'users', em), { pendingGamertag: null });
			await this.refreshHouseholdOperatives();
		} catch (e: any) {
			this.actErr = e?.message || 'Deny failed';
		} finally {
			this.gtActionBusyKey = null;
		}
	}

	async linkOperativeTeam(row: HouseholdOperativeRow) {
		this.actErr = '';
		if (!this.coppaSigned) {
			this.actErr = 'Sign the waiver before linking an operative to a team.';
			return;
		}
		const em = row.email;
		if (!em.endsWith('@operative.local')) return;
		const code = (this.linkTeamCodes[em] || '').trim();
		if (!code) {
			this.actErr = 'Enter the team dispatch code from your coach (e.g. QA-PP26).';
			return;
		}
		this.linkTeamBusyKey = em;
		try {
			await this.parentLinkOperativeToTeam({
				childEmail: em,
				teamInviteCode: code,
			});
			this.linkTeamCodes = { ...this.linkTeamCodes, [em]: '' };
			await auth.currentUser?.getIdToken(true);
			await authStore.refresh({ silent: true });
			await this.refreshHouseholdOperatives();
			this.actErr = '';
		} catch (e: any) {
			this.actErr = e?.message || 'Team link failed.';
		} finally {
			this.linkTeamBusyKey = null;
		}
	}

	async signWaiver() {
		this.actErr = '';
		this.actionBusy = true;
		try {
			const res = await this.parentSignCoppaWaiver({});
			const d = res && typeof res === 'object' && 'data' in res ? res.data : res;
			if (d && typeof d === 'object' && 'householdId' in d) {
				this.householdId = String((d as any).householdId);
			}
			await auth.currentUser?.getIdToken(true);
			await authStore.refresh({ silent: true });
			const hid = (authStore.userProfile?.householdId || '').toString() || this.householdId;
			if (hid) {
                if (!db) return;
				const snap = await getDoc(doc(db, 'households', hid));
				if (snap.exists()) {
					const x = snap.data() || {};
					this.coppaSigned = x.coppaSigned === true;
					this.coppaAt = x.coppaSignedAt ?? null;
				}
			} else {
				this.coppaSigned = true;
			}
		} catch (e: any) {
			this.actErr = e?.message || 'Waiver failed';
		} finally {
			this.actionBusy = false;
		}
	}

	async provision() {
		this.actErr = '';
		if (!this.coppaSigned) {
			this.actErr = 'Complete COPPA & liability clearance before provisioning operatives.';
			return;
		}
		const oper = this.operativeCallsign.trim();
		const slug = oper.toLowerCase().replace(/[^a-z0-9]/g, '');
		if (!this.childName.trim() || !oper) {
			this.actErr = 'Enter the operative display name and Operative Callsign (username).';
			return;
		}
		if (slug.length < 2) {
			this.actErr = 'Operative Callsign must include at least two letters or numbers.';
			return;
		}
		if (slug.length > 32) {
			this.actErr = 'Operative Callsign: use a shorter name (2–32 letters or numbers after normalizing).';
			return;
		}
		this.actionBusy = true;
		this.lastDispatch = '';
		try {
			const teamCodeOpt = this.teamDispatchCode.trim();
			const payload: Record<string, string> = {
				childName: this.childName.trim(),
				operativeCallsign: oper,
			};
			if (teamCodeOpt) {
				payload.teamInviteCode = teamCodeOpt;
			}
			const res = await this.parentProvisionOperative(payload);
			const data = res && typeof res === 'object' && 'data' in res ? res.data : res;
			const outCode =
				data && typeof data === 'object' && 'dispatchCode' in data ?
					String((data as any).dispatchCode) :
					'';
			this.lastDispatch = outCode;
			this.childName = '';
			this.operativeCallsign = '';
			this.teamDispatchCode = '';
			await auth.currentUser?.getIdToken(true);
			await authStore.refresh({ silent: true });
			if (this.householdId) {
                if (!db) return;
				const hs = await getDoc(doc(db, 'households', this.householdId));
				if (hs.exists()) {
					this.operativeRows = await buildEnrichedOperativeRows(db, hs.data() || {});
				}
			}
		} catch (e: any) {
			this.actErr = e?.message || 'Provision failed';
		} finally {
			this.actionBusy = false;
		}
	}

	fmtTs(ts: any) {
		if (!ts || typeof ts.toDate !== 'function') return '—';
		try {
			return ts.toDate().toLocaleString();
		} catch {
			return '—';
		}
	}

	closeOtpDialog() {
		this.otpDialog = false;
		this.copyFeedback = false;
	}

	async generateOtpForRow(row: HouseholdOperativeRow) {
		this.actErr = '';
		if (!this.coppaSigned) {
			this.actErr = 'Sign the waiver before issuing clearance codes.';
			return;
		}
		this.otpGenBusyKey = row.email;
		try {
			const res = await this.generatePlayerOTP({ childEmail: row.email });
			const data = (res && typeof res === 'object' && 'data' in res ? res.data : res) as {
				code?: unknown;
				expiresAt?: unknown;
			} | null;
			const code = data && typeof data === 'object' && data.code != null ? String(data.code) : '';
			const iso = data && typeof data === 'object' && data.expiresAt != null ? String(data.expiresAt) : '';
			if (!code) {
				throw new Error('No code returned.');
			}
			const expiresAt = iso ?
				new Date(iso).getTime() :
				Date.now() + 10 * 60 * 1000;
			this.otpDialog = { code, expiresAt, displayName: row.name };
		} catch (e: any) {
			this.actErr = e?.message || 'Could not generate code.';
		} finally {
			this.otpGenBusyKey = null;
		}
	}

	async copyOtpToClipboard() {
		if (!browser || !this.otpDialog || typeof this.otpDialog !== 'object') return;
		try {
			await navigator.clipboard.writeText(this.otpDialog.code);
			this.copyFeedback = true;
			setTimeout(() => {
				this.copyFeedback = false;
			}, 2000);
		} catch {
			this.actErr = 'Clipboard unavailable. Copy the code manually.';
		}
	}

	onOtpKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape' && this.otpDialog) {
			e.preventDefault();
			this.closeOtpDialog();
		}
	}

    async inviteCoParent() {
        this.coParentErr = '';
        if (!this.coppaSigned) {
            this.coParentErr = 'Complete COPPA clearance before inviting a co-parent.';
            return;
        }
        if (!this.coParentEmail.includes('@')) {
            this.coParentErr = 'Enter a valid email address.';
            return;
        }
        this.coParentBusy = true;
        try {
            await this.parentInviteCoParent({ coParentEmail: this.coParentEmail });
            this.coParentEmail = '';
        } catch (err: any) {
            this.coParentErr = err?.message || 'Failed to invite co-parent.';
        } finally {
            this.coParentBusy = false;
        }
    }
}
